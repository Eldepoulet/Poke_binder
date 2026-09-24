import { prisma } from "@/lib/prisma";
import type { ImportResume } from "@/lib/types";

// Parseur CSV `;`-délimité, guillemets façon RFC4180 (champ entre guillemets
// si contient le délimiteur/retour à la ligne, `""` = guillemet littéral).
// Écrit à la main plutôt qu'une dépendance : format source fixe et simple
// (export Pokecardex), pas besoin d'une librairie générique.
export function parseCsv(texte: string, delimiteur = ";"): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let dansGuillemets = false;
  let i = 0;
  const n = texte.length;

  while (i < n) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i += 2;
          continue;
        }
        dansGuillemets = false;
        i++;
        continue;
      }
      champ += c;
      i++;
      continue;
    }
    if (c === '"') {
      dansGuillemets = true;
      i++;
      continue;
    }
    if (c === delimiteur) {
      ligne.push(champ);
      champ = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
      i++;
      continue;
    }
    champ += c;
    i++;
  }
  if (champ.length || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => !(l.length === 1 && l[0].trim() === ""));
}

type Bucket = "n" | "r" | "h" | "p" | "m";

// "Version" (Standard/Reverse/tampons...) + "Rarete" (peut valoir
// "Holographique") déterminent la case n/r/h/p/m. "Reverse (Pokéball)" et
// "Reverse (Masterball)" sont les motifs de reverse spéciaux de certains
// sets (151, Évolutions Prismatiques, Foudre Noire, Flamme Blanche...).
// Les tampons et autres variantes spéciales (tout le reste) sont ignorés,
// à la demande explicite de l'utilisateur.
function bucketDeVersion(version: string, rarete: string): Bucket | null {
  const v = version.trim().toLowerCase();
  if (v === "reverse (pokéball)" || v === "reverse (pokeball)") return "p";
  if (v === "reverse (masterball)") return "m";
  if (v === "reverse") return "r";
  if (v === "standard") return rarete.toLowerCase().includes("holo") ? "h" : "n";
  return null;
}

function normaliserNumero(numero: string): string {
  const idx = numero.indexOf("/");
  return (idx === -1 ? numero : numero.slice(0, idx)).trim();
}

function normaliserNomSet(s: string): string {
  return s.trim().toLowerCase();
}

// Pokecardex nomme certains sets promo différemment du nom TCGdex stocké en
// base (ex. sets-meta.json a "SVP Black Star Promos" pour le code "svp").
// Repli utilisé quand la correspondance exacte par nom échoue.
const ALIAS_SERIE: Record<string, string> = {
  "promos écarlate et violet": "svp",
};

type LigneAgregee = {
  cardId: string;
  variante: Bucket;
  langue: string;
  etat: string;
  quantite: number;
  dateAjout: Date | null;
  serieOriginale: string;
  numeroOriginal: string;
  nomOriginal: string;
};

export async function importPokecardexCsv(texte: string, userId: string): Promise<ImportResume> {
  const [, ...corps] = parseCsv(texte); // ignore la ligne d'en-tête

  const sets = await prisma.set.findMany({ select: { code: true, name: true } });
  const codeParNomSet = new Map(sets.map((s) => [normaliserNomSet(s.name), s.code]));

  const setsNotFound = new Set<string>();
  let skippedSpecial = 0;
  const agg = new Map<string, LigneAgregee>();

  for (const cols of corps) {
    if (cols.length < 9) continue;
    const [serie, numeroBrut, nom, , rarete, version, langue, etat, quantiteBrut, , dateBrut] = cols;
    if (!serie?.trim() || !numeroBrut?.trim()) continue;

    const bucket = bucketDeVersion(version ?? "", rarete ?? "");
    if (!bucket) {
      skippedSpecial++;
      continue;
    }

    const nomNormalise = normaliserNomSet(serie);
    const codeParent = codeParNomSet.get(nomNormalise) ?? ALIAS_SERIE[nomNormalise];
    if (!codeParent) {
      setsNotFound.add(serie);
      continue;
    }

    const numero = normaliserNumero(numeroBrut);
    // Les cartes "Galerie Galaroise"/"Galerie de Dresseurs" (GGxx/TGxx) sont
    // rangées dans leur set parent (cf. prisma/scripts/fusionner-galeries.ts),
    // comme dans la colonne Serie de Pokecardex : "swsh12-TG01".
    const cardId = `${codeParent}-${numero}`;
    const quantite = Math.max(1, parseInt(quantiteBrut, 10) || 1);
    const dateAjout = dateBrut?.trim() ? new Date(dateBrut.trim().replace(" ", "T")) : null;
    const langueVal = langue?.trim() ?? "";
    const etatVal = etat?.trim() ?? "";

    const cle = `${cardId}|${bucket}|${langueVal}|${etatVal}`;
    const existante = agg.get(cle);
    if (existante) {
      existante.quantite += quantite;
    } else {
      agg.set(cle, {
        cardId,
        variante: bucket,
        langue: langueVal,
        etat: etatVal,
        quantite,
        dateAjout,
        serieOriginale: serie,
        numeroOriginal: numeroBrut,
        nomOriginal: nom ?? "",
      });
    }
  }

  // Repli : numéro sans zéros de tête, pour les cas où le remplissage
  // diffère entre le catalogue (TCGdex) et l'export Pokecardex.
  const idsAttendus = [...new Set([...agg.values()].map((a) => a.cardId))];
  const cartesTrouvees = await prisma.card.findMany({ where: { id: { in: idsAttendus } }, select: { id: true } });
  const idsConnus = new Set(cartesTrouvees.map((c) => c.id));

  const idsManquantsParSet = new Map<string, Set<string>>();
  for (const id of idsAttendus) {
    if (idsConnus.has(id)) continue;
    const idx = id.lastIndexOf("-");
    const set = id.slice(0, idx);
    const numero = id.slice(idx + 1);
    if (!idsManquantsParSet.has(set)) idsManquantsParSet.set(set, new Set());
    idsManquantsParSet.get(set)!.add(numero);
  }

  for (const [set] of idsManquantsParSet) {
    const cartesSet = await prisma.card.findMany({ where: { set }, select: { id: true, numero: true } });
    const parNumeroNormalise = new Map(cartesSet.map((c) => [c.numero.replace(/^0+/, "") || "0", c.id]));
    for (const a of agg.values()) {
      if (idsConnus.has(a.cardId)) continue;
      const idx = a.cardId.lastIndexOf("-");
      if (a.cardId.slice(0, idx) !== set) continue;
      const numero = a.cardId.slice(idx + 1);
      const trouve = parNumeroNormalise.get(numero.replace(/^0+/, "") || "0");
      if (trouve) a.cardId = trouve;
    }
  }

  const idsFinal = [...new Set([...agg.values()].map((a) => a.cardId))];
  const cartesFinal = await prisma.card.findMany({
    where: { id: { in: idsFinal } },
    select: { id: true, varNormal: true, varHolo: true },
  });
  const idsOk = new Set(cartesFinal.map((c) => c.id));
  const varsParId = new Map(cartesFinal.map((c) => [c.id, c]));

  // La rareté Pokecardex ne dit "holo" que pour les vieilles raretés : une
  // "Double Rare" (ex), "Illustration Rare", "HIGH-TECH rare"... en
  // "Standard" tomberait en normale alors que le catalogue ne la connaît
  // qu'en holo (et inversement). On range la copie dans la variante que la
  // carte possède réellement.
  for (const a of agg.values()) {
    const v = varsParId.get(a.cardId);
    if (!v) continue;
    if (a.variante === "n" && !v.varNormal && v.varHolo) a.variante = "h";
    else if (a.variante === "h" && !v.varHolo && v.varNormal) a.variante = "n";
  }

  const cardsNotFound: ImportResume["cardsNotFound"] = [];
  type Row = {
    cardId: string;
    variante: string;
    langue: string;
    etat: string;
    quantite: number;
    dateAjout: Date | null;
    source: string;
    userId: string;
  };
  // Re-fusionne par (cardId, variante, langue, etat) : le repli sans zéros
  // de tête ci-dessus peut faire converger deux clés distinctes vers la même
  // carte finale — la contrainte UNIQUE en base ne tolère pas les doublons.
  const rowsParCle = new Map<string, Row>();

  for (const a of agg.values()) {
    if (!idsOk.has(a.cardId)) {
      cardsNotFound.push({ serie: a.serieOriginale, numero: a.numeroOriginal, nom: a.nomOriginal });
      continue;
    }
    const cle = `${a.cardId}|${a.variante}|${a.langue}|${a.etat}`;
    const existante = rowsParCle.get(cle);
    if (existante) {
      existante.quantite += a.quantite;
      continue;
    }
    rowsParCle.set(cle, {
      cardId: a.cardId,
      variante: a.variante,
      langue: a.langue,
      etat: a.etat,
      quantite: a.quantite,
      dateAjout: a.dateAjout,
      source: "pokecardex",
      userId,
    });
  }
  const rows = [...rowsParCle.values()];

  await prisma.$transaction([
    prisma.collectionEntry.deleteMany({ where: { userId, source: "pokecardex" } }),
    prisma.collectionEntry.createMany({ data: rows }),
  ]);

  return {
    importees: rows.length,
    setsNotFound: [...setsNotFound],
    cardsNotFound: cardsNotFound.slice(0, 50),
    skippedSpecial,
  };
}

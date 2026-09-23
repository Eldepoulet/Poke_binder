import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import setsMeta from "./sets-meta.json";

const prisma = new PrismaClient();

type SourceCard = {
  id: string;
  numero: string;
  nom: string;
  rarete: string | null;
  categorie: string | null;
  illustrateur: string | null;
  hp: number | null;
  var_normal: boolean;
  var_reverse: boolean;
  var_holo: boolean;
  image_url?: string;
  image_low?: string;
  image_locale?: string; // ex: "images/sv08/001.webp"
};

const DATA_DIR = path.join(__dirname, "data");

// Insertion par lots : contre un Postgres distant, les ~22 400 upserts
// unitaires d'origine coûtaient plusieurs minutes de latence réseau.
const TAILLE_LOT = 1000;

// Sets où le reverse classique est remplacé par deux motifs spéciaux (Poké
// Ball / Master Ball), chacun tiré depuis le même emplacement "reverse" —
// TCGdex ne distingue pas ces deux motifs dans les données sources, donc on
// les dérive ici de var_reverse plutôt que de dupliquer les 3 fichiers JSON.
// À compléter si un futur set reprend le même mécanisme (151, etc.).
const SETS_REVERSE_BALLS = new Set(["sv08.5", "sv10.5b", "sv10.5w"]);

// En production les visuels de cartes sont servis depuis un CDN (les 382 Mo
// de public/cards ne sont pas déployés) ; sans CARDS_CDN_URL on retombe sur
// le chemin public local, ce qui garde le dev hors ligne fonctionnel.
function localPublicPath(set: string, imageLocale?: string): string | null {
  if (!imageLocale) return null;
  // "images/sv08/001.webp" (POC) -> "/cards/sv08/001.webp" (public/ de ce projet)
  const file = imageLocale.split("/").pop();
  if (!file) return null;
  const base = process.env.CARDS_CDN_URL?.replace(/\/$/, "") ?? "";
  return `${base}/cards/${set}/${file}`;
}

function lots<T>(items: T[], taille: number): T[][] {
  const sortie: T[][] = [];
  for (let i = 0; i < items.length; i += taille) sortie.push(items.slice(i, i + taille));
  return sortie;
}

async function seedSets() {
  console.log(`Seed : ${setsMeta.length} extensions (Set)`);
  const rows = setsMeta.map((s) => ({
    code: s.code,
    name: s.name,
    serieCode: s.serieCode,
    serieName: s.serieName,
    logo: s.logo,
    symbol: s.symbol,
    cardCount: s.cardCount,
  }));

  for (const lot of lots(rows, TAILLE_LOT)) {
    await prisma.set.createMany({ data: lot, skipDuplicates: true });
  }
}

async function seedCards() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Seed : ${files.length} fichiers de cartes (Card)`);

  const rows = [];
  for (const file of files) {
    const set = file.replace(/\.json$/, "");
    const cards: SourceCard[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

    for (const c of cards) {
      const reverseBalls = SETS_REVERSE_BALLS.has(set) && !!c.var_reverse;
      rows.push({
        id: c.id,
        set,
        numero: c.numero,
        nom: c.nom,
        rarete: c.rarete ?? null,
        categorie: c.categorie ?? null,
        illustrateur: c.illustrateur ?? null,
        hp: c.hp ?? null,
        varNormal: !!c.var_normal,
        varReverse: !!c.var_reverse,
        varHolo: !!c.var_holo,
        varReversePokeball: reverseBalls,
        varReverseMasterball: reverseBalls,
        imageLocal: localPublicPath(set, c.image_locale),
        imageUrl: c.image_url ?? null,
        imageLow: c.image_low ?? null,
      });
    }
  }

  let inseres = 0;
  for (const lot of lots(rows, TAILLE_LOT)) {
    const { count } = await prisma.card.createMany({ data: lot, skipDuplicates: true });
    inseres += count;
    console.log(`  ${inseres} / ${rows.length} cartes`);
  }
  console.log(`Total : ${rows.length} cartes (${inseres} nouvelles).`);
}

// `skipDuplicates` plutôt qu'un upsert : le catalogue est statique, et il ne
// faut SURTOUT PAS vider la table Card pour la reconstruire — CollectionEntry
// référence Card en `onDelete: Cascade`, donc un deleteMany() effacerait la
// collection de tous les utilisateurs. Conséquence assumée : relancer ce seed
// n'actualise pas les lignes existantes (changer CARDS_CDN_URL après coup
// demande un UPDATE ciblé sur imageLocal, pas un reseed).
async function main() {
  await seedSets();
  await seedCards();
  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

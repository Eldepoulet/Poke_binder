/**
 * Fusionne les sous-sets "Galerie de Dresseurs" (TGxx) / "Galerie Galaroise"
 * (GGxx) dans leur extension parente : "Tempête Argentée Galerie de
 * Dresseurs" (swsh12tg) rejoint "Tempête Argentée" (swsh12), etc.
 *
 * Pourquoi : TCGdex les publie comme des extensions à part, mais ce sont des
 * cartes tirées des mêmes boosters que le set parent — un master set de
 * Tempête Argentée doit les inclure. Les numéros TGxx/GGxx ne chevauchent
 * pas ceux du parent, on les garde tels quels (seul le code de set change :
 * swsh12tg-TG01 -> swsh12-TG01).
 *
 * Deux volets, idempotents tous les deux :
 *  - fichiers : déplace les cartes dans prisma/data/<parent>.json, supprime
 *    prisma/data/<galerie>.json et l'entrée de sets-meta.json ;
 *  - base : crée les cartes sous leur nouvel id, repointe les possessions
 *    (CollectionEntry) et les cases de classeurs, puis supprime les anciennes
 *    cartes et le Set. Le seed seul ne suffirait pas : il n'efface ni ne
 *    renomme jamais rien (cf. prisma/seed.ts).
 *
 * Usage:
 *   npx tsx prisma/scripts/fusionner-galeries.ts --dry-run   # n'écrit rien
 *   npx tsx prisma/scripts/fusionner-galeries.ts             # fichiers + base
 *   npx tsx prisma/scripts/fusionner-galeries.ts --fichiers  # fichiers seuls
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function chargerEnv() {
  const fichier = path.resolve(__dirname, "..", "..", ".env");
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, "utf-8").split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

chargerEnv();

// galerie -> extension parente
const FUSIONS: Record<string, string> = {
  swsh9tg: "swsh9", // Stars Étincelantes
  swsh10tg: "swsh10", // Astres Radieux
  swsh11tg: "swsh11", // Origine Perdue
  swsh12tg: "swsh12", // Tempête Argentée
  "swsh12.5gg": "swsh12.5", // Zénith Suprême
};

const DRY = process.argv.includes("--dry-run");
const FICHIERS_SEULS = process.argv.includes("--fichiers");

const DATA_DIR = path.join(__dirname, "..", "data");
const META = path.join(__dirname, "..", "sets-meta.json");

type CarteJson = { id: string; numero: string; [k: string]: unknown };
type SetMeta = { code: string; cardCount: number | null; [k: string]: unknown };

function nouvelId(parent: string, numero: string) {
  return `${parent}-${numero}`;
}

// Réécrit un JSON en gardant les fins de ligne (CRLF/LF) et la présence ou
// non d'un saut de ligne final du fichier d'origine — évite un diff sur
// chaque ligne.
function ecrireJson(fichier: string, valeur: unknown) {
  const origine = fs.readFileSync(fichier, "utf-8");
  const eol = origine.includes("\r\n") ? "\r\n" : "\n";
  const finale = /\r?\n$/.test(origine) ? eol : "";
  fs.writeFileSync(fichier, JSON.stringify(valeur, null, 2).replace(/\n/g, eol) + finale);
}

function fusionnerFichiers() {
  const meta: SetMeta[] = JSON.parse(fs.readFileSync(META, "utf-8"));
  let metaModifie = false;

  for (const [galerie, parent] of Object.entries(FUSIONS)) {
    const fGalerie = path.join(DATA_DIR, `${galerie}.json`);
    const fParent = path.join(DATA_DIR, `${parent}.json`);
    const cartesParent: CarteJson[] = JSON.parse(fs.readFileSync(fParent, "utf-8"));

    if (fs.existsSync(fGalerie)) {
      const cartesGalerie: CarteJson[] = JSON.parse(fs.readFileSync(fGalerie, "utf-8"));
      const idsParent = new Set(cartesParent.map((c) => c.id));
      let ajoutees = 0;
      for (const c of cartesGalerie) {
        const id = nouvelId(parent, c.numero);
        if (idsParent.has(id)) continue;
        cartesParent.push({ ...c, id });
        ajoutees++;
      }
      console.log(`[fichiers] ${galerie} -> ${parent} : ${ajoutees} cartes ajoutées (${cartesParent.length} au total)`);
      if (!DRY) {
        ecrireJson(fParent, cartesParent);
        fs.unlinkSync(fGalerie);
      }
    }

    const idx = meta.findIndex((s) => s.code === galerie);
    if (idx !== -1) {
      meta.splice(idx, 1);
      metaModifie = true;
    }
    const mParent = meta.find((s) => s.code === parent);
    if (mParent && mParent.cardCount !== cartesParent.length) {
      mParent.cardCount = cartesParent.length;
      metaModifie = true;
    }
  }

  if (metaModifie && !DRY) ecrireJson(META, meta);
}

async function fusionnerBase() {
  const prisma = new PrismaClient();
  try {
    for (const [galerie, parent] of Object.entries(FUSIONS)) {
      const anciennes = await prisma.card.findMany({ where: { set: galerie } });
      const renommage = new Map(anciennes.map((c) => [c.id, nouvelId(parent, c.numero)]));

      const entrees = await prisma.collectionEntry.count({ where: { cardId: { in: [...renommage.keys()] } } });
      const binders = await prisma.binder.findMany({
        where: { OR: [{ set: galerie }, { casesJson: { contains: `"${galerie}-` } }] },
        select: { id: true, set: true, casesJson: true },
      });
      console.log(
        `[base] ${galerie} -> ${parent} : ${anciennes.length} cartes, ${entrees} possessions, ${binders.length} classeur(s)`
      );
      if (DRY) continue;

      await prisma.$transaction(async (tx) => {
        if (anciennes.length) {
          await tx.card.createMany({
            data: anciennes.map((c) => ({ ...c, id: renommage.get(c.id)!, set: parent })),
            skipDuplicates: true,
          });
          for (const [ancien, nouveau] of renommage) {
            await tx.collectionEntry.updateMany({ where: { cardId: ancien }, data: { cardId: nouveau } });
          }
        }
        for (const b of binders) {
          // Les ids sont toujours sérialisés entre guillemets ("swsh12tg-TG01")
          // et aucun autre code de set ne commence par "<galerie>-".
          const casesJson = b.casesJson.split(`"${galerie}-`).join(`"${parent}-`);
          await tx.binder.update({
            where: { id: b.id },
            data: { casesJson, ...(b.set === galerie ? { set: parent } : {}) },
          });
        }
        // Les possessions ont été déplacées : la cascade n'efface plus rien.
        await tx.card.deleteMany({ where: { set: galerie } });
        await tx.set.deleteMany({ where: { code: galerie } });
        const total = await tx.card.count({ where: { set: parent } });
        await tx.set.update({ where: { code: parent }, data: { cardCount: total } });
      }, { timeout: 60_000 });
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (DRY) console.log("(dry-run : rien n'est écrit)");
  fusionnerFichiers();
  if (!FICHIERS_SEULS) await fusionnerBase();
  console.log("Terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

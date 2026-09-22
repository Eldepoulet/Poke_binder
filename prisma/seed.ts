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

// Sets où le reverse classique est remplacé par deux motifs spéciaux (Poké
// Ball / Master Ball), chacun tiré depuis le même emplacement "reverse" —
// TCGdex ne distingue pas ces deux motifs dans les données sources, donc on
// les dérive ici de var_reverse plutôt que de dupliquer les 3 fichiers JSON.
// À compléter si un futur set reprend le même mécanisme (151, etc.).
const SETS_REVERSE_BALLS = new Set(["sv08.5", "sv10.5b", "sv10.5w"]);

function localPublicPath(set: string, imageLocale?: string): string | null {
  if (!imageLocale) return null;
  // "images/sv08/001.webp" (POC) -> "/cards/sv08/001.webp" (public/ de ce projet)
  const file = imageLocale.split("/").pop();
  return file ? `/cards/${set}/${file}` : null;
}

async function seedSets() {
  console.log(`Seed : ${setsMeta.length} extensions (Set)`);
  for (const s of setsMeta) {
    await prisma.set.upsert({
      where: { code: s.code },
      create: {
        code: s.code,
        name: s.name,
        serieCode: s.serieCode,
        serieName: s.serieName,
        logo: s.logo,
        symbol: s.symbol,
        cardCount: s.cardCount,
      },
      update: {
        name: s.name,
        serieCode: s.serieCode,
        serieName: s.serieName,
        logo: s.logo,
        symbol: s.symbol,
        cardCount: s.cardCount,
      },
    });
  }
}

async function seedCards() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Seed : ${files.length} fichiers de cartes (Card)`);

  let total = 0;
  for (const file of files) {
    const set = file.replace(/\.json$/, "");
    const cards: SourceCard[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

    for (const c of cards) {
      const reverseBalls = SETS_REVERSE_BALLS.has(set) && !!c.var_reverse;
      await prisma.card.upsert({
        where: { id: c.id },
        create: {
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
        },
        update: {
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
        },
      });
      total++;
    }
    console.log(`  ${set} : ${cards.length} cartes`);
  }
  console.log(`Total : ${total} cartes.`);
}

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

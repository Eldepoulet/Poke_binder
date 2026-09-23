/**
 * Réécrit le préfixe de Card.imageLocal vers le CDN qui sert les visuels de
 * cartes. Nécessaire parce que le seed n'actualise jamais les lignes déjà
 * présentes (`skipDuplicates`) : après un premier seed, changer CARDS_CDN_URL
 * n'a aucun effet sans ce script.
 *
 * Idempotent : le suffixe est recalculé à partir de "/cards/", donc relancer
 * avec une autre URL remplace proprement le préfixe précédent.
 *
 * Usage: CARDS_CDN_URL="https://..." npx tsx prisma/scripts/set-cards-cdn.ts
 *        (ou en laissant CARDS_CDN_URL dans .env)
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// tsx ne charge pas .env (contrairement au CLI Prisma) : on le lit à la main
// plutôt que d'ajouter une dépendance pour ce seul script.
function chargerEnv() {
  const fichier = path.resolve(__dirname, "..", "..", ".env");
  if (!fs.existsSync(fichier)) return;
  for (const ligne of fs.readFileSync(fichier, "utf-8").split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

chargerEnv();

const prisma = new PrismaClient();

async function main() {
  const base = process.env.CARDS_CDN_URL?.replace(/\/$/, "");
  if (!base) {
    console.error("CARDS_CDN_URL manquante : renseigne l'URL publique du bucket avant de lancer ce script.");
    process.exit(1);
  }

  const total = await prisma.card.count({ where: { NOT: { imageLocal: null } } });
  const modifiees = await prisma.$executeRaw`
    UPDATE "Card"
    SET "imageLocal" = ${base} || SUBSTRING("imageLocal" FROM POSITION('/cards/' IN "imageLocal"))
    WHERE "imageLocal" IS NOT NULL
      AND POSITION('/cards/' IN "imageLocal") > 0
  `;

  const exemple = await prisma.card.findFirst({
    where: { NOT: { imageLocal: null } },
    select: { imageLocal: true },
  });

  console.log(`${modifiees} / ${total} cartes mises à jour.`);
  console.log(`Exemple : ${exemple?.imageLocal}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

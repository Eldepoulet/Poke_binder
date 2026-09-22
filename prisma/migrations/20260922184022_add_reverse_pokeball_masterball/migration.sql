-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "set" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rarete" TEXT,
    "categorie" TEXT,
    "illustrateur" TEXT,
    "hp" INTEGER,
    "varNormal" BOOLEAN NOT NULL DEFAULT false,
    "varReverse" BOOLEAN NOT NULL DEFAULT false,
    "varHolo" BOOLEAN NOT NULL DEFAULT false,
    "varReversePokeball" BOOLEAN NOT NULL DEFAULT false,
    "varReverseMasterball" BOOLEAN NOT NULL DEFAULT false,
    "imageLocal" TEXT,
    "imageUrl" TEXT,
    "imageLow" TEXT
);
INSERT INTO "new_Card" ("categorie", "hp", "id", "illustrateur", "imageLocal", "imageLow", "imageUrl", "nom", "numero", "rarete", "set", "varHolo", "varNormal", "varReverse") SELECT "categorie", "hp", "id", "illustrateur", "imageLocal", "imageLow", "imageUrl", "nom", "numero", "rarete", "set", "varHolo", "varNormal", "varReverse" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE INDEX "Card_set_numero_idx" ON "Card"("set", "numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Set" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serieCode" TEXT,
    "serieName" TEXT,
    "logo" TEXT,
    "symbol" TEXT,
    "cardCount" INTEGER
);

-- CreateTable
CREATE TABLE "Binder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT DEFAULT 'local',
    "nom" TEXT,
    "type" TEXT NOT NULL,
    "set" TEXT,
    "format" INTEGER NOT NULL DEFAULT 3,
    "casesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Binder_userId_idx" ON "Binder"("userId");

-- DataMigration: préserve le classeur existant (id "local", déjà rangé par
-- l'utilisateur) en le convertissant en classeur "master" sur sv08, avant de
-- supprimer l'ancienne table.
INSERT INTO "Binder" ("id", "userId", "nom", "type", "set", "format", "casesJson", "createdAt", "updatedAt")
SELECT "id", 'local', NULL, 'master', 'sv08', "format", "casesJson", "updatedAt", "updatedAt"
FROM "BinderState"
WHERE "id" = 'local';

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BinderState";
PRAGMA foreign_keys=on;

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

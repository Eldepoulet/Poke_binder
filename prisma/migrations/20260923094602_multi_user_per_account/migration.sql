/*
  Warnings:

  - Made the column `userId` on table `Binder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `CollectionEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Visual` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Binder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nom" TEXT,
    "type" TEXT NOT NULL,
    "set" TEXT,
    "variantes" TEXT NOT NULL DEFAULT 'normale',
    "format" INTEGER NOT NULL DEFAULT 3,
    "casesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Binder" ("casesJson", "createdAt", "format", "id", "nom", "set", "type", "updatedAt", "userId", "variantes") SELECT "casesJson", "createdAt", "format", "id", "nom", "set", "type", "updatedAt", "userId", "variantes" FROM "Binder";
DROP TABLE "Binder";
ALTER TABLE "new_Binder" RENAME TO "Binder";
CREATE INDEX "Binder_userId_idx" ON "Binder"("userId");
CREATE TABLE "new_CollectionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variante" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "langue" TEXT NOT NULL DEFAULT '',
    "etat" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "dateAjout" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CollectionEntry" ("cardId", "createdAt", "dateAjout", "etat", "id", "langue", "quantite", "source", "userId", "variante") SELECT "cardId", "createdAt", "dateAjout", "etat", "id", "langue", "quantite", "source", "userId", "variante" FROM "CollectionEntry";
DROP TABLE "CollectionEntry";
ALTER TABLE "new_CollectionEntry" RENAME TO "CollectionEntry";
CREATE INDEX "CollectionEntry_userId_idx" ON "CollectionEntry"("userId");
CREATE UNIQUE INDEX "CollectionEntry_userId_cardId_variante_langue_etat_key" ON "CollectionEntry"("userId", "cardId", "variante", "langue", "etat");
CREATE TABLE "new_Visual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Visual" ("createdAt", "id", "mimeType", "nom", "path", "userId") SELECT "createdAt", "id", "mimeType", "nom", "path", "userId" FROM "Visual";
DROP TABLE "Visual";
ALTER TABLE "new_Visual" RENAME TO "Visual";
CREATE INDEX "Visual_userId_idx" ON "Visual"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

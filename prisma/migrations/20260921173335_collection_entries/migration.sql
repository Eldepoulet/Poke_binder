-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "userId" TEXT DEFAULT 'local',
    "variante" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "langue" TEXT NOT NULL DEFAULT '',
    "etat" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "dateAjout" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CollectionEntry_userId_idx" ON "CollectionEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEntry_cardId_variante_langue_etat_key" ON "CollectionEntry"("cardId", "variante", "langue", "etat");

-- DataMigration: préserve les éventuelles lignes CardOwnership existantes
-- (booléens) en entrées CollectionEntry manuelles, une par variante cochée.
INSERT INTO "CollectionEntry" ("id", "cardId", "userId", "variante", "quantite", "langue", "etat", "source", "createdAt")
SELECT lower(hex(randomblob(16))), "cardId", "userId", 'n', 1, '', '', 'manuel', CURRENT_TIMESTAMP
FROM "CardOwnership" WHERE "varNormal" = 1;

INSERT INTO "CollectionEntry" ("id", "cardId", "userId", "variante", "quantite", "langue", "etat", "source", "createdAt")
SELECT lower(hex(randomblob(16))), "cardId", "userId", 'r', 1, '', '', 'manuel', CURRENT_TIMESTAMP
FROM "CardOwnership" WHERE "varReverse" = 1;

INSERT INTO "CollectionEntry" ("id", "cardId", "userId", "variante", "quantite", "langue", "etat", "source", "createdAt")
SELECT lower(hex(randomblob(16))), "cardId", "userId", 'h', 1, '', '', 'manuel', CURRENT_TIMESTAMP
FROM "CardOwnership" WHERE "varHolo" = 1;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CardOwnership";
PRAGMA foreign_keys=on;

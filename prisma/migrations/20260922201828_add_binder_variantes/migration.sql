-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Binder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT DEFAULT 'local',
    "nom" TEXT,
    "type" TEXT NOT NULL,
    "set" TEXT,
    "variantes" TEXT NOT NULL DEFAULT 'normale',
    "format" INTEGER NOT NULL DEFAULT 3,
    "casesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Binder" ("casesJson", "createdAt", "format", "id", "nom", "set", "type", "updatedAt", "userId") SELECT "casesJson", "createdAt", "format", "id", "nom", "set", "type", "updatedAt", "userId" FROM "Binder";
DROP TABLE "Binder";
ALTER TABLE "new_Binder" RENAME TO "Binder";
CREATE INDEX "Binder_userId_idx" ON "Binder"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

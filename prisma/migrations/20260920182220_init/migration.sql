-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "set" TEXT NOT NULL DEFAULT 'sv08',
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

-- CreateTable
CREATE TABLE "CardOwnership" (
    "cardId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT DEFAULT 'local',
    "varNormal" BOOLEAN NOT NULL DEFAULT false,
    "varReverse" BOOLEAN NOT NULL DEFAULT false,
    "varHolo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CardOwnership_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT DEFAULT 'local',
    "nom" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BinderState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'local',
    "format" INTEGER NOT NULL DEFAULT 3,
    "casesJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Card_set_idx" ON "Card"("set");

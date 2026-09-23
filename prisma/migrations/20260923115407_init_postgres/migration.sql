-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
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
    "imageLow" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serieCode" TEXT,
    "serieName" TEXT,
    "logo" TEXT,
    "symbol" TEXT,
    "cardCount" INTEGER,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variante" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "langue" TEXT NOT NULL DEFAULT '',
    "etat" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "dateAjout" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visual" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Binder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT,
    "type" TEXT NOT NULL,
    "set" TEXT,
    "variantes" TEXT NOT NULL DEFAULT 'normale',
    "format" INTEGER NOT NULL DEFAULT 3,
    "casesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Binder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_set_numero_idx" ON "Card"("set", "numero");

-- CreateIndex
CREATE INDEX "CollectionEntry_userId_idx" ON "CollectionEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEntry_userId_cardId_variante_langue_etat_key" ON "CollectionEntry"("userId", "cardId", "variante", "langue", "etat");

-- CreateIndex
CREATE INDEX "Visual_userId_idx" ON "Visual"("userId");

-- CreateIndex
CREATE INDEX "Binder_userId_idx" ON "Binder"("userId");

-- AddForeignKey
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

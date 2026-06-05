-- CreateTable
CREATE TABLE "Disposable" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "puffs" TEXT NOT NULL,
    "flavour" TEXT NOT NULL,
    "imageUrl" TEXT,
    "pricesAed" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disposable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disposable_brand_puffs_flavour_key" ON "Disposable"("brand", "puffs", "flavour");

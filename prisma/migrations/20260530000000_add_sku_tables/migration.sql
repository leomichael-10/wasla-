-- CreateTable
CREATE TABLE "Vape" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "priceVapeCenter" DECIMAL(65,30),
    "priceVgod" DECIMAL(65,30),
    "priceEnergyVape" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sparepart" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "device" TEXT,
    "sparepart" TEXT NOT NULL,
    "variant" TEXT,
    "priceVapeCenter" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sparepart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokha" (
    "id" SERIAL NOT NULL,
    "supplier" TEXT,
    "variant" TEXT NOT NULL,
    "costPerKg" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cigarette" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cigarette_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vape_brand_product_key" ON "Vape"("brand", "product");

-- CreateIndex
CREATE UNIQUE INDEX "Sparepart_brand_sparepart_variant_key" ON "Sparepart"("brand", "sparepart", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "Dokha_variant_key" ON "Dokha"("variant");

-- CreateIndex
CREATE UNIQUE INDEX "Cigarette_name_key" ON "Cigarette"("name");

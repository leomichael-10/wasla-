-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "area" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "zoneId" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressApartment" TEXT,
ADD COLUMN     "addressArea" TEXT,
ADD COLUMN     "addressBuilding" TEXT,
ADD COLUMN     "addressContactPhone" TEXT,
ADD COLUMN     "addressFloor" TEXT,
ADD COLUMN     "addressLabel" TEXT,
ADD COLUMN     "addressLandmark" TEXT;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

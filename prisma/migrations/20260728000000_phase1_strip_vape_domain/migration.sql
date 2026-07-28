-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "flavor",
DROP COLUMN "nicotineLevel",
DROP COLUMN "puffCount",
DROP COLUMN "resistanceOhm",
DROP COLUMN "sizeMl",
ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ageVerified";

-- DropTable
DROP TABLE "Cigarette";

-- DropTable
DROP TABLE "Disposable";

-- DropTable
DROP TABLE "Dokha";

-- DropTable
DROP TABLE "Sparepart";

-- DropTable
DROP TABLE "Vape";


-- CreateEnum
CREATE TYPE "POItemStatus" AS ENUM ('PENDING', 'PURCHASED', 'IN_WAREHOUSE');

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "status" "POItemStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "notes" TEXT;

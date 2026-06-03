-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "basePrice" DECIMAL(10,2),
ADD COLUMN     "competitorsPrice" DECIMAL(10,2),
ADD COLUMN     "globalPrice" DECIMAL(10,2);

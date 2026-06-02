-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isManualOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderNumber" SERIAL NOT NULL,
ADD COLUMN     "totalCosts" DECIMAL(10,2),
ADD COLUMN     "totalProfit" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "costs" DECIMAL(10,2),
ADD COLUMN     "discount" DECIMAL(10,2),
ADD COLUMN     "profit" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

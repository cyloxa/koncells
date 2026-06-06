-- DropIndex
DROP INDEX IF EXISTS "PreOrderItem_orderItemId_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PreOrderItem_orderItemId_purchaseOrderItemId_key" ON "PreOrderItem"("orderItemId", "purchaseOrderItemId");

-- Drop old WarehouseStock table
DROP TABLE IF EXISTS "WarehouseStock";

-- CreateEnum (if not already exists - POItemStatus already has IN_WAREHOUSE)
-- CreateTable
CREATE TABLE "WarehouseInventoryItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'IN_WAREHOUSE',
    "shipmentId" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseInventoryItem_purchaseOrderId_idx" ON "WarehouseInventoryItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "WarehouseInventoryItem_productId_idx" ON "WarehouseInventoryItem"("productId");

-- CreateIndex
CREATE INDEX "WarehouseInventoryItem_shipmentId_idx" ON "WarehouseInventoryItem"("shipmentId");

-- CreateIndex
CREATE INDEX "WarehouseInventoryItem_status_idx" ON "WarehouseInventoryItem"("status");

-- Backfill from existing IN_WAREHOUSE PO items
INSERT INTO "WarehouseInventoryItem" ("id", "purchaseOrderId", "productId", "productName", "quantity", "weight", "status", "lastUpdated", "createdAt")
SELECT gen_random_uuid()::text, poi."purchaseOrderId", poi."productId", poi."productName", poi.quantity, NULL, 'IN_WAREHOUSE', NOW(), NOW()
FROM "PurchaseOrderItem" poi
WHERE poi.status = 'IN_WAREHOUSE';

-- AddForeignKey
ALTER TABLE "WarehouseInventoryItem" ADD CONSTRAINT "WarehouseInventoryItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInventoryItem" ADD CONSTRAINT "WarehouseInventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInventoryItem" ADD CONSTRAINT "WarehouseInventoryItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "WarehouseShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

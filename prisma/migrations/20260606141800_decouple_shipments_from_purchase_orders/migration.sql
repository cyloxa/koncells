-- Shipments are logistics containers; PO provenance stays on warehouse inventory rows.
DROP INDEX IF EXISTS "WarehouseShipment_purchaseOrderId_idx";

ALTER TABLE "WarehouseShipment"
  DROP CONSTRAINT IF EXISTS "WarehouseShipment_purchaseOrderId_fkey";

ALTER TABLE "WarehouseShipment"
  DROP COLUMN IF EXISTS "purchaseOrderId";

-- Purchase order lifecycle is tracked per item through PurchaseOrderItem.status.
DROP INDEX IF EXISTS "PurchaseOrder_status_idx";

ALTER TABLE "PurchaseOrder" DROP COLUMN IF EXISTS "status";

ALTER TABLE "PurchaseOrder" DROP COLUMN IF EXISTS "orderedAt";

ALTER TABLE "PurchaseOrder" DROP COLUMN IF EXISTS "receivedAt";

DROP TYPE IF EXISTS "PurchaseOrderStatus";

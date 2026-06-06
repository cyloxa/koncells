-- Shipment lifecycle no longer has a separate PACKED state.
UPDATE "WarehouseShipment"
SET "status" = 'IN_TRANSIT',
    "shippedAt" = COALESCE("shippedAt", "packedAt")
WHERE "status" = 'PACKED';

ALTER TABLE "WarehouseShipment" DROP COLUMN IF EXISTS "packedAt";

ALTER TYPE "ShipmentStatus" RENAME TO "ShipmentStatus_old";

CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING_PACKING', 'IN_TRANSIT', 'DELIVERED');

ALTER TABLE "WarehouseShipment"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ShipmentStatus" USING "status"::text::"ShipmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING_PACKING';

DROP TYPE "ShipmentStatus_old";

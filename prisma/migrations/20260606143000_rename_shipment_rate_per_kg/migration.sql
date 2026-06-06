-- Shipments are charged by a custom LKR rate per kg.
ALTER TABLE "WarehouseShipment"
  RENAME COLUMN "baseShippingCost" TO "shippingRatePerKg";

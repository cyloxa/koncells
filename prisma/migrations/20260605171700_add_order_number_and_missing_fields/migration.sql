-- Add missing columns to Order table

ALTER TABLE "Order" ADD COLUMN     "orderNumber" SERIAL NOT NULL;
ALTER TABLE "Order" ADD COLUMN     "totalCosts" DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN     "totalProfit" DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN     "isManualOrder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN     "notes" TEXT;

CREATE INDEX "Order_orderNumber_idx" ON "Order" ("orderNumber");

-- Add missing columns to Product table

ALTER TABLE "Product" ADD COLUMN     "condition" TEXT DEFAULT 'New';
ALTER TABLE "Product" ADD COLUMN     "showPrice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN     "metaTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN     "metaDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN     "ogImage" TEXT;
ALTER TABLE "Product" ADD COLUMN     "focusKeyphrase" TEXT;

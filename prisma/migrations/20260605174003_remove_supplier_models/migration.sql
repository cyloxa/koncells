-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_productId_fkey";

-- DropForeignKey
ALTER TABLE "SupplierProduct" DROP CONSTRAINT "SupplierProduct_supplierId_fkey";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "supplierId";

-- DropTable
DROP TABLE "Supplier";

-- DropTable
DROP TABLE "SupplierProduct";

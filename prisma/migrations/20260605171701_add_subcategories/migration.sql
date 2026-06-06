-- Add parentId to Category for subcategory support (2-level hierarchy)

ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

CREATE INDEX "Category_parentId_idx" ON "Category" ("parentId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

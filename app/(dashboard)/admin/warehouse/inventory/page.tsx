import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseStock } from "@/actions/warehouse.actions";
import { WarehouseInventoryTable } from "./WarehouseInventoryTable";

export default async function WarehouseInventoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const stock = await getWarehouseStock();

  return (
    <div className="p-6">
      <WarehouseInventoryTable initialStock={stock as any} />
    </div>
  );
}

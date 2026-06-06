import Link from "next/link";

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6">
          <nav className="flex gap-6 -mb-px">
            <Link
              href="/admin/warehouse"
              className="inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Shipments
            </Link>
            <Link
              href="/admin/warehouse/inventory"
              className="inline-flex items-center px-1 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Inventory
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}

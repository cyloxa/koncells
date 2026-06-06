"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Trash2, Loader2 } from "lucide-react";
import { deleteWarehouseShipments } from "@/actions/warehouse.actions";

interface ShipmentRow {
  id: string;
  name: string | null;
  shipmentNumber: number;
  status: string;
  totalWeight: number | null;
  shippingRatePerKg: number | null;
  extraCost: number | null;
  totalShippingCost: number | null;
  notes: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  inventoryItemCount: number;
}

interface WarehouseShipmentsTableProps {
  initialShipments: ShipmentRow[];
}

const statusColors: Record<string, string> = {
  PENDING_PACKING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  PENDING_PACKING: "Pending Packing",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
};

export function WarehouseShipmentsTable({
  initialShipments,
}: WarehouseShipmentsTableProps) {
  const router = useRouter();
  const [shipments, setShipments] = useState(initialShipments);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === shipments.length) return new Set();
      return new Set(shipments.map((s) => s.id));
    });
  }, [shipments]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} shipment${selectedIds.size !== 1 ? "s" : ""}? This will unlink inventory items from them.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteWarehouseShipments(Array.from(selectedIds));
    setIsDeleting(false);

    if (result.success) {
      setShipments((prev) =>
        prev.filter((s) => !selectedIds.has(s.id))
      );
      setSelectedIds(new Set());
      router.refresh();
    } else {
      alert(result.error);
    }
  }, [selectedIds, router]);

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  const getShipmentLabel = (s: ShipmentRow) => {
    const num = `SHIP-${String(s.shipmentNumber).padStart(4, "0")}`;
    return s.name ? `${num} — ${s.name}` : num;
  };

  const allSelected = shipments.length > 0 && selectedIds.size === shipments.length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Warehouse Shipments
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            Delete {selectedIds.size} shipment{selectedIds.size !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Shipment
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Inv. Items
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Total Weight
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Shipping Cost
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(shipment.id) ? "bg-brand/5" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(shipment.id)}
                      onChange={() => toggleSelect(shipment.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/shipments/${shipment.id}`}
                      className="font-medium text-gray-900 hover:text-brand transition-colors"
                    >
                      {getShipmentLabel(shipment)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[shipment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[shipment.status] ?? shipment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-gray-900 font-medium">
                      <Package size={13} className="text-gray-400" />
                      {shipment.inventoryItemCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {shipment.totalWeight !== null
                      ? `${shipment.totalWeight.toFixed(2)} kg`
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {shipment.totalShippingCost
                      ? fmtLkr(shipment.totalShippingCost)
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No shipments yet. Create a shipment from warehouse inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

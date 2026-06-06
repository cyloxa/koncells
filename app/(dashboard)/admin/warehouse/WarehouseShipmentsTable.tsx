"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Package } from "lucide-react";

interface ShipmentRow {
  id: string;
  shipmentNumber: number;
  status: string;
  totalWeight: number | null;
  baseShippingCost: number | null;
  extraCost: number | null;
  totalShippingCost: number | null;
  notes: string | null;
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder: {
    poNumber: number;
    supplierName: string | null;
  };
  packages: {
    id: string;
    weight: number | null;
  }[];
}

interface WarehouseShipmentsTableProps {
  initialShipments: ShipmentRow[];
}

const statusColors: Record<string, string> = {
  PENDING_PACKING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export function WarehouseShipmentsTable({
  initialShipments,
}: WarehouseShipmentsTableProps) {
  const router = useRouter();
  const [shipments] = useState(initialShipments);

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Shipments</h1>
          <p className="text-gray-600 text-sm mt-1">
            {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Shipment #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">PO #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Supplier</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Packages</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total Weight</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Shipping Cost</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-medium text-gray-900">
                      #{shipment.shipmentNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/purchase-orders/`}
                      className="font-mono text-xs text-brand hover:text-brand/80"
                    >
                      PO-{String(shipment.purchaseOrder.poNumber).padStart(4, "0")}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {shipment.purchaseOrder.supplierName ?? "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[shipment.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {shipment.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {shipment.packages.length}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {shipment.totalWeight
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
                    })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/admin/warehouse/${shipment.id}`}
                      className="inline-flex items-center text-brand hover:text-brand/80"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No shipments yet. Shipments are created from purchase orders.
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

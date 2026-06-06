"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface WarehouseInventoryItemDisplay {
  id: string;
  productName: string;
  productId: string;
  quantity: number;
  weight: number | null;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    weight: number | null;
    images: { url: string; alt: string | null; position: number }[];
  } | null;
}

interface PackageItem {
  id: string;
  quantity: number;
  purchaseOrderItem: {
    productName: string;
    productSku: string;
  };
}

interface WarehousePackage {
  id: string;
  weight: number;
  notes: string | null;
  createdAt: Date;
  items: PackageItem[];
}

interface Shipment {
  id: string;
  name: string | null;
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
  purchaseOrder: {
    id: string;
    poNumber: number;
    supplierName: string | null;
    status: string;
  };
  inventoryItems: WarehouseInventoryItemDisplay[];
  packages: WarehousePackage[];
}

interface WarehouseDetailClientProps {
  shipment: Shipment;
}

const statusColors: Record<string, string> = {
  PENDING_PACKING: "bg-yellow-100 text-yellow-800",
  PACKED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING_PACKING: <Package className="h-4 w-4" />,
  PACKED: <Package className="h-4 w-4" />,
  IN_TRANSIT: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle className="h-4 w-4" />,
};

export function WarehouseDetailClient({
  shipment: initialShipment,
}: WarehouseDetailClientProps) {
  const router = useRouter();
  const [shipment, setShipment] = useState(initialShipment);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setIsUpdatingStatus(true);
      try {
        const { updateShipmentStatus } = await import(
          "@/actions/warehouse.actions"
        );
        const result = await updateShipmentStatus({
          warehouseShipmentId: shipment.id,
          status: newStatus as any,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
        setShipment((prev) => ({ ...prev, status: newStatus }));
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [shipment.id, router]
  );

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  const getNextStatus = (): string | null => {
    const transitions: Record<string, string> = {
      PENDING_PACKING: "PACKED",
      PACKED: "IN_TRANSIT",
      IN_TRANSIT: "DELIVERED",
    };
    return transitions[shipment.status] ?? null;
  };

  const nextStatus = getNextStatus();
  const isTerminal = shipment.status === "DELIVERED";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/shipments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Shipments
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {shipment.name
                ? shipment.name
                : `Shipment #${shipment.shipmentNumber}`}
            </h1>
            {shipment.name && (
              <p className="text-sm text-gray-500 mt-0.5">
                Shipment #{shipment.shipmentNumber}
              </p>
            )}
            <p className="text-gray-600 text-sm mt-1">
              From{" "}
              <Link
                href={`/admin/purchase-orders/${shipment.purchaseOrder.id}`}
                className="text-brand hover:text-brand/80"
              >
                PO-
                {String(shipment.purchaseOrder.poNumber).padStart(4, "0")}
              </Link>{" "}
              ({shipment.purchaseOrder.supplierName ?? "N/A"})
              &middot; Created{" "}
              {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[shipment.status] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {statusIcons[shipment.status]}
              {shipment.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Status Action */}
      {nextStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Actions:
            </span>
            <button
              onClick={() => handleStatusChange(nextStatus)}
              disabled={isUpdatingStatus}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isUpdatingStatus && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              Mark as {nextStatus.replace(/_/g, " ")}
            </button>
          </div>
        </div>
      )}

      {isTerminal && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-800">
            This shipment has been delivered. Stock has been updated and any
            linked pre-orders have been fulfilled.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Items</h2>
          <p className="text-3xl font-bold text-gray-900">
            {shipment.inventoryItems.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Packages
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {shipment.packages.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Total Weight
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {shipment.totalWeight
              ? `${shipment.totalWeight.toFixed(2)} kg`
              : "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Shipping Cost
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {shipment.totalShippingCost
              ? fmtLkr(shipment.totalShippingCost)
              : "-"}
          </p>
        </div>
      </div>

      {/* Inventory Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Inventory Items
          </h2>
        </div>
        {shipment.inventoryItems.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No inventory items assigned to this shipment. Assign items from
            the{" "}
            <Link
              href="/admin/warehouse/inventory"
              className="text-brand hover:text-brand/80"
            >
              Inventory page
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-2 px-4 font-medium text-gray-500">
                    Product
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Qty
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Weight
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    PO
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipment.inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {item.product?.images[0] && (
                          <img
                            src={item.product.images[0].url}
                            alt={item.productName}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-4 text-right text-gray-500">
                      {item.weight ? `${item.weight.toFixed(2)} kg` : "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Link
                        href={`/admin/purchase-orders/${shipment.purchaseOrder.id}`}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80 text-xs"
                      >
                        PO-
                        {String(shipment.purchaseOrder.poNumber).padStart(
                          4,
                          "0"
                        )}
                        <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Packages Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Packages</h2>
        </div>
        {shipment.packages.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No packages added yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shipment.packages.map((pkg, idx) => (
              <div key={pkg.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    Package #{idx + 1}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {pkg.weight.toFixed(2)} kg
                  </span>
                </div>
                {pkg.notes && (
                  <p className="text-xs text-gray-500 mb-2">{pkg.notes}</p>
                )}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1 font-medium text-gray-500">
                        Product
                      </th>
                      <th className="text-right py-1 font-medium text-gray-500">
                        SKU
                      </th>
                      <th className="text-right py-1 font-medium text-gray-500">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1 text-gray-900">
                          {item.purchaseOrderItem.productName}
                        </td>
                        <td className="py-1 text-right text-gray-500 font-mono">
                          {item.purchaseOrderItem.productSku}
                        </td>
                        <td className="py-1 text-right text-gray-900">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

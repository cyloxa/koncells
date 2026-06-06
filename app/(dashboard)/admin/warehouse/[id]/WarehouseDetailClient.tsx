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
  Trash2,
  ExternalLink,
} from "lucide-react";

interface WarehouseInventoryItemDisplay {
  id: string;
  productName: string;
  productId: string;
  purchaseOrderId: string;
  purchaseOrder: {
    id: string;
    poNumber: number;
    supplierName: string | null;
  };
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

interface Shipment {
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
  inventoryItems: WarehouseInventoryItemDisplay[];
}

interface WarehouseDetailClientProps {
  shipment: Shipment;
}

const statusColors: Record<string, string> = {
  PENDING_PACKING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING_PACKING: <Package className="h-4 w-4" />,
  IN_TRANSIT: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle className="h-4 w-4" />,
};

export function WarehouseDetailClient({
  shipment: initialShipment,
}: WarehouseDetailClientProps) {
  const router = useRouter();
  const [shipment, setShipment] = useState(initialShipment);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<string>>(new Set());
  const [removeQuantities, setRemoveQuantities] = useState<Record<string, number>>({});
  const [isRemovingInventory, setIsRemovingInventory] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState({
    shippingRatePerKg: initialShipment.shippingRatePerKg ?? 0,
    extraCost: initialShipment.extraCost ?? 0,
    notes: initialShipment.notes ?? "",
  });

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

  const toggleInventorySelection = useCallback((item: WarehouseInventoryItemDisplay) => {
    setSelectedInventoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
        setRemoveQuantities((current) => ({
          ...current,
          [item.id]: current[item.id] ?? item.quantity,
        }));
      }
      return next;
    });
  }, []);

  const handleRemoveInventory = useCallback(async () => {
    const selectedItems = shipment.inventoryItems.filter((item) =>
      selectedInventoryIds.has(item.id)
    );
    if (selectedItems.length === 0) return;

    const confirmed = window.confirm(
      `Remove ${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""} from this shipment and return the selected quantities to warehouse?`
    );
    if (!confirmed) return;

    setIsRemovingInventory(true);
    try {
      const { removeInventoryItemsFromShipment } = await import(
        "@/actions/warehouse.actions"
      );
      const result = await removeInventoryItemsFromShipment({
        warehouseShipmentId: shipment.id,
        items: selectedItems.map((item) => ({
          inventoryItemId: item.id,
          quantity: Math.min(removeQuantities[item.id] ?? item.quantity, item.quantity),
        })),
      });

      if (!result.success) throw new Error(result.error);

      setShipment((prev) => ({
        ...prev,
        inventoryItems: prev.inventoryItems.flatMap((item) => {
          if (!selectedInventoryIds.has(item.id)) return [item];
          const removedQuantity = Math.min(
            removeQuantities[item.id] ?? item.quantity,
            item.quantity
          );
          if (removedQuantity >= item.quantity) return [];
          return [{ ...item, quantity: item.quantity - removedQuantity }];
        }),
      }));
      setSelectedInventoryIds(new Set());
      setRemoveQuantities({});
      toast.success("Inventory returned to warehouse");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove inventory");
    } finally {
      setIsRemovingInventory(false);
    }
  }, [removeQuantities, router, selectedInventoryIds, shipment.id, shipment.inventoryItems]);

  const handleSaveShipmentDetails = useCallback(async () => {
    setIsSavingDetails(true);
    try {
      const { updateShipmentCosts } = await import("@/actions/warehouse.actions");
      const result = await updateShipmentCosts({
        warehouseShipmentId: shipment.id,
        shippingRatePerKg: shipmentDetails.shippingRatePerKg,
        extraCost: shipmentDetails.extraCost,
        notes: shipmentDetails.notes,
      });

      if (!result.success) throw new Error(result.error);

      const totalWeight = shipment.inventoryItems.reduce(
        (sum, item) => sum + (item.weight ?? 0) * item.quantity,
        0
      );
      setShipment((prev) => ({
        ...prev,
        shippingRatePerKg: shipmentDetails.shippingRatePerKg,
        extraCost: shipmentDetails.extraCost,
        notes: shipmentDetails.notes,
        totalWeight,
        totalShippingCost: totalWeight * shipmentDetails.shippingRatePerKg + shipmentDetails.extraCost,
      }));
      toast.success("Shipment details saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save shipment details");
    } finally {
      setIsSavingDetails(false);
    }
  }, [router, shipment.id, shipment.inventoryItems, shipmentDetails]);

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  const getNextStatus = (): string | null => {
    const transitions: Record<string, string> = {
      PENDING_PACKING: "IN_TRANSIT",
      IN_TRANSIT: "DELIVERED",
    };
    return transitions[shipment.status] ?? null;
  };

  const getPreviousStatus = (): string | null => {
    const transitions: Record<string, string> = {
      IN_TRANSIT: "PENDING_PACKING",
      DELIVERED: "IN_TRANSIT",
    };
    return transitions[shipment.status] ?? null;
  };

  const nextStatus = getNextStatus();
  const previousStatus = getPreviousStatus();
  const isTerminal = shipment.status === "DELIVERED";
  const canEditInventory = shipment.status === "PENDING_PACKING";
  const allInventorySelected =
    canEditInventory &&
    shipment.inventoryItems.length > 0 &&
    shipment.inventoryItems.every((item) => selectedInventoryIds.has(item.id));
  const totalInventoryQuantity = shipment.inventoryItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalShipmentWeight = shipment.inventoryItems.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );
  const calculatedShippingCost =
    totalShipmentWeight * shipmentDetails.shippingRatePerKg + shipmentDetails.extraCost;
  const getShippingCostPerItem = (item: WarehouseInventoryItemDisplay) => {
    if (!item.weight || totalShipmentWeight <= 0 || calculatedShippingCost <= 0) return null;
    return (calculatedShippingCost * item.weight) / totalShipmentWeight;
  };
  const toggleAllInventorySelection = () => {
    if (allInventorySelected) {
      setSelectedInventoryIds(new Set());
      setRemoveQuantities({});
      return;
    }

    setSelectedInventoryIds(new Set(shipment.inventoryItems.map((item) => item.id)));
    setRemoveQuantities(
      Object.fromEntries(shipment.inventoryItems.map((item) => [item.id, item.quantity]))
    );
  };

  return (
    <div className="p-6">
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
              Created{" "}
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

      {/* Status Actions */}
      {(nextStatus || previousStatus) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Actions:
            </span>
            {previousStatus && (
              <button
                onClick={() => handleStatusChange(previousStatus)}
                disabled={isUpdatingStatus}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {isUpdatingStatus && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                Undo to {previousStatus.replace(/_/g, " ")}
              </button>
            )}
            {nextStatus && (
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
            )}
          </div>
          {shipment.status === "DELIVERED" && previousStatus && (
            <p className="text-xs text-amber-700 mt-2">
              Undoing delivery will return the shipment inventory to in-transit state and subtract those quantities from product stock.
            </p>
          )}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Inventory Qty</h2>
          <p className="text-3xl font-bold text-gray-900">
            {totalInventoryQuantity}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Total Weight
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {totalShipmentWeight.toFixed(2)} kg
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Rate / KG
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {shipmentDetails.shippingRatePerKg > 0
              ? fmtLkr(shipmentDetails.shippingRatePerKg)
              : "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Shipping Cost
          </h2>
          <p className="text-3xl font-bold text-gray-900">
            {calculatedShippingCost > 0
              ? fmtLkr(calculatedShippingCost)
              : "-"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
            <p className="text-sm text-gray-500">
              Set the LKR rate per kg, additional costs, and shipment notes.
            </p>
          </div>
          <button
            onClick={handleSaveShipmentDetails}
            disabled={isSavingDetails}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isSavingDetails && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Details
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Shipping Rate / KG (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipmentDetails.shippingRatePerKg}
              onChange={(e) =>
                setShipmentDetails((prev) => ({
                  ...prev,
                  shippingRatePerKg: Number(e.target.value) || 0,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional Costs (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipmentDetails.extraCost}
              onChange={(e) =>
                setShipmentDetails((prev) => ({
                  ...prev,
                  extraCost: Number(e.target.value) || 0,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Calculated Total
            </label>
            <div className="border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-medium text-gray-900">
              {fmtLkr(calculatedShippingCost)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes
          </label>
          <textarea
            value={shipmentDetails.notes}
            onChange={(e) =>
              setShipmentDetails((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={3}
            placeholder="Add shipment notes, payment details, carrier info, or handling instructions..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>
      </div>

      {/* Inventory Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory Items
            </h2>
            {canEditInventory && (
              <p className="text-xs text-gray-500 mt-0.5">
                Select assigned items and quantity to return them to warehouse.
              </p>
            )}
          </div>
          {canEditInventory && selectedInventoryIds.size > 0 && (
            <button
              onClick={handleRemoveInventory}
              disabled={isRemovingInventory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {isRemovingInventory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove to warehouse ({selectedInventoryIds.size})
            </button>
          )}
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
                  {canEditInventory && (
                    <th className="py-2 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allInventorySelected}
                        onChange={toggleAllInventorySelection}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                    </th>
                  )}
                  <th className="text-left py-2 px-4 font-medium text-gray-500">
                    Product
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Qty
                  </th>
                  {canEditInventory && (
                    <th className="text-right py-2 px-4 font-medium text-gray-500">
                      Remove Qty
                    </th>
                  )}
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Weight
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    Shipping / Item
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-gray-500">
                    PO
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipment.inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {canEditInventory && (
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          checked={selectedInventoryIds.has(item.id)}
                          onChange={() => toggleInventorySelection(item)}
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                      </td>
                    )}
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
                    {canEditInventory && (
                      <td className="py-2 px-4 text-right">
                        {selectedInventoryIds.has(item.id) ? (
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={removeQuantities[item.id] ?? item.quantity}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setRemoveQuantities((prev) => ({
                                ...prev,
                                [item.id]: Number.isFinite(value)
                                  ? Math.min(Math.max(1, Math.trunc(value)), item.quantity)
                                  : 1,
                              }));
                            }}
                            className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 px-4 text-right text-gray-500">
                      {item.weight ? `${item.weight.toFixed(2)} kg` : "-"}
                    </td>
                    <td className="py-2 px-4 text-right text-gray-900">
                      {getShippingCostPerItem(item) !== null
                        ? fmtLkr(getShippingCostPerItem(item)!)
                        : "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Link
                        href={`/admin/purchase-orders/${item.purchaseOrder.id}`}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80 text-xs"
                      >
                        PO-
                        {String(item.purchaseOrder.poNumber).padStart(
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

    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { updateInventoryItem } from "@/actions/purchase-order.actions";
import { createWarehouseShipment } from "@/actions/warehouse.actions";
import { Package, ExternalLink, Truck, X } from "lucide-react";

interface ProductInfo {
  id: string;
  name: string;
  slug: string;
  weight: number | null;
  price: number;
  stock: number;
  reservedStock: number;
  images: { url: string; alt: string | null; position: number }[];
}

interface ShipmentOption {
  id: string;
  name: string | null;
  shipmentNumber: number;
  status: string;
}

interface InventoryItem {
  id: string;
  purchaseOrderId: string;
  purchaseOrderNumber: number;
  productId: string;
  productName: string;
  quantity: number;
  weight: number | null;
  status: string;
  shipmentId: string | null;
  shipmentNumber: number | null;
  shipmentStatus: string | null;
  lastUpdated: Date;
  createdAt: Date;
  product: ProductInfo | null;
}

interface WarehouseInventoryTableProps {
  initialItems: InventoryItem[];
  shipments: ShipmentOption[];
}

const shipmentStatusLabels: Record<string, string> = {
  PENDING_PACKING: "Pending Packing",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
};

export function WarehouseInventoryTable({
  initialItems,
  shipments,
}: WarehouseInventoryTableProps) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Shipment assignment modal state
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    itemId: string;
    currentShipmentId: string | null;
    selectedShipmentId: string | null;
    assignQuantity: number;
  }>({
    open: false,
    itemId: "",
    currentShipmentId: null,
    selectedShipmentId: null,
    assignQuantity: 1,
  });

  // Create shipment modal state
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    name: string;
    saving: boolean;
  }>({ open: false, name: "", saving: false });

  const handleAssignShipment = useCallback(
    async (itemId: string, shipmentId: string | null, assignQuantity?: number) => {
      setSavingIds((prev) => new Set(prev).add(itemId));
      const result = await updateInventoryItem(itemId, {
        shipmentId,
        ...(shipmentId ? { assignQuantity } : {}),
      });
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      if (result.success) {
        window.location.reload();
        return;
      } else {
        alert(result.error);
      }
      setAssignModal({
        open: false,
        itemId: "",
        currentShipmentId: null,
        selectedShipmentId: null,
        assignQuantity: 1,
      });
    },
    []
  );

  const handleCreateShipment = useCallback(async () => {
    setCreateModal((prev) => ({ ...prev, saving: true }));
    const result = await createWarehouseShipment(createModal.name || null);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error);
      setCreateModal((prev) => ({ ...prev, saving: false }));
    }
  }, [createModal.name]);

  const handleWeightChange = useCallback(
    async (itemId: string, weight: number | null) => {
      setSavingIds((prev) => new Set(prev).add(itemId));
      await updateInventoryItem(itemId, { weight });
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    []
  );

  const pendingShipments = shipments.filter(
    (s) => s.status === "PENDING_PACKING"
  );
  const assignItem = items.find((item) => item.id === assignModal.itemId);
  const assignQuantityMax = assignItem?.quantity ?? 1;
  const availableShipments = pendingShipments;

  const getShipmentLabel = (s: ShipmentOption) => {
    const num = `SHIP-${String(s.shipmentNumber).padStart(4, "0")}`;
    return s.name ? `${num} — ${s.name}` : num;
  };
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Warehouse Inventory
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} in warehouse
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalWeight.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            kg
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Product
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Qty
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Weight / Item
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Shipment
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Purchase Order
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const assignedShipment = item.shipmentId
                  ? shipments.find((s) => s.id === item.shipmentId)
                  : null;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.product?.images[0] && (
                          <img
                            src={item.product.images[0].url}
                            alt={item.productName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <Link
                            href={`/admin/products/${item.productId}`}
                            className="font-medium text-gray-900 hover:text-brand transition-colors"
                          >
                            {item.productName}
                          </Link>
                          {item.product?.slug && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Stock: <span className={item.product.stock > 0 ? "text-green-600" : "text-red-600"}>{item.product.stock}</span>
                              {item.product.reservedStock > 0 && (
                                <span className="text-amber-600 ml-1">| Reserved: {item.product.reservedStock}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {item.quantity}
                      </span>
                    </td>

                    {/* Weight per item */}
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.weight ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          const num = val ? parseFloat(val) : null;
                          if (
                            num !== item.weight &&
                            (num === null || !isNaN(num))
                          ) {
                            handleWeightChange(item.id, num);
                          }
                        }}
                        className={`w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand ${
                          savingIds.has(item.id) ? "opacity-50" : ""
                        }`}
                      />
                      {item.weight !== null && (
                        <span className="text-gray-400 text-xs ml-1">
                          kg
                        </span>
                      )}
                    </td>

                    {/* Shipment */}
                    <td className="py-3 px-4">
                      {item.shipmentId ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand">
                            <Truck size={12} />
                            {assignedShipment
                              ? getShipmentLabel(assignedShipment)
                              : `SHIP-${String(item.shipmentNumber).padStart(4, "0")}`}
                          </span>
                          <Link
                            href={`/admin/shipments/${item.shipmentId}`}
                            className="text-brand hover:text-brand/80"
                            title="View shipment detail"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <button
                            onClick={() =>
                              setAssignModal({
                                open: true,
                                itemId: item.id,
                                currentShipmentId: item.shipmentId,
                                selectedShipmentId: item.shipmentId,
                                assignQuantity: item.quantity,
                              })
                            }
                            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setAssignModal({
                              open: true,
                              itemId: item.id,
                              currentShipmentId: null,
                              selectedShipmentId: null,
                              assignQuantity: item.quantity,
                            })
                          }
                          disabled={savingIds.has(item.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5 transition-colors ${
                            savingIds.has(item.id) ? "opacity-50" : ""
                          }`}
                        >
                          <Package size={13} />
                          Assign to Shipment
                        </button>
                      )}
                    </td>

                    {/* Purchase Order */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/purchase-orders/${item.purchaseOrderId}`}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80 font-medium"
                      >
                        PO-
                        {String(item.purchaseOrderNumber).padStart(4, "0")}
                        <ExternalLink size={12} />
                      </Link>
                    </td>

                    {/* Last updated */}
                    <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap text-xs">
                      {new Date(item.lastUpdated).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No products in warehouse inventory yet. When a purchase
                    order item status is changed to &quot;In warehouse&quot;, it
                    will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assign to Shipment Modal ── */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Assign to Shipment
              </h2>
              <button
                onClick={() =>
                  setAssignModal({
                    open: false,
                    itemId: "",
                    currentShipmentId: null,
                    selectedShipmentId: null,
                    assignQuantity: 1,
                  })
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
              {availableShipments.length === 0 ? (
                <div className="text-center py-6">
                  <Package size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-4">
                    No pending shipments are available. Create a new one to assign
                    this item.
                  </p>
                  <button
                    onClick={() => {
                      setAssignModal({
                        open: false,
                        itemId: "",
                        currentShipmentId: null,
                        selectedShipmentId: null,
                        assignQuantity: 1,
                      });
                      setTimeout(() => {
                        setCreateModal({
                          open: true,
                          name: "",
                          saving: false,
                        });
                      }, 150);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
                  >
                    <Truck size={16} />
                    Create Shipment
                  </button>
                </div>
              ) : (
                <>
                  {assignModal.currentShipmentId ? (
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        Assigned quantity: {assignQuantityMax}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        This row can be moved to another pending shipment or unassigned.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Quantity to assign
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={assignQuantityMax}
                        value={assignModal.assignQuantity}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setAssignModal((prev) => ({
                            ...prev,
                            assignQuantity: Number.isFinite(value)
                              ? Math.min(Math.max(1, Math.trunc(value)), assignQuantityMax)
                              : 1,
                          }));
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available in this row: {assignQuantityMax}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Shipment</p>
                    {availableShipments.map((s) => {
                    const isSelected = assignModal.selectedShipmentId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setAssignModal((prev) => ({
                            ...prev,
                            selectedShipmentId: s.id,
                          }))
                        }
                        className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                          isSelected
                            ? "border-brand bg-brand/5 text-brand font-medium"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <span className="font-medium">
                          {getShipmentLabel(s)}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {shipmentStatusLabels[s.status] ?? s.status}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between gap-2">
              {assignModal.currentShipmentId && (
                <button
                  onClick={() => handleAssignShipment(assignModal.itemId, null)}
                  disabled={savingIds.has(assignModal.itemId)}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Unassign
                </button>
              )}
              <div className="ml-auto flex gap-2">
              <button
                onClick={() =>
                  setAssignModal({
                    open: false,
                    itemId: "",
                    currentShipmentId: null,
                    selectedShipmentId: null,
                    assignQuantity: 1,
                  })
                }
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              {availableShipments.length > 0 && (
                <button
                  onClick={() => {
                    if (!assignModal.selectedShipmentId) {
                      alert("Select a shipment first");
                      return;
                    }
                    handleAssignShipment(
                      assignModal.itemId,
                      assignModal.selectedShipmentId,
                      assignModal.assignQuantity
                    );
                  }}
                  disabled={savingIds.has(assignModal.itemId)}
                  className="px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand/90 font-medium disabled:opacity-50"
                >
                  {assignModal.currentShipmentId
                    ? `Move ${assignQuantityMax}`
                    : `Assign ${assignModal.assignQuantity}`}
                </button>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Shipment Modal ── */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Shipment
              </h2>
              <button
                onClick={() =>
                  setCreateModal({
                    open: false,
                    name: "",
                    saving: false,
                  })
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-gray-600 text-sm">
                A new shipment will be created. You can assign warehouse
                inventory items to it after creation.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Shipment Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={createModal.name}
                  onChange={(e) =>
                    setCreateModal((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder='e.g. "Air Freight — June 5"'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                />
              </div>
              <button
                onClick={handleCreateShipment}
                disabled={createModal.saving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors ${
                  createModal.saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Truck size={16} />
                {createModal.saving ? "Creating..." : "Create Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

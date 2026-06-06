"use client";

import { useState } from "react";
import Link from "next/link";

interface WarehouseStockItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityInStock: number;
  lastUpdated: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    reservedStock: number;
    images: { url: string; alt: string | null; position: number }[];
  } | null;
}

interface WarehouseInventoryTableProps {
  initialStock: WarehouseStockItem[];
}

export function WarehouseInventoryTable({
  initialStock,
}: WarehouseInventoryTableProps) {
  const [stock] = useState(initialStock);

  const totalItems = stock.reduce((sum, s) => sum + s.quantityInStock, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Inventory</h1>
          <p className="text-gray-600 text-sm mt-1">
            {stock.length} product{stock.length !== 1 ? "s" : ""} in stock
            {" · "}
            {totalItems} total units
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">SKU</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">In Warehouse</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Online Stock</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Reserved</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Price (LKR)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Last Updated</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {item.product?.images[0] && (
                        <img
                          src={item.product.images[0].url}
                          alt={item.productName}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <Link
                        href={`/admin/products/${item.productId}/edit`}
                        className="font-medium text-gray-900 hover:text-brand"
                      >
                        {item.productName}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    {item.productSku}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-gray-900">
                      {item.quantityInStock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {item.product?.stock ?? "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {item.product?.reservedStock ?? "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {item.product
                      ? item.product.price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "LKR",
                          minimumFractionDigits: 0,
                        })
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {new Date(item.lastUpdated).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/admin/products/${item.productId}/edit`}
                      className="text-brand hover:text-brand/80 text-xs font-medium"
                    >
                      View Product
                    </Link>
                  </td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No products in warehouse inventory yet. When a purchase order item status
                    is changed to &quot;In warehouse&quot;, it will appear here.
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

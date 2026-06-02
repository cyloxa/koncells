"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddCustomerModal } from "./AddCustomerModal";
import { EditCustomerModal } from "./EditCustomerModal";
import {
  Search,
  Trash2,
  Download,
  Pencil,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  ShoppingCart,
  Star,
  ChevronDown,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { bulkDeleteCustomers, searchCustomers } from "@/actions/customer.actions";
import { exportAsVCard } from "@/lib/vcard";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  socialLinks: string | null;
  additionalNotes: string | null;
  createdAt: Date;
  _count: { orders: number; reviews: number };
}

interface CustomersClientProps {
  initialCustomers: Customer[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal state
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // ─── Search ───────────────────────────────────────────
  const handleSearch = useCallback(
    async (value: string) => {
      setSearchQuery(value);
      if (!value.trim()) {
        setCustomers(initialCustomers);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchCustomers(value);
        setCustomers(results as unknown as Customer[]);
      } catch {
        toast.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [initialCustomers]
  );

  // ─── Selection ────────────────────────────────────────
  const allSelected = useMemo(
    () => customers.length > 0 && selectedIds.size === customers.length,
    [customers, selectedIds]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // ─── Bulk Delete ──────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("No customers selected");
      return;
    }

    if (
      !confirm(
        `Delete ${ids.length} customer${ids.length > 1 ? "s" : ""}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await bulkDeleteCustomers(ids);
      if (result.success) {
        toast.success(`${result.data.count} customer(s) deleted`);
        setSelectedIds(new Set());
        setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete customers");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Edit ─────────────────────────────────────────────
  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditCustomer(null);
  };

  // ─── WhatsApp link ────────────────────────────────────
  const whatsappLink = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, "");
    return `https://wa.me/${cleaned}`;
  };

  // ─── Export Selected ──────────────────────────────────
  const handleExportSelected = () => {
    const ids = Array.from(selectedIds);
    const toExport =
      ids.length > 0
        ? customers.filter((c) => ids.includes(c.id))
        : customers;

    if (toExport.length === 0) {
      toast.error("No customers to export");
      return;
    }

    exportAsVCard(toExport);
    toast.success(
      `Exported ${toExport.length} contact${toExport.length > 1 ? "s" : ""}`
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 text-sm mt-1">
            {customers.length} customer{customers.length !== 1 ? "s" : ""} registered
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500">
                {selectedIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={handleExportSelected}>
            <Download className="h-4 w-4 mr-1.5" />
            Export vCard
          </Button>

          <AddCustomerModal />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or location..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all bg-white"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Customer
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Contact
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Location
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">
                  Orders
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">
                  Reviews
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Joined
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`border-b border-gray-100 transition-colors ${
                    selectedIds.has(customer.id)
                      ? "bg-brand-light/50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleOne(customer.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand">
                          {customer.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {customer.name ?? "Unnamed"}
                        </p>
                        {customer.additionalNotes && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">
                            {customer.additionalNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <p className="text-gray-600 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {customer.email}
                      </p>
                      {customer.phone && (
                        <a
                          href={whatsappLink(customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 flex items-center gap-1.5 text-xs"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {customer.phone}
                          <ExternalLink className="h-3 w-3 text-green-400" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {customer.location ? (
                      <span className="text-gray-600 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {customer.location}
                      </span>
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/admin/orders?userId=${customer.id}`}
                      className="inline-flex items-center gap-1 text-brand hover:text-brand-dark transition-colors"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{customer._count.orders}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      {customer._count.reviews}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {new Date(customer.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openEdit(customer)}
                      className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                      title="Edit customer"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-gray-300" />
                      <p className="text-gray-500 text-sm">
                        {searchQuery
                          ? "No customers match your search"
                          : "No customers yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editCustomer && (
        <EditCustomerModal
          customer={editCustomer}
          isOpen={isEditOpen}
          onClose={closeEdit}
        />
      )}
    </>
  );
}

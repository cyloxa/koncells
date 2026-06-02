"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { updateCustomer } from "@/actions/customer.actions";

interface CustomerData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  socialLinks: string | null;
  additionalNotes: string | null;
}

export function EditCustomerModal({
  customer,
  isOpen,
  onClose,
}: {
  customer: CustomerData;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      location: (formData.get("location") as string) || null,
      socialLinks: (formData.get("socialLinks") as string) || null,
      additionalNotes: (formData.get("additionalNotes") as string) || null,
    };

    const result = await updateCustomer(customer.id, payload);

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("Customer updated successfully!");
    onClose();
    setError("");
    router.refresh();
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Customer
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="edit-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Customer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="edit-name"
                name="name"
                type="text"
                required
                defaultValue={customer.name ?? ""}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="edit-email"
                name="email"
                type="email"
                required
                defaultValue={customer.email}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="edit-phone"
                name="phone"
                type="tel"
                defaultValue={customer.phone ?? ""}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="edit-location"
                name="location"
                type="text"
                defaultValue={customer.location ?? ""}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                placeholder="City, Country"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-socialLinks"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Social Media Links
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="edit-socialLinks"
                name="socialLinks"
                className="pl-10"
                defaultValue={customer.socialLinks ?? ""}
                placeholder="Instagram: @handle"
                rows={2}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-additionalNotes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="edit-additionalNotes"
                name="additionalNotes"
                className="pl-10"
                defaultValue={customer.additionalNotes ?? ""}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

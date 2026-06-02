"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { updateBrandSettings } from "@/actions/settings.actions";

interface BrandSettings {
  id: string;
  brandName: string;
  phone: string | null;
  emails: string | null;
  address: string | null;
  iconUrl: string | null;
  verticalLogo: string | null;
  horizontalLogo: string | null;
  updatedAt: Date;
}

export function BrandTab({ initialData }: { initialData: BrandSettings }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [iconUrl, setIconUrl] = useState(initialData.iconUrl ?? "");
  const [verticalLogo, setVerticalLogo] = useState(initialData.verticalLogo ?? "");
  const [horizontalLogo, setHorizontalLogo] = useState(initialData.horizontalLogo ?? "");
  const [uploading, setUploading] = useState<"icon" | "vertical" | "horizontal" | null>(null);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const verticalInputRef = useRef<HTMLInputElement>(null);
  const horizontalInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const allowedTypes = ["image/png", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG and SVG files are allowed.");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB).");
      return null;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url as string;
    } catch {
      toast.error("Upload failed");
      return null;
    }
  };

  const handleUpload = async (
    field: "icon" | "vertical" | "horizontal",
    file: File | undefined,
    setter: (v: string) => void
  ) => {
    if (!file) return;
    setUploading(field);
    const url = await uploadFile(file);
    if (url) setter(url);
    setUploading(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);

    const result = await updateBrandSettings({
      brandName: formData.get("brandName") as string,
      phone: (formData.get("phone") as string) || null,
      emails: (formData.get("emails") as string) || null,
      address: (formData.get("address") as string) || null,
      iconUrl: iconUrl || null,
      verticalLogo: verticalLogo || null,
      horizontalLogo: horizontalLogo || null,
    });

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    setSuccess("Brand settings updated successfully!");
    toast.success("Brand settings updated!");
    router.refresh();
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Brand Materials
          </h2>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-lg mb-4">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label required>Brand Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="brandName"
                name="brandName"
                type="text"
                required
                defaultValue={initialData.brandName}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Koncells"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initialData.phone ?? ""}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Emails</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="emails"
                name="emails"
                className="pl-10"
                defaultValue={initialData.emails ?? ""}
                placeholder="support@koncells.com&#10;info@koncells.com"
                rows={3}
              />
            </div>
            <p className="text-xs text-gray-400">
              One email per line
            </p>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="address"
                name="address"
                className="pl-10"
                defaultValue={initialData.address ?? ""}
                placeholder="123 Main Street&#10;City, Country"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <div>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="/uploads/icon.png"
                    className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleUpload("icon", e.target.files?.[0], setIconUrl)}
                    />
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      disabled={uploading === "icon"}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      {uploading === "icon" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vertical Logo</Label>
              <div>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={verticalLogo}
                    onChange={(e) => setVerticalLogo(e.target.value)}
                    placeholder="/uploads/logo-vertical.png"
                    className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <input
                      ref={verticalInputRef}
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleUpload("vertical", e.target.files?.[0], setVerticalLogo)}
                    />
                    <button
                      type="button"
                      onClick={() => verticalInputRef.current?.click()}
                      disabled={uploading === "vertical"}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      {uploading === "vertical" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horizontal Logo</Label>
              <div>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={horizontalLogo}
                    onChange={(e) => setHorizontalLogo(e.target.value)}
                    placeholder="/uploads/logo-horizontal.png"
                    className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <input
                      ref={horizontalInputRef}
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleUpload("horizontal", e.target.files?.[0], setHorizontalLogo)}
                    />
                    <button
                      type="button"
                      onClick={() => horizontalInputRef.current?.click()}
                      disabled={uploading === "horizontal"}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    >
                      {uploading === "horizontal" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Brand Settings"}
            </Button>
          </div>
        </form>
      </div>

      {/* Preview card */}
      {(iconUrl || verticalLogo || horizontalLogo) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview</h3>
          <div className="flex items-center gap-4">
            {iconUrl && (
              <img
                src={iconUrl}
                alt="Icon"
                className="h-10 w-10 rounded object-cover"
              />
            )}
            {horizontalLogo && (
              <img
                src={horizontalLogo}
                alt="Horizontal logo"
                className="h-10 object-contain"
              />
            )}
            {verticalLogo && (
              <img
                src={verticalLogo}
                alt="Vertical logo"
                className="h-16 object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

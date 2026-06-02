"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, SearchIcon, EyeOff, Eye } from "lucide-react";
import { updateSeoSettings } from "@/actions/settings.actions";
import toast from "react-hot-toast";

interface SeoSettingsData {
  id: string;
  showInProductForm: boolean;
  updatedAt: Date;
}

export function SeoTab({
  initialData,
}: {
  initialData: SeoSettingsData;
}) {
  const [showInProductForm, setShowInProductForm] = useState(
    initialData.showInProductForm
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (value: boolean) => {
    setShowInProductForm(value);
    setIsSaving(true);

    const result = await updateSeoSettings({ showInProductForm: value });

    if (result.success) {
      toast.success(
        value
          ? "SEO fields are now visible in the product form"
          : "SEO fields are now hidden from the product form"
      );
    } else {
      setShowInProductForm(!value); // Revert
      toast.error(result.error);
    }

    setIsSaving(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-brand" />
          SEO Options for Product Form
        </h3>
        <p className="text-sm text-gray-600">
          Control whether SEO-related fields (Meta Title, Meta Description,
          Social Share Image, Focus Keyphrase, Image Title) appear in the
          Add/Edit Product form. If admins are not familiar with SEO, you can
          hide these fields to keep the form simple.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {showInProductForm ? (
              <Eye className="h-5 w-5 text-brand mt-0.5" />
            ) : (
              <EyeOff className="h-5 w-5 text-gray-400 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                Show SEO fields in Add/Edit Product
              </p>
              <p className="text-sm text-gray-500 mt-1">
                When enabled, the &quot;SEO &amp; Social Preview&quot; section
                will appear in the product form with fields for meta title,
                description, social share image, and focus keyphrase.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            <Switch
              checked={showInProductForm}
              onChange={handleToggle}
            />
          </div>
        </div>
      </div>

      {/* Preview of what gets hidden */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Fields affected by this toggle
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showInProductForm ? "bg-green-500" : "bg-red-400"}`} />
            Focus Keyphrase
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showInProductForm ? "bg-green-500" : "bg-red-400"}`} />
            Meta Title (with live preview)
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showInProductForm ? "bg-green-500" : "bg-red-400"}`} />
            Meta Description
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showInProductForm ? "bg-green-500" : "bg-red-400"}`} />
            Social Share (OG) Image
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showInProductForm ? "bg-green-500" : "bg-red-400"}`} />
            Image Title field
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        SEO fields are stored regardless of this setting. Hiding them simply
        removes them from the form UI to reduce complexity.
      </p>
    </div>
  );
}

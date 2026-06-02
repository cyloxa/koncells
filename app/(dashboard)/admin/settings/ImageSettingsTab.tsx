"use client";

import { useState } from "react";
import { updateImageSettings, type ImageSettingsData } from "@/actions/settings.actions";
import toast from "react-hot-toast";

interface Props {
  initialData: ImageSettingsData;
}

export function ImageSettingsTab({ initialData }: Props) {
  const [form, setForm] = useState({
    resizeEnabled: true,
    resizeWidth: 1200,
    resizeHeight: 1200,
    resizeFit: "inside",
    watermarkEnabled: true,
    watermarkText: "Koncells",
    watermarkOpacity: 0.5,
    watermarkSize: 48,
    watermarkPosition: "southeast",
    outputFormat: "webp",
    outputQuality: 85,
    ...initialData,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (
    field: keyof ImageSettingsData,
    value: string | number | boolean
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateImageSettings({
        resizeEnabled: form.resizeEnabled,
        resizeWidth: form.resizeWidth,
        resizeHeight: form.resizeHeight,
        resizeFit: form.resizeFit,
        watermarkEnabled: form.watermarkEnabled,
        watermarkText: form.watermarkText,
        watermarkOpacity: form.watermarkOpacity,
        watermarkSize: form.watermarkSize,
        watermarkPosition: form.watermarkPosition,
        outputFormat: form.outputFormat,
        outputQuality: form.outputQuality,
      });
      if (result.success) {
        toast.success("Image settings saved");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Image Processing</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure how uploaded images are processed by the Sharp library. These settings affect
          product images, brand logos, and all other image uploads.
        </p>
      </div>

      {/* ─── Resize Settings ─── */}
      <fieldset className="border border-gray-200 rounded-lg p-5 space-y-4">
        <legend className="text-sm font-semibold text-gray-700 px-1.5">Resize</legend>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="resize-enabled"
            checked={form.resizeEnabled}
            onChange={(e) => handleChange("resizeEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          <label htmlFor="resize-enabled" className="text-sm font-medium text-gray-700">
            Resize images on upload (disable to keep original dimensions)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Width (px)</label>
            <input
              type="number"
              min={100}
              max={5000}
              value={form.resizeWidth}
              onChange={(e) => handleChange("resizeWidth", parseInt(e.target.value) || 1200)}
              disabled={!form.resizeEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Height (px)</label>
            <input
              type="number"
              min={100}
              max={5000}
              value={form.resizeHeight}
              onChange={(e) => handleChange("resizeHeight", parseInt(e.target.value) || 1200)}
              disabled={!form.resizeEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fit Method</label>
            <select
              value={form.resizeFit}
              onChange={(e) => handleChange("resizeFit", e.target.value)}
              disabled={!form.resizeEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="inside">Inside (shrink to fit)</option>
              <option value="cover">Cover (crop to fill)</option>
              <option value="contain">Contain (fit with padding)</option>
              <option value="fill">Fill (stretch)</option>
              <option value="outside">Outside (fit to smallest)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {form.resizeFit === "inside" && "Shrinks image to fit within bounds, preserving aspect ratio."}
              {form.resizeFit === "cover" && "Crops to fill exact dimensions, preserving aspect ratio."}
              {form.resizeFit === "contain" && "Resizes to fit within bounds, may add transparent padding."}
              {form.resizeFit === "fill" && "Stretches to exact dimensions, ignoring aspect ratio."}
              {form.resizeFit === "outside" && "Resizes so both dimensions are at least the specified size."}
            </p>
          </div>
        </div>
      </fieldset>

      {/* ─── Watermark Settings ─── */}
      <fieldset className="border border-gray-200 rounded-lg p-5 space-y-4">
        <legend className="text-sm font-semibold text-gray-700 px-1.5">Watermark</legend>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="watermark-enabled"
            checked={form.watermarkEnabled}
            onChange={(e) => handleChange("watermarkEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
          />
          <label htmlFor="watermark-enabled" className="text-sm font-medium text-gray-700">
            Enable watermark on product images
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Watermark Text</label>
            <input
              type="text"
              value={form.watermarkText}
              onChange={(e) => handleChange("watermarkText", e.target.value)}
              disabled={!form.watermarkEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opacity ({Math.round(form.watermarkOpacity * 100)}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(form.watermarkOpacity * 100)}
              onChange={(e) => handleChange("watermarkOpacity", parseInt(e.target.value) / 100)}
              disabled={!form.watermarkEnabled}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bar Height (px)</label>
            <input
              type="number"
              min={16}
              max={200}
              value={form.watermarkSize}
              onChange={(e) => handleChange("watermarkSize", parseInt(e.target.value) || 48)}
              disabled={!form.watermarkEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              value={form.watermarkPosition}
              onChange={(e) => handleChange("watermarkPosition", e.target.value)}
              disabled={!form.watermarkEnabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="southeast">Bottom Right</option>
              <option value="southwest">Bottom Left</option>
              <option value="northeast">Top Right</option>
              <option value="northwest">Top Left</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* ─── Output Settings ─── */}
      <fieldset className="border border-gray-200 rounded-lg p-5 space-y-4">
        <legend className="text-sm font-semibold text-gray-700 px-1.5">Output</legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
            <select
              value={form.outputFormat}
              onChange={(e) => handleChange("outputFormat", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            >
              <option value="webp">WebP (recommended — smaller files, good quality)</option>
              <option value="jpeg">JPEG (wider compatibility, larger files)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quality ({form.outputQuality}%)
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={form.outputQuality}
              onChange={(e) => handleChange("outputQuality", parseInt(e.target.value) || 85)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1% (smallest)</span>
              <span>100% (best quality)</span>
            </div>
          </div>
        </div>
      </fieldset>

      {/* ─── Save Button ─── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

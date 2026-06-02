"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Star,
  AlertCircle,
  X,
  Check,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createExchangeRate,
  setDefaultExchangeRate,
  deleteExchangeRate,
} from "@/actions/settings.actions";

interface ExchangeRateData {
  id: string;
  source: string;
  target: string;
  rate: number;
  isDefault: boolean;
  date: Date;
  createdAt: Date;
}

export function ExchangeRatesTab({
  initialRates,
}: {
  initialRates: ExchangeRateData[];
}) {
  const router = useRouter();
  const [rates, setRates] = useState<ExchangeRateData[]>(initialRates);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const cnyRates = rates.filter((r) => r.source === "CNY");
  const usdRates = rates.filter((r) => r.source === "USD");

  const defaultCny = cnyRates.find((r) => r.isDefault);
  const defaultUsd = usdRates.find((r) => r.isDefault);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setIsLoading(true);
    setError("");

    const formData = new FormData(form);
    const result = await createExchangeRate({
      source: formData.get("source") as "CNY" | "USD",
      rate: Number(formData.get("rate")),
      isDefault: formData.get("isDefault") === "on",
    });

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("Exchange rate added");
    setShowAddForm(false);
    setError("");
    form.reset();
    router.refresh();
    setIsLoading(false);
  };

  const handleSetDefault = async (id: string, source: string) => {
    const result = await setDefaultExchangeRate(id, source);
    if (result.success) {
      toast.success("Default rate updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exchange rate?")) return;
    const result = await deleteExchangeRate(id);
    if (result.success) {
      toast.success("Rate deleted");
      setRates((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold text-gray-900">
            Manual Exchange Rates
          </h2>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rate
        </Button>
      </div>

      {/* Default rates summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-brand-light rounded-lg p-4">
          <p className="text-xs text-brand font-medium uppercase tracking-wider">
            Default CNY &rarr; LKR
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {defaultCny ? defaultCny.rate.toFixed(4) : "—"}
          </p>
          {defaultCny && (
            <p className="text-xs text-gray-500 mt-0.5">
              Set {new Date(defaultCny.date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="bg-brand-light rounded-lg p-4">
          <p className="text-xs text-brand font-medium uppercase tracking-wider">
            Default USD &rarr; LKR
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {defaultUsd ? defaultUsd.rate.toFixed(4) : "—"}
          </p>
          {defaultUsd && (
            <p className="text-xs text-gray-500 mt-0.5">
              Set {new Date(defaultUsd.date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              New Exchange Rate
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setError("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Source Currency</Label>
                <select
                  name="source"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white"
                >
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label required>Rate (to LKR)</Label>
                <Input
                  name="rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  placeholder="0.0000"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isDefault"
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-gray-700">
                Set as default rate
              </span>
            </label>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Rate"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Rates table: CNY */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            CNY &rarr; LKR Rates
          </h3>
        </div>
        {cnyRates.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No CNY rates added yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-5 font-medium text-gray-500">
                  Rate
                </th>
                <th className="text-left py-2.5 px-5 font-medium text-gray-500">
                  Date
                </th>
                <th className="text-right py-2.5 px-5 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {cnyRates.map((rate) => (
                <tr key={rate.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {rate.rate.toFixed(4)}
                      </span>
                      {rate.isDefault && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
                          <Check className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-gray-500">
                    {new Date(rate.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!rate.isDefault && (
                        <button
                          onClick={() => handleSetDefault(rate.id, "CNY")}
                          className="p-1.5 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rates table: USD */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            USD &rarr; LKR Rates
          </h3>
        </div>
        {usdRates.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No USD rates added yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-5 font-medium text-gray-500">
                  Rate
                </th>
                <th className="text-left py-2.5 px-5 font-medium text-gray-500">
                  Date
                </th>
                <th className="text-right py-2.5 px-5 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usdRates.map((rate) => (
                <tr key={rate.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {rate.rate.toFixed(4)}
                      </span>
                      {rate.isDefault && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
                          <Check className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-gray-500">
                    {new Date(rate.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!rate.isDefault && (
                        <button
                          onClick={() => handleSetDefault(rate.id, "USD")}
                          className="p-1.5 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BrandTab } from "./BrandTab";
import { BrandsTab } from "./BrandsTab";
import { ExchangeRatesTab } from "./ExchangeRatesTab";
import { BackupsTab } from "./BackupsTab";
import { SeoTab } from "./SeoTab";
import { ImageSettingsTab } from "./ImageSettingsTab";
import { Settings, DollarSign, Database, SearchIcon, Tag, ImageIcon } from "lucide-react";

export type Tab = "brand-materials" | "brands" | "exchange-rates" | "backups" | "seo" | "image-settings";

export interface BrandSettings {
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

export interface ExchangeRateData {
  id: string;
  source: string;
  target: string;
  rate: number;
  isDefault: boolean;
  date: Date;
  createdAt: Date;
}

export interface BackupData {
  id: string;
  name: string;
  filename: string;
  size: number;
  createdAt: Date;
}

export interface SeoSettingsData {
  id: string;
  showInProductForm: boolean;
  updatedAt: Date;
}

export interface ImageSettingsData {
  id: string;
  resizeEnabled: boolean;
  resizeWidth: number;
  resizeHeight: number;
  resizeFit: string;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkPosition: string;
  outputFormat: string;
  outputQuality: number;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "brand-materials", label: "Brand Materials", icon: <Settings className="h-4 w-4" /> },
  { id: "brands", label: "Brand Names", icon: <Tag className="h-4 w-4" /> },
  { id: "exchange-rates", label: "Exchange Rates", icon: <DollarSign className="h-4 w-4" /> },
  { id: "seo", label: "SEO Options", icon: <SearchIcon className="h-4 w-4" /> },
  { id: "image-settings", label: "Image Processing", icon: <ImageIcon className="h-4 w-4" /> },
  { id: "backups", label: "Database Backup", icon: <Database className="h-4 w-4" /> },
];

export function SettingsClient({
  brandSettings,
  brands,
  exchangeRates,
  backups,
  seoSettings,
  imageSettings,
}: {
  brandSettings: BrandSettings;
  brands: any[];
  exchangeRates: ExchangeRateData[];
  backups: BackupData[];
  seoSettings: SeoSettingsData;
  imageSettings: ImageSettingsData;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("brand-materials");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage brand materials, exchange rates, image processing, and database backups
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "brand-materials" && <BrandTab initialData={brandSettings} />}
        {activeTab === "brands" && <BrandsTab initialBrands={brands} />}
        {activeTab === "exchange-rates" && (
          <ExchangeRatesTab initialRates={exchangeRates} />
        )}
        {activeTab === "seo" && <SeoTab initialData={seoSettings} />}
        {activeTab === "image-settings" && <ImageSettingsTab initialData={imageSettings} />}
        {activeTab === "backups" && <BackupsTab initialBackups={backups} />}
      </div>
    </div>
  );
}

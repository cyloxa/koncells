import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";
import {
  getBrandSettings,
  getExchangeRates,
  getBackups,
  getSeoSettings,
  getImageSettings,
} from "@/actions/settings.actions";
import { getBrands } from "@/actions/brand.actions";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [brandSettings, brands, exchangeRates, backups, seoSettings, imageSettings] =
    await Promise.all([
      getBrandSettings(),
      getBrands(),
      getExchangeRates(),
      getBackups(),
      getSeoSettings(),
      getImageSettings(),
    ]);

  return (
    <div className="p-6">
      <SettingsClient
        brandSettings={brandSettings}
        brands={brands}
        exchangeRates={exchangeRates}
        backups={backups}
        seoSettings={seoSettings}
        imageSettings={imageSettings}
      />
    </div>
  );
}

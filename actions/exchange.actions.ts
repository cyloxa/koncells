"use server";

import { prisma } from "@/lib/prisma";

export interface DefaultRates {
  usdToLkr: number | null;
  cnyToLkr: number | null;
}

export async function getDefaultExchangeRates(): Promise<DefaultRates> {
  const [usdRate, cnyRate] = await Promise.all([
    prisma.exchangeRate.findFirst({
      where: { source: "USD", isDefault: true },
    }),
    prisma.exchangeRate.findFirst({
      where: { source: "CNY", isDefault: true },
    }),
  ]);

  return {
    usdToLkr: usdRate ? Number(usdRate.rate) : null,
    cnyToLkr: cnyRate ? Number(cnyRate.rate) : null,
  };
}

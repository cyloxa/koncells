import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") ?? "CNY";
  const target = req.nextUrl.searchParams.get("target") ?? "LKR";

  const rate = await prisma.exchangeRate.findFirst({
    where: { source, target, isDefault: true },
    orderBy: { createdAt: "desc" },
    select: { rate: true },
  });

  if (!rate) {
    return NextResponse.json({ rate: null }, { status: 404 });
  }

  return NextResponse.json({ rate: Number(rate.rate) });
}

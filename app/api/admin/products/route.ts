import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE a product (admin only)
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const idsParam = searchParams.get("ids");

  // Bulk delete
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, count: ids.length });
  }

  // Single delete
  if (!id) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH — inline edit a product field
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, field, value } = body;

  if (!id || !field) {
    return NextResponse.json({ error: "Product ID and field are required" }, { status: 400 });
  }

  const allowedFields = ["price", "buyingPrice", "competitorsPrice", "globalPrice"];
  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: "Field not allowed for inline editing" }, { status: 400 });
  }

  const numValue = value === "" || value === null ? null : Number(value);

  try {
    await prisma.product.update({
      where: { id },
      data: { [field]: numValue },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

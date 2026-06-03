import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE orders (admin only) — bulk delete by ?ids=id1,id2,id3
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "Order IDs are required" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
  }

  try {
    // OrderItem has onDelete: Cascade from Order, so deleting Order cascades to items
    await prisma.order.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    const prismaError = error as { code?: string; message?: string };
    console.error("Delete orders error:", prismaError.message || prismaError);
    return NextResponse.json(
      { error: "Failed to delete orders" },
      { status: 500 }
    );
  }
}

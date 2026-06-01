import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: { take: 1 } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { addressId } = body;

  if (!addressId) {
    return NextResponse.json({ error: "Address ID is required" }, { status: 400 });
  }

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const subtotal = cart.items.reduce(
    (sum: number, i) => sum + Number(i.product.price) * i.quantity,
    0
  );
  const shippingCost = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      status: "PENDING",
      subtotal,
      shippingCost,
      tax,
      total,
      shippingAddressId: addressId,
      items: {
        create: cart.items.map((item) => ({
          quantity: item.quantity,
          price: item.product.price,
          productId: item.product.id,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return NextResponse.json({ order }, { status: 201 });
}

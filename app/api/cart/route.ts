import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: { take: 1 },
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: { take: 1 },
                stock: true,
              },
            },
          },
        },
      },
    });
  }

  return NextResponse.json({ cart });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { productId, quantity = 1 } = body;

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  // Verify product exists and is in stock
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.stock < quantity) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  }

  // Get or create cart
  let cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: session.user.id },
    });
  }

  // Upsert cart item
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  // Return updated cart
  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: { take: 1 },
              stock: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ cart: updatedCart });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
  });

  if (!cart) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }

  if (productId) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
  } else {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  return NextResponse.json({ success: true });
}

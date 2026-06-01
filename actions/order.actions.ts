"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

export async function createCheckoutSession(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, price: true, images: true, stock: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  // Validate stock
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      throw new Error(`Insufficient stock for ${item.product.name}`);
    }
  }

  const subtotal = cart.items.reduce((sum: number, i: { product: { price: any; }; quantity: number; }) => sum + Number(i.product.price) * i.quantity, 0);
  const shippingCost = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      userId: session.user.id,
      cartId: cart.id,
    },
  });

  // Create order
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      status: "PENDING",
      subtotal,
      shippingCost,
      tax,
      total,
      stripePaymentIntentId: paymentIntent.id,
      shippingAddressId: addressId,
      items: {
        create: cart.items.map((item) => ({
          quantity: item.quantity,
          price: item.product.price,
          productId: item.product.id,
        })),
      },
    },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  revalidatePath("/cart");
  revalidatePath("/checkout");

  return {
    orderId: order.id,
    clientSecret: paymentIntent.client_secret,
  };
}

export async function getOrders() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.order.findMany({
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
}

export async function getOrderById(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    throw new Error("Order not found");
  }

  return order;
}

export async function getAllOrders() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOrderStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const order = await prisma.order.update({
    where: { id },
    data: { status: status as any },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return order;
}

import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    socialLinks: z.string().optional().nullable(),
    additionalNotes: z.string().optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  socialLinks: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Product ──────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  weight: z.coerce.number().positive().optional().nullable(),
  price: z.coerce.number().positive("Price must be positive"),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  globalPrice: z.coerce.number().positive().optional().nullable(),
  buyingPrice: z.coerce.number().positive().optional().nullable(),
  competitorsPrice: z.coerce.number().positive().optional().nullable(),
  shippingCost: z.coerce.number().min(0).optional().nullable(),
  handlerCost: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  isFeatured: z.boolean().default(false),
  showPrice: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category is required"),
  // SEO fields
  metaTitle: z.string().max(70, "Meta title should be under 70 characters").optional().nullable(),
  metaDescription: z.string().max(160, "Meta description should be under 160 characters").optional().nullable(),
  ogImage: z.string().optional().nullable(),
  focusKeyphrase: z.string().optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        position: z.number().int().min(0).default(0),
      })
    )
    .optional()
    .default([]),
  relatedProductIds: z.array(z.string()).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export interface ProductImageInput {
  url: string;
  alt?: string | null;
  title?: string | null;
  position: number;
}

// ─── Category ─────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  image: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ─── Address ──────────────────────────────────────────

export const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ─── Review ───────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// ─── Cart ─────────────────────────────────────────────

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

// ─── Checkout ─────────────────────────────────────────

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Shipping address is required"),
  paymentMethodId: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ─── Shared DTOs ──────────────────────────────────────

export interface ProductWithRelations {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  model: string | null;
  tags: string | null;
  weight: number | null;
  price: number;
  compareAtPrice: number | null;
  globalPrice: number | null;
  buyingPrice: number | null;
  competitorsPrice: number | null;
  shippingCost: number | null;
  handlerCost: number | null;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  sku: string;
  categoryId: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  focusKeyphrase: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  images: {
    id: string;
    url: string;
    alt: string | null;
    title: string | null;
    position: number;
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
    createdAt: Date;
  }[];
  relatedTo?: { relatedProductId: string }[];
  relatedFrom?: { productId: string }[];
  _count?: {
    reviews: number;
  };
}

export interface CartWithItems {
  id: string;
  userId: string;
  items: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      images: { url: string; alt: string | null }[];
      stock: number;
    };
  }[];
}

export interface OrderWithItems {
  id: string;
  userId: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      slug: string;
      images: { url: string; alt: string | null }[];
    };
  }[];
}

// ─── NextAuth type extension ──────────────────────────

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

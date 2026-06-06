# AGENT.md — AI Agent Instructions

> **Cursor usage:** Cursor reads this file automatically as agent-mode instructions.
> Keep this at the project root. Update it as the project evolves.

---

## Role

You are a **senior full-stack engineer** working on a Next.js 14 e-commerce application.
You write production-quality TypeScript, reason about architecture before writing code,
and follow the conventions defined in `SKILL.md` without deviation.

Always read `SKILL.md` before starting any task.

---

## Core Behaviors

### Before Writing Any Code
1. Read `SKILL.md` for project conventions, folder structure, and patterns
2. Identify which files are affected by the task
3. Check whether the task requires a Server Action, API route, or direct DB call — choose correctly
4. If the task touches the database, review `prisma/schema.prisma` first
5. If the task touches auth, verify the session access pattern matches `lib/auth.ts`

### When Generating Code
- Match existing code style in the file you're editing — check before writing
- Use the project's established patterns (see SKILL.md) — never introduce new ones without asking
- Never install a new npm package without stating why it's needed and confirming no existing package covers it
- Always add or update TypeScript types — never use `any` or skip return types
- Write the smallest change that solves the problem correctly

### When Editing Existing Files
- Read the full file before making changes
- Preserve all existing functionality — do not silently remove code
- If refactoring is needed to implement the task cleanly, flag it separately
- Use `// TODO:` comments for follow-up work, not silent omissions

---

## Task Playbook

### Adding a New Page

1. Determine the correct route group: `(store)`, `(auth)`, or `(dashboard)/admin`
2. Create `app/(group)/route/page.tsx` as a **Server Component** by default
3. Add a `loading.tsx` skeleton and `error.tsx` boundary in the same directory
4. Fetch data directly in the page using Prisma (no API call)
5. Pass data down to Client Components only when interactivity is required

```tsx
// app/(store)/products/page.tsx
import { prisma } from '@/lib/prisma';
import { ProductGrid } from '@/components/product/ProductGrid';

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, price: true, images: { take: 1 } },
    orderBy: { createdAt: 'desc' },
  });

  return <ProductGrid products={products} />;
}
```

---

### Adding a New Component

1. Place it in the correct `components/` subdirectory (see SKILL.md structure)
2. Name the file `PascalCase.tsx`
3. Define a `Props` interface at the top of the file
4. Default to Server Component — only add `"use client"` if hooks/browser APIs are used
5. Export as a named export, not default

---

### Adding a New Server Action

1. Create or update the appropriate file in `actions/`
2. Add `'use server'` directive at the top of the file
3. Validate all inputs with Zod **before** any DB operation
4. Return `{ success: true, data }` or `{ success: false, error: string }`
5. Call `revalidatePath()` or `revalidateTag()` after mutations
6. Handle Prisma errors: `P2002` (unique violation), `P2025` (record not found)

```ts
// actions/product.actions.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const UpdateStockSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

export async function updateProductStock(
  input: z.infer<typeof UpdateStockSchema>
): Promise<ActionResult<{ stock: number }>> {
  const parsed = UpdateStockSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  try {
    const product = await prisma.product.update({
      where: { id: parsed.data.productId },
      data: { stock: parsed.data.quantity },
      select: { stock: true },
    });
    revalidatePath('/admin/products');
    return { success: true, data: product };
  } catch (e: unknown) {
    if ((e as { code: string }).code === 'P2025') {
      return { success: false, error: 'Product not found' };
    }
    return { success: false, error: 'Failed to update stock' };
  }
}
```

---

### Adding a New API Route

Only create API routes for: Stripe webhooks, external service callbacks, or endpoints consumed by third parties.

```ts
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle event types...
  return new Response('OK', { status: 200 });
}
```

---

### Working with Prisma

**Always use the singleton:**
```ts
import { prisma } from '@/lib/prisma';
```

**Select only needed fields:**
```ts
// ✅ Correct
const product = await prisma.product.findUnique({
  where: { slug },
  select: { id: true, name: true, price: true, description: true },
});

// ❌ Wrong — returns full model + all relations
const product = await prisma.product.findUnique({ where: { slug } });
```

**Run independent queries in parallel:**
```ts
const [product, relatedProducts] = await Promise.all([
  prisma.product.findUnique({ where: { slug }, select: { ... } }),
  prisma.product.findMany({ where: { categoryId }, take: 4, select: { ... } }),
]);
```

---

### Working with the Cart

- Cart state lives in Zustand (`store/cartStore.ts`)
- Always access via the `useCart()` hook — never import the store directly in components
- Cart is persisted to `localStorage` automatically via Zustand `persist` middleware
- On checkout, serialize cart state and pass to the Server Action — never trust client-side totals

---

### Adding a New Database Model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Update `types/index.ts` with the new TypeScript interface
4. Update relevant Server Actions and API routes

---

### Environment Variables

When a new env var is needed:
1. Add it to `.env.local` (never commit this file)
2. Add it to `.env.example` with a placeholder value and a comment
3. Add it to the Zod schema in `lib/env.ts`
4. Document what service it belongs to

---

## What NOT To Do

| ❌ Don't | ✅ Do instead |
|---|---|
| Use `any` type | Use `unknown` + Zod narrowing |
| Fetch in `useEffect` for initial data | Fetch in Server Component with Prisma |
| Import Prisma client directly in components | Use `@/lib/prisma` singleton |
| Use `<img>` for product images | Use `next/image` |
| Store prices as floats | Store as integers (cents) |
| Skip input validation | Always validate with Zod first |
| Use default exports for components | Use named exports |
| Hardcode colors in Tailwind classes | Use design system tokens from `tailwind.config.ts` |
| Call API routes for mutations from Server Components | Use Server Actions |
| Check auth in client components for access control | Use `middleware.ts` |
| Expose `DATABASE_URL` or secrets client-side | Keep all secrets without `NEXT_PUBLIC_` prefix |

---

## Stripe Integration

- Always create a **Payment Intent** on the server — never on the client
- Confirm payment on the client with Stripe.js
- Order fulfillment happens **only** in the webhook handler (`/api/webhooks/stripe`)
- Never trust the `success` redirect URL to fulfill orders — webhooks are the source of truth

---

## Auth Patterns

```ts
// In Server Component or Server Action
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);
if (!session) redirect('/login');
if (session.user.role !== 'ADMIN') redirect('/');
```

```ts
// In Client Component
import { useSession } from 'next-auth/react';
const { data: session, status } = useSession();
```

---

## Commit Message Format

Use conventional commits:

```
feat(products): add image gallery with zoom on product detail page
fix(cart): correct quantity update mutation in CartItem
chore(prisma): add Review model and run migration
refactor(checkout): extract address form into reusable component
```

---

## When Unsure

- Check `SKILL.md` first
- Look for an existing pattern in the codebase before introducing a new one
- Ask before adding a new dependency
- Ask before modifying `prisma/schema.prisma` in a way that requires a destructive migration

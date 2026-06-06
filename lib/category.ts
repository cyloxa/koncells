import { prisma } from "./prisma";

/**
 * Given a category slug, returns an array of slugs to include when filtering.
 * - If the category is a parent (has children), returns the parent slug + all child slugs
 * - If the category is a leaf (no children), returns just its own slug
 */
export async function getCategoryAndChildrenSlugs(
  slug: string
): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      slug: true,
      children: { select: { slug: true } },
    },
  });

  if (!category) return [slug];

  if (category.children.length > 0) {
    // Parent category: include all children
    return [category.slug, ...category.children.map((c) => c.slug)];
  }

  // Leaf category or parent without children
  return [category.slug];
}

import { prisma } from "@/lib/prisma";
import type { Category, Product } from "@/lib/types";

export async function fetchCatalogFromDb(): Promise<{
  categories: Category[];
  products: Product[];
  productsByCategory: Record<string, Product[]>;
}> {
  const [dbCategories, dbProducts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, category: { isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        category: { select: { slug: true } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { sku: true, title: true, priceRub: true },
        },
      },
    }),
  ]);

  const categories: Category[] = dbCategories.map((c) => ({
    slug: c.slug,
    title: c.title,
  }));

  const products: Product[] = dbProducts
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      category: p.category.slug,
      imageUrl: p.imageUrl || "/placeholder.svg",
      variants: p.variants.map((v) => ({
        id: v.sku || `${p.slug}-${v.title}`,
        title: v.title,
        priceRub: v.priceRub,
      })),
    }));

  const productsByCategory: Record<string, Product[]> = {};
  for (const c of categories) {
    productsByCategory[c.slug] = [];
  }
  for (const p of products) {
    (productsByCategory[p.category] ??= []).push(p);
  }

  return { categories, products, productsByCategory };
}

export async function fetchProductBySlugFromDb(slug: string): Promise<Product | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true } },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { sku: true, title: true, priceRub: true },
      },
    },
  });

  if (!p || !p.variants.length || !p.isActive) return null;

  return {
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category.slug,
    imageUrl: p.imageUrl || "/placeholder.svg",
    variants: p.variants.map((v) => ({
      id: v.sku || `${p.slug}-${v.title}`,
      title: v.title,
      priceRub: v.priceRub,
    })),
  };
}


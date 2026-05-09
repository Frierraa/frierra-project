import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { fetchYandexEdaMenu } from "../src/lib/yandexEda";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  const { categories, products } = await fetchYandexEdaMenu();

  const categorySlugs = new Set(categories.map((c) => c.slug));
  const productSlugs = new Set(products.map((p) => p.slug));

  for (let i = 0; i < categories.length; i += 1) {
    const c = categories[i];
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { title: c.title, sortOrder: i, isActive: true },
      create: { slug: c.slug, title: c.title, sortOrder: i, isActive: true },
    });
  }

  // Деактивируем категории, которые пропали из меню.
  await prisma.category.updateMany({
    where: { slug: { notIn: Array.from(categorySlugs) } },
    data: { isActive: false },
  });

  for (let pIndex = 0; pIndex < products.length; pIndex += 1) {
    const p = products[pIndex];
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: p.category },
      select: { id: true },
    });

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        categoryId: category.id,
        sortOrder: pIndex,
        isActive: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        categoryId: category.id,
        sortOrder: pIndex,
        isActive: true,
      },
      select: { id: true },
    });

    for (let vIndex = 0; vIndex < p.variants.length; vIndex += 1) {
      const v = p.variants[vIndex];
      const sku = `${p.slug}-${v.id}`;
      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          title: v.title,
          priceRub: v.priceRub,
          productId: product.id,
          isActive: true,
        },
        create: {
          title: v.title,
          priceRub: v.priceRub,
          sku,
          productId: product.id,
          isActive: true,
        },
        select: { id: true },
      });
    }
  }

  // Деактивируем товары/варианты, которых больше нет в меню.
  await prisma.productVariant.updateMany({
    where: { product: { slug: { notIn: Array.from(productSlugs) } } },
    data: { isActive: false },
  });
  await prisma.product.updateMany({
    where: { slug: { notIn: Array.from(productSlugs) } },
    data: { isActive: false },
  });

  await prisma.user.upsert({
    where: { email: "admin@burgersize.local" },
    update: { role: "ADMIN", name: "Администратор" },
    create: {
      email: "admin@burgersize.local",
      role: "ADMIN",
      name: "Администратор",
      passwordHash: "demo-hash-change-me",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });


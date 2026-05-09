import type { Category, Product } from "@/lib/types";

const MENU_URL =
  "https://eda.yandex.ru/api/v2/menu/retrieve/burger_sajz_lq592?latitude=56.326799&longitude=44.00652&autoTranslate=false";

type YPicture = { uri?: string };

type YItem = {
  id: number | string;
  publicId?: string;
  name?: string;
  description?: string;
  price?: number;
  decimalPrice?: number;
  picture?: YPicture;
  weight?: string;
};

type YCategory = {
  name?: string;
  dynamicId?: string | number;
  items?: YItem[];
};

type YResponse = {
  payload?: {
    categories?: YCategory[];
  };
};

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function imageUrlFromPicture(picture?: YPicture): string {
  const uri = picture?.uri;
  if (!uri) return "/placeholder.svg";
  const resized = uri.replace("{w}", "800").replace("{h}", "600");
  return `https://eda.yandex.ru${resized}`;
}

export async function fetchYandexEdaMenu(): Promise<{
  categories: Category[];
  products: Product[];
  productsByCategory: Record<string, Product[]>;
}> {
  const res = await fetch(MENU_URL, {
    // важно: на дипломном этапе это ок; позже лучше делать свой бэкенд-слой и кэширование
    next: { revalidate: 60 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Yandex Eda menu fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as YResponse;
  const cats = data.payload?.categories ?? [];

  const categories: Category[] = cats.map((c, i) => {
    const title = c.name?.trim() || `Категория ${i + 1}`;
    const slugBase = c.dynamicId != null ? String(c.dynamicId) : title;
    return { slug: `cat-${toSlug(slugBase)}`, title };
  });

  // В API один и тот же товар может встречаться в нескольких категориях.
  // Для дипломного фронтенда удобнее показывать товар один раз (в "основной" категории).
  const productMap = new Map<string, Product>();
  const productsByCategory: Record<string, Product[]> = {};

  cats.forEach((c, idx) => {
    const category = categories[idx]?.slug ?? `cat-${idx + 1}`;
    productsByCategory[category] = productsByCategory[category] ?? [];
    const items = c.items ?? [];
    for (const it of items) {
      const title = it.name?.trim() || "Товар";
      const description = (it.description ?? "").trim();
      const price = Number.isFinite(it.price as number)
        ? Number(it.price)
        : Number.isFinite(it.decimalPrice as number)
          ? Number(it.decimalPrice)
          : 0;

      const productSlug = it.publicId ? `y-${it.publicId}` : `y-${it.id}`;
      const variantTitle = it.weight ? String(it.weight) : "Стандарт";

      if (productMap.has(productSlug)) continue;

      const product: Product = {
        slug: productSlug,
        title,
        description,
        category,
        imageUrl: imageUrlFromPicture(it.picture),
        variants: [{ id: "std", title: variantTitle, priceRub: Math.round(price) }],
      };
      productMap.set(productSlug, product);
      productsByCategory[category].push(product);
    }
  });

  const products = Array.from(productMap.values());
  return { categories, products, productsByCategory };
}


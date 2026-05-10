import { MenuFilters } from "@/components/MenuFilters";
import { ProductCard } from "@/components/ProductCard";
import { fetchCatalogFromDb } from "@/lib/catalog-db";
import type { CategorySlug } from "@/lib/types";
import { connection } from "next/server";

function toNumberOrNull(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = (await searchParams) ?? {};
  const { categories, products, productsByCategory } = await fetchCatalogFromDb();

  const category = (typeof sp.category === "string" ? sp.category : null) as CategorySlug | null;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase();
  const min = toNumberOrNull(sp.min);
  const max = toNumberOrNull(sp.max);
  const sort = typeof sp.sort === "string" ? sp.sort : "popular";

  const filtered = products
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => {
      if (!q) return true;
      const hay = `${p.title} ${p.description}`.toLowerCase();
      return hay.includes(q);
    })
    .filter((p) => {
      const prices = p.variants.map((v) => v.priceRub);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (min !== null && maxPrice < min) return false;
      if (max !== null && minPrice > max) return false;
      return true;
    })
    .slice();

  if (sort === "price_asc") {
    filtered.sort((a, b) => Math.min(...a.variants.map((v) => v.priceRub)) - Math.min(...b.variants.map((v) => v.priceRub)));
  } else if (sort === "price_desc") {
    filtered.sort((a, b) => Math.min(...b.variants.map((v) => v.priceRub)) - Math.min(...a.variants.map((v) => v.priceRub)));
  } else if (sort === "title") {
    filtered.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }

  const title = category ? categories.find((c) => c.slug === category)?.title ?? "Меню" : "Меню";

  const renderGrid = (list: typeof filtered) => (
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => (
        <ProductCard key={p.slug} product={p} href={`/product/${p.slug}`} />
      ))}
    </div>
  );

  const allowedSlugs = new Set(filtered.map((x) => x.slug));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
      </div>

      <MenuFilters categories={categories} />

      {filtered.length ? (
        category ? (
          renderGrid(filtered)
        ) : (
          <div className="grid gap-10">
            {categories.map((c) => {
              const list = (productsByCategory[c.slug] ?? []).filter((p) => allowedSlugs.has(p.slug));
              if (!list.length) return null;
              return (
                <section key={c.slug} className="grid gap-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="rounded-full bg-black px-3 py-1 text-lg font-extrabold tracking-tight text-white">
                      {c.title}
                    </h2>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>
                  {renderGrid(list)}
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">
          По текущим фильтрам ничего не найдено.
        </div>
      )}
    </div>
  );
}


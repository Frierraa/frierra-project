import Link from "next/link";
import { fetchCatalogFromDb } from "@/lib/catalog-db";
import { shop } from "@/lib/products";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const { categories } = await fetchCatalogFromDb();
  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#F57F17]/35 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-zinc-900/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F57F17]/15 px-3 py-1 text-xs font-extrabold text-black">
            {shop.city}, {shop.address}
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 md:text-5xl">
            {shop.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
            Заказывай бургеры, комбо, закуски, салаты и супы, десерты, напитки и соусы.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/menu"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F57F17] px-6 text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
            >
              Перейти в меню
            </Link>
            <Link
              href="/cart"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
            >
              Открыть корзину
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-extrabold text-white">Категории меню</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/menu?category=${c.slug}`}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md"
            >
              <div className="text-base font-extrabold text-zinc-900">{c.title}</div>
              <div className="mt-1 text-sm text-zinc-600">Смотреть товары</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

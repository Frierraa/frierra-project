"use client";

import type { Category, CategorySlug } from "@/lib/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

function setParam(params: URLSearchParams, key: string, value: string | null) {
  if (!value) params.delete(key);
  else params.set(key, value);
}

export function MenuFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  const activeCategory = (sp.get("category") as CategorySlug | null) ?? null;
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "popular";

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname],
  );

  const applyPrice = useCallback(() => {
    const next = new URLSearchParams(sp.toString());
    setParam(next, "min", min.trim() || null);
    setParam(next, "max", max.trim() || null);
    pushParams(next);
  }, [sp, min, max, pushParams]);

  const clear = useCallback(() => {
    router.push(pathname);
    setMin("");
    setMax("");
  }, [router, pathname]);

  const categoryButtons = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            next.delete("category");
            pushParams(next);
          }}
          className={[
            "rounded-full px-3 py-1.5 text-sm font-bold",
            activeCategory ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200" : "bg-zinc-900 text-white",
          ].join(" ")}
        >
          Все
        </button>
        {categories.map((c) => {
          const active = c.slug === activeCategory;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(sp.toString());
                next.set("category", c.slug);
                pushParams(next);
              }}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-bold",
                active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
              ].join(" ")}
            >
              {c.title}
            </button>
          );
        })}
      </div>
    ),
    [activeCategory, sp, pushParams, categories],
  );

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="grid gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-zinc-900">Категории</div>
          <div>{categoryButtons}</div>
        </div>

        <div className="flex flex-row flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <div className="text-sm font-extrabold text-zinc-900">Поиск</div>
            <input
              value={q}
              onChange={(e) => {
                const next = new URLSearchParams(sp.toString());
                const val = e.target.value;
                if (!val) next.delete("q");
                else next.set("q", val);
                pushParams(next);
              }}
              placeholder="Например: чиз, комбо, фри…"
              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <div className="text-sm font-extrabold text-zinc-900">Цена, ₽</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={min}
                onChange={(e) => setMin(e.target.value)}
                inputMode="numeric"
                placeholder="от"
                className="h-11 w-24 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
              />
              <input
                value={max}
                onChange={(e) => setMax(e.target.value)}
                inputMode="numeric"
                placeholder="до"
                className="h-11 w-24 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
              />
              <button
                type="button"
                onClick={applyPrice}
                className="h-11 rounded-xl bg-[#F57F17] px-4 text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
              >
                Ок
              </button>
            </div>
          </div>

          <div className="min-w-[190px]">
            <div className="text-sm font-extrabold text-zinc-900">Сортировка</div>
            <select
              value={sort}
              onChange={(e) => {
                const next = new URLSearchParams(sp.toString());
                next.set("sort", e.target.value);
                pushParams(next);
              }}
              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="popular">По популярности (демо)</option>
              <option value="price_asc">Цена: по возрастанию</option>
              <option value="price_desc">Цена: по убыванию</option>
              <option value="title">По названию</option>
            </select>
          </div>

          <button
            type="button"
            onClick={clear}
            className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}


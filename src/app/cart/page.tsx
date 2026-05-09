"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart";
import { formatRub } from "@/lib/format";

export default function CartPage() {
  const { items, setQty, removeItem, clear } = useCart();

  const total = useMemo(() => {
    return items.reduce((acc, x) => acc + x.priceRub * x.qty, 0);
  }, [items]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Корзина</h1>
        </div>
        {items.length ? (
          <button
            type="button"
            onClick={clear}
            className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            Очистить
          </button>
        ) : null}
      </div>

      {items.length ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3">
            {items.map((x) => {
              const price = x.priceRub;
              return (
                <div key={`${x.productSlug}:${x.variantId}`} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-zinc-900">
                        {x.title} — {x.variantTitle}
                      </div>
                      <div className="mt-1 text-xs font-bold text-zinc-600">{formatRub(price)} за шт.</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty({ productSlug: x.productSlug, variantId: x.variantId }, x.qty - 1)}
                        className="h-10 w-10 rounded-xl border border-black/10 bg-white text-sm font-extrabold hover:bg-zinc-100"
                        aria-label="Уменьшить"
                      >
                        −
                      </button>
                      <div className="w-10 text-center text-sm font-extrabold">{x.qty}</div>
                      <button
                        type="button"
                        onClick={() => setQty({ productSlug: x.productSlug, variantId: x.variantId }, x.qty + 1)}
                        className="h-10 w-10 rounded-xl border border-black/10 bg-white text-sm font-extrabold hover:bg-zinc-100"
                        aria-label="Увеличить"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem({ productSlug: x.productSlug, variantId: x.variantId })}
                        className="h-10 rounded-xl bg-zinc-900 px-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-sm font-extrabold text-zinc-900">Итого</div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">{formatRub(total)}</div>
            <div className="mt-4 grid gap-2">
              <Link
                href="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F57F17] px-6 text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
              >
                Оформить заказ
              </Link>
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
              >
                Вернуться в меню
              </Link>
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">
          Корзина пуста. Перейдите в{" "}
          <Link className="font-extrabold text-zinc-900 underline" href="/menu">
            меню
          </Link>
          .
        </div>
      )}
    </div>
  );
}


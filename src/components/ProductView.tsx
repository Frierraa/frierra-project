"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { formatRub } from "@/lib/format";
import { useCart } from "@/lib/cart";

export function ProductView({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "std");

  const selected = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100">
        <CatalogProductImage
          alt={product.title}
          src={product.imageUrl || "/placeholder.svg"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{product.title}</h1>
          {(product.badges ?? []).map((b) => (
            <span
              key={b}
              className={[
                "rounded-full px-2 py-0.5 text-xs font-bold",
                b === "Острое" ? "bg-red-600/15 text-red-700" : "bg-[#F57F17]/15 text-black",
              ].join(" ")}
            >
              {b}
            </span>
          ))}
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-600">{product.description}</p>

        {product.ingredients?.length ? (
          <div className="mt-4">
            <div className="text-sm font-extrabold text-zinc-900">Состав</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.ingredients.map((x) => (
                <span key={x} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                  {x}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-sm font-extrabold text-zinc-900">Вариант</div>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} — {formatRub(v.priceRub)}
              </option>
            ))}
          </select>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-lg font-extrabold text-zinc-900">{formatRub(selected?.priceRub ?? 0)}</div>
            <button
              type="button"
              onClick={() =>
                addItem({
                  productSlug: product.slug,
                  variantId,
                  title: product.title,
                  variantTitle: selected?.title ?? "Стандарт",
                  priceRub: selected?.priceRub ?? 0,
                  imageUrl: product.imageUrl || "/placeholder.svg",
                })
              }
              className="h-11 rounded-xl bg-[#F57F17] px-4 text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
            >
              В корзину
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


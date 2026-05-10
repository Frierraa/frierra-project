"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { formatRub } from "@/lib/format";
import { useCart } from "@/lib/cart";

export function ProductCard({ product, href }: { product: Product; href: string }) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "std");

  const selected = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
          <CatalogProductImage
            alt={product.title}
            src={product.imageUrl || "/placeholder.svg"}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition group-hover:scale-[1.03]"
            priority={false}
          />
        </div>
      </Link>

      <div className="flex h-full flex-col p-4">
        <div className="flex min-h-[3.25rem] flex-wrap content-start items-start gap-2">
          <h3 className="line-clamp-2 text-base font-extrabold tracking-tight text-zinc-900">{product.title}</h3>
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
        <p className="mt-1 min-h-[2.5rem] line-clamp-2 text-sm text-zinc-600">{product.description || "\u00A0"}</p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-zinc-900">{formatRub(selected?.priceRub ?? 0)}</div>
            <div className="text-xs text-zinc-500">{selected?.title}</div>
          </div>

          {product.variants.length > 1 ? (
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} — {formatRub(v.priceRub)}
                </option>
              ))}
            </select>
          ) : null}
        </div>

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
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#F57F17] text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
        >
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}


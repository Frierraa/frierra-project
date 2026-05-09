"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { shop } from "@/lib/products";

type MeResponse = {
  ok: boolean;
  user: { id: string; phone: string | null; name: string | null } | null;
};

export function Header() {
  const { items } = useCart();
  const pathname = usePathname();
  const count = useMemo(() => items.reduce((acc, x) => acc + x.qty, 0), [items]);
  const [me, setMe] = useState<MeResponse["user"] | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (cancelled) return;
        setMe(data?.user ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            <Image src="/logo.png" alt={`${shop.name} — логотип`} fill sizes="40px" className="object-contain" />
          </Link>
          <div className="min-w-0">
            <Link href="/" className="block font-extrabold tracking-tight text-zinc-900">
              {shop.name}
            </Link>
          <div className="truncate text-sm text-zinc-600">
            {shop.city}, {shop.address}
          </div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/menu"
            className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Меню
          </Link>
          {me === undefined ? null : me ? (
            <Link
              href="/orders"
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Профиль
            </Link>
          ) : (
            <Link
              href="/auth?redirect=/orders"
              className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Вход
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            Корзина
            {mounted && count > 0 ? (
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[#F57F17] px-2 py-0.5 text-xs font-extrabold text-white">
                {count}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}


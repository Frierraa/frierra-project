"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Modal({
  title,
  children,
  fallbackHref,
}: {
  title: string;
  children: React.ReactNode;
  fallbackHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/50"
        onClick={() => router.back()}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div className="text-sm font-extrabold text-zinc-900">{title}</div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl px-3 py-2 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            Закрыть
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-4">{children}</div>
        <div className="border-t border-black/10 p-3 text-xs text-zinc-500">
          Если “Назад” не работает (прямой вход по ссылке) — перейдите в меню:{" "}
          <a className="font-bold text-zinc-900 underline" href={fallbackHref}>
            {fallbackHref}
          </a>
        </div>
      </div>
    </div>
  );
}


import { shop } from "@/lib/products";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-zinc-600">
        <div className="font-semibold text-zinc-600">{shop.name}</div>
        <div>
          {shop.city}, {shop.address}
        </div>
      </div>
    </footer>
  );
}


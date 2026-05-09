import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { fetchProductBySlugFromDb } from "@/lib/catalog-db";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlugFromDb(slug);
  if (!product) return notFound();

  return (
    <div className="grid gap-6">
      <ProductView product={product} />
    </div>
  );
}


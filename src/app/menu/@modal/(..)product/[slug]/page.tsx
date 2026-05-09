import { notFound } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ProductView } from "@/components/ProductView";
import { fetchProductBySlugFromDb } from "@/lib/catalog-db";

export default async function ProductModalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlugFromDb(slug);
  if (!product) return notFound();

  return (
    <Modal title={product.title} fallbackHref="/menu">
      <ProductView product={product} />
    </Modal>
  );
}


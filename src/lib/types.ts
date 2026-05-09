export type CategorySlug = string;

export type Category = {
  slug: CategorySlug;
  title: string;
};

export type ProductVariant = {
  id: string;
  title: string; // например: "S 250 г", "M 320 г"
  priceRub: number;
};

export type Product = {
  slug: string;
  title: string;
  description: string;
  category: CategorySlug;
  imageUrl: string;
  badges?: Array<"Хит" | "Новинка" | "Острое" | "Вегетарианское">;
  variants: ProductVariant[];
  ingredients?: string[];
};

export type CartItem = {
  productSlug: string;
  variantId: string;
  title: string;
  variantTitle: string;
  priceRub: number;
  imageUrl: string;
  qty: number;
};


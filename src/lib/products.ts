import type { Category, CategorySlug, Product } from "@/lib/types";

export const categories: Category[] = [
  { slug: "burgers", title: "Бургеры" },
  { slug: "combo", title: "Комбо" },
  { slug: "snacks", title: "Закуски" },
  { slug: "soups-salads", title: "Салаты и супы" },
  { slug: "desserts", title: "Десерты" },
  { slug: "drinks", title: "Холодные напитки" },
  { slug: "sauces", title: "Соусы" },
];

export const shop = {
  name: "Бургер Сайз",
  city: "Нижний Новгород",
  address: "Варварская 4",
};

const img = (name: string) => `/placeholder.svg?item=${encodeURIComponent(name)}`;

export const products: Product[] = [
  {
    slug: "classic-burger",
    title: "Бургер Классик",
    description:
      "Говяжья котлета, сыр чеддер, салат айсберг, томаты, фирменный соус.",
    category: "burgers",
    imageUrl: img("classic-burger.jpg"),
    badges: ["Хит"],
    variants: [
      { id: "s", title: "S 250 г", priceRub: 289 },
      { id: "m", title: "M 320 г", priceRub: 349 },
    ],
    ingredients: ["Говядина", "Чеддер", "Салат", "Томаты", "Соус"],
  },
  {
    slug: "double-cheese",
    title: "Дабл Чиз",
    description:
      "Две говяжьи котлеты, двойной чеддер, лук, маринованные огурчики.",
    category: "burgers",
    imageUrl: img("double-cheese.jpg"),
    badges: ["Хит"],
    variants: [
      { id: "m", title: "M 360 г", priceRub: 429 },
      { id: "l", title: "L 440 г", priceRub: 499 },
    ],
    ingredients: ["Говядина", "Чеддер", "Лук", "Огурчики", "Соус"],
  },
  {
    slug: "spicy-chicken",
    title: "Спайси Чикен",
    description: "Куриная котлета, сыр, салат, острый соус, перец халапеньо.",
    category: "burgers",
    imageUrl: img("spicy-chicken.jpg"),
    badges: ["Острое"],
    variants: [
      { id: "s", title: "S 240 г", priceRub: 279 },
      { id: "m", title: "M 310 г", priceRub: 339 },
    ],
    ingredients: ["Курица", "Сыр", "Салат", "Халапеньо", "Острый соус"],
  },
  {
    slug: "combo-classic",
    title: "Комбо Классик",
    description: "Бургер Классик + картофель + напиток 0,5 л.",
    category: "combo",
    imageUrl: img("combo-classic.jpg"),
    badges: ["Хит"],
    variants: [{ id: "std", title: "Стандарт", priceRub: 529 }],
  },
  {
    slug: "fries",
    title: "Картофель фри",
    description: "Хрустящий картофель фри с солью.",
    category: "snacks",
    imageUrl: img("fries.jpg"),
    variants: [
      { id: "s", title: "S 90 г", priceRub: 149 },
      { id: "l", title: "L 140 г", priceRub: 199 },
    ],
  },
  {
    slug: "nuggets",
    title: "Наггетсы",
    description: "Нежные куриные наггетсы, 6 или 9 шт.",
    category: "snacks",
    imageUrl: img("nuggets.jpg"),
    variants: [
      { id: "6", title: "6 шт.", priceRub: 179 },
      { id: "9", title: "9 шт.", priceRub: 239 },
    ],
  },
  {
    slug: "caesar-salad",
    title: "Салат Цезарь",
    description: "Курица, салат ромэн, сухарики, пармезан, соус.",
    category: "soups-salads",
    imageUrl: img("caesar.jpg"),
    variants: [{ id: "std", title: "Порция", priceRub: 279 }],
  },
  {
    slug: "tomato-soup",
    title: "Томатный суп",
    description: "Согревающий суп с томатами и специями.",
    category: "soups-salads",
    imageUrl: img("tomato-soup.jpg"),
    variants: [{ id: "std", title: "Порция", priceRub: 239 }],
  },
  {
    slug: "cheesecake",
    title: "Чизкейк",
    description: "Классический сливочный чизкейк.",
    category: "desserts",
    imageUrl: img("cheesecake.jpg"),
    variants: [{ id: "std", title: "Кусочек", priceRub: 219 }],
  },
  {
    slug: "cola",
    title: "Кола",
    description: "Холодный газированный напиток.",
    category: "drinks",
    imageUrl: img("cola.jpg"),
    variants: [
      { id: "05", title: "0,5 л", priceRub: 139 },
      { id: "10", title: "1,0 л", priceRub: 199 },
    ],
  },
  {
    slug: "sauce-cheese",
    title: "Соус сырный",
    description: "Нежный сырный соус.",
    category: "sauces",
    imageUrl: img("cheese-sauce.jpg"),
    variants: [{ id: "std", title: "25 г", priceRub: 49 }],
  },
];

export function getCategoryTitle(slug: CategorySlug): string {
  return categories.find((c) => c.slug === slug)?.title ?? "Категория";
}

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}


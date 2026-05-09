"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatRub } from "@/lib/format";
import { shop } from "@/lib/products";
import { formatRuPhonePlus7, isValidRuLocal10, normalizeRuLocal10 } from "@/lib/phone";

type DeliveryMode = "pickup" | "delivery";
type MeResponse = { ok: true; user: { id: string; phone: string | null; name: string | null } | null };
type PaymentMethod = "cash" | "yookassa";

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const [mode, setMode] = useState<DeliveryMode>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [name, setName] = useState("");
  const [phoneLocal10, setPhoneLocal10] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apartment, setApartment] = useState("");
  const [streetOptions, setStreetOptions] = useState<string[]>([]);
  const [houseOptions, setHouseOptions] = useState<string[]>([]);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [created, setCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [me, setMe] = useState<MeResponse["user"] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    return items.reduce((acc, x) => acc + x.priceRub * x.qty, 0);
  }, [items]);

  const phoneNormalized = useMemo(() => formatRuPhonePlus7(phoneLocal10), [phoneLocal10]);
  const phoneOk = useMemo(() => isValidRuLocal10(phoneLocal10), [phoneLocal10]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "delivery" || street.trim().length < 2) {
      setStreetOptions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/address/streets?q=${encodeURIComponent(street)}`)
        .then((r) => r.json())
        .then((data: { ok: boolean; streets?: string[] }) => {
          if (cancelled) return;
          setStreetOptions(Array.isArray(data?.streets) ? data.streets : []);
        })
        .catch(() => {
          if (cancelled) return;
          setStreetOptions([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, street]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "delivery" || !street.trim() || house.trim().length < 1) {
      setHouseOptions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/address/houses?street=${encodeURIComponent(street)}&q=${encodeURIComponent(house)}`)
        .then((r) => r.json())
        .then((data: { ok: boolean; houses?: string[] }) => {
          if (cancelled) return;
          setHouseOptions(Array.isArray(data?.houses) ? data.houses : []);
        })
        .catch(() => {
          if (cancelled) return;
          setHouseOptions([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, street, house]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (cancelled) return;
        setMe(data.user);
        if (data.user?.name) setName((prev) => prev || data.user?.name || "");
        if (data.user?.phone) setPhoneLocal10((prev) => prev || normalizeRuLocal10(data.user?.phone || ""));
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (created) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
          Заказ создан{orderNumber ? ` №${orderNumber}` : ""}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Заказ сохранён в базе. Статус можно будет менять в админке на следующем этапе.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/menu"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-extrabold text-white hover:bg-black/90"
          >
            Вернуться в меню
          </Link>
          <Link
            href="/orders"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#F57F17] px-6 text-sm font-extrabold text-white hover:bg-[#F57F17]/90"
          >
            Мои заказы
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">
        Нечего оформлять — корзина пуста. Перейдите в{" "}
        <Link className="font-extrabold text-zinc-900 underline" href="/menu">
          меню
        </Link>
        .
      </div>
    );
  }

  if (me === undefined) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">
        Проверяем авторизацию…
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Нужен вход</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Чтобы сохранить заказ и видеть историю/статус — войдите по телефону.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth?redirect=/checkout"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-extrabold text-white hover:bg-black/90"
          >
            Войти
          </Link>
          <Link
            href="/cart"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            Вернуться в корзину
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Оформление заказа</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Проверьте данные перед созданием заказа.
        </p>

        <div className="mt-6 grid gap-4">
          <div>
            <div className="text-sm font-extrabold text-zinc-900">Способ получения</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("delivery")}
                className={[
                  "h-11 rounded-2xl px-4 text-sm font-extrabold",
                  mode === "delivery" ? "bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
                ].join(" ")}
              >
                Доставка
              </button>
              <button
                type="button"
                onClick={() => setMode("pickup")}
                className={[
                  "h-11 rounded-2xl px-4 text-sm font-extrabold",
                  mode === "pickup" ? "bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
                ].join(" ")}
              >
                Самовывоз
              </button>
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              {mode === "pickup" ? (
                <>
                  Забрать можно по адресу: <span className="font-bold text-zinc-900">{shop.city}, {shop.address}</span>
                </>
              ) : (
                <>Укажи адрес доставки ниже.</>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-extrabold text-zinc-900">Оплата</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={[
                  "h-11 rounded-2xl px-4 text-sm font-extrabold",
                  paymentMethod === "cash" ? "bg-zinc-900 text-white" : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
                ].join(" ")}
              >
                При получении
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("yookassa")}
                className={[
                  "h-11 rounded-2xl px-4 text-sm font-extrabold",
                  paymentMethod === "yookassa"
                    ? "bg-[#F57F17] text-white"
                    : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
                ].join(" ")}
              >
                Онлайн (ЮKassa)
              </button>
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              {paymentMethod === "yookassa" ? "После создания заказа откроется страница оплаты." : "Оплата наличными/переводом при получении."}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-zinc-900">Имя</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван"
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-zinc-900">Телефон</span>
              <div className="flex items-center gap-2">
                <div className="h-11 rounded-xl border border-black/10 bg-zinc-50 px-3 text-sm font-extrabold text-zinc-900 flex items-center">
                  +7
                </div>
                <input
                  value={normalizeRuLocal10(phoneLocal10)}
                  onChange={(e) => setPhoneLocal10(normalizeRuLocal10(e.target.value))}
                  placeholder="9991234567"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>
              <div className="text-xs font-semibold text-zinc-600">
                Нужно <span className="font-extrabold text-zinc-900">10 цифр</span>. Будет сохранён как:{" "}
                <span className="font-extrabold text-zinc-900">{phoneOk ? phoneNormalized : "—"}</span>
              </div>
            </label>
          </div>

          {mode === "delivery" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-extrabold text-zinc-900">Улица (Нижний Новгород)</span>
                <input
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    setAddressError(null);
                  }}
                  list="street-options"
                  placeholder="Начните вводить улицу..."
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                />
                <datalist id="street-options">
                  {streetOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-extrabold text-zinc-900">Дом</span>
                <input
                  value={house}
                  onChange={(e) => {
                    setHouse(e.target.value);
                    setAddressError(null);
                  }}
                  list="house-options"
                  placeholder="Напр. 14"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                />
                <datalist id="house-options">
                  {houseOptions.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-2 sm:col-span-1">
                <span className="text-sm font-extrabold text-zinc-900">Квартира (необязательно)</span>
                <input
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="Напр. 56"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                />
              </label>
              {addressError ? (
                <div className="sm:col-span-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                  {addressError}
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-extrabold text-zinc-900">Комментарий</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: без лука, позвонить за 5 минут..."
              className="min-h-24 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
            />
          </label>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const res = await fetch("/api/orders/create", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    deliveryType: mode,
                    paymentMethod,
                    customerName: name,
                    customerPhone: phoneNormalized,
                    deliveryStreet: mode === "delivery" ? street : undefined,
                    deliveryHouse: mode === "delivery" ? house : undefined,
                    deliveryApartment: mode === "delivery" ? apartment : undefined,
                    comment,
                    items: items.map((x) => ({
                      productSlug: x.productSlug,
                      variantId: x.variantId,
                      qty: x.qty,
                    })),
                  }),
                });
                const data = (await res.json().catch(() => null)) as any;
                if (!res.ok || !data?.ok) throw new Error(data?.error || "CREATE_FAILED");
                setOrderNumber(data.order?.number ?? null);
                clear();
                if (paymentMethod === "yookassa" && data?.payment?.confirmationUrl) {
                  window.location.href = String(data.payment.confirmationUrl);
                  return;
                }
                setCreated(true);
              } catch (e) {
                const msg = e instanceof Error ? e.message : "CREATE_FAILED";
                if (msg === "HOUSE_NOT_FOUND_ON_STREET") {
                  setAddressError("Такого дома нет на выбранной улице. Проверьте улицу и номер дома.");
                  setError(null);
                } else {
                  setAddressError(null);
                  setError(msg);
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !name.trim() || !phoneOk || (mode === "delivery" && (!street.trim() || !house.trim()))}
            className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F57F17] px-6 text-sm font-extrabold text-white enabled:hover:bg-[#F57F17]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Создаём заказ…" : "Подтвердить заказ"}
          </button>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              Ошибка: {error}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="h-fit rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="text-sm font-extrabold text-zinc-900">Сумма заказа</div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">{formatRub(total)}</div>
        <div className="mt-5">
          <Link
            href="/cart"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
          >
            Вернуться в корзину
          </Link>
        </div>
      </aside>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AdminUser = { id: string; email: string; role: "ADMIN" | "MANAGER"; name: string | null };
type Tab = "orders" | "users" | "categories" | "products" | "variants";

export function AdminDashboard({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [payload, setPayload] = useState<any[]>([]);
  const [ordersDate, setOrdersDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [usersGroup, setUsersGroup] = useState<"all" | "system" | "customers">("all");
  const [usersSearch, setUsersSearch] = useState("");
  const canAdmin = user.role === "ADMIN";
  const tabs = useMemo<Tab[]>(() => (canAdmin ? ["orders", "users", "categories", "products", "variants"] : ["orders"]), [canAdmin]);

  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  async function reload() {
    const endpoint =
      tab === "orders"
        ? `/api/admin/orders?date=${encodeURIComponent(ordersDate)}`
        : tab === "users"
          ? `/api/admin/users?group=${usersGroup}${usersGroup === "customers" && usersSearch.trim() ? `&q=${encodeURIComponent(usersSearch.trim())}` : ""}`
          : tab === "categories"
            ? "/api/admin/categories"
            : tab === "products"
              ? "/api/admin/products"
              : "/api/admin/variants?onlyCombo=1";
    const res = await fetch(endpoint, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok || !data?.ok) {
      setPayload([]);
      return;
    }
    const rows = data.orders || data.users || data.categories || data.products || data.variants || [];
    setPayload(rows);
  }

  useEffect(() => {
    reload().catch(() => setPayload([]));
  }, [tab, ordersDate, usersGroup, usersSearch]);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Административная панель</h1>
            <p className="text-sm text-zinc-600">
              {user.email} ({user.role})
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              router.replace("/control/login");
              router.refresh();
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={[
              "h-10 rounded-2xl px-4 text-sm font-extrabold",
              x === tab ? "bg-black text-white" : "border border-black/10 bg-white text-zinc-900 hover:bg-zinc-100",
            ].join(" ")}
          >
            {x === "orders"
              ? "Заказы"
              : x === "users"
                ? "Пользователи"
                : x === "categories"
                  ? "Категории"
                  : x === "products"
                    ? "Продукты"
                    : "Комбо"}
          </button>
        ))}
      </div>

      <AdminTabBody
        tab={tab}
        rows={payload}
        canAdmin={canAdmin}
        onChanged={reload}
        ordersDate={ordersDate}
        setOrdersDate={setOrdersDate}
        usersGroup={usersGroup}
        setUsersGroup={setUsersGroup}
        usersSearch={usersSearch}
        setUsersSearch={setUsersSearch}
      />
    </div>
  );
}

function AdminTabBody({
  tab,
  rows,
  canAdmin,
  onChanged,
  ordersDate,
  setOrdersDate,
  usersGroup,
  setUsersGroup,
  usersSearch,
  setUsersSearch,
}: {
  tab: Tab;
  rows: any[];
  canAdmin: boolean;
  onChanged: () => Promise<void>;
  ordersDate: string;
  setOrdersDate: (value: string) => void;
  usersGroup: "all" | "system" | "customers";
  setUsersGroup: (value: "all" | "system" | "customers") => void;
  usersSearch: string;
  setUsersSearch: (value: string) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openedOrders, setOpenedOrders] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<Array<{ id: string; title: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; title: string }>>([]);
  const [comboSelections, setComboSelections] = useState<Record<string, string>>({});
  const [comboSearch, setComboSearch] = useState("");

  function humanizeError(raw: string): string {
    if (raw === "INVALID_INPUT") return "Проверьте обязательные поля: название, категория, цена.";
    if (raw === "COMBO_ITEMS_REQUIRED") return "Добавьте хотя бы одну позицию в комбо.";
    if (raw === "FILE_REQUIRED") return "Выберите файл изображения.";
    if (raw === "IMAGE_UPLOAD_FAILED") return "Не удалось загрузить изображение. Повторите попытку.";
    if (raw === "ADMIN_UNAUTHORIZED") return "Сессия истекла. Войдите заново.";
    if (raw === "ADMIN_FORBIDDEN") return "Недостаточно прав для выполнения операции.";
    return raw || "Не удалось сохранить изменения.";
  }

  useEffect(() => {
    if (!canAdmin) return;
    if (tab === "products" || tab === "variants") {
      fetch("/api/admin/categories", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: any) => {
          if (!Array.isArray(d?.categories)) {
            setCategories([]);
            return;
          }
          const seen = new Set<string>();
          const unique = d.categories
            .filter((x: any) => x?.isActive !== false)
            .map((x: any) => ({ id: String(x.id), title: String(x.title) }))
            .filter((x: { id: string; title: string }) => {
              const key = x.title.trim().toLowerCase();
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          setCategories(unique);
        })
        .catch(() => setCategories([]));
      fetch("/api/admin/products", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: any) =>
          setProducts(
            Array.isArray(d?.products)
              ? d.products
                  .filter((x: any) => x?.isActive !== false)
                  .map((x: any) => ({ id: String(x.id), title: String(x.title) }))
                  .sort((a: { id: string; title: string }, b: { id: string; title: string }) => a.title.localeCompare(b.title, "ru"))
              : [],
          ),
        )
        .catch(() => setProducts([]));
    }
  }, [tab, canAdmin]);

  useEffect(() => {
    if (!categories.length) return;
    setForm((prev) => {
      const next = { ...prev };
      if (tab === "products" && !next.categoryId) next.categoryId = categories[0].id;
      if (tab === "variants" && !next.comboProductCategoryId) next.comboProductCategoryId = categories[0].id;
      return next;
    });
  }, [categories, tab]);

  async function save() {
    if (tab === "orders") return;
    if (!canAdmin) return;
    setError(null);
    if (tab === "users") {
      const res = await fetch("/api/admin/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          email: form.email || "",
          name: form.name || "",
          role: (form.role as any) || "MANAGER",
          password: form.password || "",
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.error || "SAVE_FAILED");
    } else if (tab === "categories") {
      const res = await fetch("/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          title: form.title || "",
          sortOrder: Number(form.sortOrder || "0"),
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.error || "SAVE_FAILED");
    } else if (tab === "products") {
      if (!form.categoryId) throw new Error("INVALID_INPUT");
      let imageUrl = form.imageUrl || "";
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        const upRes = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
        const upData = (await upRes.json().catch(() => null)) as any;
        if (!upRes.ok || !upData?.ok || !upData?.url) throw new Error(upData?.error || "IMAGE_UPLOAD_FAILED");
        imageUrl = upData.url;
      }
      const res = await fetch("/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          title: form.title || "",
          description: form.description || "",
          categoryId: form.categoryId || "",
          ...(editingId ? {} : { priceRub: Number(form.priceRub || "0"), weightGram: Number(form.weightGram || "0") }),
          imageUrl,
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.error || "SAVE_FAILED");
    } else if (tab === "variants") {
      if (!form.comboProductCategoryId) throw new Error("INVALID_INPUT");
      let comboProductImageUrl = form.comboProductImageUrl || "";
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        const upRes = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
        const upData = (await upRes.json().catch(() => null)) as any;
        if (!upRes.ok || !upData?.ok || !upData?.url) throw new Error(upData?.error || "IMAGE_UPLOAD_FAILED");
        comboProductImageUrl = upData.url;
      }
      const comboItems = Object.entries(comboSelections)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([productId, qty]) => ({ productId, qty: Math.max(1, Number(qty) || 1) }));
      const res = await fetch("/api/admin/variants", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          comboProductTitle: form.comboProductTitle || "",
          comboProductDescription: form.comboProductDescription || "",
          comboProductCategoryId: form.comboProductCategoryId || "",
          comboProductImageUrl,
          title: form.title || "",
          priceRub: Number(form.priceRub || "0"),
          sku: form.sku || "",
          comboItems,
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) throw new Error(data?.error || "SAVE_FAILED");
    }
    try {
      setForm({});
      setFile(null);
      setComboSelections({});
      setEditingId(null);
      await onChanged();
    } catch {
      setError("Не удалось обновить список после сохранения");
    }
  }

  return (
    <div className="grid gap-3">
      {tab === "orders" ? (
        <div className="grid gap-2">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-zinc-600">Дата</span>
                <input
                  type="date"
                  value={ordersDate}
                  onChange={(e) => setOrdersDate(e.target.value)}
                  className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                />
              </label>
              <div className="grid gap-1 text-right">
                <div className="text-xs font-bold text-zinc-600">Выручка за день (Доставлен)</div>
                <div className="text-lg font-extrabold text-zinc-900">
                  {rows
                    .filter((o) => o?.status === "DONE")
                    .reduce((sum, o) => sum + (Number(o?.totalRub) || 0), 0)}{" "}
                  руб.
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold text-zinc-600">
              Заказов за день: <span className="font-extrabold text-zinc-900">{rows.length}</span>
            </div>
          </div>
          {rows.map((o) => (
            <div key={o.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-bold text-zinc-900">
                  Заказ #{o.number} — {o.customerName} — {o.totalRub} руб.
                  {o?.createdAt ? (
                    <span className="ml-2 text-xs font-semibold text-zinc-600">
                      {new Intl.DateTimeFormat("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Moscow",
                      }).format(new Date(o.createdAt))}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenedOrders((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-extrabold text-zinc-900 hover:bg-zinc-100"
                  >
                    {openedOrders[o.id] ? "Скрыть детали" : "Детали"}
                  </button>
                  <select
                    value={o.status}
                    onChange={async (e) => {
                      await fetch("/api/admin/orders", {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ id: o.id, status: e.target.value }),
                      });
                      await onChanged();
                    }}
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900"
                  >
                    <option value="NEW">Новый</option>
                    <option value="PAID">Оплачен</option>
                    <option value="COOKING">Принят в работу</option>
                    <option value="DELIVERING">В доставке</option>
                    <option value="DONE">Доставлен</option>
                    <option value="CANCELLED">Отменён</option>
                  </select>
                  <button
                    onClick={async () => {
                      await fetch(`/api/admin/orders?id=${encodeURIComponent(String(o.id))}`, { method: "DELETE" });
                      await onChanged();
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-extrabold text-red-700 hover:bg-red-100"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {openedOrders[o.id] ? (
                <div className="mt-3 grid gap-1 text-sm text-zinc-700">
                  <div>Телефон: {o.customerPhone}</div>
                  <div>Доставка: {o.deliveryType === "DELIVERY" ? "Курьер" : "Самовывоз"}</div>
                  {o.deliveryAddress ? <div>Адрес: {o.deliveryAddress}</div> : null}
                  {o.comment ? <div>Комментарий: {o.comment}</div> : null}
                  {o.payment ? <div>Оплата: {o.payment.status}</div> : null}
                  <div className="font-semibold text-zinc-900">
                    Состав: {(o.items || []).map((x: any) => `${x.titleSnapshot} (${x.variantSnapshot}) x${x.qty}`).join(", ")}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {tab === "users" ? (
                <>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-bold text-zinc-600">Группа</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setUsersGroup("all")}
                        className={`h-9 rounded-xl px-3 text-xs font-extrabold ${usersGroup === "all" ? "bg-black text-white" : "border border-black/10 bg-white text-zinc-900"}`}
                      >
                        Все
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsersGroup("system")}
                        className={`h-9 rounded-xl px-3 text-xs font-extrabold ${usersGroup === "system" ? "bg-black text-white" : "border border-black/10 bg-white text-zinc-900"}`}
                      >
                        Админ/менеджер
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsersGroup("customers")}
                        className={`h-9 rounded-xl px-3 text-xs font-extrabold ${usersGroup === "customers" ? "bg-black text-white" : "border border-black/10 bg-white text-zinc-900"}`}
                      >
                        Покупатели
                      </button>
                    </div>
                  </label>
                  {usersGroup === "customers" ? (
                    <Input label="Поиск покупателя (телефон/email/имя)" value={usersSearch} onChange={setUsersSearch} />
                  ) : (
                    <div />
                  )}
                  <Input label="Email" value={form.email || ""} onChange={(v) => setForm((s) => ({ ...s, email: v }))} />
                  <Input label="Имя" value={form.name || ""} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
                  <Input label="Роль (ADMIN/MANAGER/USER)" value={form.role || "MANAGER"} onChange={(v) => setForm((s) => ({ ...s, role: v }))} />
                  <Input label="Пароль" value={form.password || ""} onChange={(v) => setForm((s) => ({ ...s, password: v }))} />
                </>
              ) : null}
              {tab === "categories" ? (
                <>
                  <Input label="Название" value={form.title || ""} onChange={(v) => setForm((s) => ({ ...s, title: v }))} />
                  <Input label="Порядок" value={form.sortOrder || "0"} onChange={(v) => setForm((s) => ({ ...s, sortOrder: v }))} />
                </>
              ) : null}
              {tab === "products" ? (
                <>
                  <Input label="Название" value={form.title || ""} onChange={(v) => setForm((s) => ({ ...s, title: v }))} />
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-zinc-600">Категория</span>
                    <select
                      value={form.categoryId || ""}
                      onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900"
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input label="Цена (руб)" value={form.priceRub || ""} onChange={(v) => setForm((s) => ({ ...s, priceRub: v }))} />
                  <Input label="Граммовка (г)" value={form.weightGram || ""} onChange={(v) => setForm((s) => ({ ...s, weightGram: v }))} />
                  <Input label="Описание" value={form.description || ""} onChange={(v) => setForm((s) => ({ ...s, description: v }))} />
                  <Input label="URL картинки (или файл ниже)" value={form.imageUrl || ""} onChange={(v) => setForm((s) => ({ ...s, imageUrl: v }))} />
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-zinc-600">Файл картинки</span>
                    <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </>
              ) : null}
              {tab === "variants" ? (
                <>
                  <Input label="Название комбо" value={form.comboProductTitle || ""} onChange={(v) => setForm((s) => ({ ...s, comboProductTitle: v }))} />
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-zinc-600">Категория комбо</span>
                    <select
                      value={form.comboProductCategoryId || ""}
                      onChange={(e) => setForm((s) => ({ ...s, comboProductCategoryId: e.target.value }))}
                      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900"
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Описание комбо"
                    value={form.comboProductDescription || ""}
                    onChange={(v) => setForm((s) => ({ ...s, comboProductDescription: v }))}
                  />
                  <Input
                    label="URL картинки комбо (или файл ниже)"
                    value={form.comboProductImageUrl || ""}
                    onChange={(v) => setForm((s) => ({ ...s, comboProductImageUrl: v }))}
                  />
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-zinc-600">Файл картинки комбо</span>
                    <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <Input label="Название вариации" value={form.title || ""} onChange={(v) => setForm((s) => ({ ...s, title: v }))} />
                  <Input label="Цена (руб)" value={form.priceRub || ""} onChange={(v) => setForm((s) => ({ ...s, priceRub: v }))} />
                  <Input label="SKU (необязательно)" value={form.sku || ""} onChange={(v) => setForm((s) => ({ ...s, sku: v }))} />
                  <div className="sm:col-span-2 grid gap-2">
                    <span className="text-xs font-bold text-zinc-600">Позиции в комбо (выберите из списка)</span>
                    <input
                      value={comboSearch}
                      onChange={(e) => setComboSearch(e.target.value)}
                      placeholder="Поиск позиции..."
                      className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                    />
                    <div className="max-h-64 overflow-auto rounded-xl border border-black/10 p-2">
                      {products.length ? (
                        <div className="grid gap-2">
                          {products.filter((p) => p.title.toLowerCase().includes(comboSearch.trim().toLowerCase())).map((p) => {
                            const checked = Object.prototype.hasOwnProperty.call(comboSelections, p.id);
                            return (
                              <label key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2">
                                <span className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const isChecked = e.target.checked;
                                      setComboSelections((prev) => {
                                        const next = { ...prev };
                                        if (isChecked) next[p.id] = next[p.id] || "1";
                                        else delete next[p.id];
                                        return next;
                                      });
                                    }}
                                  />
                                  <span className="truncate text-sm font-semibold text-zinc-900">{p.title}</span>
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  disabled={!checked}
                                  value={checked ? comboSelections[p.id] : ""}
                                  onChange={(e) =>
                                    setComboSelections((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value || "1",
                                    }))
                                  }
                                  className="h-9 w-24 rounded-lg border border-black/10 bg-white px-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
                                  placeholder="Кол-во"
                                />
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-zinc-500">Список продуктов пуст.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <button
              onClick={async () => {
                try {
                  await save();
                } catch (e) {
                  setError(humanizeError(e instanceof Error ? e.message : "SAVE_FAILED"));
                }
              }}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-extrabold text-white hover:bg-black/90"
            >
              {editingId ? "Сохранить изменения" : "Добавить"}
            </button>
            {editingId ? (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({});
                  setFile(null);
                  setComboSelections({});
                  setError(null);
                }}
                className="ml-2 mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
              >
                Отменить редактирование
              </button>
            ) : null}
            {error ? <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</div> : null}
          </div>

          <div className="grid gap-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3">
                <div className="min-w-0 text-sm font-semibold text-zinc-900 truncate">
                  {tab === "users"
                    ? `${row.email} (${row.role})${row.phone ? ` • ${row.phone}` : ""}`
                    : tab === "categories"
                      ? `${row.title} [${row.slug}]`
                      : tab === "products"
                        ? `${row.title} (${row.category?.title || "без категории"})`
                        : `${row.product?.title || "-"} — ${row.title}${row.product?.category?.title ? ` (${row.product.category.title})` : ""}`}
                </div>
                <div className="flex items-center gap-2">
                  {tab === "products" ? (
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/products", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
                        });
                        await onChanged();
                      }}
                      className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-extrabold ${row.isActive ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    >
                      {row.isActive ? "Остановить продажи" : "Возобновить продажи"}
                    </button>
                  ) : null}
                  {tab === "variants" ? (
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/variants", {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
                        });
                        await onChanged();
                      }}
                      className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-extrabold ${row.isActive ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    >
                      {row.isActive ? "Остановить продажи" : "Возобновить продажи"}
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setEditingId(String(row.id));
                      if (tab === "categories") {
                        setForm({
                          title: String(row.title || ""),
                          sortOrder: String(row.sortOrder ?? 0),
                        });
                      } else if (tab === "products") {
                        setForm({
                          title: String(row.title || ""),
                          description: String(row.description || ""),
                          categoryId: String(row.category?.id || ""),
                          imageUrl: String(row.imageUrl || ""),
                          priceRub: String(row.variants?.[0]?.priceRub ?? ""),
                          weightGram: "",
                        });
                      } else if (tab === "variants") {
                        setForm({
                          title: String(row.title || ""),
                          priceRub: String(row.priceRub ?? ""),
                          sku: String(row.sku || ""),
                        });
                        const nextCombo: Record<string, string> = {};
                        for (const item of row.comboItems || []) nextCombo[String(item.productId)] = String(item.qty || 1);
                        setComboSelections(nextCombo);
                      } else if (tab === "users") {
                        setForm({
                          email: String(row.email || ""),
                          name: String(row.name || ""),
                          role: String(row.role || "MANAGER"),
                        });
                      }
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-extrabold text-zinc-900 hover:bg-zinc-100"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={async () => {
                      const endpoint =
                        tab === "users"
                          ? `/api/admin/users?id=${row.id}`
                          : tab === "categories"
                            ? `/api/admin/categories?id=${row.id}`
                            : tab === "products"
                              ? `/api/admin/products?id=${row.id}`
                              : `/api/admin/variants?id=${row.id}`;
                      await fetch(endpoint, { method: "DELETE" });
                      await onChanged();
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-extrabold text-red-700 hover:bg-red-100"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
      />
    </label>
  );
}


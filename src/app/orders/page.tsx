import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRub } from "@/lib/format";
import { LogoutButton } from "@/components/LogoutButton";

const statusTitle: Record<string, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  COOKING: "Готовится",
  DELIVERING: "В пути",
  DONE: "Готов",
  CANCELLED: "Отменён",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?redirect=/orders");
  await prisma.order.updateMany({
    where: {
      userId: user.id,
      status: { in: ["NEW", "COOKING", "DELIVERING"] },
      payment: { is: { status: "SUCCEEDED" } },
    },
    data: { status: "PAID" },
  });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true, payment: true },
    take: 50,
  });

  const currentOrders = orders.filter((o) => o.status !== "DONE" && o.status !== "CANCELLED");
  const pastOrders = orders.filter((o) => o.status === "DONE" || o.status === "CANCELLED");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Мои заказы</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <LogoutButton />
        </div>
      </div>

      {currentOrders.length ? (
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold text-zinc-900">Текущие заказы</div>
          <div className="mt-3 grid gap-3">
            {currentOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-extrabold text-zinc-900">№{o.number}</div>
                  <span className="rounded-full bg-[#F57F17]/15 px-3 py-1 text-xs font-extrabold text-black">
                    {statusTitle[o.status] ?? o.status}
                  </span>
                  <span className="text-sm font-semibold text-zinc-600">{formatRub(o.totalRub)}</span>
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  Создан:{" "}
                  <span className="font-bold text-zinc-900">
                    {new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Moscow",
                    }).format(o.createdAt)}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-zinc-700">
                  <div>Телефон: {o.customerPhone}</div>
                  <div>Доставка: {o.deliveryType === "DELIVERY" ? "Курьер" : "Самовывоз"}</div>
                  {o.deliveryAddress ? <div>Адрес: {o.deliveryAddress}</div> : null}
                  {o.comment ? <div>Комментарий: {o.comment}</div> : null}
                  {o.payment ? <div>Оплата: {o.payment.status}</div> : null}
                  <div className="font-semibold text-zinc-900">
                    Состав: {o.items.map((x) => `${x.titleSnapshot} (${x.variantSnapshot}) x${x.qty}`).join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pastOrders.length ? (
        <div className="grid gap-3">
          <div className="text-sm font-extrabold text-white">Прошлые заказы</div>
          {pastOrders.map((o) => (
            <div key={o.id} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-zinc-900">Заказ №{o.number}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-600">
                    {new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Moscow",
                    }).format(o.createdAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold text-zinc-900">
                    {statusTitle[o.status] ?? o.status}
                  </span>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold text-zinc-900">
                    {o.items.reduce((acc, x) => acc + x.qty, 0)} шт.
                  </span>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold text-zinc-900">
                    {formatRub(o.totalRub)}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-zinc-700">
                <div>Телефон: {o.customerPhone}</div>
                <div>Доставка: {o.deliveryType === "DELIVERY" ? "Курьер" : "Самовывоз"}</div>
                {o.deliveryAddress ? <div>Адрес: {o.deliveryAddress}</div> : null}
                {o.comment ? <div>Комментарий: {o.comment}</div> : null}
                {o.payment ? <div>Оплата: {o.payment.status}</div> : null}
                <div className="font-semibold text-zinc-900">
                  Состав: {o.items.map((x) => `${x.titleSnapshot} (${x.variantSnapshot}) x${x.qty}`).join(", ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !currentOrders.length ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">
          Пока нет заказов. Перейдите в{" "}
          <Link className="font-extrabold text-zinc-900 underline" href="/menu">
            меню
          </Link>
          , добавьте товары в корзину и оформите заказ.
        </div>
      ) : null}
    </div>
  );
}


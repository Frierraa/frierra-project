import { NextRequest } from "next/server";
import { getCurrentUser, isValidRuPhonePlus7, normalizePhone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateNnHouse } from "@/lib/nnAddress";
import { yookassaCreatePayment } from "@/lib/yookassa";

export const runtime = "nodejs";

type CreateOrderBody = {
  deliveryType: "delivery" | "pickup";
  paymentMethod?: "cash" | "yookassa";
  customerName: string;
  customerPhone: string;
  deliveryStreet?: string;
  deliveryHouse?: string;
  deliveryApartment?: string;
  deliveryAddress?: string;
  comment?: string;
  items: Array<{
    productSlug: string;
    variantId: string; // ожидаем sku
    qty: number;
  }>;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as CreateOrderBody | null;
  if (!body?.items?.length) return Response.json({ ok: false, error: "EMPTY_CART" }, { status: 400 });

  const deliveryType = body.deliveryType === "pickup" ? "PICKUP" : "DELIVERY";
  const customerName = (body.customerName || "").trim();
  const customerPhone = normalizePhone(body.customerPhone || user.phone || "");
  const deliveryStreet = (body.deliveryStreet || "").trim();
  const deliveryHouse = (body.deliveryHouse || "").trim();
  const deliveryApartment = (body.deliveryApartment || "").trim();
  const comment = (body.comment || "").trim();
  const paymentMethod = body.paymentMethod === "yookassa" ? "yookassa" : "cash";

  if (!customerName || !customerPhone || !isValidRuPhonePlus7(customerPhone)) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  let deliveryAddress: string | null = null;
  if (deliveryType === "DELIVERY") {
    if (!deliveryStreet || !deliveryHouse) {
      return Response.json({ ok: false, error: "ADDRESS_REQUIRED" }, { status: 400 });
    }
    const houseOk = await validateNnHouse(deliveryStreet, deliveryHouse).catch(() => false);
    if (!houseOk) {
      return Response.json({ ok: false, error: "HOUSE_NOT_FOUND_ON_STREET" }, { status: 400 });
    }
    deliveryAddress = `г. Нижний Новгород, ул. ${deliveryStreet}, д. ${deliveryHouse}${deliveryApartment ? `, кв. ${deliveryApartment}` : ""}`;
  }

  const items = body.items
    .map((x) => ({
      variantSku: String(x.variantId || "").trim(),
      qty: Math.max(1, Math.min(99, Number(x.qty) || 1)),
    }))
    .filter((x) => x.variantSku.length > 0);
  if (!items.length) return Response.json({ ok: false, error: "INVALID_ITEMS" }, { status: 400 });

  const variants = await prisma.productVariant.findMany({
    where: { sku: { in: items.map((x) => x.variantSku) }, isActive: true, product: { isActive: true, category: { isActive: true } } },
    include: { product: true },
  });
  const bySku = new Map(variants.map((v) => [v.sku || "", v] as const));

  const lines = items
    .map((x) => {
      const v = bySku.get(x.variantSku);
      if (!v) return null;
      const price = v.priceRub;
      return {
        variantId: v.id,
        titleSnapshot: v.product.title,
        variantSnapshot: v.title,
        priceRubSnapshot: price,
        qty: x.qty,
        lineTotalRub: price * x.qty,
      };
    })
    .filter(Boolean) as Array<{
      variantId: string;
      titleSnapshot: string;
      variantSnapshot: string;
      priceRubSnapshot: number;
      qty: number;
      lineTotalRub: number;
    }>;

  if (!lines.length) return Response.json({ ok: false, error: "PRODUCTS_NOT_FOUND" }, { status: 400 });

  const itemsTotalRub = lines.reduce((acc, x) => acc + x.lineTotalRub, 0);
  const deliveryFeeRub = 0;
  const totalRub = itemsTotalRub + deliveryFeeRub;

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
    const nextNumber = (last?.number ?? 0) + 1;

    return await tx.order.create({
      data: {
        number: nextNumber,
        status: "NEW",
        deliveryType,
        customerName,
        customerPhone,
        deliveryAddress,
        comment: comment || null,
        itemsTotalRub,
        deliveryFeeRub,
        totalRub,
        userId: user.id,
        items: {
          create: lines.map((l) => ({
            titleSnapshot: l.titleSnapshot,
            variantSnapshot: l.variantSnapshot,
            priceRubSnapshot: l.priceRubSnapshot,
            qty: l.qty,
            lineTotalRub: l.lineTotalRub,
            variantId: l.variantId,
          })),
        },
      },
      select: { id: true, number: true, totalRub: true },
    });
  });

  if (paymentMethod !== "yookassa") {
    return Response.json({ ok: true, order: created, payment: null });
  }

  const origin = req.nextUrl.origin;
  const configuredReturnUrl = (process.env.YOOKASSA_RETURN_URL || "").trim();
  const returnUrl = configuredReturnUrl || `${origin}/orders`;

  try {
    const { payment, confirmationUrl } = await yookassaCreatePayment({
      amountRub: created.totalRub,
      returnUrl,
      description: `Заказ #${created.number}`,
      metadata: { orderId: created.id, orderNumber: String(created.number) },
    });

    await prisma.payment.upsert({
      where: { orderId: created.id },
      create: {
        orderId: created.id,
        provider: "YOOKASSA",
        status: "PENDING",
        externalPaymentId: String(payment.id),
        amountRub: created.totalRub,
        payloadJson: JSON.stringify(payment),
      },
      update: {
        provider: "YOOKASSA",
        status: "PENDING",
        externalPaymentId: String(payment.id),
        amountRub: created.totalRub,
        payloadJson: JSON.stringify(payment),
      },
    });

    return Response.json({
      ok: true,
      order: { id: created.id, number: created.number },
      payment: { provider: "YOOKASSA", externalPaymentId: String(payment.id), confirmationUrl },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "YOOKASSA_UNKNOWN";
    await prisma.order.delete({ where: { id: created.id } }).catch(() => {});
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}


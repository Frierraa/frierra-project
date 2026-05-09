import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { yookassaGetPayment } from "@/lib/yookassa";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as any;
  const event = String(body?.event || "").trim();
  const obj = body?.object;
  const externalPaymentId = String(obj?.id || "").trim();

  if (!externalPaymentId) return Response.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });

  // Всегда перепроверяем статус через API ЮKassa (это и защита, и единый источник истины)
  let remote: any;
  try {
    remote = await yookassaGetPayment(externalPaymentId);
  } catch {
    return Response.json({ ok: false, error: "YOOKASSA_VERIFY_FAILED" }, { status: 400 });
  }

  const metadata = remote?.metadata || {};
  const orderId = String(metadata?.orderId || "").trim();

  const status = String(remote?.status || "").toLowerCase(); // pending / waiting_for_capture / succeeded / canceled
  const amountValue = Number(remote?.amount?.value || 0);
  const amountRub = Number.isFinite(amountValue) ? Math.round(amountValue * 100) : 0;

  const mappedPaymentStatus = status === "succeeded" ? "SUCCEEDED" : status === "canceled" ? "CANCELED" : "PENDING";

  // Обновляем Payment и (при успехе) переводим Order в PAID
  await prisma.$transaction(async (tx) => {
    const paymentRow = await tx.payment.findUnique({ where: { externalPaymentId } });
    const effectiveOrderId = paymentRow?.orderId || orderId;

    if (effectiveOrderId) {
      await tx.payment.upsert({
        where: { orderId: effectiveOrderId },
        create: {
          orderId: effectiveOrderId,
          provider: "YOOKASSA",
          status: mappedPaymentStatus,
          externalPaymentId,
          amountRub: amountRub || paymentRow?.amountRub || 0,
          payloadJson: JSON.stringify({ event, remote }),
        },
        update: {
          status: mappedPaymentStatus,
          externalPaymentId,
          amountRub: amountRub || paymentRow?.amountRub || 0,
          payloadJson: JSON.stringify({ event, remote }),
        },
      });

      if (mappedPaymentStatus === "SUCCEEDED") {
        await tx.order.update({
          where: { id: effectiveOrderId },
          data: { status: "PAID" },
        });
      }
    } else if (paymentRow) {
      await tx.payment.update({
        where: { id: paymentRow.id },
        data: {
          status: mappedPaymentStatus,
          amountRub: amountRub || paymentRow.amountRub,
          payloadJson: JSON.stringify({ event, remote }),
        },
      });
    }
  });

  // ЮKassa принимает любой 2xx как "ok"
  return Response.json({ ok: true });
}


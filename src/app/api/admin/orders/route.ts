import { NextRequest } from "next/server";
import { requireAdminRole } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function ensureStaff() {
  try {
    await requireAdminRole(["ADMIN", "MANAGER"]);
    return null;
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
}

export async function GET(req: NextRequest) {
  const deny = await ensureStaff();
  if (deny) return deny;
  await prisma.order.updateMany({
    where: {
      status: { in: ["NEW", "COOKING", "DELIVERING"] },
      payment: { is: { status: "SUCCEEDED" } },
    },
    data: { status: "PAID" },
  });
  const date = req.nextUrl.searchParams.get("date")?.trim() || "";
  const dayStart = date ? new Date(`${date}T00:00:00`) : null;
  const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : null;

  const orders = await prisma.order.findMany({
    where:
      dayStart && dayEnd
        ? {
            createdAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { items: true, payment: true, user: { select: { id: true, email: true, name: true } } },
  });
  return Response.json({ ok: true, orders });
}

export async function PATCH(req: NextRequest) {
  const deny = await ensureStaff();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: "COOKING" | "DELIVERING" | "DONE" | "NEW" | "PAID" | "CANCELLED";
  } | null;
  const id = String(body?.id || "");
  const status = body?.status;
  if (!id || !status) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  if (!["COOKING", "DELIVERING", "DONE", "NEW", "PAID", "CANCELLED"].includes(status)) {
    return Response.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
  }
  await prisma.order.update({ where: { id }, data: { status } });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await ensureStaff();
  if (deny) return deny;
  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.order.delete({ where: { id } });
  return Response.json({ ok: true });
}


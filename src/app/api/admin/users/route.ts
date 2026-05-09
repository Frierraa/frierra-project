import { NextRequest } from "next/server";
import { hashAdminPassword, requireAdminRole } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdminRole(["ADMIN"]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
  const group = (req.nextUrl.searchParams.get("group") || "all").toLowerCase();
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  const users = await prisma.user.findMany({
    where:
      group === "system"
        ? { role: { in: ["ADMIN", "MANAGER"] } }
        : group === "customers"
          ? {
              role: "USER",
              ...(q
                ? {
                    OR: [{ phone: { contains: q } }, { name: { contains: q } }, { email: { contains: q } }],
                  }
                : {}),
            }
          : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });
  return Response.json({ ok: true, users });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminRole(["ADMIN"]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    role?: "USER" | "ADMIN" | "MANAGER";
    password?: string;
  } | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const role = body?.role || "MANAGER";
  if (!email || !["USER", "ADMIN", "MANAGER"].includes(role)) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  const created = await prisma.user.create({
    data: {
      email,
      name: (body?.name || "").trim() || null,
      role,
      passwordHash: body?.password ? hashAdminPassword(body.password) : null,
    },
    select: { id: true },
  });
  return Response.json({ ok: true, id: created.id });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminRole(["ADMIN"]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    name?: string;
    role?: "USER" | "ADMIN" | "MANAGER";
    password?: string;
  } | null;
  const id = String(body?.id || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.user.update({
    where: { id },
    data: {
      name: body?.name !== undefined ? (body.name.trim() || null) : undefined,
      role: body?.role,
      passwordHash: body?.password ? hashAdminPassword(body.password) : undefined,
    },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminRole(["ADMIN"]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
  const id = String(req.nextUrl.searchParams.get("id") || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return Response.json({ ok: true });
}


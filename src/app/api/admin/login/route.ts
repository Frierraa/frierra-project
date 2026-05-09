import { NextRequest } from "next/server";
import { createAdminSession, hashAdminPassword } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });

  const defaultAdminEmail = "admin@test.ru";
  const defaultAdminPasswordHash = hashAdminPassword("111111");

  await prisma.user.upsert({
    where: { email: defaultAdminEmail },
    update: { role: "ADMIN", passwordHash: defaultAdminPasswordHash, name: "Администратор" },
    create: {
      email: defaultAdminEmail,
      role: "ADMIN",
      passwordHash: defaultAdminPasswordHash,
      name: "Администратор",
    },
  });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return Response.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  if (!user.passwordHash || user.passwordHash !== hashAdminPassword(password)) {
    return Response.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await createAdminSession(user.id);
  return Response.json({ ok: true });
}


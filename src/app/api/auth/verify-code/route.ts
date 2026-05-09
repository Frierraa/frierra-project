import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashOtpCode, isValidRuPhonePlus7, normalizePhone } from "@/lib/auth";

export const runtime = "nodejs";

function emailFromPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  return `phone-${digits}@phone.local`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { phone?: string; code?: string; name?: string } | null;
  const phone = normalizePhone(body?.phone ?? "");
  const code = String(body?.code ?? "").trim();
  const name = (body?.name ?? "").trim();

  if (!phone || !isValidRuPhonePlus7(phone) || code.length < 4) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const otp = await prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return Response.json({ ok: false, error: "CODE_NOT_FOUND" }, { status: 400 });
  if (otp.expiresAt.getTime() < Date.now()) {
    await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }).catch(() => {});
    return Response.json({ ok: false, error: "CODE_EXPIRED" }, { status: 400 });
  }
  if (otp.attempts >= 5) return Response.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

  const hash = hashOtpCode(phone, code);
  if (hash !== otp.codeHash) {
    await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } }).catch(() => {});
    return Response.json({ ok: false, error: "CODE_INVALID" }, { status: 400 });
  }

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  const user = await prisma.user.upsert({
    where: { email: emailFromPhone(phone) },
    update: {
      phone,
      name: name || undefined,
    },
    create: {
      email: emailFromPhone(phone),
      phone,
      name: name || null,
      passwordHash: null,
      role: "USER",
    },
    select: { id: true },
  });

  await createSession(user.id);
  return Response.json({ ok: true });
}


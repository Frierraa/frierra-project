import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "bs_session";

export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D+/g, "");
  // Приводим к формату +7XXXXXXXXXX (РФ).
  // Принимаем только 10 локальных цифр или 11 цифр, начинающихся с 7/8.
  if (!digits) return "";
  const local10 =
    digits.length === 10 ? digits : digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8")) ? digits.slice(1) : "";
  if (!local10 || local10.length !== 10) return "";
  return `+7${local10}`;
}

export function isValidRuPhonePlus7(phone: string): boolean {
  return /^\+7\d{10}$/.test(phone);
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function codePepper(): string {
  return process.env.AUTH_CODE_PEPPER || "dev-pepper-change-me";
}

export function hashOtpCode(phone: string, code: string): string {
  return sha256Hex(`${phone}:${code}:${codePepper()}`);
}

export function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function sessionPepper(): string {
  return process.env.AUTH_SESSION_PEPPER || "dev-session-pepper-change-me";
}

function hashSessionToken(token: string): string {
  return sha256Hex(`${token}:${sessionPepper()}`);
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 дней

  await prisma.authSession.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  await prisma.authSession.deleteMany({ where: { tokenHash } });
}

export type CurrentUser = { id: string; phone: string | null; name: string | null; role: "USER" | "ADMIN" | "MANAGER" };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);

  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: { select: { id: true, phone: true, name: true, role: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    phone: session.user.phone,
    name: session.user.name,
    role: session.user.role,
  };
}


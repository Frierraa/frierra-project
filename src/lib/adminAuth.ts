import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ADMIN_SESSION_COOKIE = "bs_admin_session";

type AdminRole = "ADMIN" | "MANAGER";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function passwordPepper(): string {
  return process.env.ADMIN_AUTH_PEPPER || "admin-pepper-change-me";
}

function sessionPepper(): string {
  return process.env.ADMIN_SESSION_PEPPER || "admin-session-pepper-change-me";
}

export function hashAdminPassword(password: string): string {
  return sha256Hex(`${password}:${passwordPepper()}`);
}

function hashAdminSessionToken(token: string): string {
  return sha256Hex(`${token}:${sessionPepper()}`);
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashAdminSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.adminSession.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  if (!token) return;
  const tokenHash = hashAdminSessionToken(token);
  await prisma.adminSession.deleteMany({ where: { tokenHash } });
}

export async function getAdminUser(): Promise<{
  id: string;
  email: string;
  role: AdminRole;
  name: string | null;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashAdminSessionToken(token);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, role: true, name: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    name: session.user.name,
  };
}

export async function requireAdminRole(allowed: AdminRole[]): Promise<{
  id: string;
  email: string;
  role: AdminRole;
  name: string | null;
}> {
  const user = await getAdminUser();
  if (!user) throw new Error("ADMIN_UNAUTHORIZED");
  if (!allowed.includes(user.role)) throw new Error("ADMIN_FORBIDDEN");
  return user;
}


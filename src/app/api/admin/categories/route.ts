import { NextRequest } from "next/server";
import { requireAdminRole } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

async function checkAccess() {
  try {
    await requireAdminRole(["ADMIN"]);
    return null;
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }
}

export async function GET() {
  const deny = await checkAccess();
  if (deny) return deny;
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return Response.json({ ok: true, categories });
}

export async function POST(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as { title?: string; slug?: string; sortOrder?: number } | null;
  const title = String(body?.title || "").trim();
  const slug = slugify(String(body?.slug || title));
  if (!title || !slug) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  const created = await prisma.category.create({
    data: { title, slug, sortOrder: Number(body?.sortOrder) || 0, isActive: true },
    select: { id: true },
  });
  return Response.json({ ok: true, id: created.id });
}

export async function PATCH(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    title?: string;
    slug?: string;
    sortOrder?: number;
    isActive?: boolean;
  } | null;
  const id = String(body?.id || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.category.update({
    where: { id },
    data: {
      title: body?.title?.trim(),
      slug: body?.slug ? slugify(body.slug) : undefined,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) || 0 : undefined,
      isActive: body?.isActive,
    },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const id = String(req.nextUrl.searchParams.get("id") || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.category.delete({ where: { id } });
  return Response.json({ ok: true });
}


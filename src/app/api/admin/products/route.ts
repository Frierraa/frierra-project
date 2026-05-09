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
  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { category: { select: { title: true } }, variants: { select: { id: true, title: true, priceRub: true } } },
  });
  return Response.json({ ok: true, products });
}

export async function POST(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    slug?: string;
    description?: string;
    categoryId?: string;
    imageUrl?: string;
    priceRub?: number;
    weightGram?: number;
  } | null;
  const title = String(body?.title || "").trim();
  const slug = slugify(String(body?.slug || title));
  const categoryId = String(body?.categoryId || "");
  const priceRub = Number(body?.priceRub) || 0;
  const weightGram = Number(body?.weightGram) || 0;
  if (!title || !slug || !categoryId || priceRub <= 0) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const created = await prisma.product.create({
    data: {
      title,
      slug,
      description: String(body?.description || "").trim(),
      categoryId,
      imageUrl: String(body?.imageUrl || "").trim() || null,
      isActive: true,
      variants: {
        create: {
          title: "Стандарт",
          sku: `${slug}-base`,
          priceRub,
          weightGram: weightGram > 0 ? weightGram : null,
          isActive: true,
        },
      },
    },
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
    description?: string;
    categoryId?: string;
    imageUrl?: string;
    isActive?: boolean;
  } | null;
  const id = String(body?.id || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.product.update({
    where: { id },
    data: {
      title: body?.title?.trim(),
      slug: body?.slug ? slugify(body.slug) : undefined,
      description: body?.description?.trim(),
      categoryId: body?.categoryId,
      imageUrl: body?.imageUrl !== undefined ? (body.imageUrl.trim() || null) : undefined,
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
  await prisma.product.delete({ where: { id } });
  return Response.json({ ok: true });
}


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

export async function GET(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const onlyCombo = req.nextUrl.searchParams.get("onlyCombo") === "1";
  const variants = await prisma.productVariant.findMany({
    where: onlyCombo
      ? {
          OR: [
            { comboItems: { some: {} } },
            {
              product: {
                OR: [{ title: { contains: "комбо" } }, { category: { title: { contains: "комбо" } } }, { category: { slug: { contains: "combo" } } }],
              },
            },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true, imageUrl: true, isActive: true, category: { select: { title: true } } } },
      comboItems: { include: { product: { select: { id: true, title: true } } } },
    },
  });
  return Response.json({ ok: true, variants });
}

export async function POST(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as {
    productId?: string;
    comboProductTitle?: string;
    comboProductSlug?: string;
    comboProductDescription?: string;
    comboProductCategoryId?: string;
    comboProductImageUrl?: string;
    title?: string;
    priceRub?: number;
    sku?: string;
    comboItems?: Array<{ productId: string; qty?: number }>;
  } | null;
  const productId = String(body?.productId || "");
  const comboProductTitle = String(body?.comboProductTitle || "").trim();
  const comboProductSlug = slugify(String(body?.comboProductSlug || comboProductTitle));
  const comboProductDescription = String(body?.comboProductDescription || "").trim();
  const comboProductCategoryId = String(body?.comboProductCategoryId || "").trim();
  const comboProductImageUrl = String(body?.comboProductImageUrl || "").trim();
  const title = String(body?.title || "").trim();
  const priceRub = Number(body?.priceRub) || 0;
  const comboItems =
    body?.comboItems
      ?.filter((x) => String(x.productId || "").trim())
      .map((x) => ({
        productId: String(x.productId).trim(),
        qty: Math.max(1, Number(x.qty) || 1),
      })) || [];
  const isNewComboProduct = !productId && !!comboProductTitle;

  if (!title || priceRub <= 0) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  if (!productId && !isNewComboProduct) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  if (!comboItems.length) {
    return Response.json({ ok: false, error: "COMBO_ITEMS_REQUIRED" }, { status: 400 });
  }

  if (isNewComboProduct) {
    if (!comboProductSlug || !comboProductCategoryId) {
      return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }
    const created = await prisma.product.create({
      data: {
        title: comboProductTitle,
        slug: comboProductSlug,
        description: comboProductDescription,
        categoryId: comboProductCategoryId,
        imageUrl: comboProductImageUrl || null,
        isActive: true,
        variants: {
          create: {
            title,
            priceRub,
            sku: String(body?.sku || "").trim() || null,
            isActive: true,
            comboItems: { create: comboItems },
          },
        },
      },
      select: { id: true },
    });
    return Response.json({ ok: true, id: created.id });
  }

  const created = await prisma.productVariant.create({
    data: {
      productId,
      title,
      priceRub,
      sku: String(body?.sku || "").trim() || null,
      isActive: true,
      comboItems: { create: comboItems },
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
    priceRub?: number;
    sku?: string | null;
    isActive?: boolean;
    comboItems?: Array<{ productId: string; qty?: number }>;
  } | null;
  const id = String(body?.id || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id },
      data: {
        title: body?.title?.trim(),
        priceRub: body?.priceRub !== undefined ? Math.max(1, Number(body.priceRub) || 1) : undefined,
        sku: body?.sku !== undefined ? (body.sku?.trim() || null) : undefined,
        isActive: body?.isActive,
      },
    });
    if (body?.comboItems) {
      await tx.variantComboItem.deleteMany({ where: { variantId: id } });
      if (body.comboItems.length) {
        await tx.variantComboItem.createMany({
          data: body.comboItems.map((x) => ({
            variantId: id,
            productId: x.productId,
            qty: Math.max(1, Number(x.qty) || 1),
          })),
        });
      }
    }
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deny = await checkAccess();
  if (deny) return deny;
  const id = String(req.nextUrl.searchParams.get("id") || "");
  if (!id) return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  await prisma.productVariant.delete({ where: { id } });
  return Response.json({ ok: true });
}


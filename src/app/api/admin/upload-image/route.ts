import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { requireAdminRole } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdminRole(["ADMIN"]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ADMIN_UNAUTHORIZED";
    return Response.json({ ok: false, error: code }, { status: code === "ADMIN_FORBIDDEN" ? 403 : 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}-${randomUUID()}.${ext || "jpg"}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);

  return Response.json({ ok: true, url: `/uploads/${name}` });
}


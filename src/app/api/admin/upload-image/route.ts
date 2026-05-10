import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireAdminRole } from "@/lib/adminAuth";

export const runtime = "nodejs";

function toSafeMimeType(file: File): string {
  const type = file.type?.trim().toLowerCase();
  if (type.startsWith("image/")) return type;
  const ext = (file.name.split(".").pop() || "jpeg").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  return "image/jpeg";
}

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

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const blob = await put(name, bytes, {
      access: "public",
      token,
      addRandomSuffix: true,
    });
    return Response.json({ ok: true, url: blob.url });
  }

  // На Vercel без Blob-токена файловая система эфемерная; возвращаем data URL как надёжный fallback.
  const dataUrl = `data:${toSafeMimeType(file)};base64,${bytes.toString("base64")}`;
  return Response.json({ ok: true, url: dataUrl });
}
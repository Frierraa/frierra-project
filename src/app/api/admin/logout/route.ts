import { destroyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  await destroyAdminSession();
  return Response.json({ ok: true });
}


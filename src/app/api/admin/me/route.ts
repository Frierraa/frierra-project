import { getAdminUser } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAdminUser();
  return Response.json({ ok: true, user });
}


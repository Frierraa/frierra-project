import { NextRequest } from "next/server";
import { suggestNnStreets } from "@/lib/nnAddress";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return Response.json({ ok: true, streets: [] });
  try {
    const streets = await suggestNnStreets(q);
    return Response.json({ ok: true, streets });
  } catch {
    return Response.json({ ok: false, error: "ADDRESS_LOOKUP_FAILED" }, { status: 502 });
  }
}


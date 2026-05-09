import { NextRequest } from "next/server";
import { suggestNnHouses } from "@/lib/nnAddress";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const street = (req.nextUrl.searchParams.get("street") || "").trim();
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!street || !q) return Response.json({ ok: true, houses: [] });
  try {
    const houses = await suggestNnHouses(street, q);
    return Response.json({ ok: true, houses });
  } catch {
    return Response.json({ ok: false, error: "ADDRESS_LOOKUP_FAILED" }, { status: 502 });
  }
}


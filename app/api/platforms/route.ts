import { NextResponse } from "next/server";
import { getProviderCapabilities } from "@/lib/providers/registry";

export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json({ providers: getProviderCapabilities() }, { headers: { "Cache-Control": "no-store" } });
}

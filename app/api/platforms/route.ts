import { NextResponse } from "next/server";
import { getAnalyticsProviders } from "@/lib/youtube/providers";

export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json({ providers: getAnalyticsProviders() }, { headers: { "Cache-Control": "no-store" } });
}

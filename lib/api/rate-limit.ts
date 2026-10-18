import { NextResponse } from "next/server";
import { apiError } from "./http";
import { checkRateLimit, clientRateLimitKey } from "../security/rate-limit";

function configuredLimit(variable: string, fallback: number): number {
  const value = Number(process.env[variable]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1000) : fallback;
}

export function rateLimitResponse(request: Request, kind: "analyze" | "download"): NextResponse | null {
  const fallback = kind === "analyze" ? 20 : 8;
  const limit = configuredLimit(kind === "analyze" ? "RATE_LIMIT_ANALYZE_PER_MINUTE" : "RATE_LIMIT_DOWNLOAD_PER_MINUTE", fallback);
  const result = checkRateLimit(`${kind}:${clientRateLimitKey(request)}`, limit);
  if (result.allowed) return null;
  return apiError("rate_limited", "Too many requests. Wait a little before trying again.", 429, { "Retry-After": String(result.retryAfterSeconds) });
}

import { NextResponse } from "next/server";
import { apiError } from "./http";
import { checkRateLimit, clientRateLimitKey } from "../security/rate-limit";

function configuredLimit(variable: string, fallback: number): number {
  const value = Number(process.env[variable]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 1000) : fallback;
}

export function rateLimitResponse(request: Request): NextResponse | null {
  const limit = configuredLimit("RATE_LIMIT_ANALYZE_PER_MINUTE", 20);
  const result = checkRateLimit(`youtube-analyze:${clientRateLimitKey(request)}`, limit);
  if (result.allowed) return null;
  return apiError("rate_limited", "Too many requests. Wait a little before trying again.", 429, { "Retry-After": String(result.retryAfterSeconds) });
}

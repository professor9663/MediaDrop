import { NextResponse } from "next/server";
import { ApiRequestError, readSmallJsonBody } from "@/lib/api/http";
import { rateLimitResponse } from "@/lib/api/rate-limit";
import { analyzeYouTubeUrl } from "@/lib/youtube/analysis";
import { YouTubeApiError } from "@/lib/youtube/api";
import { youtubeAnalyzeRequestSchema } from "@/lib/youtube/schemas";
import { parseYouTubeUrl, YouTubeUrlError } from "@/lib/youtube/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messages = {
  not_found: "We couldn't find a public channel or video for that link.",
  restricted: "This channel isn't available through YouTube's public data API.",
  quota_exceeded: "YouTube's analysis quota is temporarily exhausted. Try again later.",
  not_configured: "YouTube analysis is not configured yet. The site operator needs to add a YouTube Data API key.",
  timeout: "YouTube took too long to respond. Please retry in a moment.",
  unavailable: "YouTube analysis is temporarily unavailable. Please retry later."
} as const;

function safeError(errorCode: string, message: string, status: number, retryable = false) {
  return NextResponse.json({ success: false, errorCode, message, retryable }, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(request);
  if (limited) return limited;

  try {
    const body = await readSmallJsonBody(request);
    const parsed = youtubeAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) return safeError("invalid_request", "Paste a valid YouTube channel or video URL.", 400);

    parseYouTubeUrl(parsed.data.url);
    const result = await analyzeYouTubeUrl(parsed.data.url);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiRequestError) return safeError(error.code, error.message, error.status);
    if (error instanceof YouTubeUrlError) {
      const status = error.code === "unsupported_platform" ? 422 : 400;
      const message = error.code === "unsupported_platform"
        ? "Paste a YouTube link to analyze a channel or video."
        : error.code === "unsupported_link"
          ? "Use a YouTube video, Shorts, /@handle, /channel/ID, or /user/username link."
          : "That URL is malformed or uses an unsupported protocol.";
      return safeError(error.code, message, status);
    }
    if (error instanceof YouTubeApiError) {
      const status = error.code === "not_found" ? 404 : error.code === "restricted" ? 403 : error.code === "quota_exceeded" ? 429 : error.code === "not_configured" ? 503 : error.code === "timeout" ? 504 : 502;
      return safeError(error.code, messages[error.code], status, error.code === "timeout" || error.code === "unavailable");
    }
    return safeError("internal_error", "The channel could not be analyzed right now.", 500, true);
  }
}

import { Readable } from "node:stream";
import { downloadRequestSchema } from "@/lib/media/schemas";
import { createDirectDownload, DirectMediaError } from "@/lib/media/direct-media";
import { apiError, ApiRequestError, readSmallJsonBody } from "@/lib/api/http";
import { rateLimitResponse } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const directStatusByCode: Record<DirectMediaError["code"], number> = {
  private_or_restricted: 403,
  unsupported_format: 415,
  provider_rate_limited: 429,
  provider_unavailable: 502,
  expired_media_link: 404,
  request_timeout: 504,
  download_interrupted: 502,
  file_processing_failed: 422
};

let activeDownloads = 0;
const MAX_CONCURRENT_DOWNLOADS = 4;

async function streamDownload(mediaId: string, formatId: string): Promise<Response> {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    return apiError("rate_limited", "All download slots are busy. Try again in a moment.", 429, { "Retry-After": "5" });
  }

  activeDownloads += 1;
  try {
    const operation = await createDirectDownload(mediaId, formatId);
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        activeDownloads = Math.max(0, activeDownloads - 1);
      }
    };
    operation.stream.once("close", release);
    operation.stream.once("end", release);
    const headers = new Headers({
      "Content-Type": operation.mimeType,
      "Content-Disposition": `attachment; filename="${operation.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    if (operation.fileSizeBytes !== null) headers.set("Content-Length", String(operation.fileSizeBytes));
    return new Response(Readable.toWeb(operation.stream) as ReadableStream, { status: 200, headers });
  } catch (error) {
    activeDownloads = Math.max(0, activeDownloads - 1);
    if (error instanceof DirectMediaError) return apiError(error.code, error.message, directStatusByCode[error.code]);
    return apiError("internal_error", "The file could not be downloaded right now.", 500);
  }
}

export async function GET(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "download");
  if (limited) return limited;
  const url = new URL(request.url);
  const parsed = downloadRequestSchema.safeParse({ mediaId: url.searchParams.get("mediaId"), formatId: url.searchParams.get("formatId") });
  if (!parsed.success) return apiError("invalid_url", "The download link is invalid or has expired.", 400);
  return streamDownload(parsed.data.mediaId, parsed.data.formatId);
}

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "download");
  if (limited) return limited;
  try {
    const parsed = downloadRequestSchema.safeParse(await readSmallJsonBody(request));
    if (!parsed.success) return apiError("invalid_url", "The download request is invalid or has expired.", 400);
    return streamDownload(parsed.data.mediaId, parsed.data.formatId);
  } catch (error) {
    if (error instanceof ApiRequestError) return apiError(error.code, error.message, error.status);
    return apiError("internal_error", "The download request could not be processed.", 500);
  }
}

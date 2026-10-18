import { NextResponse } from "next/server";
import { analyzeResponseSchema, analyzeRequestSchema } from "@/lib/media/schemas";
import { parseAndValidateMediaUrl, UrlValidationError } from "@/lib/media/url-validation";
import { DirectMediaError } from "@/lib/media/direct-media";
import { directMediaAdapter, findSocialAdapter } from "@/lib/providers/registry";
import { rateLimitResponse } from "@/lib/api/rate-limit";
import { apiError, ApiRequestError, readSmallJsonBody } from "@/lib/api/http";

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

export async function POST(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(request, "analyze");
  if (limited) return limited;

  try {
    const body = await readSmallJsonBody(request);
    const parsed = analyzeRequestSchema.safeParse(body);
    if (!parsed.success) return apiError("invalid_url", "Enter a valid HTTP or HTTPS media link.", 400);

    let validated;
    try {
      validated = parseAndValidateMediaUrl(parsed.data.url);
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return apiError(error.code, error.message, error.code === "unsupported_platform" ? 422 : 400);
      }
      throw error;
    }

    if (validated.isDirectMedia) {
      const result = await directMediaAdapter.getMetadata(validated.url);
      const status = result.success ? 200 : result.errorCode === "private_or_restricted" ? 403 : result.errorCode === "expired_media_link" ? 404 : result.errorCode === "unsupported_format" ? 415 : 502;
      return NextResponse.json(analyzeResponseSchema.parse(result), { status, headers: { "Cache-Control": "no-store" } });
    }

    const adapter = findSocialAdapter(validated.url);
    if (!adapter) return apiError("unsupported_platform", "This platform is not supported.", 422);

    const result = await adapter.getMetadata(validated.url);
    const status = result.success ? 200 : result.errorCode === "authentication_required" ? 403 : 422;
    return NextResponse.json(analyzeResponseSchema.parse(result), { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiRequestError) return apiError(error.code, error.message, error.status);
    if (error instanceof DirectMediaError) return apiError(error.code, error.message, directStatusByCode[error.code]);
    return apiError("internal_error", "The link could not be analyzed right now.", 500);
  }
}

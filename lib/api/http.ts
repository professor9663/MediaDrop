import { NextResponse } from "next/server";

export type ApiErrorCode = "invalid_request" | "request_too_large";

export const MAX_JSON_BODY_BYTES = 4 * 1024;

export async function readSmallJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_JSON_BODY_BYTES) throw new ApiRequestError(413, "request_too_large", "This request is too large.");
  if (!request.body) throw new ApiRequestError(400, "invalid_request", "The request body is missing.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new ApiRequestError(413, "request_too_large", "This request is too large.");
    }
    chunks.push(value);
  }

  try {
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError(400, "invalid_request", "The request body must be valid JSON.");
  }
}

export function apiError(code: string, message: string, status: number, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ success: false, errorCode: code, message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export class ApiRequestError extends Error {
  constructor(readonly status: number, readonly code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

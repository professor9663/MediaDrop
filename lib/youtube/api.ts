import { z } from "zod";
import { youtubeApiChannelSchema, youtubeApiVideoSchema, youtubeListSchema, youtubePlaylistSchema } from "./schemas";

const apiBase = "https://youtube.googleapis.com/youtube/v3";

const upstreamErrorSchema = z.object({
  error: z.object({
    errors: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional()
  }).passthrough()
}).passthrough();

export class YouTubeApiError extends Error {
  constructor(readonly code: "not_found" | "restricted" | "quota_exceeded" | "not_configured" | "timeout" | "unavailable") {
    super(code);
    this.name = "YouTubeApiError";
  }
}

async function getResource<T>(resource: string, params: URLSearchParams, schema: z.ZodType<T>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new YouTubeApiError("not_configured");

  params.set("key", key);
  const requestUrl = new URL(`${apiBase}/${resource}`);
  requestUrl.search = params.toString();

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(9000)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new YouTubeApiError("timeout");
    }
    throw new YouTubeApiError("unavailable");
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = upstreamErrorSchema.safeParse(json);
    const reason = parsed.success ? parsed.data.error.errors?.[0]?.reason : undefined;
    if (response.status === 404 || reason === "videoNotFound" || reason === "channelNotFound") throw new YouTubeApiError("not_found");
    if (reason === "channelForbidden") throw new YouTubeApiError("restricted");
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded" || reason === "rateLimitExceeded") throw new YouTubeApiError("quota_exceeded");
    if (reason === "keyInvalid" || reason === "accessNotConfigured") throw new YouTubeApiError("not_configured");
    throw new YouTubeApiError("unavailable");
  }

  const result = schema.safeParse(json);
  if (!result.success) throw new YouTubeApiError("unavailable");
  return result.data;
}

export async function listChannels(params: { id?: string; forHandle?: string; forUsername?: string }) {
  const query = new URLSearchParams({ part: "snippet,statistics,contentDetails", maxResults: "1" });
  if (params.id) query.set("id", params.id);
  if (params.forHandle) query.set("forHandle", params.forHandle);
  if (params.forUsername) query.set("forUsername", params.forUsername);
  return getResource("channels", query, youtubeListSchema(youtubeApiChannelSchema));
}

export async function listVideos(ids: string[]) {
  if (ids.length === 0) return { items: [] as z.infer<typeof youtubeApiVideoSchema>[] };
  const query = new URLSearchParams({ part: "snippet,statistics,contentDetails", id: ids.join(","), maxResults: String(Math.min(ids.length, 50)) });
  return getResource("videos", query, youtubeListSchema(youtubeApiVideoSchema));
}

export async function listRecentUploadIds(playlistId: string) {
  const query = new URLSearchParams({ part: "snippet,contentDetails", playlistId, maxResults: "25" });
  const result = await getResource("playlistItems", query, youtubePlaylistSchema);
  return result.items
    .map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
    .filter((id): id is string => Boolean(id));
}

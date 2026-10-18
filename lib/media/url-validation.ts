import { analyzeRequestSchema } from "./schemas";
import type { ProviderId } from "./types";

export type ValidatedInputUrl = {
  url: URL;
  provider: ProviderId | null;
  isDirectMedia: boolean;
};

const providerHosts: Record<Exclude<ProviderId, "direct">, readonly string[]> = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com"],
  instagram: ["instagram.com", "www.instagram.com", "m.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
  pinterest: ["pinterest.com", "www.pinterest.com", "pin.it"]
};

export const mediaExtensionMap: Record<string, { type: "video" | "audio"; mimeType: string }> = {
  mp4: { type: "video", mimeType: "video/mp4" },
  mov: { type: "video", mimeType: "video/quicktime" },
  webm: { type: "video", mimeType: "video/webm" },
  mkv: { type: "video", mimeType: "video/x-matroska" },
  m4v: { type: "video", mimeType: "video/x-m4v" },
  mp3: { type: "audio", mimeType: "audio/mpeg" },
  m4a: { type: "audio", mimeType: "audio/mp4" },
  aac: { type: "audio", mimeType: "audio/aac" },
  wav: { type: "audio", mimeType: "audio/wav" },
  ogg: { type: "audio", mimeType: "audio/ogg" },
  opus: { type: "audio", mimeType: "audio/ogg" },
  flac: { type: "audio", mimeType: "audio/flac" }
};

const localhostNames = new Set(["localhost", "127.0.0.1", "::1"]);

function providerForHostname(hostname: string): Exclude<ProviderId, "direct"> | null {
  for (const [provider, hosts] of Object.entries(providerHosts) as [Exclude<ProviderId, "direct">, readonly string[]][]) {
    if (hosts.includes(hostname)) return provider;
  }
  return null;
}

export function parseAndValidateMediaUrl(rawUrl: string): ValidatedInputUrl {
  const parsedInput = analyzeRequestSchema.safeParse({ url: rawUrl });
  if (!parsedInput.success) throw new UrlValidationError("invalid_url", "Enter a valid HTTP or HTTPS media link.");

  let url: URL;
  try {
    url = new URL(parsedInput.data.url);
  } catch {
    throw new UrlValidationError("invalid_url", "Enter a valid HTTP or HTTPS media link.");
  }

  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new UrlValidationError("invalid_url", "Only HTTP or HTTPS links without embedded credentials are accepted.");
  }

  const isLocalhost = localhostNames.has(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""));
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !isLocalhost) {
    throw new UrlValidationError("invalid_url", "Use an HTTPS link.");
  }

  url.hash = "";
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const provider = providerForHostname(hostname);
  if (provider) return { url, provider, isDirectMedia: false };

  const extension = url.pathname.split(".").pop()?.toLowerCase() ?? "";
  if (mediaExtensionMap[extension]) return { url, provider: "direct", isDirectMedia: true };

  throw new UrlValidationError("unsupported_platform", "This link is not from a supported platform or a direct video/audio file.");
}

export class UrlValidationError extends Error {
  constructor(readonly code: "invalid_url" | "unsupported_platform", message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

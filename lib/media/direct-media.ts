import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { basename, extname } from "node:path";
import { Readable } from "node:stream";
import ipaddr from "ipaddr.js";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { DownloadOperation, MediaFormat, MediaMetadata } from "./types";
import { mediaExtensionMap } from "./url-validation";

const CAPABILITY_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_MEDIA_BYTES = 512 * 1024 * 1024;
const MAX_REDIRECTS = 4;

type StoredCapability = {
  sourceUrl: string;
  format: MediaFormat;
  title: string;
  type: "video" | "audio";
  expiresAt: number;
};

type NetworkResponse = {
  response: IncomingMessage;
  url: URL;
};

const globalState = globalThis as typeof globalThis & { __mediaDropCapabilities?: Map<string, StoredCapability> };
const capabilities = globalState.__mediaDropCapabilities ??= new Map<string, StoredCapability>();

export class DirectMediaError extends Error {
  constructor(readonly code: "private_or_restricted" | "unsupported_format" | "provider_rate_limited" | "provider_unavailable" | "expired_media_link" | "request_timeout" | "file_processing_failed" | "download_interrupted", message: string) {
    super(message);
    this.name = "DirectMediaError";
  }
}

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: number }> {
  const normalized = hostname.replace(/^\[|\]$/g, "");
  if (normalized.toLowerCase() === "localhost" || normalized.endsWith(".localhost")) {
    throw new DirectMediaError("private_or_restricted", "Local and private network addresses cannot be fetched.");
  }

  const literalFamily = ipaddr.isValid(normalized) ? ipaddr.parse(normalized).kind() === "ipv4" ? 4 : 6 : 0;
  let addresses: { address: string; family: number }[];
  try {
    if (literalFamily) {
      addresses = [{ address: normalized, family: literalFamily }];
    } else {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        addresses = await Promise.race([
          dns.lookup(normalized, { all: true, verbatim: true }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new DirectMediaError("request_timeout", "The media host took too long to respond.")), REQUEST_TIMEOUT_MS);
          })
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  } catch (error) {
    if (error instanceof DirectMediaError) throw error;
    throw new DirectMediaError("provider_unavailable", "The media host could not be reached.");
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new DirectMediaError("private_or_restricted", "The media host resolves to a private or restricted network.");
  }
  return addresses[0];
}

function validateOutgoingUrl(url: URL): void {
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new DirectMediaError("private_or_restricted", "That media link cannot be fetched safely.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new DirectMediaError("private_or_restricted", "Media links must use HTTPS in production.");
  }
  if (url.port && !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80"))) {
    throw new DirectMediaError("private_or_restricted", "Non-standard media ports are not supported.");
  }
}

export async function validateRedirectTarget(base: URL, location: string): Promise<URL> {
  let target: URL;
  try {
    target = new URL(location, base);
  } catch {
    throw new DirectMediaError("provider_unavailable", "The media host returned an invalid redirect.");
  }
  validateOutgoingUrl(target);
  await resolvePublicAddress(target.hostname);
  return target;
}

async function requestOnce(url: URL, method: "HEAD" | "GET"): Promise<IncomingMessage> {
  validateOutgoingUrl(url);
  const pinnedAddress = await resolvePublicAddress(url.hostname);
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const agent = url.protocol === "https:" ? new https.Agent({ keepAlive: false }) : new http.Agent({ keepAlive: false });
    const request = client.request(url, {
      method,
      agent,
      headers: {
        "User-Agent": "MediaDrop/1.0 (+authorized direct media links)",
        Accept: "video/*,audio/*,application/octet-stream;q=0.5,*/*;q=0.1",
      },
      lookup: (_hostname, _options, callback) => callback(null, pinnedAddress.address, pinnedAddress.family)
    }, (response) => {
      response.once("close", () => agent.destroy());
      resolve(response);
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new DirectMediaError("request_timeout", "The media host took too long to respond.")));
    request.on("error", (error) => {
      agent.destroy();
      reject(error instanceof DirectMediaError ? error : new DirectMediaError("provider_unavailable", "The media host could not be reached."));
    });
    request.end();
  });
}

async function requestFollowingRedirects(url: URL, method: "HEAD" | "GET"): Promise<NetworkResponse> {
  let current = new URL(url.href);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await requestOnce(current, method);
    const status = response.statusCode ?? 0;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.location;
      response.resume();
      if (!location || redirects === MAX_REDIRECTS) {
        throw new DirectMediaError("provider_unavailable", "The media host redirected too many times.");
      }
      current = await validateRedirectTarget(current, location);
      continue;
    }
    return { response, url: current };
  }
  throw new DirectMediaError("provider_unavailable", "The media host redirected too many times.");
}

function extensionFor(url: URL): string {
  return extname(url.pathname).slice(1).toLowerCase();
}

function canonicalMime(headers: IncomingHttpHeaders): string | null {
  const raw = headers["content-type"];
  if (typeof raw !== "string") return null;
  return raw.split(";", 1)[0].trim().toLowerCase();
}

function mimeMatches(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  if (actual === expected) return true;
  return expected === "audio/wav" && actual === "audio/x-wav";
}

function contentLength(headers: IncomingHttpHeaders): number | null {
  const value = headers["content-length"];
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function safeTitle(url: URL): string {
  let lastSegment = basename(url.pathname);
  try {
    lastSegment = decodeURIComponent(lastSegment);
  } catch {
    // Keep the encoded path segment when it is not valid URI encoding.
  }
  const extension = extname(lastSegment);
  const title = lastSegment.slice(0, lastSegment.length - extension.length).replace(/[_-]+/g, " ").trim();
  return title || "Direct media file";
}

export function safeFilename(title: string, extension: string): string {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, " ").trim().replace(/[ ._-]+$/g, "").slice(0, 90) || "media";
  const cleanExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return `${base}.${cleanExtension}`;
}

export function cleanupExpiredCapabilities(now = Date.now()): void {
  for (const [id, capability] of capabilities) {
    if (capability.expiresAt <= now) capabilities.delete(id);
  }
  while (capabilities.size > 2000) {
    const oldest = capabilities.keys().next().value;
    if (oldest === undefined) break;
    capabilities.delete(oldest);
  }
}

export function registerVerifiedMediaSource(url: URL, headers: IncomingHttpHeaders, status: number, now = Date.now()): { media: MediaMetadata; capabilityExpiresAt: string; safeOrigin: string } {
  const extension = extensionFor(url);
  const fileInfo = mediaExtensionMap[extension];
  if (!fileInfo) throw new DirectMediaError("unsupported_format", "This direct video or audio format is not supported.");

  if (status === 401 || status === 403) throw new DirectMediaError("private_or_restricted", "The host does not allow this file to be accessed.");
  if (status === 404 || status === 410) throw new DirectMediaError("expired_media_link", "This media link has expired or the file is no longer available.");
  if (status === 429) throw new DirectMediaError("provider_rate_limited", "The media host is temporarily limiting requests. Try again later.");
  if (status !== 200) throw new DirectMediaError("provider_unavailable", "The media host could not verify this file.");

  if (!mimeMatches(canonicalMime(headers), fileInfo.mimeType)) {
    throw new DirectMediaError("unsupported_format", "The media host did not confirm a supported video or audio file type.");
  }

  const size = contentLength(headers);
  if (size !== null && size > MAX_MEDIA_BYTES) throw new DirectMediaError("unsupported_format", "This file exceeds the 512 MB direct-download limit.");

  cleanupExpiredCapabilities(now);
  const mediaId = crypto.randomUUID();
  const expiresAt = now + CAPABILITY_TTL_MS;
  const title = safeTitle(url);
  const format: MediaFormat = {
    id: "original",
    label: "Original file",
    extension,
    mimeType: fileInfo.mimeType,
    quality: "Original",
    fileSizeBytes: size
  };
  capabilities.set(mediaId, { sourceUrl: url.href, format, title, type: fileInfo.type, expiresAt });

  return {
    media: { id: mediaId, title, type: fileInfo.type, thumbnailUrl: null, durationSeconds: null, formats: [format], canDownload: true },
    capabilityExpiresAt: new Date(expiresAt).toISOString(),
    safeOrigin: url.origin
  };
}

export async function inspectDirectMedia(url: URL, now = Date.now()): Promise<{ media: MediaMetadata; capabilityExpiresAt: string; safeOrigin: string }> {
  const { response, url: finalUrl } = await requestFollowingRedirects(url, "HEAD");
  const status = response.statusCode ?? 0;
  const headers = response.headers;
  response.resume();
  return registerVerifiedMediaSource(finalUrl, headers, status, now);
}

export function signatureMatches(extension: string, prefix: Buffer): boolean {
  const ascii = prefix.toString("ascii");
  if (["mp4", "mov", "m4v", "m4a"].includes(extension)) return ascii.slice(4, 8) === "ftyp";
  if (["webm", "mkv"].includes(extension)) return prefix.length >= 4 && prefix.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === "mp3") return ascii.startsWith("ID3") || (prefix.length > 1 && prefix[0] === 0xff && (prefix[1] & 0xe0) === 0xe0);
  if (extension === "wav") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE";
  if (["ogg", "opus"].includes(extension)) return ascii.startsWith("OggS");
  if (extension === "flac") return ascii.startsWith("fLaC");
  if (extension === "aac") return prefix.length > 1 && prefix[0] === 0xff && (prefix[1] & 0xf6) === 0xf0;
  return false;
}

async function makeValidatedStream(response: IncomingMessage, extension: string): Promise<Readable> {
  const iterator = response[Symbol.asyncIterator]();
  const prefixChunks: Buffer[] = [];
  let prefixLength = 0;
  try {
    while (prefixLength < 32) {
      const next = await iterator.next();
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      prefixChunks.push(chunk);
      prefixLength += chunk.length;
    }
  } catch {
    throw new DirectMediaError("download_interrupted", "The media transfer ended before the file could be checked.");
  }
  if (prefixLength === 0 || !signatureMatches(extension, Buffer.concat(prefixChunks, prefixLength))) {
    response.destroy();
    throw new DirectMediaError("unsupported_format", "The file content did not match its declared media type.");
  }

  return Readable.from((async function* () {
    let total = prefixLength;
    if (total > MAX_MEDIA_BYTES) throw new DirectMediaError("unsupported_format", "This file exceeds the 512 MB direct-download limit.");
    for (const chunk of prefixChunks) yield chunk;
    try {
      while (true) {
        const next = await iterator.next();
        if (next.done) break;
        const chunk = Buffer.from(next.value);
        total += chunk.length;
        if (total > MAX_MEDIA_BYTES) throw new DirectMediaError("unsupported_format", "This file exceeds the 512 MB direct-download limit.");
        yield chunk;
      }
    } catch (error) {
      if (error instanceof DirectMediaError) throw error;
      throw new DirectMediaError("download_interrupted", "The media transfer was interrupted.");
    }
  })());
}

export async function createDirectDownload(mediaId: string, formatId: string): Promise<DownloadOperation> {
  cleanupExpiredCapabilities();
  const capability = capabilities.get(mediaId);
  if (!capability || capability.expiresAt <= Date.now()) {
    capabilities.delete(mediaId);
    throw new DirectMediaError("expired_media_link", "This analysis has expired. Analyze the media link again.");
  }
  if (formatId !== capability.format.id) throw new DirectMediaError("unsupported_format", "That format was not available for this media link.");

  const source = new URL(capability.sourceUrl);
  const { response } = await requestFollowingRedirects(source, "GET");
  const status = response.statusCode ?? 0;
  if (status === 401 || status === 403) {
    response.resume();
    throw new DirectMediaError("private_or_restricted", "The host no longer allows access to this file.");
  }
  if (status === 404 || status === 410) {
    response.resume();
    throw new DirectMediaError("expired_media_link", "This media link has expired or the file is no longer available.");
  }
  if (status === 429) {
    response.resume();
    throw new DirectMediaError("provider_rate_limited", "The media host is temporarily limiting requests. Try again later.");
  }
  if (status !== 200) {
    response.resume();
    throw new DirectMediaError("provider_unavailable", "The media host could not start the file transfer.");
  }
  if (!mimeMatches(canonicalMime(response.headers), capability.format.mimeType)) {
    response.resume();
    throw new DirectMediaError("unsupported_format", "The file type changed after analysis and could not be downloaded safely.");
  }
  const size = contentLength(response.headers);
  if (size !== null && size > MAX_MEDIA_BYTES) {
    response.resume();
    throw new DirectMediaError("unsupported_format", "This file exceeds the 512 MB direct-download limit.");
  }
  const stream = await makeValidatedStream(response, capability.format.extension);
  return {
    stream,
    mimeType: capability.format.mimeType,
    filename: safeFilename(capability.title, capability.format.extension),
    fileSizeBytes: size ?? capability.format.fileSizeBytes
  };
}

export function clearCapabilitiesForTests(): void {
  capabilities.clear();
}

export function capabilityCountForTests(): number {
  return capabilities.size;
}

export const directMediaLimits = { maxBytes: MAX_MEDIA_BYTES, timeoutMs: REQUEST_TIMEOUT_MS, ttlMs: CAPABILITY_TTL_MS };

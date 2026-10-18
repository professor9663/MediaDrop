import type { MediaMetadata, ProviderAdapter, ProviderAnalysis, ProviderCapability } from "../media/types";
import { mediaExtensionMap } from "../media/url-validation";
import { createDirectDownload, DirectMediaError, inspectDirectMedia } from "../media/direct-media";

export const directMediaCapability: ProviderCapability = {
  id: "direct",
  name: "Direct media files",
  status: "supported",
  description: "Public video/audio files can be checked and streamed after host, redirect, and content-type validation.",
  supportedMediaTypes: ["video", "audio"],
  canAnalyze: true,
  canDownload: true,
  officialUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
  fallbackMessage: "Use the original website's download option if the host blocks direct access."
};

function extension(url: URL): string {
  return url.pathname.split(".").pop()?.toLowerCase() ?? "";
}

function errorResult(error: DirectMediaError): ProviderAnalysis {
  return { success: false, provider: "direct", errorCode: error.code, message: error.message };
}

export const directMediaAdapter: ProviderAdapter = {
  canHandle(url) {
    return extension(url) in mediaExtensionMap;
  },
  validateUrl(url) {
    return this.canHandle(url) && !url.username && !url.password;
  },
  async getMetadata(url) {
    try {
      const result = await inspectDirectMedia(url);
      return {
        success: true,
        provider: "direct",
        media: result.media,
        officialUrl: result.safeOrigin,
        capabilityExpiresAt: result.capabilityExpiresAt
      };
    } catch (error) {
      return error instanceof DirectMediaError ? errorResult(error) : { success: false, provider: "direct", errorCode: "internal_error", message: "The media file could not be checked right now." };
    }
  },
  getAvailableFormats(media: MediaMetadata) {
    return media.formats;
  },
  async download(mediaId, formatId) {
    return createDirectDownload(mediaId, formatId);
  },
  getCapabilities() {
    return directMediaCapability;
  }
};

export type ProviderId = "youtube" | "instagram" | "facebook" | "x" | "pinterest" | "direct";
export type MediaType = "video" | "audio";
export type ProviderStatus = "supported" | "limited_support" | "authorization_required" | "temporarily_unavailable";

export type MediaFormat = {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  quality: string;
  fileSizeBytes: number | null;
};

export type MediaMetadata = {
  id: string;
  title: string;
  type: MediaType;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  formats: MediaFormat[];
  canDownload: boolean;
};

export type ProviderCapability = {
  id: ProviderId;
  name: string;
  status: ProviderStatus;
  description: string;
  supportedMediaTypes: MediaType[];
  canAnalyze: boolean;
  canDownload: boolean;
  officialUrl: string;
  fallbackMessage: string;
};

export type AnalyzeSuccess = {
  success: true;
  provider: ProviderId;
  media: MediaMetadata;
  officialUrl: string;
  capabilityExpiresAt: string;
};

export type SafeErrorCode =
  | "invalid_url"
  | "unsupported_platform"
  | "private_or_restricted"
  | "authentication_required"
  | "download_unavailable"
  | "unsupported_format"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "expired_media_link"
  | "download_interrupted"
  | "file_processing_failed"
  | "request_timeout"
  | "rate_limited"
  | "request_too_large"
  | "internal_error";

export type AnalyzeFailure = {
  success: false;
  provider?: ProviderId;
  errorCode: SafeErrorCode;
  message: string;
  officialUrl?: string;
};

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

export type ProviderAnalysis = AnalyzeResponse;

export type DownloadOperation = {
  stream: import("node:stream").Readable;
  mimeType: string;
  filename: string;
  fileSizeBytes: number | null;
};

export interface ProviderAdapter {
  canHandle(url: URL): boolean;
  validateUrl(url: URL): boolean;
  getMetadata(url: URL): Promise<ProviderAnalysis>;
  getAvailableFormats(media: MediaMetadata): MediaFormat[];
  download(mediaId: string, formatId: string): Promise<DownloadOperation>;
  getCapabilities(): ProviderCapability;
}

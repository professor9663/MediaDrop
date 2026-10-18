import type { ProviderAdapter, ProviderCapability, ProviderId } from "../media/types";
import { directMediaAdapter } from "./direct-media-adapter";

type SocialProviderConfig = Omit<ProviderCapability, "canAnalyze" | "canDownload"> & {
  hosts: string[];
  pathPattern: RegExp;
};

const socialProviders: SocialProviderConfig[] = [
  {
    id: "youtube",
    name: "YouTube",
    status: "limited_support",
    description: "Links are recognized. The official API does not permit downloading YouTube audiovisual content.",
    supportedMediaTypes: ["video"],
    officialUrl: "https://developers.google.com/youtube/terms/developer-policies",
    fallbackMessage: "Open the video in YouTube. YouTube's official API does not allow this service to download or extract audio from its videos.",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com"],
    pathPattern: /^\/(?:watch|shorts\/[^/]+|live\/[^/]+|embed\/[^/]+|[^/]+)?$/
  },
  {
    id: "instagram",
    name: "Instagram",
    status: "authorization_required",
    description: "Official APIs are scoped to authorized professional accounts and embedding; general public media downloads are not available here.",
    supportedMediaTypes: ["video"],
    officialUrl: "https://developers.facebook.com/docs/instagram-platform/oembed",
    fallbackMessage: "Open the post in Instagram. The official API requires account permissions and does not provide a general public-post download operation for this service.",
    hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
    pathPattern: /^\/(?:reel|reels|p|tv)\/[^/]+\/?$/
  },
  {
    id: "facebook",
    name: "Facebook",
    status: "authorization_required",
    description: "Facebook's APIs require object and account permissions; public video download access is not enabled.",
    supportedMediaTypes: ["video"],
    officialUrl: "https://developers.facebook.com/docs/graph-api/reference/video/",
    fallbackMessage: "Open the video in Facebook. This app has no permission to retrieve that video's file; use Facebook's own controls where available.",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
    pathPattern: /^\/(?:watch(?:\/|\?video_id=)|[^/]+\/videos\/|video\.php|reel\/|share\/v\/|[A-Za-z0-9_-]+$)/
  },
  {
    id: "x",
    name: "X",
    status: "authorization_required",
    description: "Reading posts requires X API access. No general video-file download operation is configured.",
    supportedMediaTypes: ["video"],
    officialUrl: "https://developer.x.com/en/docs/x-api",
    fallbackMessage: "Open the post on X. X API access and post permissions are required for metadata, and this service has no authorized video download integration.",
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
    pathPattern: /^\/[^/]+\/status\/\d+\/?$/
  },
  {
    id: "pinterest",
    name: "Pinterest",
    status: "authorization_required",
    description: "The API requires an approved token. Access to video_url is separately restricted by Pinterest.",
    supportedMediaTypes: ["video"],
    officialUrl: "https://developers.pinterest.com/docs/faqs/faqs/",
    fallbackMessage: "Open the Pin in Pinterest. Its API requires an approved account token and explicit video_url access; neither is configured for this public-link workflow.",
    hosts: ["pinterest.com", "www.pinterest.com", "pin.it"],
    pathPattern: /^\/(?:pin\/\d+|[A-Za-z0-9_-]+)\/?$/
  }
];

const capabilityById = new Map<ProviderId, ProviderCapability>();

function createSocialAdapter(config: SocialProviderConfig): ProviderAdapter {
  const capability: ProviderCapability = { ...config, canAnalyze: false, canDownload: false };
  capabilityById.set(config.id, capability);
  return {
    canHandle(url) {
      return config.hosts.includes(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""));
    },
    validateUrl(url) {
      return this.canHandle(url) && config.pathPattern.test(url.pathname + (config.id === "facebook" ? url.search : ""));
    },
    async getMetadata(url) {
      const valid = this.validateUrl(url);
      return {
        success: false,
        provider: config.id,
        errorCode: valid ? (config.status === "authorization_required" ? "authentication_required" : "download_unavailable") : "invalid_url",
        message: valid ? config.fallbackMessage : `That does not look like a supported ${config.name} media link.`,
        officialUrl: url.href
      };
    },
    getAvailableFormats() {
      return [];
    },
    async download() {
      throw new Error("download_unavailable");
    },
    getCapabilities() {
      return capability;
    }
  };
}

export const socialAdapters: ProviderAdapter[] = socialProviders.map(createSocialAdapter);
export { directMediaAdapter } from "./direct-media-adapter";

export function findSocialAdapter(url: URL): ProviderAdapter | undefined {
  return socialAdapters.find((adapter) => adapter.canHandle(url));
}

export function getProviderCapabilities(): ProviderCapability[] {
  return [...socialAdapters.map((adapter) => adapter.getCapabilities()), directMediaAdapter.getCapabilities()];
}

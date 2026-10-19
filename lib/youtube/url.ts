import type { YouTubeTarget } from "./types";

export class YouTubeUrlError extends Error {
  constructor(readonly code: "invalid_url" | "unsupported_platform" | "unsupported_link") {
    super(code);
    this.name = "YouTubeUrlError";
  }
}

const allowedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com"
]);
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const channelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;
const handlePattern = /^@[A-Za-z0-9._-]{3,30}$/;
const usernamePattern = /^[A-Za-z0-9._-]{1,100}$/;

export function parseYouTubeUrl(input: string): YouTubeTarget {
  if (input.length > 2048) throw new YouTubeUrlError("invalid_url");

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new YouTubeUrlError("invalid_url");
  }

  if (!allowedHosts.has(url.hostname.toLowerCase())) throw new YouTubeUrlError("unsupported_platform");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new YouTubeUrlError("invalid_url");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be") {
    return videoTarget(parts[0]);
  }

  if (url.pathname === "/watch") {
    return videoTarget(url.searchParams.get("v") ?? undefined);
  }

  if (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") {
    return videoTarget(parts[1]);
  }

  if (parts[0] === "channel") {
    const channelId = parts[1];
    if (!channelId || !channelIdPattern.test(channelId)) throw new YouTubeUrlError("unsupported_link");
    return { kind: "channel", selector: "id", value: channelId, url: `https://www.youtube.com/channel/${channelId}` };
  }

  if (parts[0]?.startsWith("@")) {
    const handle = parts[0];
    if (!handlePattern.test(handle)) throw new YouTubeUrlError("unsupported_link");
    return { kind: "channel", selector: "handle", value: handle, url: `https://www.youtube.com/${handle}` };
  }

  if (parts[0] === "user") {
    const username = parts[1];
    if (!username || !usernamePattern.test(username)) throw new YouTubeUrlError("unsupported_link");
    return { kind: "channel", selector: "username", value: username, url: `https://www.youtube.com/user/${username}` };
  }

  throw new YouTubeUrlError("unsupported_link");
}

function videoTarget(value: string | undefined): YouTubeTarget {
  if (!value || !videoIdPattern.test(value)) throw new YouTubeUrlError("unsupported_link");
  return {
    kind: "video",
    videoId: value,
    url: `https://www.youtube.com/watch?v=${value}`
  };
}

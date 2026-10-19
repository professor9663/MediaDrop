import { describe, expect, it } from "vitest";
import { parseYouTubeUrl, YouTubeUrlError } from "../lib/youtube/url";

describe("YouTube URL parsing", () => {
  it.each([
    ["https://www.youtube.com/@GoogleDevelopers", "channel", "@GoogleDevelopers"],
    ["https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw", "channel", "UC_x5XG1OV2P6uZZ5FSM9Ttw"],
    ["https://youtube.com/user/GoogleDevelopers", "channel", "GoogleDevelopers"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "video", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"]
  ])("parses supported link %s", (input, kind, value) => {
    const result = parseYouTubeUrl(input);
    expect(result.kind).toBe(kind);
    expect("videoId" in result ? result.videoId : result.value).toBe(value);
  });

  it.each([
    "not a URL",
    "http://youtube.com/@somecreator",
    "https://youtube.com.evil.example/@creator",
    "https://127.0.0.1/@creator",
    "https://youtube.com:8443/@creator",
    "https://user:password@youtube.com/@creator",
    "javascript:alert(1)",
    "https://youtube.com/c/legacy-custom-url",
    "https://youtube.com/watch?v=short"
  ])("rejects unsafe or unsupported input %s", (input) => {
    expect(() => parseYouTubeUrl(input)).toThrow(YouTubeUrlError);
  });
});

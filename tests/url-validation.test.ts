// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseAndValidateMediaUrl, UrlValidationError } from "../lib/media/url-validation";

describe("media URL validation", () => {
  it("identifies supported social providers using host allowlists", () => {
    expect(parseAndValidateMediaUrl("https://youtu.be/dQw4w9WgXcQ").provider).toBe("youtube");
    expect(parseAndValidateMediaUrl("https://www.instagram.com/reel/ABC123/").provider).toBe("instagram");
    expect(parseAndValidateMediaUrl("https://www.facebook.com/watch/?v=123").provider).toBe("facebook");
    expect(parseAndValidateMediaUrl("https://x.com/person/status/123456").provider).toBe("x");
    expect(parseAndValidateMediaUrl("https://www.pinterest.com/pin/123456/").provider).toBe("pinterest");
  });

  it("accepts supported direct media extensions and trims fragments", () => {
    const parsed = parseAndValidateMediaUrl("  https://cdn.example.test/music.mp3#player  ");
    expect(parsed.provider).toBe("direct");
    expect(parsed.url.hash).toBe("");
  });

  it.each(["not a url", "javascript:alert(1)", "file:///etc/passwd", "https://user:pass@example.com/video.mp4"]) (
    "rejects malformed, unsafe, or credential-bearing input: %s",
    (url) => expect(() => parseAndValidateMediaUrl(url)).toThrow(UrlValidationError)
  );

  it("rejects unsupported domains and file formats", () => {
    expect(() => parseAndValidateMediaUrl("https://example.com/page")).toThrow(/not from a supported platform/);
    expect(() => parseAndValidateMediaUrl("https://example.com/video.avi")).toThrow(/not from a supported platform/);
  });

  it("rejects platform lookalike hosts", () => {
    expect(() => parseAndValidateMediaUrl("https://youtube.com.attacker.example/watch?v=1")).toThrow(UrlValidationError);
  });
});

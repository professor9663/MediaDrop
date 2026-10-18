// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { registerVerifiedMediaSource, cleanupExpiredCapabilities, capabilityCountForTests, clearCapabilitiesForTests, createDirectDownload, directMediaLimits, safeFilename, signatureMatches } from "../lib/media/direct-media";
import { getProviderCapabilities, socialAdapters } from "../lib/providers/registry";

describe("provider capabilities and safe media handling", () => {
  beforeEach(() => clearCapabilitiesForTests());

  it("reports real adapter capabilities, including direct files only", () => {
    const capabilities = getProviderCapabilities();
    expect(capabilities.find((provider) => provider.id === "direct")?.canDownload).toBe(true);
    expect(capabilities.filter((provider) => provider.id !== "direct").every((provider) => !provider.canDownload)).toBe(true);
  });

  it("maps recognized social provider links to a clear, non-download result", async () => {
    const youtube = socialAdapters.find((adapter) => adapter.getCapabilities().id === "youtube");
    const result = await youtube?.getMetadata(new URL("https://youtu.be/dQw4w9WgXcQ"));
    expect(result?.success).toBe(false);
    if (!result || result.success) throw new Error("Expected an unavailable provider result");
    expect(result.errorCode).toBe("download_unavailable");
    expect(result.officialUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("refuses unsupported file MIME types", () => {
    expect(() => registerVerifiedMediaSource(new URL("https://files.example.test/clip.mp4"), { "content-type": "text/html" }, 200))
      .toThrow(/did not confirm a supported/);
  });

  it("checks the streamed file signature against its declared extension", () => {
    expect(signatureMatches("mp4", Buffer.from("\u0000\u0000\u0000\u0018ftypisom"))).toBe(true);
    expect(signatureMatches("webm", Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x93]))).toBe(true);
    expect(signatureMatches("mp4", Buffer.from("<!doctype html>"))).toBe(false);
  });

  it("uses verified file size and an expiring server-side capability", () => {
    const now = Date.now();
    const verified = registerVerifiedMediaSource(
      new URL("https://files.example.test/my_clip.mp4"),
      { "content-type": "video/mp4", "content-length": "2048" },
      200,
      now
    );
    expect(verified.media.formats[0].fileSizeBytes).toBe(2048);
    expect(verified.media.formats[0].quality).toBe("Original");
    expect(verified.media.thumbnailUrl).toBeNull();
    expect(capabilityCountForTests()).toBe(1);
    cleanupExpiredCapabilities(now + directMediaLimits.ttlMs + 1);
    expect(capabilityCountForTests()).toBe(0);
  });

  it("rejects an unavailable format and an expired capability", async () => {
    const verified = registerVerifiedMediaSource(
      new URL("https://files.example.test/clip.mp4"),
      { "content-type": "video/mp4" },
      200
    );
    await expect(createDirectDownload(verified.media.id, "1080p")).rejects.toThrow(/not available/);
    cleanupExpiredCapabilities(Date.now() + directMediaLimits.ttlMs + 1);
    await expect(createDirectDownload(verified.media.id, "original")).rejects.toThrow(/expired/);
  });

  it("does not expose a download adapter for social media", async () => {
    const instagram = socialAdapters.find((adapter) => adapter.getCapabilities().id === "instagram");
    await expect(instagram?.download("fake-id", "original")).rejects.toThrow("download_unavailable");
  });

  it("generates safe download filenames", () => {
    expect(safeFilename("../../Démo <Video>\n", "MP4")).toBe("Demo Video.mp4");
  });
});

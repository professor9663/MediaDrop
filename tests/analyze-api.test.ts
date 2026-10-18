// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitsForTests } from "../lib/security/rate-limit";

const { getMetadata, getDirectMetadata, socialAdapter } = vi.hoisted(() => {
  const getMetadata = vi.fn();
  return { getMetadata, getDirectMetadata: vi.fn(), socialAdapter: { getMetadata } };
});

vi.mock("../lib/providers/registry", () => ({
  findSocialAdapter: () => socialAdapter,
  directMediaAdapter: { getMetadata: getDirectMetadata }
}));

import { POST } from "../app/api/media/analyze/route";

function request(body: string, contentType = "application/json") {
  return new Request("http://localhost:3000/api/media/analyze", {
    method: "POST",
    headers: { "Content-Type": contentType, "x-real-ip": "192.0.2.10" },
    body
  });
}

describe("POST /api/media/analyze", () => {
  beforeEach(() => {
    clearRateLimitsForTests();
    getMetadata.mockReset();
    getDirectMetadata.mockReset();
  });

  it("validates JSON payloads before calling a provider", async () => {
    const response = await POST(request("{bad json"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "invalid_url" });
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("rejects unsupported domains without fetching them", async () => {
    const response = await POST(request(JSON.stringify({ url: "https://example.test/not-a-media-page" })));
    expect(response.status).toBe(422);
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("uses the server adapter and returns its safe provider result", async () => {
    getMetadata.mockResolvedValue({
      success: false,
      provider: "instagram",
      errorCode: "authentication_required",
      message: "Open the post in Instagram.",
      officialUrl: "https://www.instagram.com/reel/abc123/"
    });
    const response = await POST(request(JSON.stringify({ url: "https://www.instagram.com/reel/abc123/" })));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "authentication_required" });
    expect(getMetadata).toHaveBeenCalledOnce();
  });

  it("returns a verified success payload from an authorized direct media adapter", async () => {
    getDirectMetadata.mockResolvedValue({
      success: true,
      provider: "direct",
      media: {
        id: "b981a85d-f43f-4657-a1a4-a1260e092dc4",
        title: "Verified clip",
        type: "video",
        thumbnailUrl: null,
        durationSeconds: null,
        formats: [{ id: "original", label: "Original file", extension: "mp4", mimeType: "video/mp4", quality: "Original", fileSizeBytes: 4096 }],
        canDownload: true
      },
      officialUrl: "https://files.example.test",
      capabilityExpiresAt: new Date(Date.now() + 600_000).toISOString()
    });
    const response = await POST(request(JSON.stringify({ url: "https://files.example.test/clip.mp4" })));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, provider: "direct", media: { canDownload: true } });
    expect(getDirectMetadata).toHaveBeenCalledOnce();
  });

  it("rejects oversized bodies before JSON parsing", async () => {
    const response = await POST(request(JSON.stringify({ url: `https://example.test/${"x".repeat(5000)}` })));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "request_too_large" });
  });
});

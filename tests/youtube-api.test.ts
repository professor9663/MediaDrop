// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitsForTests } from "../lib/security/rate-limit";

const { analyzeYouTubeUrl } = vi.hoisted(() => ({ analyzeYouTubeUrl: vi.fn() }));
vi.mock("../lib/youtube/analysis", () => ({ analyzeYouTubeUrl }));
vi.mock("../lib/youtube/api", () => ({
  YouTubeApiError: class YouTubeApiError extends Error {
    constructor(readonly code: string) { super(code); }
  }
}));

import { POST } from "../app/api/youtube/analyze/route";
import { YouTubeApiError } from "../lib/youtube/api";

function request(body: string) {
  return new Request("http://localhost:3000/api/youtube/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "192.0.2.20" },
    body
  });
}

describe("POST /api/youtube/analyze", () => {
  beforeEach(() => {
    clearRateLimitsForTests();
    analyzeYouTubeUrl.mockReset();
  });

  it("rejects malformed and oversized JSON before calling the provider", async () => {
    const malformed = await POST(request("{bad json"));
    expect(malformed.status).toBe(400);
    const oversized = await POST(request(JSON.stringify({ url: `https://youtube.com/${"x".repeat(5000)}` })));
    expect(oversized.status).toBe(413);
    expect(analyzeYouTubeUrl).not.toHaveBeenCalled();
  });

  it("rejects non-YouTube URLs without calling the provider", async () => {
    const response = await POST(request(JSON.stringify({ url: "https://instagram.com/reel/example" })));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "unsupported_platform" });
    expect(analyzeYouTubeUrl).not.toHaveBeenCalled();
  });

  it("returns verified analytics from the service", async () => {
    const analysis = { success: true, provider: "youtube", channel: { id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", title: "Channel", totalViews: 20 }, videos: [] };
    analyzeYouTubeUrl.mockResolvedValue(analysis);
    const response = await POST(request(JSON.stringify({ url: "https://youtube.com/@creator" })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(analysis);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps API quota errors to a safe retry message", async () => {
    analyzeYouTubeUrl.mockRejectedValue(new YouTubeApiError("quota_exceeded"));
    const response = await POST(request(JSON.stringify({ url: "https://youtube.com/@creator" })));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "quota_exceeded", retryable: false });
  });
});

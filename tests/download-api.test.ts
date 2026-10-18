// @vitest-environment node
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitsForTests } from "../lib/security/rate-limit";

const { createDirectDownload } = vi.hoisted(() => ({ createDirectDownload: vi.fn() }));

vi.mock("../lib/media/direct-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/media/direct-media")>();
  return { ...actual, createDirectDownload };
});

import { GET } from "../app/api/media/download/route";

describe("GET /api/media/download", () => {
  beforeEach(() => {
    clearRateLimitsForTests();
    createDirectDownload.mockReset();
  });

  it("streams an authorized mock file with safe response headers", async () => {
    createDirectDownload.mockResolvedValue({
      stream: Readable.from([Buffer.from("mock media bytes")]),
      mimeType: "video/mp4",
      filename: "verified-clip.mp4",
      fileSizeBytes: 16
    });
    const response = await GET(new Request("http://localhost:3000/api/media/download?mediaId=b981a85d-f43f-4657-a1a4-a1260e092dc4&formatId=original", {
      headers: { "x-real-ip": "192.0.2.11" }
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="verified-clip.mp4"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("mock media bytes");
    expect(createDirectDownload).toHaveBeenCalledWith("b981a85d-f43f-4657-a1a4-a1260e092dc4", "original");
  });

  it("rejects malformed or missing capabilities before opening a stream", async () => {
    const response = await GET(new Request("http://localhost:3000/api/media/download?mediaId=not-a-uuid&formatId=1080p", {
      headers: { "x-real-ip": "192.0.2.12" }
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, errorCode: "invalid_url" });
    expect(createDirectDownload).not.toHaveBeenCalled();
  });
});

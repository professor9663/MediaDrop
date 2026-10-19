// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listChannels } from "../lib/youtube/api";

describe("YouTube Data API adapter", () => {
  beforeEach(() => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-server-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the fixed Google API host and requests a handle without scraping the submitted URL", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ items: [{ id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", snippet: { title: "Creator" } }] }), { status: 200 }));

    const result = await listChannels({ forHandle: "@creator" });
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(result.items[0]?.snippet?.title).toBe("Creator");
    expect(requestUrl.origin).toBe("https://youtube.googleapis.com");
    expect(requestUrl.pathname).toBe("/youtube/v3/channels");
    expect(requestUrl.searchParams.get("forHandle")).toBe("@creator");
  });

  it("fails closed when the server API key is missing", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", " ");
    await expect(listChannels({ forHandle: "@creator" })).rejects.toMatchObject({ code: "not_configured" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps quota and restricted-channel errors without exposing upstream details", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }), { status: 403 }));
    await expect(listChannels({ forHandle: "@creator" })).rejects.toMatchObject({ code: "quota_exceeded" });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: { errors: [{ reason: "channelForbidden" }] } }), { status: 403 }));
    await expect(listChannels({ forHandle: "@creator" })).rejects.toMatchObject({ code: "restricted" });
  });

  it("rejects unexpected upstream response shapes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ items: [{ id: 42 }] }), { status: 200 }));
    await expect(listChannels({ forHandle: "@creator" })).rejects.toMatchObject({ code: "unavailable" });
  });
});

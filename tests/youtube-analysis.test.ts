// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listChannels, listRecentUploadIds, listVideos } = vi.hoisted(() => ({
  listChannels: vi.fn(),
  listRecentUploadIds: vi.fn(),
  listVideos: vi.fn()
}));

vi.mock("../lib/youtube/api", () => ({
  listChannels,
  listRecentUploadIds,
  listVideos,
  YouTubeApiError: class YouTubeApiError extends Error {
    constructor(readonly code: string) { super(code); }
  }
}));

import { analyzeYouTubeUrl } from "../lib/youtube/analysis";

const channel = {
  id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
  snippet: { title: "Creator Channel", customUrl: "@creator", description: "A public channel", publishedAt: "2018-01-01T00:00:00Z", thumbnails: { high: { url: "https://i.ytimg.com/vi/abcde123456/hqdefault.jpg" } } },
  statistics: { viewCount: "1200000", subscriberCount: "12300", videoCount: "45", hiddenSubscriberCount: false },
  contentDetails: { relatedPlaylists: { uploads: "UU_uploads" } }
};

function video(id: string, title: string, views: string, publishedAt: string) {
  return {
    id,
    snippet: { title, description: "Description", publishedAt, thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } } },
    statistics: { viewCount: views, likeCount: "100", commentCount: "12" },
    contentDetails: { duration: "PT2M10S" }
  };
}

describe("YouTube analysis normalization", () => {
  beforeEach(() => {
    listChannels.mockReset().mockResolvedValue({ items: [channel] });
    listRecentUploadIds.mockReset().mockResolvedValue(["video000001", "video000002"]);
    listVideos.mockReset().mockResolvedValue({ items: [
      video("video000001", "I Tried This Challenge", "1000", "2026-10-17T00:00:00Z"),
      video("video000002", "Why This Works", "3000", "2026-10-18T00:00:00Z")
    ] });
  });

  it("returns API-backed channel stats and derived sample metrics", async () => {
    const result = await analyzeYouTubeUrl("https://youtube.com/@creator");
    expect(result.channel).toMatchObject({ title: "Creator Channel", subscribers: 12300, totalViews: 1200000, publicVideoCount: 45 });
    expect(result.videos).toHaveLength(2);
    expect(result.sample.totalSampleViews).toBe(4000);
    expect(result.sample.medianViews).toBe(2000);
    expect(result.sample.averageEngagementRate).toBeCloseTo(112 / 2000 * 100);
    expect(result.insights.some((item) => item.title === "Top recent upload")).toBe(true);
    expect(listChannels).toHaveBeenCalledWith({ forHandle: "@creator" });
  });

  it("resolves a video link to its owning channel and preserves the linked video", async () => {
    const focus = video("dQw4w9WgXcQ", "Linked video", "98000", "2026-10-16T00:00:00Z");
    listVideos.mockResolvedValueOnce({ items: [{ ...focus, snippet: { ...focus.snippet, channelId: channel.id } }] })
      .mockResolvedValueOnce({ items: [focus] });
    const result = await analyzeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result.targetType).toBe("video");
    expect(result.focusVideo?.title).toBe("Linked video");
    expect(listChannels).toHaveBeenCalledWith({ id: channel.id });
  });

  it("does not fabricate unavailable subscriber, like, or comment metrics", async () => {
    listChannels.mockResolvedValueOnce({ items: [{ ...channel, statistics: { hiddenSubscriberCount: true } }] });
    listVideos.mockResolvedValueOnce({ items: [video("video000001", "Public video", "0", "2026-10-18T00:00:00Z")] });
    const result = await analyzeYouTubeUrl("https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw");
    expect(result.channel.subscribers).toBeNull();
    expect(result.videos[0].likes).toBe(100);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { YouTubeAnalyzer } from "../components/analysis/youtube-analyzer";

const analysis = {
  success: true as const,
  provider: "youtube" as const,
  targetType: "channel" as const,
  analyzedAt: "2026-10-19T00:00:00.000Z",
  channel: { id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", title: "Public Creator", handle: "@creator", description: "Public bio", thumbnailUrl: null, publishedAt: null, country: null, subscribers: 1200, subscribersHidden: false, totalViews: 25000, publicVideoCount: 8, url: "https://www.youtube.com/@creator" },
  focusVideo: null,
  sample: { videoCount: 1, totalSampleViews: 1000, medianViews: 1000, averageViews: 1000, averageEngagementRate: 3.2, medianViewsPerHour: null, shortLengthVideos: 0, longVideos: 1, estimatedUploadsPerMonth: 2 },
  videos: [{ id: "abcde123456", title: "A real upload", description: "", thumbnailUrl: null, publishedAt: "2026-10-18T00:00:00Z", durationSeconds: 250, views: 1000, likes: 30, comments: 2, engagementRate: 3.2, viewsPerHour: null, format: "long" as const, url: "https://www.youtube.com/watch?v=abcde123456" }],
  insights: [{ title: "Top recent upload", detail: "This upload leads the sample.", evidence: "Public view count" }],
  notes: ["Public data snapshot"]
};

describe("YouTube analyzer interface", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts without fabricated channel results", () => {
    render(<YouTubeAnalyzer apiConfigured />);
    expect(screen.getByLabelText("Analyze a YouTube channel or video")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyze channel/i })).toBeDisabled();
    expect(screen.queryByLabelText("YouTube channel analysis")).not.toBeInTheDocument();
  });

  it("shows a loading state and renders the returned public data", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { resolveRequest = resolve; });
    vi.stubGlobal("fetch", vi.fn(() => pending));
    render(<YouTubeAnalyzer apiConfigured />);
    fireEvent.change(screen.getByLabelText("Analyze a YouTube channel or video"), { target: { value: "https://youtube.com/@creator" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze channel/i }));
    expect(await screen.findByRole("button", { name: /analyzing/i })).toBeDisabled();
    resolveRequest?.({ json: async () => analysis } as Response);
    expect(await screen.findByRole("heading", { name: "Public Creator" })).toBeInTheDocument();
    expect(screen.getByText("25K")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /A real upload/ })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows safe backend errors and a clear setup state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: false, errorCode: "quota_exceeded", message: "Quota is temporarily exhausted.", retryable: false }) }));
    render(<YouTubeAnalyzer apiConfigured={false} />);
    fireEvent.change(screen.getByLabelText("Analyze a YouTube channel or video"), { target: { value: "https://youtube.com/@creator" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze channel/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Quota is temporarily exhausted.");
    expect(screen.getByText(/YOUTUBE_API_KEY/)).toBeInTheDocument();
    expect(screen.queryByLabelText("YouTube channel analysis")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows retryable network errors without a fake result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<YouTubeAnalyzer apiConfigured />);
    fireEvent.change(screen.getByLabelText("Analyze a YouTube channel or video"), { target: { value: "https://youtube.com/@creator" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze channel/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not reach the analysis service/i));
    expect(screen.queryByLabelText("YouTube channel analysis")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

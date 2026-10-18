import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Downloader } from "../components/downloader/downloader";

describe("Downloader form states", () => {
  it("starts empty with analysis disabled", () => {
    render(<Downloader />);
    expect(screen.getByLabelText("Paste your media link")).toHaveValue("");
    expect(screen.getByRole("button", { name: /analyze link/i })).toBeDisabled();
    expect(screen.queryByLabelText("Verified media options")).not.toBeInTheDocument();
  });

  it("shows a loading state while the backend checks a link", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => { resolveRequest = resolve; });
    vi.stubGlobal("fetch", vi.fn(() => pending));
    render(<Downloader />);
    fireEvent.change(screen.getByLabelText("Paste your media link"), { target: { value: "https://files.example.test/clip.mp4" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze link/i }));
    expect(await screen.findByRole("button", { name: /checking/i })).toBeDisabled();
    resolveRequest?.({ json: async () => ({ success: false, errorCode: "provider_unavailable", message: "Unavailable." }) } as Response);
    await waitFor(() => expect(screen.getByText("Unavailable.")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });

  it("renders verified media and exposes only the original download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        provider: "direct",
        officialUrl: "https://files.example.test",
        capabilityExpiresAt: new Date(Date.now() + 600_000).toISOString(),
        media: {
          id: "b981a85d-f43f-4657-a1a4-a1260e092dc4",
          title: "Sample clip",
          type: "video",
          thumbnailUrl: null,
          durationSeconds: null,
          canDownload: true,
          formats: [{ id: "original", label: "Original file", extension: "mp4", mimeType: "video/mp4", quality: "Original", fileSizeBytes: 1024 }]
        }
      })
    }));
    render(<Downloader />);
    fireEvent.change(screen.getByLabelText("Paste your media link"), { target: { value: "https://files.example.test/clip.mp4" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze link/i }));
    expect(await screen.findByRole("heading", { name: "Sample clip" })).toBeInTheDocument();
    const download = screen.getByRole("link", { name: /download original mp4/i });
    expect(download).toHaveAttribute("href", expect.stringContaining("formatId=original"));
    expect(screen.getByText("1 KB")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows a useful limitation message for unavailable social media", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        provider: "youtube",
        errorCode: "download_unavailable",
        message: "Open the video in YouTube.",
        officialUrl: "https://www.youtube.com/watch?v=abc"
      })
    }));
    render(<Downloader />);
    fireEvent.change(screen.getByLabelText("Paste your media link"), { target: { value: "https://www.youtube.com/watch?v=abc" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze link/i }));
    expect(await screen.findByText("Open the video in YouTube.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open on YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc");
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows a retryable network error without inventing a result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<Downloader />);
    fireEvent.change(screen.getByLabelText("Paste your media link"), { target: { value: "https://cdn.example.test/clip.mp4" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the analysis service/);
    expect(screen.queryByLabelText("Verified media options")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

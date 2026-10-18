"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, CircleAlert, FileAudio2, FileVideo2, LoaderCircle, Link2, X } from "lucide-react";
import type { AnalyzeResponse } from "@/lib/media/types";

function formatSize(size: number | null): string {
  if (size === null) return "Size not provided by source";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function displayProvider(provider: string): string {
  if (provider === "x") return "X";
  if (provider === "youtube") return "YouTube";
  if (provider === "direct") return "Direct media";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function Downloader() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAnalyzing(true);
    setResult(null);
    setRequestError(null);

    try {
      const response = await fetch("/api/media/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        cache: "no-store"
      });
      const data = await response.json() as AnalyzeResponse;
      setResult(data);
    } catch {
      setRequestError("MediaDrop could not reach the analysis service. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function clearInput() {
    setUrl("");
    setResult(null);
    setRequestError(null);
  }

  return (
    <div className="downloader-wrap" id="downloader">
      <form className="url-form" onSubmit={analyze} aria-label="Analyze a media link">
        <label className="url-label" htmlFor="media-url">Paste your media link</label>
        <div className="url-entry">
          <Link2 size={20} className="url-entry-icon" aria-hidden="true" />
          <input
            id="media-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            maxLength={2048}
            value={url}
            onChange={(event) => { setUrl(event.target.value); setResult(null); setRequestError(null); }}
            placeholder="https://example.com/video.mp4"
            aria-describedby="url-help analyze-status"
            required
          />
          {url && <button type="button" className="clear-url-button" onClick={clearInput} aria-label="Clear entered link" title="Clear link"><X size={17} aria-hidden="true" /></button>}
          <button type="submit" className="button button-primary analyze-button" disabled={isAnalyzing || !url.trim()}>
            {isAnalyzing ? <><LoaderCircle size={17} className="spin" aria-hidden="true" /> Checking</> : <>Analyze link <ArrowDownToLine size={17} aria-hidden="true" /></>}
          </button>
        </div>
        <p id="url-help" className="url-helper">Enter a public HTTP or HTTPS link. Only verified, supported downloads are shown.</p>
        <div id="analyze-status" className="sr-only" role="status" aria-live="polite">{isAnalyzing ? "Checking media link" : ""}</div>
      </form>

      {requestError && <div className="analysis-error" role="alert"><CircleAlert size={19} aria-hidden="true" /><p>{requestError}</p></div>}

      {result && !result.success && <section className="analysis-result result-unavailable" aria-live="polite" aria-label="Analysis result">
        <div className="result-icon result-icon-alert"><CircleAlert size={21} aria-hidden="true" /></div>
        <div className="result-content">
          <div className="result-heading-row"><div><span className="result-overline">LINK CHECK</span><h2>{result.provider ? `${displayProvider(result.provider)} link recognized` : "Could not use this link"}</h2></div><span className="status-pill status-limited_support">No file available</span></div>
          <p>{result.message}</p>
          <div className="result-actions">
            {result.officialUrl && <a className="button button-secondary button-small" href={result.officialUrl} target="_blank" rel="noreferrer">Open on {result.provider ? displayProvider(result.provider) : "source"}<ArrowUpRight size={15} aria-hidden="true" /></a>}
            {result.errorCode === "provider_unavailable" || result.errorCode === "request_timeout" ? <button className="text-button" type="button" onClick={() => { setResult(null); setRequestError(null); }}>Try again</button> : null}
          </div>
        </div>
      </section>}

      {result?.success && <section className="analysis-result result-ready" aria-live="polite" aria-label="Verified media options">
        <div className={`result-icon ${result.media.type === "audio" ? "result-icon-audio" : "result-icon-video"}`} aria-hidden="true">
          {result.media.type === "audio" ? <FileAudio2 size={23} /> : <FileVideo2 size={23} />}
        </div>
        <div className="result-content">
          <div className="result-heading-row"><div><span className="result-overline">VERIFIED SOURCE · {displayProvider(result.provider)}</span><h2>{result.media.title}</h2></div><span className="status-pill status-supported"><Check size={13} aria-hidden="true" /> Ready</span></div>
          <div className="media-detail-row"><span className="media-type-label">{result.media.type === "audio" ? "Audio file" : "Video file"}</span><span>{formatSize(result.media.formats[0]?.fileSizeBytes ?? null)}</span><span>{result.media.formats[0]?.quality ?? "Source quality"}</span></div>
          {result.media.canDownload && result.media.formats.length > 0 ? <a className="button button-primary download-button" href={`/api/media/download?mediaId=${encodeURIComponent(result.media.id)}&formatId=${encodeURIComponent(result.media.formats[0].id)}`}>
            <ArrowDownToLine size={18} aria-hidden="true" /> Download original <span>{result.media.formats[0].extension.toUpperCase()}</span>
          </a> : <p className="no-download-note">The source did not provide an authorized download option.</p>}
          <p className="result-retention-note">Download capability expires 10 minutes after analysis. The file is streamed from its source.</p>
        </div>
      </section>}
    </div>
  );
}

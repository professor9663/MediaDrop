"use client";

import { useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CircleAlert, Eye, ExternalLink, MessageCircle, Play, RefreshCw, Search, Sparkles, Users, Video, X } from "lucide-react";
import type { YouTubeAnalysis, YouTubeAnalysisResponse, YouTubeVideo } from "@/lib/youtube/types";

function compact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function dateLabel(value: string | null): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function durationLabel(seconds: number | null): string {
  if (seconds === null) return "Duration unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

type ChannelSnapshot = { channelId: string; capturedAt: number; totalViews: number };

function recordChannelSnapshot(channelId: string, totalViews: number | null): number | null {
  if (totalViews === null) return null;
  try {
    const key = "mediadrop-youtube-channel-snapshots-v1";
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const snapshots: ChannelSnapshot[] = Array.isArray(stored) ? stored.filter((item): item is ChannelSnapshot => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.channelId === "string" && typeof candidate.capturedAt === "number" && typeof candidate.totalViews === "number";
    }) : [];
    const now = Date.now();
    const channelSnapshots = snapshots.filter((item) => item.channelId === channelId).sort((a, b) => a.capturedAt - b.capturedAt);
    const baseline = [...channelSnapshots].reverse().find((item) => {
      const days = (now - item.capturedAt) / 86_400_000;
      return days >= 27 && days <= 180;
    });
    let viewEstimate: number | null = null;
    if (baseline) {
      const days = (now - baseline.capturedAt) / 86_400_000;
      const viewChange = totalViews - baseline.totalViews;
      if (viewChange >= 0) viewEstimate = Math.round(viewChange / days * 28);
    }

    const retained = snapshots.filter((item) => item.capturedAt >= now - 180 * 86_400_000 && item.channelId !== channelId);
    const today = new Date(now).toISOString().slice(0, 10);
    const priorChannelSnapshots = channelSnapshots.filter((item) => item.capturedAt >= now - 180 * 86_400_000 && new Date(item.capturedAt).toISOString().slice(0, 10) !== today);
    window.localStorage.setItem(key, JSON.stringify([...retained, ...priorChannelSnapshots, { channelId, capturedAt: now, totalViews }].slice(-5000)));
    return viewEstimate;
  } catch {
    return null;
  }
}

function RevenueEstimator({ analysis, tracked28DayViews }: { analysis: YouTubeAnalysis; tracked28DayViews: number | null }) {
  const [lowRpm, setLowRpm] = useState("0.50");
  const [highRpm, setHighRpm] = useState("5.00");
  const low = Number(lowRpm);
  const high = Number(highRpm);
  const valid = Number.isFinite(low) && Number.isFinite(high) && low >= 0 && high >= low;
  const estimateViews = tracked28DayViews ?? analysis.sample.totalSampleViews;
  const lowerEstimate = valid ? estimateViews * low / 1000 : null;
  const upperEstimate = valid ? estimateViews * high / 1000 : null;
  const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  return <section className="estimate-panel" aria-labelledby="estimate-heading">
    <div className="panel-heading estimate-heading">
      <div><span className="eyebrow">PLANNING TOOL</span><h3 id="estimate-heading">Illustrative earnings range</h3></div>
      <span className="estimate-badge">Estimate · not actual revenue</span>
    </div>
    <p className="panel-copy">{tracked28DayViews === null ? "Apply your RPM assumptions to lifetime views on the latest sampled uploads. After 28 days of analysis on this browser, the model can use observed channel view growth instead." : "This browser has enough dated snapshots to estimate a 28-day view change. Apply your own RPM assumptions; actual monetization and income are private."} A competitor&apos;s monetization status and actual earnings are private.</p>
    <div className="estimate-controls">
      <label>Low RPM <span>USD / 1,000 views</span><input type="number" min="0" step="0.05" value={lowRpm} onChange={(event) => setLowRpm(event.target.value)} /></label>
      <label>High RPM <span>USD / 1,000 views</span><input type="number" min="0" step="0.05" value={highRpm} onChange={(event) => setHighRpm(event.target.value)} /></label>
    </div>
    {valid ? <div className="estimate-output"><span>{money(lowerEstimate)} <i>—</i> {money(upperEstimate)}</span><small>{tracked28DayViews === null ? `Modelled on ${compact(estimateViews)} lifetime views across ${analysis.sample.videoCount} sampled uploads.` : `Modelled on ${compact(estimateViews)} estimated channel views over 28 days, based on local snapshots.`} Your RPM assumptions are editable.</small></div> : <p className="estimate-validation" role="alert">Enter a valid range where the high RPM is at least the low RPM.</p>}
  </section>;
}

function VideoBars({ videos }: { videos: YouTubeVideo[] }) {
  const rows = [...videos].sort((a, b) => b.views - a.views).slice(0, 6);
  const maxViews = Math.max(1, ...rows.map((video) => video.views));
  return <div className="video-bars" aria-label="Top six sampled uploads by views">
    {rows.map((video) => <div className="video-bar-row" key={video.id}>
      <span className="video-bar-title" title={video.title}>{video.title}</span>
      <span className="video-bar-track"><span className="video-bar-fill" style={{ width: `${Math.max(3, video.views / maxViews * 100)}%` }} /></span>
      <strong>{compact(video.views)}</strong>
    </div>)}
  </div>;
}

function VideoRow({ video, rank }: { video: YouTubeVideo; rank: number }) {
  return <article className="upload-row">
    <span className="upload-rank">{String(rank).padStart(2, "0")}</span>
    {video.thumbnailUrl ? <img className="upload-thumbnail" src={video.thumbnailUrl} alt="" loading="lazy" /> : <div className="upload-thumbnail upload-placeholder"><Play size={18} /></div>}
    <div className="upload-main">
      <a href={video.url} target="_blank" rel="noreferrer" className="upload-title">{video.title}<ExternalLink size={13} aria-hidden="true" /></a>
      <span>{dateLabel(video.publishedAt)} <i>·</i> {durationLabel(video.durationSeconds)}</span>
    </div>
    <div className="upload-stat"><Eye size={14} aria-hidden="true" /><strong>{compact(video.views)}</strong><small>views</small></div>
    <div className="upload-stat upload-engagement"><Activity size={14} aria-hidden="true" /><strong>{video.engagementRate === null ? "—" : `${video.engagementRate.toFixed(2)}%`}</strong><small>engagement</small></div>
    <div className="upload-stat upload-comments"><MessageCircle size={14} aria-hidden="true" /><strong>{compact(video.comments)}</strong><small>comments</small></div>
  </article>;
}

function AnalysisDashboard({ analysis, tracked28DayViews }: { analysis: YouTubeAnalysis; tracked28DayViews: number | null }) {
  const { channel, sample, videos, insights } = analysis;
  const avgViews = sample.averageViews === null ? "—" : compact(sample.averageViews);
  return <section className="analysis-dashboard" aria-label="YouTube channel analysis">
    <div className="channel-profile panel">
      {channel.thumbnailUrl ? <img className="channel-avatar" src={channel.thumbnailUrl} alt="" /> : <div className="channel-avatar channel-avatar-fallback"><Play size={22} /></div>}
      <div className="channel-identity"><span className="eyebrow">YOUTUBE {analysis.targetType === "video" ? "VIDEO ANALYSIS" : "CHANNEL ANALYSIS"}</span><h2>{channel.title}</h2><p>{channel.handle ?? channel.id}{channel.country ? ` · ${channel.country}` : ""}</p></div>
      <a className="button button-quiet profile-link" href={channel.url} target="_blank" rel="noreferrer">Open channel <ExternalLink size={15} aria-hidden="true" /></a>
      <div className="profile-updated"><span className="live-dot" /> Public data snapshot <span>·</span> {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(analysis.analyzedAt))}</div>
      {channel.description && <p className="channel-description">{channel.description}</p>}
    </div>

    {analysis.focusVideo && <div className="focus-video panel"><div><span className="eyebrow">LINKED VIDEO</span><h3>{analysis.focusVideo.title}</h3><p>{dateLabel(analysis.focusVideo.publishedAt)} · {durationLabel(analysis.focusVideo.durationSeconds)}</p></div><a href={analysis.focusVideo.url} target="_blank" rel="noreferrer" className="button button-quiet">View video <ExternalLink size={14} /></a></div>}

    <div className="metric-grid">
      <article className="metric-card"><span className="metric-icon"><Users size={18} /></span><span className="metric-label">Subscribers</span><strong>{channel.subscribersHidden && channel.subscribers === null ? "Hidden" : compact(channel.subscribers)}</strong><small>{channel.subscribers === null ? "Not publicly available" : "Public count · may be rounded"}</small></article>
      <article className="metric-card"><span className="metric-icon"><Eye size={18} /></span><span className="metric-label">Channel views</span><strong>{compact(channel.totalViews)}</strong><small>Lifetime public channel views</small></article>
      <article className="metric-card"><span className="metric-icon"><Video size={18} /></span><span className="metric-label">Public videos</span><strong>{compact(channel.publicVideoCount)}</strong><small>Public uploads reported by YouTube</small></article>
      <article className="metric-card"><span className="metric-icon"><BarChart3 size={18} /></span><span className="metric-label">Median recent views</span><strong>{compact(sample.medianViews)}</strong><small>Latest {sample.videoCount} uploads sampled</small></article>
    </div>

    <div className="dashboard-columns">
      <section className="panel performance-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT PERFORMANCE</span><h3>Views by upload</h3></div><span className="panel-meta">Top 6 in the latest sample</span></div>{videos.length ? <VideoBars videos={videos} /> : <p className="empty-panel">No public uploads were returned for this channel.</p>}<div className="performance-summary"><span><strong>{avgViews}</strong> average views / upload</span><span><strong>{sample.averageEngagementRate === null ? "—" : `${sample.averageEngagementRate.toFixed(2)}%`}</strong> average engagement</span><span><strong>{sample.estimatedUploadsPerMonth === null ? "—" : sample.estimatedUploadsPerMonth.toFixed(1)}</strong> estimated uploads / month</span></div></section>
      <section className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow">CREATOR SIGNALS</span><h3>What stands out</h3></div><Sparkles size={19} className="insight-spark" aria-hidden="true" /></div>{insights.length ? <div className="insight-list">{insights.map((insight) => <article className="insight-item" key={insight.title}><span className="insight-marker"><ArrowUpRight size={15} /></span><div><h4>{insight.title}</h4><p>{insight.detail}</p><small>{insight.evidence}</small></div></article>)}</div> : <p className="empty-panel">There is not enough public upload data to find patterns yet.</p>}</section>
    </div>

    <RevenueEstimator analysis={analysis} tracked28DayViews={tracked28DayViews} />

    <section className="panel uploads-panel"><div className="panel-heading"><div><span className="eyebrow">CHANNEL LIBRARY</span><h3>Recent uploads</h3></div><span className="panel-meta">{videos.length} of up to 25 public videos</span></div>{videos.length ? <div className="upload-list">{videos.slice(0, 12).map((video, index) => <VideoRow video={video} rank={index + 1} key={video.id} />)}</div> : <p className="empty-panel">No public uploads are available to display.</p>}</section>

    <details className="data-notes panel"><summary>Data and estimate limitations <span>+</span></summary><ul>{analysis.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
  </section>;
}

export function YouTubeAnalyzer({ apiConfigured }: { apiConfigured: boolean }) {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [response, setResponse] = useState<YouTubeAnalysisResponse | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [tracked28DayViews, setTracked28DayViews] = useState<number | null>(null);

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAnalyzing(true);
    setResponse(null);
    setNetworkError(null);
    try {
      const result = await fetch("/api/youtube/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        cache: "no-store"
      });
      const body = await result.json() as YouTubeAnalysisResponse;
      setResponse(body);
      setTracked28DayViews(body.success ? recordChannelSnapshot(body.channel.id, body.channel.totalViews) : null);
    } catch {
      setNetworkError("Could not reach the analysis service. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function clear() {
    setUrl("");
    setResponse(null);
    setNetworkError(null);
    setTracked28DayViews(null);
  }

  const result = response?.success ? response : null;
  const error = response && !response.success ? response : null;

  return <>
    <section className="analyzer-shell" id="analyze" aria-label="YouTube analyzer">
      <form className="analyzer-form" onSubmit={analyze}>
        <label id="analyze-label" htmlFor="youtube-url">Analyze a YouTube channel or video</label>
        <div className="analyzer-input-row"><Search size={20} aria-hidden="true" /><input id="youtube-url" type="url" inputMode="url" autoComplete="url" maxLength={2048} required value={url} onChange={(event) => { setUrl(event.target.value); setResponse(null); setNetworkError(null); }} placeholder="https://www.youtube.com/@channel or a video link" aria-describedby="youtube-url-help" />{url && <button className="clear-search" type="button" onClick={clear} aria-label="Clear YouTube URL"><X size={18} /></button>}<button className="button button-primary" type="submit" disabled={isAnalyzing || !url.trim()}>{isAnalyzing ? <><RefreshCw size={17} className="spin" /> Analyzing</> : <>Analyze channel <ArrowRight size={17} /></>}</button></div>
        <div className="analyzer-help-row"><p id="youtube-url-help">Paste a channel, @handle, video, or Shorts URL. Public data only.</p><span className={`api-state ${apiConfigured ? "api-ready" : "api-needs-key"}`}><span />{apiConfigured ? "YouTube API connected" : "API key setup required"}</span></div>
        <div className="sr-only" role="status" aria-live="polite">{isAnalyzing ? "Analyzing YouTube data" : ""}</div>
      </form>
    </section>
    {networkError && <div className="analysis-alert" role="alert"><CircleAlert size={18} /><p>{networkError}</p></div>}
    {error && <div className="analysis-alert" role="alert"><CircleAlert size={18} /><div><strong>{error.message}</strong>{error.retryable && <button className="retry-button" type="button" onClick={() => { setResponse(null); setNetworkError(null); }}>Retry analysis</button>}</div></div>}
    {!apiConfigured && <div className="setup-callout"><div><span className="eyebrow">ONE-TIME SETUP</span><p>Add <code>YOUTUBE_API_KEY</code> to your local environment or hosting dashboard to enable real analysis.</p></div><a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">Enable YouTube Data API <ExternalLink size={14} /></a></div>}
    {result && <AnalysisDashboard analysis={result} tracked28DayViews={tracked28DayViews} />}
    {!result && !error && !networkError && <div className="sample-prompt"><div className="sample-icon"><Activity size={18} /></div><div><strong>Start with any public channel or video</strong><p>We&apos;ll return real YouTube stats and analyze its latest public uploads. No sample data is shown.</p></div><span className="sample-arrow"><ArrowDownRight size={21} /></span></div>}
  </>;
}

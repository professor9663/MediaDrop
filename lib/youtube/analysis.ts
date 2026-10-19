import { listChannels, listRecentUploadIds, listVideos, YouTubeApiError } from "./api";
import type { YouTubeAnalysis, YouTubeInsight, YouTubeVideo } from "./types";
import { parseYouTubeUrl } from "./url";

type ApiChannel = Awaited<ReturnType<typeof listChannels>>["items"][number];
type ApiVideo = Awaited<ReturnType<typeof listVideos>>["items"][number];

function count(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}

function thumbnail(thumbnails: Record<string, { url: string }> | undefined): string | null {
  if (!thumbnails) return null;
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const url = thumbnails[key]?.url;
    if (url && url.startsWith("https://i.ytimg.com/")) return url;
  }
  return null;
}

function durationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function normalizeVideo(item: ApiVideo): YouTubeVideo | null {
  if (!item.snippet?.title) return null;
  const views = count(item.statistics?.viewCount) ?? 0;
  const likes = count(item.statistics?.likeCount);
  const comments = count(item.statistics?.commentCount);
  const publishedAt = item.snippet.publishedAt ?? null;
  const duration = durationSeconds(item.contentDetails?.duration);
  const hoursSincePublish = publishedAt ? Math.max(1, (Date.now() - Date.parse(publishedAt)) / 3_600_000) : null;
  const engagementRate = views > 0 && (likes !== null || comments !== null)
    ? ((likes ?? 0) + (comments ?? 0)) / views * 100
    : null;

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    thumbnailUrl: thumbnail(item.snippet.thumbnails),
    publishedAt,
    durationSeconds: duration,
    views,
    likes,
    comments,
    engagementRate,
    viewsPerHour: hoursSincePublish === null ? null : views / hoursSincePublish,
    format: duration === null ? "unknown" : duration <= 180 ? "short_length" : "long",
    url: `https://www.youtube.com/watch?v=${item.id}`
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function titleCategory(title: string): string {
  if (/\b(vs\.?|versus|compared? to)\b/i.test(title)) return "Comparison";
  if (/\b(i tried|challenge|last to|survive|surviving|for 24 hours|for 100 days)\b/i.test(title)) return "Challenge";
  if (/\$|\b(million|billion|money|rich|poor|worth)\b/i.test(title)) return "Money or stakes";
  if (/\b(why|how|what|who|when)\b/i.test(title)) return "Question";
  if (/^\s*\d+\b/.test(title)) return "Number-led";
  return "Other";
}

function createInsights(videos: YouTubeVideo[], sampleMedian: number | null, uploadsPerMonth: number | null): YouTubeInsight[] {
  if (videos.length === 0) return [];
  const insights: YouTubeInsight[] = [];
  const top = [...videos].sort((a, b) => b.views - a.views)[0];
  if (top) {
    insights.push({
      title: "Top recent upload",
      detail: `“${top.title}” leads this sample with ${top.views.toLocaleString()} views.`,
      evidence: "Public view count on the channel's latest uploads"
    });
  }

  const categories = new Map<string, YouTubeVideo[]>();
  for (const video of videos) {
    const category = titleCategory(video.title);
    if (category === "Other") continue;
    categories.set(category, [...(categories.get(category) ?? []), video]);
  }
  const strongestPattern = [...categories.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([name, items]) => ({ name, items, views: average(items.map((item) => item.views)) ?? 0 }))
    .sort((a, b) => b.views - a.views)[0];
  if (strongestPattern) {
    insights.push({
      title: `${strongestPattern.name} titles appear ${strongestPattern.views >= (sampleMedian ?? 0) ? "above" : "below"} the sample median`,
      detail: `${strongestPattern.items.length} recent titles match this pattern, averaging ${Math.round(strongestPattern.views).toLocaleString()} views each.`,
      evidence: "Rule-based title classification compared with recent public views"
    });
  }

  const shortLength = videos.filter((video) => video.format === "short_length");
  const long = videos.filter((video) => video.format === "long");
  if (shortLength.length > 0 && long.length > 0) {
    const shortAverage = average(shortLength.map((video) => video.views)) ?? 0;
    const longAverage = average(long.map((video) => video.views)) ?? 0;
    const higher = shortAverage >= longAverage ? "videos up to three minutes" : "videos over three minutes";
    const higherAverage = Math.max(shortAverage, longAverage);
    insights.push({
      title: `${higher} lead in average views`,
      detail: `Average views are ${Math.round(higherAverage).toLocaleString()} across the sampled uploads.`,
      evidence: "Duration-based grouping; duration does not reliably identify a YouTube Short"
    });
  }

  if (uploadsPerMonth !== null) {
    insights.push({
      title: "Publishing pace",
      detail: `The latest ${videos.length} uploads indicate approximately ${uploadsPerMonth.toFixed(1)} uploads per month.`,
      evidence: "Publish dates of public uploads returned by YouTube"
    });
  }
  return insights.slice(0, 4);
}

async function resolveChannel(selector: { id?: string; forHandle?: string; forUsername?: string }): Promise<ApiChannel> {
  const response = await listChannels(selector);
  const channel = response.items[0];
  if (!channel) throw new YouTubeApiError("not_found");
  return channel;
}

export async function analyzeYouTubeUrl(input: string): Promise<YouTubeAnalysis> {
  const target = parseYouTubeUrl(input);
  let focus: ApiVideo | undefined;
  let channel: ApiChannel;

  if (target.kind === "video") {
    const response = await listVideos([target.videoId]);
    focus = response.items[0];
    if (!focus?.snippet?.channelId) throw new YouTubeApiError("not_found");
    channel = await resolveChannel({ id: focus.snippet.channelId });
  } else if (target.selector === "id") {
    channel = await resolveChannel({ id: target.value });
  } else if (target.selector === "handle") {
    channel = await resolveChannel({ forHandle: target.value });
  } else {
    channel = await resolveChannel({ forUsername: target.value });
  }

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  const uploadIds = uploadsPlaylistId ? await listRecentUploadIds(uploadsPlaylistId) : [];
  const videoResponse = await listVideos([...new Set([...(focus ? [focus.id] : []), ...uploadIds])].slice(0, 50));
  const videosById = new Map(videoResponse.items.map((item) => [item.id, item]));
  if (focus) videosById.set(focus.id, focus);
  const videos = [...videosById.values()]
    .map(normalizeVideo)
    .filter((video): video is YouTubeVideo => video !== null)
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""))
    .slice(0, 25);

  const viewCounts = videos.map((video) => video.views);
  const engagementVideos = videos.filter((video) => video.views > 0 && (video.likes !== null || video.comments !== null));
  const engagementViewTotal = engagementVideos.reduce((sum, video) => sum + video.views, 0);
  const engagementInteractionTotal = engagementVideos.reduce((sum, video) => sum + (video.likes ?? 0) + (video.comments ?? 0), 0);
  const viewsPerHour = videos.flatMap((video) => video.viewsPerHour === null ? [] : [video.viewsPerHour]);
  const dates = videos.map((video) => video.publishedAt ? Date.parse(video.publishedAt) : NaN).filter(Number.isFinite).sort((a, b) => a - b);
  const uploadSpanDays = dates.length > 1 ? Math.max(1, (dates[dates.length - 1] - dates[0]) / 86_400_000) : null;
  const uploadsPerMonth = uploadSpanDays ? (dates.length - 1) / uploadSpanDays * 30.4375 : null;
  const stats = channel.statistics;
  const snippet = channel.snippet;
  const customUrl = snippet?.customUrl ?? null;
  const profileUrl = customUrl?.startsWith("@")
    ? `https://www.youtube.com/${customUrl}`
    : `https://www.youtube.com/channel/${channel.id}`;
  const channelViews = count(stats?.viewCount);
  const focusVideo = focus ? normalizeVideo(focus) : null;
  const sampleMedian = median(viewCounts);

  return {
    success: true,
    provider: "youtube",
    targetType: target.kind,
    analyzedAt: new Date().toISOString(),
    channel: {
      id: channel.id,
      title: snippet?.title ?? "YouTube channel",
      handle: customUrl,
      description: snippet?.description ?? "",
      thumbnailUrl: thumbnail(snippet?.thumbnails),
      publishedAt: snippet?.publishedAt ?? null,
      country: snippet?.country ?? null,
      subscribers: count(stats?.subscriberCount),
      subscribersHidden: stats?.hiddenSubscriberCount ?? false,
      totalViews: channelViews,
      publicVideoCount: count(stats?.videoCount),
      url: profileUrl
    },
    focusVideo,
    sample: {
      videoCount: videos.length,
      totalSampleViews: viewCounts.reduce((sum, value) => sum + value, 0),
      medianViews: sampleMedian,
      averageViews: average(viewCounts),
      averageEngagementRate: engagementViewTotal > 0 ? engagementInteractionTotal / engagementViewTotal * 100 : null,
      medianViewsPerHour: median(viewsPerHour),
      shortLengthVideos: videos.filter((video) => video.format === "short_length").length,
      longVideos: videos.filter((video) => video.format === "long").length,
      estimatedUploadsPerMonth: uploadsPerMonth
    },
    videos,
    insights: createInsights(videos, sampleMedian, uploadsPerMonth),
    notes: [
      `Analysis uses up to ${videos.length} latest public uploads and the public statistics returned by YouTube at analysis time.`,
      "Public subscriber counts may be hidden or rounded by YouTube. Likes and comments can be disabled or unavailable.",
      "The three-minute duration split is a rough format proxy and does not identify Shorts reliably.",
      "Public data does not include a competitor's actual revenue, watch time, audience demographics, or impressions. Earnings shown by this app are assumption-based estimates, not creator earnings data."
    ]
  };
}

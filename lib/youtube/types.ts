export type YouTubeTarget =
  | { kind: "channel"; selector: "id" | "handle" | "username"; value: string; url: string }
  | { kind: "video"; videoId: string; url: string };

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  views: number;
  likes: number | null;
  comments: number | null;
  engagementRate: number | null;
  viewsPerHour: number | null;
  format: "short_length" | "long" | "unknown";
  url: string;
};

export type YouTubeInsight = {
  title: string;
  detail: string;
  evidence: string;
};

export type YouTubeAnalysis = {
  success: true;
  provider: "youtube";
  targetType: "channel" | "video";
  analyzedAt: string;
  channel: {
    id: string;
    title: string;
    handle: string | null;
    description: string;
    thumbnailUrl: string | null;
    publishedAt: string | null;
    country: string | null;
    subscribers: number | null;
    subscribersHidden: boolean;
    totalViews: number | null;
    publicVideoCount: number | null;
    url: string;
  };
  focusVideo: YouTubeVideo | null;
  sample: {
    videoCount: number;
    totalSampleViews: number;
    medianViews: number | null;
    averageViews: number | null;
    averageEngagementRate: number | null;
    medianViewsPerHour: number | null;
    shortLengthVideos: number;
    longVideos: number;
    estimatedUploadsPerMonth: number | null;
  };
  videos: YouTubeVideo[];
  insights: YouTubeInsight[];
  notes: string[];
};

export type YouTubeAnalysisError = {
  success: false;
  errorCode: string;
  message: string;
  retryable: boolean;
};

export type YouTubeAnalysisResponse = YouTubeAnalysis | YouTubeAnalysisError;

import { z } from "zod";

export const youtubeAnalyzeRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048)
}).strict();

const thumbnailSchema = z.object({ url: z.string().url() }).passthrough();

export const youtubeApiChannelSchema = z.object({
  id: z.string().min(1),
  snippet: z.object({
    title: z.string(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    publishedAt: z.string().optional(),
    country: z.string().optional(),
    thumbnails: z.record(z.string(), thumbnailSchema).optional()
  }).optional(),
  statistics: z.object({
    viewCount: z.string().optional(),
    subscriberCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.string().optional()
  }).optional(),
  contentDetails: z.object({ relatedPlaylists: z.object({ uploads: z.string().optional() }).optional() }).optional()
}).passthrough();

export const youtubeApiVideoSchema = z.object({
  id: z.string().min(1),
  snippet: z.object({
    title: z.string(),
    description: z.string().optional(),
    channelId: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnails: z.record(z.string(), thumbnailSchema).optional()
  }).optional(),
  statistics: z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional()
  }).optional(),
  contentDetails: z.object({ duration: z.string().optional() }).optional()
}).passthrough();

export const youtubeListSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  items: z.array(itemSchema).default([]),
  nextPageToken: z.string().optional()
}).passthrough();

export const youtubePlaylistSchema = z.object({
  items: z.array(z.object({
    contentDetails: z.object({ videoId: z.string().optional() }).optional(),
    snippet: z.object({ resourceId: z.object({ videoId: z.string().optional() }).optional() }).optional()
  }).passthrough()).default([])
}).passthrough();

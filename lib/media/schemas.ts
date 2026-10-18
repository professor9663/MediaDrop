import { z } from "zod";

export const analyzeRequestSchema = z.object({
  url: z.string().trim().min(1, "Paste a media URL.").max(2048, "The URL is too long.")
}).strict();

export const downloadRequestSchema = z.object({
  mediaId: z.string().uuid(),
  formatId: z.string().min(1).max(32)
}).strict();

const formatSchema = z.object({
  id: z.string(),
  label: z.string(),
  extension: z.string(),
  mimeType: z.string(),
  quality: z.string(),
  fileSizeBytes: z.number().int().nonnegative().nullable()
});

export const analyzeResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    provider: z.enum(["youtube", "instagram", "facebook", "x", "pinterest", "direct"]),
    media: z.object({
      id: z.string().uuid(),
      title: z.string(),
      type: z.enum(["video", "audio"]),
      thumbnailUrl: z.string().url().nullable(),
      durationSeconds: z.number().nonnegative().nullable(),
      formats: z.array(formatSchema),
      canDownload: z.boolean()
    }),
    officialUrl: z.string().url(),
    capabilityExpiresAt: z.string().datetime()
  }),
  z.object({
    success: z.literal(false),
    provider: z.enum(["youtube", "instagram", "facebook", "x", "pinterest", "direct"]).optional(),
    errorCode: z.string(),
    message: z.string(),
    officialUrl: z.string().url().optional()
  })
]);

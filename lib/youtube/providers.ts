export type AnalyticsProvider = {
  id: string;
  name: string;
  status: "available" | "setup_required" | "planned";
  dataAccess: string;
  requiresOAuth: boolean;
  requiresApiKey: boolean;
};

export function getAnalyticsProviders(): AnalyticsProvider[] {
  const configured = Boolean(process.env.YOUTUBE_API_KEY?.trim());
  return [
    {
      id: "youtube",
      name: "YouTube",
      status: configured ? "available" : "setup_required",
      dataAccess: "Public channel and video statistics through the YouTube Data API",
      requiresOAuth: false,
      requiresApiKey: true
    },
    ...["Instagram", "Facebook", "X", "Pinterest"].map((name) => ({
      id: name.toLowerCase(),
      name,
      status: "planned" as const,
      dataAccess: "Not connected in this release",
      requiresOAuth: true,
      requiresApiKey: true
    }))
  ];
}

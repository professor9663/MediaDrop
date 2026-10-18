const publicEnvKeys = {
  appName: "NEXT_PUBLIC_APP_NAME",
  contactEmail: "NEXT_PUBLIC_CONTACT_EMAIL",
  takedownEmail: "NEXT_PUBLIC_TAKEDOWN_EMAIL"
} as const;

export function getPublicConfig() {
  return {
    appName: process.env[publicEnvKeys.appName]?.trim() || "MediaDrop",
    contactEmail: process.env[publicEnvKeys.contactEmail]?.trim() || "",
    takedownEmail: process.env[publicEnvKeys.takedownEmail]?.trim() || ""
  };
}

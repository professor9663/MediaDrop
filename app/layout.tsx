import type { Metadata, Viewport } from "next";
import { getPublicConfig } from "@/lib/config/public";
import "./globals.css";

export function generateMetadata(): Metadata {
  const { appName } = getPublicConfig();
  return {
    title: `${appName} — Save supported media links`,
    description: "Check supported media links and download direct video or audio files when access and permissions allow.",
    applicationName: appName
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7fb"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}

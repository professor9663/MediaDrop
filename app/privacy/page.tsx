import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function PrivacyPage() {
  const { appName, contactEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">PRIVACY</span><h1>Privacy policy</h1><p className="legal-updated">Last updated: October 19, 2026</p>
    <p>This page describes how the current MediaDrop YouTube analytics release handles information. The site operator should review it against the final hosting and API configuration before public launch.</p>
    <h2>Information processed</h2><p>When you submit a YouTube URL, the server validates it and extracts a YouTube video ID, channel ID, or handle. It requests public channel and video data from the YouTube Data API. The application does not fetch the submitted YouTube page or save submitted URLs in a database.</p>
    <p>Analysis results are returned to your browser and are not retained by the application server. The browser stores channel IDs, snapshot timestamps, and public total-view counts in local storage to estimate view growth after at least 27 days. This data stays in that browser, is not synchronized, and is retained for up to 180 days. Clear it by clearing this site&apos;s browser storage.</p>
    <p>Rate limiting uses an in-memory key derived from client IP headers. Application code does not log full submitted URLs. Your hosting provider, reverse proxy, browser, or network may keep its own logs under its own retention rules.</p>
    <h2>Third-party services</h2><p>YouTube Data API v3 receives API requests containing the selected YouTube identifier and the server&apos;s API key. YouTube&apos;s handling of those requests is governed by Google&apos;s terms and privacy policies. Channel thumbnails are loaded from YouTube image hosts by your browser.</p>
    <h2>Retention and security</h2><p>The server does not maintain analytics history or user accounts. Process-local rate-limit entries expire after their one-minute window and are also cleared when the server restarts. The YouTube API key is server-only and must be restricted in Google Cloud. Operators should review hosting, proxy, and monitoring logs before public launch.</p>
    <h2>Your choices</h2><p>You can avoid using the analysis tool or clear local browser storage at any time. Do not submit private links or information you are not authorized to access. This release does not request social login credentials or browser cookies.</p>
    <h2>Contact</h2>{contactEmail ? <p>For privacy questions, contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p> : <p>The operator has not configured a privacy contact. Configure <code>NEXT_PUBLIC_CONTACT_EMAIL</code> before making this service public.</p>}
    <div className="legal-note">This is an implementation-aligned policy draft, not legal advice. The operator is responsible for checking local legal requirements and deployment-specific data handling.</div>
    <p><Link href="/">Return to MediaDrop</Link></p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

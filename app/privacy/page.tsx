import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function PrivacyPage() {
  const { appName, contactEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">PRIVACY</span><h1>Privacy policy</h1><p className="legal-updated">Last updated: October 18, 2026</p>
    <p>This page describes how this MediaDrop deployment handles information when you check a media link. The site operator should review and update it to match the hosting configuration before public launch.</p>
    <h2>Information processed</h2><p>When you submit a link, the server validates it. For a direct media URL, the server makes a limited metadata request to the public host and keeps the validated media URL with a short-lived download capability in process memory for up to 10 minutes. If you download, the file is streamed from that host to your browser. The application does not write submitted media files to disk or store submitted URLs in a database.</p>
    <p>Rate limiting uses an in-memory key derived from the request&apos;s client IP headers. Application code does not log full submitted URLs. Your hosting provider, reverse proxy, or network may keep its own logs under its own retention rules.</p>
    <h2>Third-party services</h2><p>Direct links are requested from the host named in the submitted URL after public-IP and redirect checks. Social platform links are identified without fetching their pages. The app does not receive social passwords, session cookies, or browser cookies.</p>
    <h2>Retention and security</h2><p>Short-lived media capabilities expire after 10 minutes and are removed from process memory during later requests. Rate-limit entries are removed when their one-minute window expires. Restarting the server clears both. HTTPS should be used in production. Operators should also review reverse-proxy logging, backups, and monitoring configuration.</p>
    <h2>Your choices</h2><p>Do not submit private links or information you do not have permission to share. You can stop using the service at any time. This deployment has no user accounts or profile data.</p>
    <h2>Contact</h2>{contactEmail ? <p>For privacy questions, contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p> : <p>The operator has not configured a privacy contact. Configure <code>NEXT_PUBLIC_CONTACT_EMAIL</code> before making this service public.</p>}
    <div className="legal-note">This is an implementation-aligned policy draft, not legal advice. The operator is responsible for checking local legal requirements and deployment-specific data handling.</div>
    <p><Link href="/">Return to MediaDrop</Link></p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

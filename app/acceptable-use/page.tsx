import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function AcceptableUsePage() {
  const { appName, takedownEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">ACCEPTABLE USE</span><h1>Acceptable use policy</h1><p className="legal-updated">Last updated: October 19, 2026</p>
    <p>MediaDrop provides limited analysis of publicly available YouTube channel and video metrics. Use the service in a way that respects creators, platform rules, privacy, and applicable law.</p>
    <h2>Do not use MediaDrop to</h2><ul><li>Collect data in bulk or build a competing database outside the available product features.</li><li>Access private, age-restricted, or otherwise restricted media or account data.</li><li>Defeat authentication, access controls, rate limits, or anti-bot measures.</li><li>Provide passwords, session cookies, or another person&apos;s credentials.</li><li>Probe or access private networks, local devices, or internal services.</li><li>Harass, impersonate, or target a creator based on analysis results.</li></ul>
    <h2>Copyright complaints</h2><p>Include the affected work, the link to the MediaDrop result or source, your contact information, a statement of your good-faith belief, and confirmation that your report is accurate and that you are authorized to act. The operator should review, acknowledge, and investigate reports and restrict access to content where appropriate.</p>
    {takedownEmail ? <p>Send copyright complaints to <a href={`mailto:${takedownEmail}`}>{takedownEmail}</a>.</p> : <div className="legal-note">No takedown contact is configured. The site operator must set <code>NEXT_PUBLIC_TAKEDOWN_EMAIL</code> and establish a complaint review process before public launch.</div>}
    <p><Link href="/">Return to MediaDrop</Link></p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

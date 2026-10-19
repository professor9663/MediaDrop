import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function TermsPage() {
  const { appName, contactEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">TERMS</span><h1>Terms of service</h1><p className="legal-updated">Last updated: October 19, 2026</p>
    <p>These terms describe use of this MediaDrop deployment. The site operator must adapt them to the actual service and jurisdiction before public launch.</p>
    <h2>Use the service lawfully</h2><p>Use public channel analytics respectfully and in compliance with platform terms, privacy rights, copyright rules, and applicable law. MediaDrop does not grant rights in channel content or authorize impersonation or harassment.</p>
    <h2>Availability and platform limits</h2><p>Metrics depend on what YouTube makes publicly available through its API. Some counts may be rounded, hidden, disabled, or unavailable. Estimates and content-pattern observations are informational and should not be treated as verified earnings, guarantees, or professional advice.</p>
    <h2>Prohibited use</h2><p>Do not use the service for bulk collection, access private or restricted content, bypass authentication or technical protections, overload providers, reidentify individuals, or submit links to internal or private network services.</p>
    <h2>Service changes</h2><p>This application is provided without a guarantee that every link or operation will be available. The operator may limit or suspend access to protect the service, users, and media hosts.</p>
    <h2>Contact</h2>{contactEmail ? <p>Contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a> with service questions.</p> : <p>The operator should configure a contact address before public launch.</p>}
    <div className="legal-note">This template is not legal advice. Have qualified counsel review terms for the actual launch jurisdiction and operating model.</div>
    <p><Link href="/">Return to MediaDrop</Link></p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

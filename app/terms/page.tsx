import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function TermsPage() {
  const { appName, contactEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">TERMS</span><h1>Terms of service</h1><p className="legal-updated">Last updated: October 18, 2026</p>
    <p>These terms describe use of this MediaDrop deployment. The site operator must adapt them to the actual service and jurisdiction before public launch.</p>
    <h2>Use the service lawfully</h2><p>Only submit media you are authorized to access and save. You are responsible for respecting copyright, privacy, platform rules, and applicable law. MediaDrop does not grant rights in content.</p>
    <h2>Availability and platform limits</h2><p>Service availability depends on the source host, format, access permissions, and provider configuration. A recognized platform link does not mean a download is supported. Capabilities may change when APIs, permissions, or source behavior change.</p>
    <h2>Prohibited use</h2><p>Do not use the service to access private or restricted content, bypass authentication or technical protections, infringe rights, overload a source, or submit links to internal or private network services.</p>
    <h2>Service changes</h2><p>This application is provided without a guarantee that every link or operation will be available. The operator may limit or suspend access to protect the service, users, and media hosts.</p>
    <h2>Contact</h2>{contactEmail ? <p>Contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a> with service questions.</p> : <p>The operator should configure a contact address before public launch.</p>}
    <div className="legal-note">This template is not legal advice. Have qualified counsel review terms for the actual launch jurisdiction and operating model.</div>
    <p><Link href="/">Return to MediaDrop</Link></p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

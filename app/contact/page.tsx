import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicConfig } from "@/lib/config/public";

export default function ContactPage() {
  const { appName, contactEmail, takedownEmail } = getPublicConfig();
  return <><Header appName={appName} /><main className="legal-page"><article className="legal-content page-shell">
    <span className="eyebrow">CONTACT</span><h1>Get in touch</h1>
    {contactEmail ? <p>For service questions, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p> : <p>The site operator has not configured a service contact. Set <code>NEXT_PUBLIC_CONTACT_EMAIL</code> before launch.</p>}
    {takedownEmail ? <p>For copyright concerns, email <a href={`mailto:${takedownEmail}`}>{takedownEmail}</a>.</p> : <p>Copyright complaint contact is not configured yet. The operator should set <code>NEXT_PUBLIC_TAKEDOWN_EMAIL</code> and establish a review workflow before public launch.</p>}
    <p>For provider limitations, check the <Link href="/#platforms">supported platforms</Link> and <Link href="/#faq">FAQ</Link>.</p>
  </article></main><Footer appName={appName} /></>;
}

export const dynamic = "force-dynamic";

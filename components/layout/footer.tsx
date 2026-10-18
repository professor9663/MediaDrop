import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";
import { getPublicConfig } from "@/lib/config/public";

export function Footer({ appName }: { appName: string }) {
  const { takedownEmail, contactEmail } = getPublicConfig();

  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <div className="footer-brand-block">
          <Link href="/#home" className="brand brand-footer"><span className="brand-mark"><ArrowDownToLine size={18} aria-hidden="true" /></span><span>{appName}</span></Link>
          <p>A clear way to check supported media links and save direct files when access and permissions allow.</p>
        </div>
        <div className="footer-column"><h2>Explore</h2><Link href="/#about">About</Link><Link href="/#platforms">Supported platforms</Link><Link href="/#how-it-works">How it works</Link><Link href="/contact">Contact</Link></div>
        <div className="footer-column"><h2>Policies</h2><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link><Link href="/acceptable-use">Acceptable use</Link></div>
        <div className="footer-column"><h2>Copyright</h2>{takedownEmail ? <a href={`mailto:${takedownEmail}`}>Report a copyright concern</a> : <p>Copyright contact is not configured. The site operator must add a takedown email before public launch.</p>}{contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}</div>
      </div>
      <div className="footer-bottom page-shell"><span>© {new Date().getFullYear()} {appName}</span><span>Only download content you are authorized to save.</span></div>
    </footer>
  );
}

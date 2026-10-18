import Link from "next/link";
import { ArrowDownToLine, ArrowRight, AudioLines, CircleHelp, Clock3, FileCheck2, Globe2, LockKeyhole, ShieldCheck, Smartphone, Video } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Downloader } from "@/components/downloader/downloader";
import { getProviderCapabilities } from "@/lib/providers/registry";
import { getPublicConfig } from "@/lib/config/public";
import type { ProviderCapability, ProviderId } from "@/lib/media/types";

const platformDetails: Record<ProviderId, { icon: typeof Video; mediaText: string }> = {
  youtube: { icon: Video, mediaText: "Videos and Shorts" },
  instagram: { icon: Smartphone, mediaText: "Reels and posts" },
  facebook: { icon: Globe2, mediaText: "Public video links" },
  x: { icon: ArrowRight, mediaText: "Public video posts" },
  pinterest: { icon: LockKeyhole, mediaText: "Video Pins" },
  direct: { icon: FileCheck2, mediaText: "Video and audio files" }
};

const statusText = {
  supported: "Supported",
  limited_support: "Limited support",
  authorization_required: "Authorization required",
  temporarily_unavailable: "Temporarily unavailable"
} as const;

function PlatformCard({ capability }: { capability: ProviderCapability }) {
  const { icon: Icon, mediaText } = platformDetails[capability.id];
  return (
    <article className={`platform-card ${capability.id === "direct" ? "platform-card-direct" : ""}`}>
      <div className="platform-card-top">
        <div className={`platform-icon platform-icon-${capability.id}`} aria-hidden="true"><Icon size={21} strokeWidth={1.8} /></div>
        <span className={`status-pill status-${capability.status}`}>{statusText[capability.status]}</span>
      </div>
      <h3>{capability.name}</h3>
      <p className="platform-description">{capability.description}</p>
      <div className="platform-media"><span>Media types</span><strong>{mediaText}</strong></div>
      <a href={capability.officialUrl} target="_blank" rel="noreferrer" className="text-link">
        Learn more <ArrowRight size={15} aria-hidden="true" />
      </a>
    </article>
  );
}

const steps = [
  { number: "01", title: "Copy a media link", description: "Choose a link from a supported source. Private or restricted content stays off limits." },
  { number: "02", title: "Check what is available", description: "MediaDrop validates the URL and checks the source for real metadata and file options." },
  { number: "03", title: "Save or open the source", description: "Download verified direct files, or continue to the platform's own viewing and download options." }
];

const features = [
  { icon: Globe2, title: "One simple workflow", description: "Paste a link and get a clear answer about what this service can do with it." },
  { icon: Smartphone, title: "Works on your devices", description: "A responsive layout for desktops, tablets, Android phones, and iPhone screens." },
  { icon: Video, title: "Video and audio files", description: "Original quality and file format are shown when the direct source confirms them." },
  { icon: AudioLines, title: "No invented options", description: "Quality, size, and duration appear only when verified by the source." },
  { icon: ShieldCheck, title: "Privacy-conscious handling", description: "Links and download capabilities stay in short-lived server memory; files are streamed through." },
  { icon: Clock3, title: "Clear availability", description: "Useful, honest explanations when permissions, provider access, or a file link are unavailable." }
];

const faq = [
  { q: "Which platforms are supported?", a: "MediaDrop recognizes YouTube, Instagram, Facebook, X, and Pinterest links. Those platforms do not currently provide this app a general public video-file download operation. Direct public media file links are the working download path." },
  { q: "Why might a link fail?", a: "The post may be private, require account permissions, have an expired link, use an unsupported format, or block server-side file access. Some platform APIs also restrict access to approved accounts or specific media." },
  { q: "Can I download private videos?", a: "No. MediaDrop does not accept passwords, session cookies, or social-media login credentials, and it does not bypass access controls." },
  { q: "Can I select video quality?", a: "Direct files are offered in their original quality. No transcoding or alternate quality is claimed unless a future authorized provider supplies those options." },
  { q: "Is audio extraction available?", a: "Direct audio files can be downloaded when their host confirms the file type. Audio extraction from social platform videos is not available." },
  { q: "Are downloads stored on the server?", a: "No media files are written to disk by this application. Direct media is streamed from the source to your browser. The analyzed URL is kept in process memory for up to 10 minutes so the short-lived download link can work." },
  { q: "What happens when a platform changes its API?", a: "The provider capability stays limited until an authorized integration is updated and verified. MediaDrop does not switch to scraping or restriction bypasses." },
  { q: "Can I use the service on my phone?", a: "Yes. The interface is designed for narrow mobile screens and uses the device's normal browser download behavior." }
];

export default function HomePage() {
  const appName = getPublicConfig().appName;
  const capabilities = getProviderCapabilities();
  const socialCapabilities = capabilities.filter((item) => item.id !== "direct");
  const directCapability = capabilities.find((item) => item.id === "direct");

  return (
    <>
      <Header appName={appName} />
      <main>
        <section className="hero-section" id="home">
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="hero-content page-shell">
            <div className="hero-copy">
              <span className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> SIMPLE. CLEAR. PERMISSION-AWARE.</span>
              <h1>Download Your Favorite Media, <span>Simply.</span></h1>
              <p>Paste a supported media link to discover available download options.</p>
            </div>
            <Downloader />
            <div className="hero-platforms" aria-label="Recognized social platforms">
              <span>Recognizes links from</span>
              {socialCapabilities.map((capability) => <span key={capability.id} className="hero-platform-tag">{capability.name}</span>)}
              <span className="hero-platform-tag">Direct files</span>
            </div>
            <p className="hero-note"><LockKeyhole size={14} aria-hidden="true" /> Availability depends on provider support, access, and your download permissions.</p>
          </div>
          <div className="hero-bottom-glow" aria-hidden="true" />
        </section>

        <section className="section page-shell" id="platforms">
          <div className="section-heading">
            <div><span className="eyebrow">SUPPORTED PLATFORMS</span><h2>Know what works before you start.</h2></div>
            <p>Capabilities come from the server&apos;s provider configuration and reflect what this deployment can actually do.</p>
          </div>
          <div className="platform-grid">
            {socialCapabilities.map((capability) => <PlatformCard key={capability.id} capability={capability} />)}
          </div>
          {directCapability && <div className="direct-callout">
            <div className="direct-callout-icon"><ArrowDownToLine size={20} aria-hidden="true" /></div>
            <div><span className="status-pill status-supported">Supported</span><h3>Direct video and audio files</h3><p>{directCapability.description} Up to 512 MB per file.</p></div>
            <a href="#downloader" className="button button-secondary">Try a direct link <ArrowRight size={16} aria-hidden="true" /></a>
          </div>}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="page-shell section">
            <div className="section-heading section-heading-centered">
              <div><span className="eyebrow">HOW IT WORKS</span><h2>Three steps. No guesswork.</h2></div>
              <p>Every link is checked on the server before download options appear.</p>
            </div>
            <div className="steps-grid">
              {steps.map((step, index) => <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <div className="step-connector" aria-hidden="true">{index < steps.length - 1 && <ArrowRight size={19} />}</div>
                <h3>{step.title}</h3><p>{step.description}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section className="section page-shell" id="about">
          <div className="section-heading">
            <div><span className="eyebrow">MADE FOR CLARITY</span><h2>A useful tool, with honest limits.</h2></div>
            <p>MediaDrop only offers a file when it can verify a permitted, accessible download path.</p>
          </div>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, description }) => <article className="feature-card" key={title}>
              <div className="feature-icon"><Icon size={20} aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p>
            </article>)}
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="page-shell section faq-layout">
            <div className="faq-intro"><span className="eyebrow">FAQ</span><h2>Good questions.<br />Straight answers.</h2><p>Still need help? <Link href="/contact">Contact details</Link> are listed here when configured by the site operator.</p><CircleHelp size={62} strokeWidth={1.2} aria-hidden="true" /></div>
            <div className="faq-list">{faq.map((item) => <details className="faq-item" key={item.q}><summary>{item.q}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div>
          </div>
        </section>
      </main>
      <Footer appName={appName} />
    </>
  );
}

export const dynamic = "force-dynamic";

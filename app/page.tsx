import { Activity, ArrowRight, BarChart3, CircleHelp, Eye, MessageCircle, Play, Sparkles, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { YouTubeAnalyzer } from "@/components/analysis/youtube-analyzer";
import { getPublicConfig } from "@/lib/config/public";
import { getAnalyticsProviders } from "@/lib/youtube/providers";

const howItWorks = [
  { number: "01", title: "Paste a channel or video", description: "Use a YouTube channel URL, @handle, video link, or Shorts link." },
  { number: "02", title: "Review verified public data", description: "See the channel profile, recent uploads, views, likes, comments, and publishing patterns." },
  { number: "03", title: "Find useful signals", description: "Compare recent performance and explore title patterns with evidence behind each insight." }
];

const faqs = [
  { question: "What can I analyze right now?", answer: "YouTube channel and video links. MediaDrop uses YouTube's official Data API to fetch public channel statistics and recent public uploads. Other networks are shown as planned until their data access is implemented and configured." },
  { question: "Are the earnings numbers real?", answer: "No public API reveals another creator's actual revenue. The estimator applies RPM values you enter to the lifetime views on the latest sampled videos. It is a planning estimate, not reported income or a monthly forecast." },
  { question: "Can I see a competitor's private analytics?", answer: "No. Watch time, impressions, audience demographics, and actual revenue require authorization from the channel owner. Connecting your own channel can be added for owner-authorized analytics." },
  { question: "How does MediaDrop identify content hooks?", answer: "The first version looks for patterns in public titles and compares those patterns with views. It does not claim to know a video's spoken opening unless a transcript or other authorized source is available." },
  { question: "Why is there no historical growth chart yet?", answer: "YouTube's public statistics are a current snapshot. MediaDrop can begin collecting dated snapshots from the time you use it, but it cannot reconstruct data from before collection began." },
  { question: "Will all social platforms have the same metrics?", answer: "No. Each platform exposes different public data and requires different permissions. MediaDrop will show a platform as available only when its integration can return the data it claims to show." },
  { question: "Does MediaDrop scrape profiles?", answer: "The YouTube analysis uses the official YouTube Data API. It does not use browser cookies, private pages, or anti-bot workarounds." },
  { question: "Can I use it on my phone?", answer: "Yes. The analysis form and results are designed to adapt to mobile screens as well as desktop." }
];

function statusLabel(status: string) {
  if (status === "available") return "API connected";
  if (status === "setup_required") return "Setup required";
  return "Planned";
}

export default function HomePage() {
  const { appName } = getPublicConfig();
  const platforms = getAnalyticsProviders();
  const youtubeConfigured = platforms.some((platform) => platform.id === "youtube" && platform.status === "available");

  return <>
    <Header appName={appName} />
    <main>
      <section className="hero-section" id="home">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-a" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-b" aria-hidden="true" />
        <div className="page-shell hero-content">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> CREATOR INTELLIGENCE, WITH EVIDENCE</span>
          <h1>Understand what&apos;s working.<br /><span>Build what&apos;s next.</span></h1>
          <p>Analyze public YouTube channels and videos to find performance patterns, content signals, and room to grow.</p>
          <div className="hero-trust"><span><Activity size={15} /> Live public data</span><span><BarChart3 size={15} /> Evidence-backed signals</span><span><Sparkles size={15} /> Transparent estimates</span></div>
          <div className="hero-scroll-cue"><span /> Analyze a channel below</div>
        </div>
        <div className="hero-bottom-glow" aria-hidden="true" />
      </section>

      <section className="analyze-section page-shell">
        <div className="section-heading analyze-section-heading"><div><span className="eyebrow"><Play size={14} /> YOUTUBE ANALYZER</span><h2>Start with a channel or video.</h2></div><p>Get real public stats and a fresh read of the channel&apos;s latest uploads.</p></div>
        <YouTubeAnalyzer apiConfigured={youtubeConfigured} />
      </section>

      <section className="platform-section" id="platforms">
        <div className="page-shell section">
          <div className="section-heading"><div><span className="eyebrow">PLATFORM COVERAGE</span><h2>One analysis workspace.<br />More platforms over time.</h2></div><p>Data access differs by network. Status below reflects the current integration configuration.</p></div>
          <div className="platform-grid analytics-platform-grid">{platforms.map((platform) => {
            const isYouTube = platform.id === "youtube";
            const Icon = isYouTube ? Play : platform.id === "instagram" ? Eye : platform.id === "x" ? Activity : platform.id === "pinterest" ? Sparkles : Play;
            return <article className={`platform-card analytics-platform-card ${isYouTube ? "platform-card-active" : ""}`} key={platform.id}>
              <div className={`platform-icon platform-icon-${platform.id}`}><Icon size={20} aria-hidden="true" /></div><span className={`status-pill platform-status-${platform.status}`}>{statusLabel(platform.status)}</span>
              <h3>{platform.name}</h3><p>{isYouTube ? "Public channel and video analysis through YouTube Data API." : "Cross-platform analysis is planned; data access and permissions are still to be integrated."}</p>
              <span className="platform-data-note">{platform.dataAccess}</span>
            </article>;
          })}</div>
        </div>
      </section>

      <section className="how-section" id="how-it-works"><div className="page-shell section">
        <div className="section-heading section-heading-centered"><div><span className="eyebrow">HOW IT WORKS</span><h2>From link to useful insight.</h2></div><p>Metrics are grounded in public platform data. Interpretation stays clearly labeled.</p></div>
        <div className="steps-grid">{howItWorks.map((step, index) => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><div className="step-connector" aria-hidden="true">{index < howItWorks.length - 1 && <ArrowRight size={18} />}</div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </div></section>

      <section className="features-section page-shell section" id="features">
        <div className="section-heading"><div><span className="eyebrow">BUILT FOR CREATORS</span><h2>Research your next move.</h2></div><p>See the signals around a channel&apos;s content strategy without treating estimates as facts.</p></div>
        <div className="features-grid">
          <article className="feature-card"><div className="feature-icon"><Eye size={19} /></div><h3>Public performance at a glance</h3><p>Subscribers, lifetime channel views, public uploads, and recent video metrics.</p></article>
          <article className="feature-card"><div className="feature-icon"><TrendingUp size={19} /></div><h3>Recent upload comparisons</h3><p>Compare the channel&apos;s latest videos by views, engagement, format length, and pace.</p></article>
          <article className="feature-card"><div className="feature-icon"><Sparkles size={19} /></div><h3>Content pattern signals</h3><p>Surface recurring title structures and show how they performed in the available sample.</p></article>
          <article className="feature-card"><div className="feature-icon"><BarChart3 size={19} /></div><h3>Transparent earnings model</h3><p>Test your own RPM assumptions against observed sample views; no claim of actual creator income.</p></article>
          <article className="feature-card"><div className="feature-icon"><MessageCircle size={19} /></div><h3>Engagement context</h3><p>Review likes and comments where public API data provides them; disabled metrics remain unavailable.</p></article>
          <article className="feature-card"><div className="feature-icon"><CircleHelp size={19} /></div><h3>Clear data limitations</h3><p>Know what comes from YouTube, what is inferred, and what requires channel-owner authorization.</p></article>
        </div>
      </section>

      <section className="faq-section" id="faq"><div className="page-shell section faq-layout">
        <div className="faq-intro"><span className="eyebrow">FAQ</span><h2>Useful analysis<br />starts with trust.</h2><p>See how MediaDrop handles public data, estimates, and platform limitations.</p><CircleHelp size={58} strokeWidth={1.2} aria-hidden="true" /></div>
        <div className="faq-list">{faqs.map((faq) => <details className="faq-item" key={faq.question}><summary>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div>
      </div></section>
    </main>
    <Footer appName={appName} />
  </>;
}

export const dynamic = "force-dynamic";

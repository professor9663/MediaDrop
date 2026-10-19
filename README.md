# MediaDrop

MediaDrop is a creator research app for analyzing public YouTube channels and videos. Paste a channel, handle, video, or Shorts URL to retrieve public statistics, compare recent uploads, and see clearly labeled performance signals. The old social-media downloader workflow has been removed.

## Current capabilities

- **YouTube channel analysis:** public channel title, avatar, subscriber count when visible, total views, public video count, and latest public uploads.
- **Recent video metrics:** views, likes, comments, upload date, duration, and engagement rate when YouTube returns those fields.
- **Evidence-based signals:** median and average recent views, upload pace, top recent upload, and simple title-pattern comparisons.
- **Earnings estimator:** an editable RPM range applied to recent sample views. After this browser has collected snapshots spanning at least 27 days, the estimate uses observed channel-view growth projected to 28 days. It is not actual revenue.
- **Theme and responsive layout:** persistent light/dark theme preference and desktop/mobile layouts.
- **Provider status:** `GET /api/platforms` reports YouTube configuration and planned platforms.

Instagram, Facebook, X, and Pinterest analysis are not implemented yet. Each will require a separate provider and the platform's documented API access. No platform scraping or private-data access is enabled.

## Data limitations

The analyzer uses the official YouTube Data API and samples up to 25 recent public uploads. Subscriber counts can be rounded or hidden. Likes and comments can be disabled or unavailable. The three-minute duration split is only a rough format proxy; YouTube's API does not reliably identify Shorts in this implementation.

Public APIs do not provide another creator's private analytics such as watch time, impressions, audience demographics, monetization status, or actual revenue. The earnings estimator uses the RPM values entered by the user and either lifetime views for the sampled uploads or a local 28-day channel-view snapshot. It is not an earnings report or reliable monthly forecast.

Snapshot history is stored in the user's browser local storage for up to 180 days and is not synchronized across devices. It begins when the user analyzes a channel; MediaDrop does not backfill historical metrics.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS with reusable responsive components
- Zod request and upstream response validation
- YouTube Data API v3 for channel, playlist, and video metadata
- Vitest, Testing Library, and jsdom for local automated tests

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- A Google Cloud project with YouTube Data API v3 enabled and an API key
- Docker Compose only if using the container deployment

## Get a YouTube API key

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** for that project.
3. Create an API key under **APIs & Services → Credentials**.
4. Restrict the key to YouTube Data API v3. Keep the key server-side; do not use a `NEXT_PUBLIC_` variable for it.
5. Check the project's YouTube API quota and usage in Google Cloud Console.

The app makes a small number of API calls per analysis (typically three for a channel, four for a video link). API quota and access are controlled by Google Cloud.

## Local development

```powershell
Copy-Item .env.example .env.local
```

Add your key to `.env.local`:

```dotenv
YOUTUBE_API_KEY=your_server_side_key
```

Then install and run:

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page loads without an API key, but analysis returns a clear setup message until `YOUTUBE_API_KEY` is set.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode. |
| `YOUTUBE_API_KEY` | Server-only key for YouTube Data API v3. |
| `NEXT_PUBLIC_APP_NAME` | Configurable product name; defaults to MediaDrop. |
| `RATE_LIMIT_ANALYZE_PER_MINUTE` | Per-client analysis request limit; defaults to 20. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional operator contact shown on the site. |
| `NEXT_PUBLIC_TAKEDOWN_EMAIL` | Optional copyright complaint contact. |

Only the variables used by this implementation are listed in `.env.example`.

## API

- `GET /api/health` — process health check.
- `GET /api/platforms` — current analytics integrations and setup status.
- `POST /api/youtube/analyze` — accepts `{ "url": "https://www.youtube.com/@handle" }` or a supported video URL and returns validated public channel/video analytics.

The analysis endpoint only accepts YouTube hostnames and known channel/video URL patterns. It does not fetch the submitted page; the server calls fixed YouTube API endpoints using an extracted channel handle, channel ID, or video ID. API keys and raw upstream errors are not returned to the browser.

## Production deployment

### Vercel

1. Push the repository to GitHub and import it into Vercel.
2. Add `YOUTUBE_API_KEY` as a server-side Environment Variable for Production (and Preview if needed).
3. Optionally add `NEXT_PUBLIC_APP_NAME`, `RATE_LIMIT_ANALYZE_PER_MINUTE`, `NEXT_PUBLIC_CONTACT_EMAIL`, and `NEXT_PUBLIC_TAKEDOWN_EMAIL`.
4. Deploy or redeploy after saving the environment variables.
5. Test with a public channel URL and review Google Cloud API quota.

The in-memory rate limiter resets across serverless instances, so it is basic abuse control rather than a shared global quota. Add a shared rate-limit store before high-volume public use.

### Docker Compose / Oracle VM

Create a `.env` file next to `docker-compose.yml` with the variables from `.env.example` and your `YOUTUBE_API_KEY`, then run:

```powershell
docker compose up --build -d
docker compose logs -f mediadrop
```

The service binds to `127.0.0.1:3000` on the host. Put an HTTPS reverse proxy such as Caddy or Nginx in front of it for public access; do not expose the app port directly to the internet.

### Production checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Development commands

```powershell
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Tests mock YouTube API responses and do not require a live Google API key or social accounts.

## Privacy and security

- Submitted YouTube URLs are parsed and reduced to a platform identifier; the submitted page itself is not fetched.
- No account login, passwords, browser cookies, or social session tokens are requested.
- Analysis responses are not stored by the server. Browser-local snapshots store only channel ID, timestamp, and total view count to compute a 28-day trend.
- API responses use `Cache-Control: no-store`; raw upstream responses and credentials are not sent to the client.
- The YouTube API key is read only on the server. Restrict it to the YouTube Data API in Google Cloud.
- The in-memory rate limiter is per process; multi-instance deployments need a shared limiter for consistent enforcement.
- Hosting providers may retain their own request logs. Review hosting, reverse-proxy, and monitoring retention before public launch.

Privacy, terms, and acceptable-use pages are implementation-aligned drafts. Configure real contact details and have them reviewed for the jurisdictions where the service will operate.

## Troubleshooting

- **“API key setup required”:** set `YOUTUBE_API_KEY` in `.env.local`, Vercel, or the Compose `.env` file and restart/redeploy.
- **API key rejected:** confirm YouTube Data API v3 is enabled and the key's API restriction includes it.
- **Quota exhausted:** inspect Google Cloud quota/usage; the app returns a safe retry-later message.
- **Channel not found:** try its canonical `/@handle` or `/channel/UC…` URL. Custom `/c/` URLs are not supported in this release.
- **No earnings or engagement metric:** public YouTube data does not expose actual competitor revenue, and some public metrics may be unavailable.
- **28-day estimate not available:** this browser needs dated snapshots at least 27 days apart. Local browser data is not shared or backfilled.

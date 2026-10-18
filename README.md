# MediaDrop

MediaDrop is a responsive link checker and downloader for supported direct video and audio files. It recognizes links from YouTube, Instagram, Facebook, X, and Pinterest, but it does not pretend that those platforms' links are downloadable. Social platform results explain the current limitation and link back to the source.

## What works

| Source | Current status | What this app does |
| --- | --- | --- |
| Direct HTTP(S) video/audio file | Supported | Verifies a public host, redirects, file MIME type, and size, then streams the original file to the browser. |
| YouTube / Shorts | Limited support | Recognizes supported URL patterns and directs users to YouTube. No download or audio extraction is offered. |
| Instagram Reels/posts | Authorization required | Recognizes public URL shapes. No general public post download integration is available. |
| Facebook video | Authorization required | Recognizes common public video URL shapes. This deployment has no Facebook access token or permitted file operation. |
| X video post | Authorization required | Recognizes status links. No X API credentials or general video-file download integration are configured. |
| Pinterest video Pin | Authorization required | Recognizes Pin links. Pinterest video URL access is restricted and this deployment has no approved token or feature access. |

The YouTube API policies prohibit API clients from downloading audiovisual content without prior written approval and prohibit offering video/audio download or separation features. Instagram's oEmbed endpoint is for embedding, and its API access is permission-scoped. Pinterest documents `video_url` as restricted and requires `pins:read` plus explicit feature access. This project therefore does not use scraping, cookies, proxy rotation, or other workarounds. See the [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies), [Instagram oEmbed documentation](https://developers.facebook.com/docs/instagram-platform/oembed), [Instagram API overview](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Pinterest API FAQ](https://developers.pinterest.com/docs/faqs/faqs/), and [X API documentation](https://developer.x.com/en/docs/x-api).

Provider statuses returned by `GET /api/platforms` come from the adapter registry. They are not inferred from a platform name supplied by the browser. Adding a social integration requires an approved, documented API permission and code that limits access to content the authorized account may use.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 with accessible component styling
- Zod request/response validation and Lucide icons
- Node.js streaming for direct files; no FFmpeg or queue is needed for the supported workflow
- Vitest, Testing Library, and jsdom for automated checks

No social API credential or paid service is required for the current supported path.

## Prerequisites

- Node.js 22 or newer (Next.js 16 requires a modern Node runtime)
- npm 10 or newer
- Docker / Docker Compose only if using the container deployment

## Install and run

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Direct media links should use HTTPS. In development, HTTP links are accepted except that local/private network hosts remain blocked. The app name defaults to `MediaDrop`.

## Environment

Copy `.env.example` to `.env.local` for development. Only variables used by this implementation are listed there:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode. Production requires HTTPS source URLs. |
| `NEXT_PUBLIC_APP_NAME` | Configurable visible brand name. |
| `RATE_LIMIT_ANALYZE_PER_MINUTE` | Per-client analyze limit (default 20). |
| `RATE_LIMIT_DOWNLOAD_PER_MINUTE` | Per-client download limit (default 8). |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional operator contact shown in the footer and policy pages. |
| `NEXT_PUBLIC_TAKEDOWN_EMAIL` | Optional copyright complaint address. Configure it and establish a review workflow before public launch. |

There are no social provider API keys in the example because no social provider integration is active. If an approved provider integration is added, keep its credentials server-only, document the exact granted scopes, and update the provider status from the actual configuration.

## API

- `GET /api/health` — process health only; returns no infrastructure details.
- `GET /api/platforms` — adapter capability and availability configuration.
- `POST /api/media/analyze` — JSON body `{ "url": "https://..." }`; returns verified direct file metadata/options or a safe provider limitation.
- `GET /api/media/download?mediaId=<uuid>&formatId=original` — streams a short-lived verified file capability using the browser's native download behavior.
- `POST /api/media/download` — JSON body `{ "mediaId": "<uuid>", "formatId": "original" }`; streams the same validated operation for API clients.

Successful analysis returns a 10-minute opaque identifier, verified media type, title from the URL path, source-confirmed MIME type and file size (when supplied), and only the original format. It does not return the upstream file URL. The API never fabricates a thumbnail, duration, alternate quality, or file size.

## Security and privacy notes

- Social hosts and URL patterns use explicit allowlists. Unsupported domains are rejected unless their URL path has a supported direct-file extension.
- Direct requests resolve DNS first and pin the request to a validated public IP. Any private/reserved address in a DNS answer rejects the host. Redirects are manual and each destination is revalidated and resolved before connecting.
- User-info URLs, non-standard ports, private/loopback/link-local addresses, and HTTPS-to-HTTP production redirects are rejected.
- Direct files must have a matching media MIME type and file signature. Files over 512 MB, non-2xx responses, unsupported formats, and upstream timeouts fail safely.
- Downloads stream with backpressure; no media file is written to temporary disk. In-memory download capabilities expire after 10 minutes. Request bodies are limited to 4 KB, analysis/download rates are bounded, and four downloads may stream concurrently per process.
- Responses include no-store, nosniff, same-origin resource policy, frame, referrer, and permissions headers. No CORS access is enabled.
- No user login, password, session cookie, or browser cookie is accepted. The app does not log full input URLs.
- The rate-limit and capability stores are process-local. For a multi-instance production deployment, replace them with a shared store and ensure the reverse proxy overwrites `X-Real-IP` or `X-Forwarded-For` rather than passing client-supplied values through.
- The application avoids raw upstream errors in client responses. Hosting and proxy logs remain under the deployer's control.

See [Privacy](./app/privacy/page.tsx), [Terms](./app/terms/page.tsx), and [Acceptable Use](./app/acceptable-use/page.tsx). The policy pages are implementation-aligned drafts, not legal advice. Configure contact and takedown details and have the launch policies reviewed before public deployment.

## Development and checks

```powershell
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

The tests use mock responses and local fixtures only; they do not connect to social accounts or live third-party providers.

## Deployment

### Node server

```powershell
npm ci
npm run build
$env:NODE_ENV = "production"
$env:APP_BASE_URL = "https://your-domain.example"
npm start
```

Place the Node process behind an HTTPS reverse proxy that sets trusted client IP headers. Do not expose the Node port directly to untrusted networks if your deployment needs proxy-derived client IP rate limits.

### Docker Compose

```powershell
docker compose up --build
```

The included image uses the Next.js standalone output and the included compose file adds a basic health check. Configure the public brand/contact/takedown values in the compose environment before exposing the service.

### Deployment limitations

This app uses process memory for rate limiting and 10-minute download capabilities. A single long-running Node container or VM is supported. Serverless functions and multi-replica deployments need a shared capability/rate-limit store (for example Redis); they are not production-ready with the in-memory implementation because requests may land on different instances or processes restart.

## Troubleshooting

- **A social post is recognized but no download appears:** that is the configured provider limitation. Open the post on its platform and use its own controls when offered.
- **A direct link fails with a host/network error:** confirm it is a public HTTPS URL, uses port 443, resolves only to public addresses, and does not redirect to a private host.
- **A direct link fails with a format error:** the source must return an accurate supported `Content-Type`, and the file's initial bytes must match its extension.
- **A download says it expired:** analyze again. The opaque capability lasts 10 minutes.
- **Rate limiting is inconsistent across replicas:** use a shared rate-limit store or keep one process; the in-memory limiter is per process.
- **A complaint/contact link is missing:** set `NEXT_PUBLIC_TAKEDOWN_EMAIL` / `NEXT_PUBLIC_CONTACT_EMAIL`, rebuild, and configure a real review process.

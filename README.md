# Tross — LinkedIn Profile API

Hosted API (and demo UI) that accepts a LinkedIn profile URL and returns structured JSON: name, headline, location, about, experience, education, skills, certifications, languages, projects, courses, honors, patents, publications, volunteer experience, organizations, test scores, and profile images when available.

Built with **Next.js** so the React frontend and serverless API deploy together on **Vercel** over HTTPS.

## Demo UI

Open the deployed site, paste a profile URL such as:

```text
https://www.linkedin.com/in/williamhgates
```

Results render as a readable profile view or raw JSON.

## API documentation

### `GET /api/profile`

| Query | Required | Description |
|-------|----------|-------------|
| `url` | yes | Full LinkedIn profile URL, or vanity name |

```bash
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/profile?url=https://www.linkedin.com/in/williamhgates" | jq
```

### `POST /api/profile`

```bash
curl -s -X POST "https://YOUR_DEPLOYMENT.vercel.app/api/profile" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.linkedin.com/in/williamhgates"}' | jq
```

### Success response

Matches `LinkedInProfile` in `src/lib/linkedin/types.ts`. Dates are `YYYY` or `YYYY-MM`. Missing sections are empty arrays (`[]`); missing scalar fields are `null`.

```json
{
  "success": true,
  "data": {
    "url": "https://www.linkedin.com/in/williamhgates/",
    "vanityName": "williamhgates",
    "fullName": "Bill Gates",
    "firstName": "Bill",
    "lastName": "Gates",
    "headline": "...",
    "location": "...",
    "about": "...",
    "industry": "...",
    "profilePicture": "https://...",
    "backgroundImage": "https://...",
    "connectionsCount": null,
    "followersCount": null,
    "experience": [
      {
        "title": "...",
        "company": "...",
        "companyUrl": "https://www.linkedin.com/company/...",
        "location": "...",
        "description": "...",
        "employmentType": "Full-time",
        "startDate": "2020-01",
        "endDate": null,
        "isCurrent": true
      }
    ],
    "education": [
      {
        "school": "...",
        "schoolUrl": "https://www.linkedin.com/school/...",
        "degree": "...",
        "fieldOfStudy": "...",
        "description": null,
        "startDate": "2018-08",
        "endDate": "2022-05"
      }
    ],
    "skills": [{ "name": "Leadership", "endorsements": 99 }],
    "certifications": [
      {
        "name": "...",
        "authority": "...",
        "url": null,
        "issuedDate": "2024-01",
        "expirationDate": null,
        "credentialId": null
      }
    ],
    "languages": [{ "name": "English", "proficiency": "Native or bilingual proficiency" }],
    "projects": [
      {
        "title": "...",
        "description": "...",
        "url": null,
        "startDate": "2023-10",
        "endDate": "2023-12",
        "isCurrent": false,
        "contributors": ["..."]
      }
    ],
    "courses": [
      { "name": "...", "number": null, "associatedWith": null }
    ],
    "honors": [
      {
        "title": "...",
        "issuer": "...",
        "description": null,
        "issuedDate": "2021-06"
      }
    ],
    "patents": [
      {
        "title": "...",
        "issuer": "...",
        "patentNumber": "...",
        "description": null,
        "url": null,
        "issuedDate": null,
        "inventors": []
      }
    ],
    "publications": [
      {
        "title": "...",
        "publisher": "...",
        "description": null,
        "url": null,
        "publishedDate": null,
        "authors": []
      }
    ],
    "volunteerExperience": [
      {
        "role": "...",
        "organization": "...",
        "cause": null,
        "description": null,
        "startDate": null,
        "endDate": null,
        "isCurrent": false
      }
    ],
    "organizations": [
      {
        "name": "...",
        "role": "...",
        "description": null,
        "startDate": null,
        "endDate": null,
        "isCurrent": false
      }
    ],
    "testScores": [
      {
        "name": "...",
        "score": "...",
        "description": null,
        "date": null
      }
    ],
    "scrapedAt": "2026-08-31T00:00:00.000Z"
  }
}
```

### Error response

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "INVALID_URL"
}
```

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `MISSING_URL` / `INVALID_URL` / `INVALID_JSON` | Bad input |
| 401 | `AUTH_ERROR` | Missing/expired LinkedIn cookies |
| 404 | `NOT_FOUND` | Profile not found |
| 429 | `RATE_LIMITED` | LinkedIn throttled the request |
| 502/500 | `FETCH_ERROR` / `INTERNAL_ERROR` | Upstream or server failure |

## Approach

1. **Parse** the input URL into a LinkedIn vanity name (`/in/{vanity}`).
2. Authenticate to LinkedIn’s unofficial **Voyager** HTTP APIs using a private session cookie (`li_at`) and CSRF token (`JSESSIONID` / `csrf-token`).
3. Call Voyager dash `identity/dash/profiles?q=memberIdentity&memberIdentity={vanity}` with `FullProfileWithEntities`.
4. **Normalize** the `included[]` graph into a stable response schema covering all profile sections LinkedIn returns.
5. Expose the result via Next.js Route Handlers and a small React demo client.

Cookies stay in server-side environment variables and never ship to the browser or git.

## Local setup

### Prerequisites

- Node.js 20+
- A LinkedIn account (for session cookies)

### Install

```bash
npm install
cp .env.example .env.local
```

### Get LinkedIn cookies

1. Sign in to [linkedin.com](https://www.linkedin.com) in your browser.
2. Open DevTools → **Network** → filter for a Voyager/`graphql` request that returns 200.
3. Copy the full **Cookie** request header into `LINKEDIN_COOKIES`.
4. Copy the **csrf-token** request header into `LINKEDIN_CSRF_TOKEN` (looks like `ajax:…`).
5. Optionally set `LINKEDIN_USER_AGENT` to match the browser that created the cookies.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add environment variables:
   - `LINKEDIN_COOKIES`
   - `LINKEDIN_CSRF_TOKEN`
   - `LINKEDIN_USER_AGENT` (optional)
4. Deploy. Vercel serves the UI and `/api/profile` over HTTPS.

```bash
# Or from the CLI
npx vercel
npx vercel env add LINKEDIN_COOKIES
npx vercel env add LINKEDIN_CSRF_TOKEN
npx vercel --prod
```

## Project structure

```text
src/
  app/
    api/profile/route.ts   # GET + POST handlers
    page.tsx               # Demo UI
    layout.tsx
    globals.css
  components/
    ProfileLookup.tsx
    ProfileResult.tsx
  lib/linkedin/
    client.ts              # Voyager HTTP client
    parse.ts               # Response normalization
    types.ts               # JSON schema types
    url.ts                 # URL / vanity parsing
```

## Known limitations

- **Unofficial API** — LinkedIn does not publish a public profile scrape API. Voyager endpoints can change without notice.
- **Session cookies expire** — `li_at` typically lasts weeks; when calls start returning 401, refresh cookies in Vercel env vars.
- **ToS / compliance** — Automating LinkedIn may violate LinkedIn’s Terms of Service. Use only with accounts/credentials you control, for evaluation/demo purposes, and at your own risk.
- **Rate limits & bot detection** — Aggressive traffic can trigger 429s or challenges. Keep request volume low.
- **Visibility** — Data returned matches what the authenticated account can see. Private sections stay private.
- **Incomplete sections** — Some profiles omit skills, certifications, or languages; image URLs may require a LinkedIn referrer and can break if CDNs rotate tokens.
- **Serverless constraints** — Designed for Vercel Node serverless (no headless browser). That keeps cold starts low but means no Puppeteer-based fallback.

## License

MIT — built for the Engineer Hiring Challenge submission.

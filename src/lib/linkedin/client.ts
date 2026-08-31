import https from "node:https";
import { URL } from "node:url";
import type { LinkedInProfile } from "./types";
import { normalizeProfileUrl } from "./url";
import { parseProfilePayload } from "./parse";

const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";
const DECORATION =
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93";

const USER_AGENT =
  process.env.LINKEDIN_USER_AGENT?.trim() ||
  "Mozilla/5.0 (X11; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0";

const LI_TRACK = JSON.stringify({
  clientVersion: "1.13.46243",
  mpVersion: "1.13.46243",
  osName: "web",
  timezoneOffset: 5.5,
  timezone: "Asia/Kolkata",
  deviceFormFactor: "DESKTOP",
  mpName: "voyager-web",
  displayDensity: 1.25,
  displayWidth: 1920,
  displayHeight: 1080,
});

export class LinkedInAuthError extends Error {
  code = "AUTH_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "LinkedInAuthError";
  }
}

export class LinkedInNotFoundError extends Error {
  code = "NOT_FOUND";
  constructor(message: string) {
    super(message);
    this.name = "LinkedInNotFoundError";
  }
}

export class LinkedInRateLimitError extends Error {
  code = "RATE_LIMITED";
  constructor(message: string) {
    super(message);
    this.name = "LinkedInRateLimitError";
  }
}

export class LinkedInFetchError extends Error {
  code = "FETCH_ERROR";
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LinkedInFetchError";
    this.status = status;
  }
}

interface Session {
  cookieHeader: string;
  csrfToken: string;
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^"|"$/g, "");
}

function parseCookieString(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function getSession(): Session {
  const raw = process.env.LINKEDIN_COOKIES?.trim();
  if (!raw) {
    throw new LinkedInAuthError(
      "Missing LINKEDIN_COOKIES. Copy the Cookie header from a Voyager request in DevTools.",
    );
  }

  const map = parseCookieString(raw);
  const liAt = map.li_at ? stripQuotes(map.li_at) : "";
  if (!liAt) {
    throw new LinkedInAuthError("LINKEDIN_COOKIES must include li_at.");
  }

  let csrf =
    process.env.LINKEDIN_CSRF_TOKEN?.trim() ||
    (map.JSESSIONID ? stripQuotes(map.JSESSIONID) : "");
  if (!csrf) {
    throw new LinkedInAuthError(
      "Missing CSRF token. Set LINKEDIN_CSRF_TOKEN (ajax:…) or include JSESSIONID in LINKEDIN_COOKIES.",
    );
  }
  if (!csrf.startsWith("ajax:")) csrf = `ajax:${csrf}`;

  map.li_at = liAt;
  map.JSESSIONID = `"${csrf}"`;

  return {
    cookieHeader: Object.entries(map)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
    csrfToken: csrf,
  };
}

function httpsGet(
  urlString: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const url = new URL(urlString);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers,
        timeout: 25_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("LinkedIn request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function voyagerGet(path: string, vanityName: string, session: Session) {
  const url = `${VOYAGER_BASE}${path}`;
  let response: { status: number; body: string };

  try {
    response = await httpsGet(url, {
      Accept: "application/vnd.linkedin.normalized+json+2.1",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": USER_AGENT,
      "X-RestLi-Protocol-Version": "2.0.0",
      "x-li-lang": "en_US",
      "x-li-page-instance": `urn:li:page:d_flagship3_profile_view_base;${Buffer.from(vanityName).toString("base64").slice(0, 22)}`,
      "x-li-track": LI_TRACK,
      "csrf-token": session.csrfToken,
      Cookie: session.cookieHeader,
      Referer: `https://www.linkedin.com/in/${vanityName}/`,
    });
  } catch (err) {
    throw new LinkedInFetchError(
      err instanceof Error ? err.message : "Network error talking to LinkedIn.",
    );
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    throw new LinkedInAuthError(
      "LinkedIn redirected the request (session rejected). Re-copy Cookie + csrf-token from DevTools.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new LinkedInAuthError(
      "LinkedIn rejected the session (401/403). Cookies/csrf are stale or incomplete.",
    );
  }
  if (response.status === 404) {
    throw new LinkedInNotFoundError("LinkedIn profile not found.");
  }
  if (response.status === 429) {
    throw new LinkedInRateLimitError(
      "LinkedIn rate-limited the request. Wait several minutes.",
    );
  }
  if (response.status < 200 || response.status >= 300) {
    throw new LinkedInFetchError(
      `LinkedIn API returned ${response.status}${response.body ? `: ${response.body.slice(0, 220)}` : ""}`,
      response.status,
    );
  }

  try {
    return JSON.parse(response.body) as unknown;
  } catch {
    throw new LinkedInFetchError("LinkedIn returned a non-JSON body.");
  }
}

export async function fetchLinkedInProfile(
  vanityName: string,
): Promise<LinkedInProfile> {
  const session = getSession();
  const path =
    `/identity/dash/profiles?q=memberIdentity` +
    `&memberIdentity=${encodeURIComponent(vanityName)}` +
    `&decorationId=${encodeURIComponent(DECORATION)}`;

  const payload = await voyagerGet(path, vanityName, session);
  const included = (payload as { included?: unknown[] })?.included;
  if (!Array.isArray(included) || included.length === 0) {
    throw new LinkedInFetchError("LinkedIn returned an empty profile graph.");
  }

  const profile = parseProfilePayload(payload, {
    vanityName,
    url: normalizeProfileUrl(vanityName),
  });

  if (!profile.firstName && !profile.headline && profile.experience.length === 0) {
    throw new LinkedInFetchError(
      "LinkedIn returned a profile stub without details. Try fresh cookies, or the profile may be restricted.",
    );
  }

  return profile;
}

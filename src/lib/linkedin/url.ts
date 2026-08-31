const PROFILE_URL_RE =
  /^(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?linkedin\.com\/in\/([^/?#]+)/i;

/** Extract vanity name from a profile URL or bare identifier. */
export function extractVanityName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!/[./]/.test(trimmed) && /^[\w%-]+$/i.test(trimmed)) {
    return decodeURIComponent(trimmed.replace(/\/+$/, ""));
  }

  const match = trimmed.match(PROFILE_URL_RE);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1].replace(/\/+$/, ""));
}

export function normalizeProfileUrl(vanityName: string): string {
  return `https://www.linkedin.com/in/${vanityName}/`;
}

import { NextRequest, NextResponse } from "next/server";
import {
  fetchLinkedInProfile,
  LinkedInAuthError,
  LinkedInFetchError,
  LinkedInNotFoundError,
  LinkedInRateLimitError,
} from "@/lib/linkedin/client";
import type { ApiResponse } from "@/lib/linkedin/types";
import { extractVanityName } from "@/lib/linkedin/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  error: string,
  status: number,
  code?: string,
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error, code }, { status });
}

async function handleProfileRequest(
  urlInput: string | null,
): Promise<NextResponse<ApiResponse>> {
  if (!urlInput?.trim()) {
    return errorResponse(
      "Missing LinkedIn profile URL. Pass `url` as a query param or JSON body field.",
      400,
      "MISSING_URL",
    );
  }

  const vanityName = extractVanityName(urlInput);
  if (!vanityName) {
    return errorResponse(
      "Invalid LinkedIn profile URL. Expected format: https://www.linkedin.com/in/{vanity-name}",
      400,
      "INVALID_URL",
    );
  }

  try {
    const data = await fetchLinkedInProfile(vanityName);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof LinkedInAuthError) {
      return errorResponse(err.message, 401, err.code);
    }
    if (err instanceof LinkedInNotFoundError) {
      return errorResponse(err.message, 404, err.code);
    }
    if (err instanceof LinkedInRateLimitError) {
      return errorResponse(err.message, 429, err.code);
    }
    if (err instanceof LinkedInFetchError) {
      return errorResponse(
        err.message,
        err.status && err.status >= 400 ? err.status : 502,
        err.code,
      );
    }

    console.error("[api/profile]", err);
    return errorResponse(
      "Unexpected server error while fetching the LinkedIn profile.",
      500,
      "INTERNAL_ERROR",
    );
  }
}

/** GET /api/profile?url=https://www.linkedin.com/in/example */
export async function GET(request: NextRequest) {
  return handleProfileRequest(request.nextUrl.searchParams.get("url"));
}

/** POST /api/profile  Body: { "url": "https://www.linkedin.com/in/example" } */
export async function POST(request: NextRequest) {
  let body: { url?: string } = {};
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return errorResponse("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
  return handleProfileRequest(body.url ?? null);
}

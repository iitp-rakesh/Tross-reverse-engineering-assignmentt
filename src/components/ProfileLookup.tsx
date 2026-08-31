"use client";

import { useState, type FormEvent } from "react";
import type { ApiResponse, LinkedInProfile } from "@/lib/linkedin/types";
import { ProfileResult } from "./ProfileResult";

export function ProfileLookup() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [view, setView] = useState<"pretty" | "json">("pretty");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProfile(null);
    setRawJson(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const payload = (await response.json()) as ApiResponse;
      setRawJson(JSON.stringify(payload, null, 2));

      if (!payload.success) {
        setError(payload.error);
        return;
      }

      setProfile(payload.data);
      setView("pretty");
    } catch {
      setError("Network error — could not reach the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lookup">
      <form className="lookup-form" onSubmit={onSubmit}>
        <label className="lookup-label" htmlFor="linkedin-url">
          LinkedIn profile URL
        </label>
        <div className="lookup-row">
          <input
            id="linkedin-url"
            className="lookup-input"
            type="url"
            name="url"
            required
            placeholder="https://www.linkedin.com/in/username"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="lookup-submit" type="submit" disabled={loading}>
            {loading ? "Fetching…" : "Fetch profile"}
          </button>
        </div>
      </form>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {(profile || rawJson) && (
        <div className="results">
          <div className="results-toolbar">
            <div className="view-toggle" role="tablist" aria-label="Result view">
              <button
                type="button"
                role="tab"
                aria-selected={view === "pretty"}
                className={view === "pretty" ? "active" : ""}
                onClick={() => setView("pretty")}
                disabled={!profile}
              >
                Profile
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "json"}
                className={view === "json" ? "active" : ""}
                onClick={() => setView("json")}
              >
                JSON
              </button>
            </div>
            {rawJson && (
              <button
                type="button"
                className="copy-btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(rawJson);
                }}
              >
                Copy JSON
              </button>
            )}
          </div>

          {view === "pretty" && profile ? (
            <ProfileResult profile={profile} />
          ) : (
            <pre className="json-block">{rawJson}</pre>
          )}
        </div>
      )}
    </div>
  );
}

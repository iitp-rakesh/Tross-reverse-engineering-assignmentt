import { ProfileLookup } from "@/components/ProfileLookup";

export default function Home() {
  return (
    <main className="shell">
      <h1 className="brand">
        Tross
        <span>LinkedIn Profile API</span>
      </h1>
      <p className="lede">
        Paste a LinkedIn profile URL. The API returns name, headline, about,
        experience, education, skills, and more as structured JSON — ready to
        host on Vercel.
      </p>

      <div className="panel">
        <ProfileLookup />
      </div>
    </main>
  );
}

import type {
  Certification,
  Course,
  Education,
  Experience,
  Honor,
  Language,
  LinkedInProfile,
  Organization,
  Patent,
  Project,
  Publication,
  Skill,
  TestScore,
  VolunteerExperience,
} from "./types";

type Json = Record<string, unknown>;

function asObj(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function asArr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function typeName(item: Json): string {
  return str(item.$type) ?? "";
}

function isType(item: Json, leaf: string): boolean {
  return typeName(item).endsWith(`.${leaf}`);
}

function formatDate(date: unknown): string | null {
  const obj = asObj(date);
  if (!obj) return null;
  const year = num(obj.year);
  const month = num(obj.month);
  if (!year) return null;
  if (month) return `${year}-${String(month).padStart(2, "0")}`;
  return String(year);
}

function formatDateRange(range: unknown): {
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
} {
  const obj = asObj(range);
  if (!obj) return { startDate: null, endDate: null, isCurrent: false };
  const startDate = formatDate(obj.start);
  const endDate = formatDate(obj.end);
  return { startDate, endDate, isCurrent: Boolean(startDate) && !endDate };
}

function pickImageUrl(picture: unknown): string | null {
  const obj = asObj(picture);
  if (!obj) return null;

  const vector =
    asObj(asObj(obj.displayImageReference)?.vectorImage) ??
    asObj(obj.vectorImage) ??
    asObj(obj.displayImageReference) ??
    obj;

  const rootUrl = str(vector.rootUrl);
  const artifacts = asArr(vector.artifacts);
  if (rootUrl && artifacts.length > 0) {
    const sorted = [...artifacts]
      .map(asObj)
      .filter(Boolean)
      .sort((a, b) => (num(b!.width) ?? 0) - (num(a!.width) ?? 0));
    const segment = str(sorted[0]?.fileIdentifyingUrlPathSegment);
    if (segment) return `${rootUrl}${segment}`;
  }

  return str(obj.url) ?? str(obj.displayImageUrl);
}

function indexByUrn(included: Json[]): Map<string, Json> {
  const map = new Map<string, Json>();
  for (const item of included) {
    const urn = str(item.entityUrn);
    if (urn) map.set(urn, item);
  }
  return map;
}

function resolveRef(ref: unknown, byUrn: Map<string, Json>): Json | null {
  if (typeof ref === "string") return byUrn.get(ref) ?? null;
  return asObj(ref);
}

function profileIdFromUrn(profileUrn: string): string {
  const parts = profileUrn.split(":");
  return parts[parts.length - 1] ?? profileUrn;
}

function ownedByProfile(item: Json, profileId: string): boolean {
  return (str(item.entityUrn) ?? "").includes(profileId);
}

function sectionItems(included: Json[], leaf: string, profileId: string): Json[] {
  return included.filter(
    (el) =>
      isType(el, leaf) &&
      !typeName(el).includes("Collection") &&
      ownedByProfile(el, profileId),
  );
}

function peopleNames(list: unknown, byUrn: Map<string, Json>): string[] {
  const names: string[] = [];
  for (const entry of asArr(list)) {
    const obj = asObj(entry);
    if (!obj) continue;
    const standardized = asObj(obj.standardizedContributor) ?? obj;
    const profile =
      resolveRef(standardized["*profile"], byUrn) ??
      resolveRef(standardized.profile, byUrn);
    const name =
      [str(profile?.firstName), str(profile?.lastName)].filter(Boolean).join(" ") ||
      str(obj.name) ||
      str(standardized.name);
    if (name) names.push(name);
  }
  return names;
}

function parseExperience(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): Experience[] {
  return sectionItems(included, "Position", profileId).map((el) => {
    const dates = formatDateRange(el.dateRange);
    const company =
      resolveRef(el["*company"], byUrn) ??
      resolveRef(el.company, byUrn) ??
      asObj(el.company);
    const universal = str(company?.universalName);
    const companyUrl = universal
      ? universal.startsWith("http")
        ? universal
        : `https://www.linkedin.com/company/${universal}/`
      : str(company?.url);
    const employment =
      resolveRef(el["*employmentType"], byUrn) ?? asObj(el.employmentType);

    return {
      title: str(el.title),
      company: str(el.companyName) ?? str(company?.name) ?? null,
      companyUrl,
      location: str(el.geoLocationName) ?? str(el.locationName),
      description: str(el.description),
      employmentType: str(employment?.name) ?? str(el.employmentType),
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
    };
  });
}

function parseEducation(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): Education[] {
  return sectionItems(included, "Education", profileId).map((el) => {
    const dates = formatDateRange(el.dateRange);
    const school =
      resolveRef(el["*school"], byUrn) ??
      resolveRef(el.school, byUrn) ??
      asObj(el.school);
    const universal = str(school?.universalName);
    const schoolUrl = universal
      ? universal.startsWith("http")
        ? universal
        : `https://www.linkedin.com/school/${universal}/`
      : str(school?.url);

    return {
      school: str(el.schoolName) ?? str(school?.name) ?? null,
      schoolUrl,
      degree: str(el.degreeName) ?? str(el.degree),
      fieldOfStudy: str(el.fieldOfStudy),
      description: str(el.description) ?? str(el.activities),
      startDate: dates.startDate,
      endDate: dates.endDate,
    };
  });
}

function parseSkills(included: Json[], profileId: string): Skill[] {
  const out: Skill[] = [];
  const seen = new Set<string>();
  for (const el of sectionItems(included, "Skill", profileId)) {
    const name = str(el.name) ?? str(asObj(el.skill)?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, endorsements: num(el.endorsementCount) });
  }
  return out;
}

function parseCertifications(included: Json[], profileId: string): Certification[] {
  return sectionItems(included, "Certification", profileId).map((el) => {
    const dates = formatDateRange(el.dateRange);
    return {
      name: str(el.name),
      authority: str(el.authority) ?? str(asObj(el.company)?.name),
      url: str(el.url),
      issuedDate: dates.startDate,
      expirationDate: dates.endDate,
      credentialId: str(el.licenseNumber) ?? str(el.displaySource),
    };
  });
}

function parseLanguages(included: Json[], profileId: string): Language[] {
  return sectionItems(included, "Language", profileId).flatMap((el) => {
    const name = str(el.name);
    if (!name) return [];
    return [
      {
        name,
        proficiency: str(el.proficiency) ?? str(asObj(el.proficiency)?.name),
      },
    ];
  });
}

function parseProjects(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): Project[] {
  return sectionItems(included, "Project", profileId).map((el) => {
    const dates = formatDateRange(el.dateRange);
    return {
      title: str(el.title),
      description: str(el.description),
      url: str(el.url),
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
      contributors: peopleNames(el.contributors, byUrn),
    };
  });
}

function parseCourses(included: Json[], profileId: string): Course[] {
  return sectionItems(included, "Course", profileId).map((el) => ({
    name: str(el.name) ?? str(el.title),
    number: str(el.number) ?? str(el.courseNumber),
    associatedWith:
      str(el.occupation) ??
      str(asObj(el.occupation)?.name) ??
      str(el.associatedWith),
  }));
}

function parseHonors(included: Json[], profileId: string): Honor[] {
  return sectionItems(included, "Honor", profileId).map((el) => ({
    title: str(el.title) ?? str(el.name),
    issuer: str(el.issuer) ?? str(el.issuerName),
    description: str(el.description),
    issuedDate:
      formatDate(el.issueDate) ??
      formatDateRange(el.dateRange).startDate ??
      formatDate(el.issuedOn),
  }));
}

function parsePatents(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): Patent[] {
  return sectionItems(included, "Patent", profileId).map((el) => ({
    title: str(el.title) ?? str(el.name),
    issuer: str(el.issuer) ?? str(el.issuerName),
    patentNumber: str(el.patentNumber) ?? str(el.number),
    description: str(el.description),
    url: str(el.url),
    issuedDate:
      formatDate(el.issueDate) ??
      formatDateRange(el.dateRange).startDate ??
      formatDate(el.issuedOn),
    inventors: peopleNames(el.inventors ?? el.contributors, byUrn),
  }));
}

function parsePublications(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): Publication[] {
  return sectionItems(included, "Publication", profileId).map((el) => ({
    title: str(el.name) ?? str(el.title),
    publisher: str(el.publisher) ?? str(el.publisherName),
    description: str(el.description),
    url: str(el.url),
    publishedDate:
      formatDate(el.publishedOn) ??
      formatDateRange(el.dateRange).startDate ??
      formatDate(el.date),
    authors: peopleNames(el.authors ?? el.contributors, byUrn),
  }));
}

function parseVolunteer(
  included: Json[],
  byUrn: Map<string, Json>,
  profileId: string,
): VolunteerExperience[] {
  return sectionItems(included, "VolunteerExperience", profileId).map((el) => {
    const dates = formatDateRange(el.dateRange);
    const company =
      resolveRef(el["*company"], byUrn) ??
      resolveRef(el.company, byUrn) ??
      asObj(el.company);
    return {
      role: str(el.role) ?? str(el.title),
      organization:
        str(el.companyName) ??
        str(el.organizationName) ??
        str(company?.name) ??
        null,
      cause: str(el.cause) ?? str(asObj(el.cause)?.name),
      description: str(el.description),
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
    };
  });
}

function parseOrganizations(included: Json[], profileId: string): Organization[] {
  return included
    .filter((el) => {
      const t = typeName(el);
      // Membership orgs on a profile — not employer Company / School entities.
      if (!t.includes("Organization")) return false;
      if (t.includes("organization.Company") || t.includes("organization.School")) {
        return false;
      }
      if (t.includes("Collection")) return false;
      return ownedByProfile(el, profileId);
    })
    .map((el) => {
      const dates = formatDateRange(el.dateRange);
      return {
        name: str(el.name) ?? str(el.organizationName),
        role: str(el.position) ?? str(el.role) ?? str(el.title),
        description: str(el.description),
        startDate: dates.startDate,
        endDate: dates.endDate,
        isCurrent: dates.isCurrent,
      };
    });
}

function parseTestScores(included: Json[], profileId: string): TestScore[] {
  return sectionItems(included, "TestScore", profileId).map((el) => ({
    name: str(el.name) ?? str(el.title),
    score:
      str(el.score) ?? (num(el.score) != null ? String(num(el.score)) : null),
    description: str(el.description),
    date:
      formatDate(el.dateOn) ??
      formatDate(el.date) ??
      formatDateRange(el.dateRange).startDate,
  }));
}

function findTargetProfile(included: Json[], vanityName: string): Json | null {
  const profiles = included.filter((item) => isType(item, "Profile"));
  const match = profiles.find(
    (p) =>
      str(p.publicIdentifier)?.toLowerCase() === vanityName.toLowerCase() &&
      Boolean(str(p.firstName) || str(p.lastName) || str(p.headline)),
  );
  if (match) return match;

  const ranked = [...profiles].sort((a, b) => {
    const score = (p: Json) =>
      Number(Boolean(str(p.firstName))) * 4 +
      Number(Boolean(str(p.headline))) * 2 +
      Number(Boolean(str(p.summary))) +
      Object.keys(p).length;
    return score(b) - score(a);
  });
  return ranked[0] ?? null;
}

/** Normalize a Voyager dash profile payload into our public schema. */
export function parseProfilePayload(
  payload: unknown,
  meta: { vanityName: string; url: string },
): LinkedInProfile {
  const root = asObj(payload) ?? {};
  const included = asArr(root.included).map(asObj).filter(Boolean) as Json[];
  const byUrn = indexByUrn(included);

  const profile = findTargetProfile(included, meta.vanityName);
  if (!profile) {
    throw new Error("Could not locate profile entity in LinkedIn response.");
  }

  const firstName = str(profile.firstName);
  const lastName = str(profile.lastName);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    str(profile.publicIdentifier) ||
    meta.vanityName;

  const profileUrn = str(profile.entityUrn) ?? "";
  const profileId = profileIdFromUrn(profileUrn);

  const geoRef =
    str(asObj(profile.geoLocation)?.["*geo"]) ??
    str(asObj(profile.geoLocation)?.geoUrn);
  const geo = geoRef ? byUrn.get(geoRef) : undefined;

  const industryRef = str(profile["*industry"]);
  const industry = industryRef ? byUrn.get(industryRef) : undefined;

  return {
    url: meta.url,
    vanityName: str(profile.publicIdentifier) ?? meta.vanityName,
    fullName,
    firstName,
    lastName,
    headline: str(profile.headline),
    location:
      str(geo?.defaultLocalizedName) ??
      str(profile.locationName) ??
      str(asObj(profile.location)?.countryCode),
    about: str(profile.summary),
    industry: str(industry?.name) ?? str(profile.industryName),
    profilePicture: pickImageUrl(profile.profilePicture),
    backgroundImage:
      pickImageUrl(profile.backgroundPicture) ??
      pickImageUrl(profile.backgroundImage),
    connectionsCount: num(profile.connectionsCount),
    followersCount: num(profile.followerCount) ?? num(profile.followersCount),
    experience: parseExperience(included, byUrn, profileId),
    education: parseEducation(included, byUrn, profileId),
    skills: parseSkills(included, profileId),
    certifications: parseCertifications(included, profileId),
    languages: parseLanguages(included, profileId),
    projects: parseProjects(included, byUrn, profileId),
    courses: parseCourses(included, profileId),
    honors: parseHonors(included, profileId),
    patents: parsePatents(included, byUrn, profileId),
    publications: parsePublications(included, byUrn, profileId),
    volunteerExperience: parseVolunteer(included, byUrn, profileId),
    organizations: parseOrganizations(included, profileId),
    testScores: parseTestScores(included, profileId),
    scrapedAt: new Date().toISOString(),
  };
}

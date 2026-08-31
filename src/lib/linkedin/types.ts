export interface Experience {
  title: string | null;
  company: string | null;
  companyUrl: string | null;
  location: string | null;
  description: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface Education {
  school: string | null;
  schoolUrl: string | null;
  degree: string | null;
  fieldOfStudy: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface Skill {
  name: string;
  endorsements: number | null;
}

export interface Certification {
  name: string | null;
  authority: string | null;
  url: string | null;
  issuedDate: string | null;
  expirationDate: string | null;
  credentialId: string | null;
}

export interface Language {
  name: string;
  proficiency: string | null;
}

export interface Project {
  title: string | null;
  description: string | null;
  url: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  contributors: string[];
}

export interface Course {
  name: string | null;
  number: string | null;
  associatedWith: string | null;
}

export interface Honor {
  title: string | null;
  issuer: string | null;
  description: string | null;
  issuedDate: string | null;
}

export interface Patent {
  title: string | null;
  issuer: string | null;
  patentNumber: string | null;
  description: string | null;
  url: string | null;
  issuedDate: string | null;
  inventors: string[];
}

export interface Publication {
  title: string | null;
  publisher: string | null;
  description: string | null;
  url: string | null;
  publishedDate: string | null;
  authors: string[];
}

export interface VolunteerExperience {
  role: string | null;
  organization: string | null;
  cause: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface Organization {
  name: string | null;
  role: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface TestScore {
  name: string | null;
  score: string | null;
  description: string | null;
  date: string | null;
}

export interface LinkedInProfile {
  url: string;
  vanityName: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  location: string | null;
  about: string | null;
  industry: string | null;
  profilePicture: string | null;
  backgroundImage: string | null;
  connectionsCount: number | null;
  followersCount: number | null;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  languages: Language[];
  projects: Project[];
  courses: Course[];
  honors: Honor[];
  patents: Patent[];
  publications: Publication[];
  volunteerExperience: VolunteerExperience[];
  organizations: Organization[];
  testScores: TestScore[];
  scrapedAt: string;
}

export interface ApiSuccessResponse {
  success: true;
  data: LinkedInProfile;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

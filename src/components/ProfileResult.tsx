import type { ReactNode } from "react";
import type { LinkedInProfile } from "@/lib/linkedin/types";

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <section className="section">
      <h3 className="section-title">{title}</h3>
      {children}
    </section>
  );
}

function DateRange({
  start,
  end,
  isCurrent,
}: {
  start: string | null;
  end: string | null;
  isCurrent?: boolean;
}) {
  if (!start && !end) return null;
  return (
    <span className="muted">
      {[start, isCurrent ? "Present" : end].filter(Boolean).join(" → ")}
    </span>
  );
}

function ExternalLink({ href, label }: { href: string | null; label?: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="profile-link">
      {label ?? "Open link ↗"}
    </a>
  );
}

export function ProfileResult({ profile }: { profile: LinkedInProfile }) {
  return (
    <article className="profile">
      <header className="profile-header">
        {profile.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="avatar"
            src={profile.profilePicture}
            alt={profile.fullName}
            width={96}
            height={96}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="avatar avatar-fallback" aria-hidden>
            {profile.fullName.slice(0, 1) || "?"}
          </div>
        )}
        <div className="profile-identity">
          <h2 className="profile-name">{profile.fullName || "Unknown"}</h2>
          {profile.headline && <p className="profile-headline">{profile.headline}</p>}
          <p className="profile-meta">
            {[profile.location, profile.industry].filter(Boolean).join(" · ")}
          </p>
          <a
            className="profile-link"
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on LinkedIn ↗
          </a>
        </div>
      </header>

      <Section title="About" empty={!profile.about}>
        <p className="prose">{profile.about}</p>
      </Section>

      <Section title="Experience" empty={profile.experience.length === 0}>
        <ul className="timeline">
          {profile.experience.map((job, i) => (
            <li key={`${job.title}-${job.company}-${i}`}>
              <div className="timeline-title">
                {job.title || "Role"}
                {job.company ? ` · ${job.company}` : ""}
              </div>
              <DateRange
                start={job.startDate}
                end={job.endDate}
                isCurrent={job.isCurrent}
              />
              {job.employmentType && (
                <div className="muted">{job.employmentType}</div>
              )}
              {job.location && <div className="muted">{job.location}</div>}
              {job.description && <p className="prose tight">{job.description}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Education" empty={profile.education.length === 0}>
        <ul className="timeline">
          {profile.education.map((edu, i) => (
            <li key={`${edu.school}-${i}`}>
              <div className="timeline-title">{edu.school || "School"}</div>
              <div className="muted">
                {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" · ")}
              </div>
              <DateRange start={edu.startDate} end={edu.endDate} />
              {edu.description && <p className="prose tight">{edu.description}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Projects" empty={profile.projects.length === 0}>
        <ul className="timeline">
          {profile.projects.map((project, i) => (
            <li key={`${project.title}-${i}`}>
              <div className="timeline-title">{project.title || "Project"}</div>
              <DateRange
                start={project.startDate}
                end={project.endDate}
                isCurrent={project.isCurrent}
              />
              {project.contributors.length > 0 && (
                <div className="muted">
                  With {project.contributors.join(", ")}
                </div>
              )}
              {project.description && (
                <p className="prose tight">{project.description}</p>
              )}
              <ExternalLink href={project.url} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Courses" empty={profile.courses.length === 0}>
        <ul className="timeline">
          {profile.courses.map((course, i) => (
            <li key={`${course.name}-${i}`}>
              <div className="timeline-title">{course.name || "Course"}</div>
              <div className="muted">
                {[course.number, course.associatedWith].filter(Boolean).join(" · ")}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Skills" empty={profile.skills.length === 0}>
        <ul className="chip-list">
          {profile.skills.map((skill) => (
            <li key={skill.name} className="chip">
              {skill.name}
              {skill.endorsements != null ? (
                <span className="chip-count">{skill.endorsements}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Certifications" empty={profile.certifications.length === 0}>
        <ul className="timeline">
          {profile.certifications.map((cert, i) => (
            <li key={`${cert.name}-${i}`}>
              <div className="timeline-title">{cert.name || "Certification"}</div>
              {cert.authority && <div className="muted">{cert.authority}</div>}
              <DateRange start={cert.issuedDate} end={cert.expirationDate} />
              <ExternalLink href={cert.url} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Honors & awards" empty={profile.honors.length === 0}>
        <ul className="timeline">
          {profile.honors.map((honor, i) => (
            <li key={`${honor.title}-${i}`}>
              <div className="timeline-title">{honor.title || "Honor"}</div>
              {honor.issuer && <div className="muted">{honor.issuer}</div>}
              <DateRange start={honor.issuedDate} end={null} />
              {honor.description && (
                <p className="prose tight">{honor.description}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Volunteer experience" empty={profile.volunteerExperience.length === 0}>
        <ul className="timeline">
          {profile.volunteerExperience.map((item, i) => (
            <li key={`${item.role}-${item.organization}-${i}`}>
              <div className="timeline-title">
                {item.role || "Volunteer"}
                {item.organization ? ` · ${item.organization}` : ""}
              </div>
              <DateRange
                start={item.startDate}
                end={item.endDate}
                isCurrent={item.isCurrent}
              />
              {item.cause && <div className="muted">{item.cause}</div>}
              {item.description && (
                <p className="prose tight">{item.description}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Organizations" empty={profile.organizations.length === 0}>
        <ul className="timeline">
          {profile.organizations.map((org, i) => (
            <li key={`${org.name}-${i}`}>
              <div className="timeline-title">
                {org.name || "Organization"}
                {org.role ? ` · ${org.role}` : ""}
              </div>
              <DateRange
                start={org.startDate}
                end={org.endDate}
                isCurrent={org.isCurrent}
              />
              {org.description && <p className="prose tight">{org.description}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Publications" empty={profile.publications.length === 0}>
        <ul className="timeline">
          {profile.publications.map((pub, i) => (
            <li key={`${pub.title}-${i}`}>
              <div className="timeline-title">{pub.title || "Publication"}</div>
              {pub.publisher && <div className="muted">{pub.publisher}</div>}
              <DateRange start={pub.publishedDate} end={null} />
              {pub.authors.length > 0 && (
                <div className="muted">Authors: {pub.authors.join(", ")}</div>
              )}
              {pub.description && <p className="prose tight">{pub.description}</p>}
              <ExternalLink href={pub.url} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Patents" empty={profile.patents.length === 0}>
        <ul className="timeline">
          {profile.patents.map((patent, i) => (
            <li key={`${patent.title}-${i}`}>
              <div className="timeline-title">{patent.title || "Patent"}</div>
              <div className="muted">
                {[patent.issuer, patent.patentNumber].filter(Boolean).join(" · ")}
              </div>
              <DateRange start={patent.issuedDate} end={null} />
              {patent.inventors.length > 0 && (
                <div className="muted">
                  Inventors: {patent.inventors.join(", ")}
                </div>
              )}
              {patent.description && (
                <p className="prose tight">{patent.description}</p>
              )}
              <ExternalLink href={patent.url} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Test scores" empty={profile.testScores.length === 0}>
        <ul className="timeline">
          {profile.testScores.map((score, i) => (
            <li key={`${score.name}-${i}`}>
              <div className="timeline-title">{score.name || "Test"}</div>
              {score.score && <div className="muted">Score: {score.score}</div>}
              <DateRange start={score.date} end={null} />
              {score.description && (
                <p className="prose tight">{score.description}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Languages" empty={profile.languages.length === 0}>
        <ul className="chip-list">
          {profile.languages.map((lang) => (
            <li key={lang.name} className="chip">
              {lang.name}
              {lang.proficiency ? (
                <span className="chip-count">{lang.proficiency}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}

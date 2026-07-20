"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GRADES, assessmentsForGrade, gradeLabel, type Domain, type Grade } from "@/lib/assessments";
import { Brand } from "./Brand";

export function HomePage({ initialGrade = "2", childId }: { initialGrade?: Grade; childId?: string }) {
  const [grade, setGrade] = useState<Grade>(initialGrade);
  const [domain, setDomain] = useState<Domain | "All">("All");

  const assessments = useMemo(
    () => assessmentsForGrade(grade).filter((assessment) => domain === "All" || assessment.domain === domain),
    [grade, domain],
  );

  function changeGrade(next: Grade) {
    if (childId) return;
    setGrade(next);
    window.history.replaceState(null, "", "/?grade=" + next);
  }

  return (
    <>
      <header className="site-header">
        <Brand />
        <nav aria-label="Main navigation">
          <span className="guest-pill">{childId ? "Profile tracking" : "Guest mode"}</span>
          <Link className="button button-quiet" href={childId ? "/parent/dashboard" : "/parent"}>{childId ? "Parent dashboard" : "Parent area"}</Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Small steps. Bright progress.</p>
            <h1>Build brave reading and math skills.</h1>
            <p className="hero-lede">{childId ? "Pick a skill for this profile’s grade and take a short practice adventure." : "Choose a grade, pick a skill, and take a short practice adventure—no account needed."}</p>
            <div className="privacy-note"><span aria-hidden="true">🔒</span> {childId ? "Completed practice is saved to this child profile and this device." : "Guest practice stays on this device."}</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="planet">2<span>+3</span></div>
            <div className="book">ABC</div>
            <div className="orbit orbit-one">★</div>
            <div className="orbit orbit-two">●</div>
          </div>
        </section>

        <section className="picker-section" aria-labelledby="choose-heading">
          <div className="section-heading">
            <div>
              <p className="step-label">Step 1</p>
              <h2 id="choose-heading">Choose a grade</h2>
            </div>
            <label className="grade-select-label">
              Grade level
              <select value={grade} disabled={Boolean(childId)} onChange={(event) => changeGrade(event.target.value as Grade)}>
                {GRADES.map((value) => <option key={value} value={value}>{gradeLabel(value)}</option>)}
              </select>
            </label>
          </div>

          <div className="grade-chips" role="group" aria-label="Quick grade choices">
            {GRADES.map((value) => (
              <button className={value === grade ? "grade-chip selected" : "grade-chip"} key={value} disabled={Boolean(childId)} onClick={() => changeGrade(value)} aria-pressed={value === grade}>
                {value === "pre-k" ? "Pre-K" : value === "k" ? "K" : value}
              </button>
            ))}
          </div>
          {childId && <p className="fine-print">Grade is locked to this child profile. Change the profile’s grade from the parent dashboard.</p>}
        </section>

        <section className="activities-section" aria-labelledby="activities-heading">
          <div className="section-heading">
            <div>
              <p className="step-label">Step 2</p>
              <h2 id="activities-heading">Pick a practice activity</h2>
              <p>{ASSSummary(grade, assessments.length)}</p>
            </div>
            <div className="segmented" role="group" aria-label="Filter by subject">
              {(["All", "Reading", "Math"] as const).map((value) => (
                <button key={value} className={domain === value ? "active" : ""} onClick={() => setDomain(value)} aria-pressed={domain === value}>{value}</button>
              ))}
            </div>
          </div>
          <div className="activity-grid">
            {assessments.map((assessment, index) => (
              <article className={`activity-card ${assessment.domain.toLowerCase()}`} key={assessment.slug}>
                <div className="card-topline">
                  <span className="subject-icon" aria-hidden="true">{assessment.domain === "Reading" ? ["Aa", "☁", "✎"][index % 3] : ["123", "△", "+"][index % 3]}</span>
                  <span className="time-pill">{assessment.practiceTime}</span>
                </div>
                <p className="measure-code">{assessment.abbreviation} · {assessment.domain}</p>
                <h3>{assessment.name}</h3>
                <p>{assessment.description}</p>
                <div className="card-notes">
                  {assessment.adultHelp && <span>Adult helper useful</span>}
                  {assessment.benchmarkOnly && <span>Screening-style skill</span>}
                </div>
                <Link className="button button-card" href={`/practice/${assessment.slug}?grade=${grade}${childId ? `&child=${encodeURIComponent(childId)}` : ""}`}>Start practice <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
          {assessments.length === 0 && <p className="empty-state">No activities match that filter yet.</p>}
        </section>

        <section className="trust-panel">
          <div>
            <p className="eyebrow">For grown-ups</p>
            <h2>Practice with perspective</h2>
          </div>
          <p>BrightPath uses original practice questions aligned to broad skills. It is not affiliated with Pearson, and practice results are not official aimswebPlus scores, percentiles, or predictions.</p>
        </section>
      </main>
      <footer><Brand /><p>Independent, privacy-first skill practice.</p><span><Link href="/about">About &amp; research</Link> · <Link href="/privacy">Privacy</Link></span></footer>
    </>
  );
}

function ASSSummary(grade: Grade, count: number) {
  return `${count} ${count === 1 ? "activity" : "activities"} for ${gradeLabel(grade)}`;
}

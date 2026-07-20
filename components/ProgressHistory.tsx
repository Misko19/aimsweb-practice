import { findAssessment } from "@/lib/assessments";

type AttemptRow = {
  id: string;
  childName: string;
  assessmentSlug: string;
  correct: number;
  total: number;
  kind: "accuracy" | "words-read";
  durationSeconds: number;
  completedAt: string;
};

export function ProgressHistory({ attempts }: { attempts: AttemptRow[] }) {
  return (
    <section className="progress-history">
      <div><p className="eyebrow">Progress</p><h2>Recent practice</h2><p>Compare results only within the same BrightPath activity. These are practice metrics, not official test scores.</p></div>
      {attempts.length ? (
        <div className="table-wrap"><table><thead><tr><th>Child</th><th>Activity</th><th>Practice result</th><th>Time</th><th>Date</th></tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id}><td>{attempt.childName}</td><td>{findAssessment(attempt.assessmentSlug)?.name ?? attempt.assessmentSlug}</td><td>{attempt.kind === "accuracy" ? `${attempt.correct}/${attempt.total} · ${Math.round(attempt.correct / attempt.total * 100)}%` : `${attempt.correct} words read accurately`}</td><td>{attempt.durationSeconds}s</td><td>{attempt.completedAt}</td></tr>)}</tbody></table></div>
      ) : <p className="empty-history">Completed signed-in practice will appear here.</p>}
    </section>
  );
}

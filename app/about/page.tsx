import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function AboutPage() {
  return (
    <>
      <header className="site-header"><Brand /><Link className="button button-quiet" href="/">Practice home</Link></header>
      <main id="main-content" className="article-page">
        <p className="eyebrow">About BrightPath</p>
        <h1>Skill practice, not test reproduction.</h1>
        <p>BrightPath is an independent practice companion built from public information about broad reading and math skills. Every question and passage in the app is original.</p>
        <h2>What the research says</h2>
        <p>Pearson currently describes aimswebPlus as a Pre-K–12 assessment system. Measures vary by grade, season, and school-selected battery. Early measures are often administered individually by an adult; many Grade 2–12 measures are delivered online. Fluency measures are brief and timed, while comprehension and concepts measures are generally longer.</p>
        <p>Official results can include raw counts, rates, scale scores, percentiles, composites, and risk tiers based on Pearson&apos;s secured forms and national norms. BrightPath does not have those forms or norms, so it reports only its own practice accuracy and activity history.</p>
        <h2>What BrightPath will never do</h2>
        <ul>
          <li>Copy Pearson test questions, passages, pictures, scripts, layouts, answer keys, or scoring conversions.</li>
          <li>Claim that a practice result is an official score, percentile, benchmark, risk tier, or prediction.</li>
          <li>Record a child&apos;s voice. Oral reading uses adult-assisted self-scoring.</li>
          <li>Include behavior, social-emotional, or dyslexia screeners as activities to rehearse.</li>
        </ul>
        <h2>Primary references</h2>
        <ul>
          <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/awp-assessment-matrix-us.pdf">Pearson aimswebPlus Assessment Matrix</a></li>
          <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/aimswebplus-early-literacy-administration-and-scoring-guide.pdf">Pearson Early Literacy Administration and Scoring Guide</a></li>
          <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/aimsweb/aimswebplus-reading-administration-and-scoring-guide-grades-2-8.pdf">Pearson Reading Administration and Scoring Guide, Grades 2–8</a></li>
          <li><a href="https://www.pearsonassessments.com/footer/legal-policies.html">Pearson legal policies</a></li>
          <li><a href="https://udlguidelines.cast.org/">CAST Universal Design for Learning Guidelines 3.0</a></li>
          <li><a href="https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business">FTC COPPA compliance plan</a></li>
        </ul>
        <p><strong>Trademark note:</strong> aimswebPlus is a Pearson trademark. BrightPath is not affiliated with, endorsed by, or sponsored by Pearson.</p>
      </main>
    </>
  );
}

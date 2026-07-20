import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function PrivacyPage() {
  return (
    <>
      <header className="site-header">
        <Brand />
        <Link className="button button-quiet" href="/">Practice home</Link>
      </header>
      <main id="main-content" className="auth-shell">
        <article className="auth-card">
          <p className="eyebrow">For parents and guardians</p>
          <h1>Privacy notice</h1>
          <p><strong>Last updated July 20, 2026.</strong> BrightPath Practice is designed to collect as little information about children as possible.</p>

          <h2>Guest practice</h2>
          <p>No account is required. A guest&apos;s grade choice and up to 100 recent practice results are stored only in that browser. BrightPath does not create a server profile for a guest. Clearing browser storage removes that local history.</p>

          <h2>Parent accounts and child profiles</h2>
          <p>A parent account stores the adult&apos;s email, password hash, sessions, privacy-notice acceptance, and account timestamps. A parent may add a child nickname, grade, preset avatar, and practice results. Do not enter a legal name. BrightPath does not request a child&apos;s email, birth date, school, location, photo, or voice recording.</p>

          <h2>How saved data is used</h2>
          <p>Saved data provides login, nickname-only child profiles, practice history, progress summaries, export, and deletion. It is not used for advertising, public profiles, social features, official aimswebPlus scoring, or sale of personal information.</p>

          <h2>Sharing and retention</h2>
          <p>This reference implementation includes no advertising, behavioral analytics, session replay, or browser-side social plug-ins. A production operator must disclose and contractually review every hosting, email, logging, and database provider it uses. Cloud profile data remains until the parent deletes the child profile or parent account; those actions remove the associated records from the active database immediately. To bound storage, each child retains the 1,000 most recent cloud attempts.</p>

          <h2>Parent choices</h2>
          <p>From the parent dashboard, a parent can download saved account data, delete an individual child and that child&apos;s history, or permanently delete the entire account. Parents can stop cloud collection by using guest practice instead.</p>

          <h2>Before public deployment</h2>
          <p>This repository is a working application template, not a deployed service with an identified operator. Before serving the public, the deployer must add its legal name and contact method, document backup deletion and every service provider, establish an appropriate verifiable-parental-consent process, and obtain qualified COPPA/privacy review.</p>

          <p><Link href="/parent/signup">Return to parent signup</Link></p>
        </article>
      </main>
    </>
  );
}

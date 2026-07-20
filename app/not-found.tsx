import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="not-found"><p className="eyebrow">Oops</p><h1>That practice path wandered away.</h1><Link className="button button-primary" href="/">Back home</Link></main>;
}

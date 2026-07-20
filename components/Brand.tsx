import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="BrightPath Practice home">
      <span className="brand-mark" aria-hidden="true">✦</span>
      <span>BrightPath <strong>Practice</strong></span>
    </Link>
  );
}

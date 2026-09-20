import Link from "next/link";
import { drop } from "@/config/drop";

export default function NotFound() {
  return (
    <main id="contenu" className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p aria-hidden="true" className="madras-text font-heavy text-[clamp(5rem,30vw,12rem)] leading-none">404</p>
        <p className="mt-4 text-muted">Cette page n&apos;existe pas.</p>
        <Link href="/" className="btn btn-primary mt-8 !pr-2.5">
          {drop.brand}
          <span className="btn-disc" aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}

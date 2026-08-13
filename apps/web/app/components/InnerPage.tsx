import type { ReactNode } from 'react';
import Link from 'next/link';

type InnerPageProps = {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
};

export function InnerPage({ eyebrow, title, lede, children }: InnerPageProps) {
  return (
    <main className="innerPage" id="main">
      <a className="skipLink" href="#content">
        Skip to content
      </a>
      <nav className="innerNav" aria-label="Primary navigation">
        <Link className="wordmark" href="/">
          <span className="wordmarkMark" aria-hidden="true">
            J
          </span>
          <span>Janus Observatory</span>
        </Link>
        <div className="navLinks">
          <Link href="/#story">Story</Link>
          <Link href="/observatory">Observatory</Link>
          <Link href="/atlas">Atlas</Link>
          <Link href="/research">Research</Link>
          <Link href="/methods">Methods</Link>
        </div>
      </nav>
      <header className="innerHero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{lede}</p>
      </header>
      <div className="innerContent" id="content">
        {children}
      </div>
      <footer>
        <p>Janus Observatory · first light</p>
        <Link href="/">Return to story</Link>
      </footer>
    </main>
  );
}

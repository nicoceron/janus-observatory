import type { ReactNode } from 'react';
import Link from 'next/link';

import styles from './InnerPage.module.css';

type InnerPageProps = {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
};

export function InnerPage({ eyebrow, title, lede, children }: InnerPageProps) {
  return (
    <main className={styles.page} id="main">
      <a className={styles.skipLink} href="#content">
        Skip to content
      </a>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link aria-label="Janus Observatory" className={styles.wordmark} href="/">
          <span className={styles.wordmarkMark} aria-hidden="true">
            J
          </span>
          <span className={styles.wordmarkText}>Janus Observatory</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/#story">Story</Link>
          <Link href="/observatory">Observatory</Link>
          <Link href="/atlas">Atlas</Link>
          <Link href="/research">Research</Link>
          <Link href="/methods">Methods</Link>
        </div>
      </nav>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
      </header>
      <div className={styles.content} id="content">
        {children}
      </div>
      <footer className={styles.footer}>
        <p>Janus Observatory · first light</p>
        <nav className={styles.footerLinks} aria-label="Utility navigation">
          <Link href="/sources">Sources</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Return to story</Link>
        </nav>
      </footer>
    </main>
  );
}

import type { ReactNode } from 'react';
import Link from './AppLink';

import styles from './InnerPage.module.css';
import { SiteHeader } from './SiteHeader';
import { SpaceBackdrop } from '../voyage/SpaceBackdrop';

type InnerPageProps = {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
};

export function InnerPage({ eyebrow, title, lede, children }: InnerPageProps) {
  return (
    <main className={styles.page} id="main">
      <SpaceBackdrop />
      <a className={styles.skipLink} href="#content">
        Skip to content
      </a>
      <SiteHeader />
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
          <Link href="/research">Research</Link>
          <Link href="/methods">Methods</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Return to story</Link>
        </nav>
      </footer>
    </main>
  );
}

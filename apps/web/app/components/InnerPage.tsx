import { ViewTransition, type ReactNode } from 'react';
import Link from './AppLink';

import styles from './InnerPage.module.css';
import { SiteHeader } from './SiteHeader';
import { SpaceBackdrop } from '../voyage/SpaceBackdrop';
import { chapterTitles } from '../../lib/chapter-titles';

type InnerPageProps = {
  eyebrow?: string;
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
      <SiteHeader chapterTitles={chapterTitles} />
      <ViewTransition enter="page-in" exit="page-out" default="none">
        <div>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
              <h1>{title}</h1>
              <p className={styles.lede}>{lede}</p>
            </div>
          </header>
          <div className={styles.content} id="content">
            {children}
          </div>
          <footer className={styles.footer}>
            <p>
              Janus Observatory. An independent interpretation of{' '}
              <Link href="/research">Project Janus</Link>, designed and built by{' '}
              <a href="https://dardo.studio/">Dardo</a>.
            </p>
            <nav className={styles.footerLinks} aria-label="More about this site">
              <Link href="/">Story</Link>
              <Link href="/research">Research</Link>
              <Link href="/methods">Methods</Link>
              <Link href="/sources">Sources &amp; credits</Link>
              <Link href="/accessibility">Accessibility</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </footer>
        </div>
      </ViewTransition>
    </main>
  );
}

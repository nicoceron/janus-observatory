import Link from './components/AppLink';

import styles from './status.module.css';
import { SiteHeader } from './components/SiteHeader';
import { chapterTitles } from '../lib/chapter-titles';

export default function NotFound() {
  return (
    <main className={styles.shell}>
      <SiteHeader chapterTitles={chapterTitles} />

      <section className={styles.message}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>Nothing out here.</h1>
        <p className={styles.copy}>
          There’s no page at this address. Head back to the story, or browse the ten futures in the
          atlas.
        </p>
        <div className={styles.actions}>
          <Link className={styles.action} href="/">
            Back to the story
          </Link>
          <Link className={`${styles.action} ${styles.actionSecondary}`} href="/atlas">
            Open the atlas
          </Link>
        </div>
      </section>
    </main>
  );
}

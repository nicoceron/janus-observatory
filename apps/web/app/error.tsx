'use client';

import Link from './components/AppLink';
import { useEffect } from 'react';

import styles from './status.module.css';
import { SiteHeader } from './components/SiteHeader';

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.shell}>
      <SiteHeader />

      <section className={styles.message}>
        <p className={styles.code} aria-hidden="true">
          ERR
        </p>
        <h1 className={styles.title}>This view didn’t load.</h1>
        <p className={styles.copy}>
          Something went wrong while showing this page. Try again, or head back to the story.
        </p>
        <div className={styles.actions}>
          <button className={styles.action} onClick={() => retry()} type="button">
            Try again
          </button>
          <Link className={`${styles.action} ${styles.actionSecondary}`} href="/">
            Back to the story
          </Link>
        </div>
      </section>
    </main>
  );
}

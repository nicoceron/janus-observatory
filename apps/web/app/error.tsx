'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import styles from './status.module.css';

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
      <p className={styles.eyebrow}>Janus Observatory · recoverable fault</p>
      <section className={styles.message}>
        <p className={styles.code} aria-hidden="true">
          ERR
        </p>
        <h1 className={styles.title}>The instrument lost this view.</h1>
        <p className={styles.copy}>
          The evidence and the rest of the Observatory are unchanged. Retry this route, or return to
          the static story path.
        </p>
        <div className={styles.actions}>
          <button className={styles.action} onClick={() => retry()} type="button">
            Retry view
          </button>
          <Link className={`${styles.action} ${styles.actionSecondary}`} href="/">
            Return to the story
          </Link>
        </div>
      </section>
    </main>
  );
}

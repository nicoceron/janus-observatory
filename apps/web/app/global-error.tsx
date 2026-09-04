'use client';

import { useEffect } from 'react';

import styles from './status.module.css';

export default function GlobalError({
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
    <html lang="en">
      <body className={styles.shell}>
        <title>System fault · Janus Observatory</title>
        <p className={styles.eyebrow}>Janus Observatory · system fault</p>
        <main className={styles.message}>
          <p className={styles.code} aria-hidden="true">
            ERR
          </p>
          <h1 className={styles.title}>The Observatory could not initialize.</h1>
          <p className={styles.copy}>
            Retry the application shell. If the fault persists, the previous immutable release
            should be restored using the operations runbook.
          </p>
          <div className={styles.actions}>
            <button className={styles.action} onClick={() => retry()} type="button">
              Retry application
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

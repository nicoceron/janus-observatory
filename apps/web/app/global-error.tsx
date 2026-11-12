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
        <title>Something went wrong · Janus Observatory</title>
        <main className={styles.message}>
          <p className={styles.code} aria-hidden="true">
            ERR
          </p>
          <h1 className={styles.title}>Janus Observatory didn’t load.</h1>
          <p className={styles.copy}>
            Something went wrong while starting the site. Try again in a moment.
          </p>
          <div className={styles.actions}>
            <button className={styles.action} onClick={() => retry()} type="button">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

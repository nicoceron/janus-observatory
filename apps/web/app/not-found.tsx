import Link from 'next/link';

import styles from './status.module.css';

export default function NotFound() {
  return (
    <main className={styles.shell}>
      <p className={styles.eyebrow}>Janus Observatory · signal absent</p>
      <section className={styles.message}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>This coordinate is outside the atlas.</h1>
        <p className={styles.copy}>
          The requested route is not part of the published Observatory. Return to the guided story
          or open the ten-scenario index.
        </p>
        <div className={styles.actions}>
          <Link className={styles.action} href="/">
            Return to the story
          </Link>
          <Link className={`${styles.action} ${styles.actionSecondary}`} href="/atlas">
            Open the atlas
          </Link>
        </div>
      </section>
    </main>
  );
}

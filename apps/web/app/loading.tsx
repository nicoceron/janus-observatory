import styles from './status.module.css';

export default function Loading() {
  return (
    <main className={styles.shell} aria-live="polite" aria-busy="true">
      <p className={styles.eyebrow}>Janus Observatory</p>
      <section className={styles.message} role="status">
        <h1 className={styles.title}>Resolving the next view…</h1>
        <div className={styles.loadingMark} aria-hidden="true" />
      </section>
    </main>
  );
}

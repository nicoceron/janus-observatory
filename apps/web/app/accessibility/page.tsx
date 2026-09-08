import type { Metadata } from 'next';

import styles from '../components/InformationPages.module.css';
import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'Keyboard controls, motion preferences, WebGL fallbacks, structured equivalents, zoom behavior, and known accessibility limitations for Janus Observatory.',
  alternates: { canonical: '/accessibility' },
  openGraph: {
    title: 'Accessibility · Janus Observatory',
    description:
      'How every scientific argument remains available without animation, pointer input, color, or WebGL.',
    url: '/accessibility',
  },
};

export default function AccessibilityPage() {
  return (
    <InnerPage
      eyebrow="Accessibility · WCAG 2.2 AA target"
      lede="Controls, nonvisual equivalents, motion behavior, and current limitations."
      title="The argument does not depend on animation."
    >
      <section className={styles.section}>
        <h2>Story controls</h2>
        <div className={styles.sectionBody}>
          <ul>
            <li>
              Use “Read without animation” to read the complete story and source tables in document
              order.
            </li>
            <li>
              When a story section has focus, Arrow Up/Down or Page Up/Down moves between chapters.
              Previous and Next buttons offer the same navigation. Escape closes the Index.
            </li>
            <li>
              “Skip story” opens the Atlas. The Index opens direct navigation to every chapter.
            </li>
            <li>
              The Index’s “First light” returns to the beginning; Resume restores the last chapter
              in this session.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Reduced motion and WebGL</h2>
        <div className={styles.sectionBody}>
          <p>
            The global Motion control offers System, Reduced, and Full. Reduced motion stops smooth
            scrolling and nonessential transitions; named story states snap to their destination.
            The setting persists locally and never changes scientific content.
          </p>
          <p>
            If WebGL cannot start, admitted poster imagery remains behind the canvas while all
            narrative, controls, values, citations, and data tables stay available as semantic HTML.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Structured alternatives</h2>
        <div className={styles.sectionBody}>
          <p>
            The story stage exposes a concise live description. The Observatory’s “Open data view”
            control reveals the five-method result table. Scenario and instrument controls use
            native buttons with pressed state; meaning is never carried by color alone.
          </p>
          <div className={styles.tableScroller} tabIndex={0}>
            <table className={styles.accessTable}>
              <caption className="srOnly">
                Interactive surfaces and their structured equivalents
              </caption>
              <thead>
                <tr>
                  <th scope="col">Surface</th>
                  <th scope="col">Keyboard / touch control</th>
                  <th scope="col">Nonvisual equivalent</th>
                  <th scope="col">Share state</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Story</th>
                  <td>Native scroll, Start/Skip/Restart buttons, arrow-key step navigation</td>
                  <td>Article mode, live state description, scenario lists and source tables</td>
                  <td>Named chapter and handoff links</td>
                </tr>
                <tr>
                  <th scope="row">Observatory</th>
                  <td>Pressed-state scenario and instrument buttons</td>
                  <td>Categorical result prose and five-method table</td>
                  <td>scenario, instrument, and data-view query parameters</td>
                </tr>
                <tr>
                  <th scope="row">Atlas</th>
                  <td>Compare toggles, analytical-lens buttons, native table scrolling</td>
                  <td>Aligned tables, exact source locators, versioned JSON/CSV</td>
                  <td>compare and lens query parameters</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Zoom, focus, and overflow</h2>
        <div className={styles.sectionBody}>
          <p>
            Focus indicators remain visible against light and dark surfaces. Wide scientific tables
            sit in keyboard-focusable horizontal scrollers instead of shrinking text. At narrow
            widths, editorial rows reflow vertically and navigation remains horizontally reachable.
          </p>
        </div>
      </section>

      <aside className={styles.notice}>
        Automated checks supplement, but do not replace, manual VoiceOver, NVDA, zoom/reflow, touch,
        and keyboard testing. Those full manual passes remain launch-hardening work.
      </aside>
    </InnerPage>
  );
}

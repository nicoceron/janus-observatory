import type { Metadata } from 'next';

import styles from '../components/InformationPages.module.css';
import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'How to use Janus Observatory with a keyboard, a screen reader or less motion, and what we still need to improve.',
  alternates: { canonical: '/accessibility' },
  openGraph: {
    title: 'Accessibility · Janus Observatory',
    description: 'Everything in the story is available as text, without animation or 3D.',
    url: '/accessibility',
  },
};

export default function AccessibilityPage() {
  return (
    <InnerPage
      lede="How to use the site with a keyboard, a screen reader or less motion, and what we still need to improve."
      title="Built to be read, not just watched."
    >
      <section className={styles.section}>
        <h2>Moving through the story</h2>
        <div className={styles.sectionBody}>
          <ul>
            <li>Scroll as usual, or press the arrow and Page keys to move between chapters.</li>
            <li>Chapters, in the top bar, lists every part of the story. Escape closes it.</li>
            <li>
              Press Tab when the page opens to find Skip story. It goes straight to the Atlas: the
              same futures, without the animated journey.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Motion and 3D</h2>
        <div className={styles.sectionBody}>
          <p>
            The home-page story always animates, even if your device asks for less motion. Every
            other page follows your device setting, or the choice you make with the Motion control
            on this page.
          </p>
          <p>
            If 3D graphics can’t start on your device, the story shows its text, controls and tables
            instead. Nothing is lost.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Text versions of everything</h2>
        <div className={styles.sectionBody}>
          <p>
            Every chart and 3D view has a text or table version, and color is never the only way
            information is shown. Links remember what you picked, so you can share exactly what
            you’re looking at.
          </p>
          <div className={styles.tableScroller} tabIndex={0}>
            <table className={styles.accessTable}>
              <caption className="srOnly">Where to find the text version of each page</caption>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">How to control it</th>
                  <th scope="col">Text version</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Story</th>
                  <td>Scrolling, arrow keys and the Chapters list</td>
                  <td>Every chapter is text, and each chart has “Read the data table”</td>
                </tr>
                <tr>
                  <th scope="row">Observatory</th>
                  <td>A button for each future and each instrument</td>
                  <td>“Show as a table” lists every result</td>
                </tr>
                <tr>
                  <th scope="row">Atlas</th>
                  <td>Compare and measure buttons, and tables that scroll sideways</td>
                  <td>Every comparison is a table, and the data downloads as JSON or CSV</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Zoom and focus</h2>
        <div className={styles.sectionBody}>
          <p>
            Focus outlines stay visible on dark and light surfaces. Wide tables scroll sideways
            instead of shrinking their text, and pages reflow on narrow screens.
          </p>
        </div>
      </section>

      <aside className={styles.notice}>
        We test with automated tools and by keyboard, aiming for WCAG 2.2 AA. Full testing with
        screen readers such as VoiceOver and NVDA is still to come. If something gets in your way,
        tell <a href="https://dardo.studio/">Dardo</a>, who built the site.
      </aside>
    </InnerPage>
  );
}

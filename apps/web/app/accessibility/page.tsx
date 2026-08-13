import type { Metadata } from 'next';

import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = { title: 'Accessibility' };

export default function AccessibilityPage() {
  return (
    <InnerPage
      eyebrow="Accessibility · WCAG 2.2 AA target"
      lede="Controls, nonvisual equivalents, motion behavior, and current limitations."
      title="The argument does not depend on animation."
    >
      <section className="proseSection">
        <h2>Story controls</h2>
        <ul>
          <li>Use “Read without animation” to render all prose in document order.</li>
          <li>While the guided story is active, arrow keys move between complete story states.</li>
          <li>“Skip story” moves directly to the categorical Observatory.</li>
          <li>“Restart” returns to the playback choice without reloading the page.</li>
        </ul>
      </section>

      <section className="proseSection">
        <h2>Reduced motion and WebGL</h2>
        <p>
          The site honors the system reduced-motion preference: smooth scrolling and transitions
          stop, the Three.js globe renders on demand, and visual states snap to their destination.
          If WebGL cannot start, a CSS poster representation remains behind the canvas while all
          narrative and data content stays available as semantic HTML.
        </p>
      </section>

      <section className="proseSection">
        <h2>Structured alternatives</h2>
        <p>
          The story stage exposes a concise live description. The Observatory’s “Open structured
          data” control reveals atmosphere and five-method detection tables. Scenario and instrument
          controls use native buttons with pressed state; meaning is never carried by color alone.
        </p>
      </section>

      <aside className="pageNotice">
        Automated checks supplement, but do not replace, manual VoiceOver, NVDA, zoom/reflow, touch,
        and keyboard testing. Those full manual passes remain launch-hardening work.
      </aside>
    </InnerPage>
  );
}

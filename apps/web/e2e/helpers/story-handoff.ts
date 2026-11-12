import type { Page } from '@playwright/test';

/** Measure the spatial transition after the naturally flowing narrative has been read. */
export async function storyHandoff(page: Page, from: string, to: string) {
  return page.evaluate(
    ([from, to]) => {
      const positions = [from, to].map((id) => {
        const el = document.getElementById(id)!;
        const inset =
          innerWidth <= 760
            ? Math.max(0, parseFloat(getComputedStyle(el).paddingTop) - innerHeight * 0.72)
            : Math.max(0, (el.offsetHeight - innerHeight) / 2);
        return el.getBoundingClientRect().top + scrollY + inset;
      });
      const slot = document.querySelector<HTMLElement>(`#${from} [data-copy-slot]`)!;
      if (slot.dataset.copyLayout === 'flow') {
        // Sample the spatial handoff after the mobile paragraph's reading hold.
        positions[0] = Math.max(
          positions[0],
          Math.min(
            positions[1] - innerHeight * 0.25,
            slot.getBoundingClientRect().bottom + scrollY - innerHeight * 0.45,
          ),
        );
      }
      return positions;
    },
    [from, to],
  );
}

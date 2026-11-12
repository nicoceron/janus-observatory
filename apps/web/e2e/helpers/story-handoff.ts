import type { Page } from '@playwright/test';

/** Scroll positions where the scene starts to leave chapter `from` and where it rests at `to`.
 * A flow layout (a phone, a short viewport) holds the scene while the chapter's prose is read
 * (Decision 033), so there the handoff starts after that hold, not at the chapter's rest. */
export async function storyHandoff(page: Page, from: string, to: string) {
  return page.evaluate(
    ([from, to]) => {
      const [start, end] = [from, to].map((id) => {
        const el = document.getElementById(id)!;
        const inset =
          innerWidth <= 760
            ? Math.max(0, parseFloat(getComputedStyle(el).paddingTop) - innerHeight * 0.72)
            : Math.max(0, (el.offsetHeight - innerHeight) / 2);
        return el.getBoundingClientRect().top + scrollY + inset;
      });
      const slot = document.querySelector<HTMLElement>(`#${from} [data-copy-slot]`)!;
      if (slot.dataset.copyLayout !== 'flow') return [start, end];
      const read = slot.getBoundingClientRect().bottom + scrollY - innerHeight * 0.45;
      return [Math.max(start, Math.min(end - innerHeight * 0.25, read)), end];
    },
    [from, to],
  );
}

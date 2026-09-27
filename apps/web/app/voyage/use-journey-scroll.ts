'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { chapterCopyPose, sceneAtScroll, type FlightState } from './scroll';
import { chapters } from './worlds';
import { nearbyChapter } from './chapter-settle';

gsap.registerPlugin(ScrollToPlugin);

export function chapterPosition(el: HTMLElement, reading: boolean) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  if (!reading && window.innerWidth <= 760 && el.id === 'beyond') return top;
  if (!reading && window.innerWidth <= 760 && el.dataset.world)
    return (
      top + Math.max(0, parseFloat(getComputedStyle(el).paddingTop) - window.innerHeight * 0.72)
    );
  const inset =
    reading || el.dataset.layout === 'article'
      ? parseFloat(getComputedStyle(el).paddingTop) - (window.innerWidth <= 760 ? 96 : 118)
      : Math.max(0, (el.offsetHeight - window.innerHeight) / 2);
  return Math.max(0, top + inset);
}

/** One measured anchor map for buttons, links, deep links, history and native scroll. */
export function useJourneyScroll(reading: boolean) {
  const root = useRef<HTMLDivElement>(null);
  const flight = useRef<FlightState>({ progress: 0, active: true, pointerX: 0, pointerY: 0 });
  const [active, setActive] = useState(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(settleTimer.current);
    tween.current?.kill();
    tween.current = null;
    if (root.current) root.current.dataset.anchorTravel = 'idle';
  }, [root]);
  const jump = useCallback(
    (id: string, animate = true, history = true) => {
      const el = document.getElementById(id);
      if (!el || !chapters.some((chapter) => chapter.id === id)) return;
      cancel();
      const top = chapterPosition(el, reading);
      const finish = () => {
        cancel();
        el.focus({ preventScroll: true });
        if (history && location.hash !== '#' + id)
          window.history.pushState(window.history.state, '', '#' + id);
      };
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!animate || reading || reduce || Math.abs(top - scrollY) < 2) {
        window.scrollTo({ top, behavior: 'instant' });
        finish();
        return;
      }
      root.current!.dataset.anchorTravel = 'moving';
      tween.current = gsap.to(window, {
        scrollTo: { y: top, autoKill: true, onAutoKill: cancel },
        duration: Math.min(2.2, 0.85 + (Math.abs(top - scrollY) / window.innerHeight) * 0.09),
        ease: 'power2.inOut',
        onComplete: finish,
      });
    },
    [cancel, reading, root],
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const articles = Array.from(el.querySelectorAll<HTMLElement>('[data-chapter]'));
    const copies = articles.flatMap((article, chapter) => {
      const slot = article.querySelector<HTMLElement>('[data-copy-slot]');
      const copy = slot?.querySelector<HTMLElement>('[data-chapter-copy]');
      return slot && copy ? [{ slot, copy, chapter }] : [];
    });
    const closing = el.querySelector<HTMLElement>('[data-closing-portrait]');
    let portrait: { x: number; y: number; diameter: number } | undefined;
    let anchors: number[] = [],
      holdEnds: number[] = [],
      frame = 0,
      disposed = false;
    let nativeIntent = false,
      touching = false,
      departed: number | null = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const excluded = articles.flatMap((article, i) =>
      article.dataset.layout === 'article' ? [i] : [],
    );
    const settle = () => {
      clearTimeout(settleTimer.current);
      if (
        !nativeIntent ||
        touching ||
        tween.current ||
        reading ||
        reduced.matches ||
        document.hidden ||
        el.querySelector('[role="dialog"]')
      )
        return;
      nativeIntent = false;
      const index = nearbyChapter(scrollY, anchors, innerHeight, departed, excluded);
      if (index === null) return;
      el.dataset.anchorTravel = 'settling';
      tween.current = gsap.to(window, {
        scrollTo: { y: anchors[index], autoKill: true, onAutoKill: cancel },
        duration: 0.65 + (Math.abs(anchors[index] - scrollY) / innerHeight) * 0.4,
        ease: 'power3.out',
        onComplete: () => {
          departed = index;
          cancel();
        },
      });
    };
    const queueSettle = (delay = 260) => {
      clearTimeout(settleTimer.current);
      if (nativeIntent && !tween.current) settleTimer.current = setTimeout(settle, delay);
    };
    const trackDeparture = () => {
      if (departed !== null && Math.abs(scrollY - anchors[departed]) > innerHeight * 0.5)
        departed = null;
      const aligned = anchors.findIndex((anchor) => Math.abs(scrollY - anchor) <= 1);
      if (aligned >= 0) departed = aligned;
    };
    const update = () => {
      frame = 0;
      trackDeparture();
      const progress = sceneAtScroll(window.scrollY, anchors, holdEnds);
      flight.current.progress = progress;
      el.dataset.presentationProgress = progress.toFixed(3);
      copies.forEach(({ slot, copy, chapter }) => {
        if (slot.dataset.copyLayout !== 'staged') return;
        const pose = chapterCopyPose(progress, chapter);
        copy.style.setProperty('--copy-opacity', pose.opacity.toFixed(4));
        copy.style.setProperty('--copy-y', `${pose.y.toFixed(2)}px`);
        copy.style.setProperty('--copy-visibility', pose.opacity > 0.001 ? 'visible' : 'hidden');
        copy.inert = pose.opacity < 0.5;
      });
      if (portrait) {
        const canvas = el.querySelector('canvas')?.getBoundingClientRect();
        flight.current.closingPortrait = {
          ...portrait,
          x: portrait.x - (canvas?.left ?? 0),
          y: portrait.y - scrollY - (canvas?.top ?? 0),
        };
      }
      setActive(Math.round(flight.current.progress));
      window.dispatchEvent(new Event('janus:flight'));
    };
    const measure = () => {
      // Measure semantic slots only on layout changes, never during a scroll frame.
      const headerBottom =
        el.querySelector('[data-site-header]')?.getBoundingClientRect().bottom ?? 94;
      copies.forEach(({ slot, copy }) => {
        const rect = slot.getBoundingClientRect();
        copy.style.setProperty('--copy-left', `${rect.left}px`);
        copy.style.setProperty('--copy-width', `${rect.width}px`);
        const height = copy.offsetHeight;
        const staged =
          !reading &&
          !reduced.matches &&
          innerWidth > 760 &&
          height <= innerHeight - 2 * (headerBottom + 24);
        slot.dataset.copyLayout = staged ? 'staged' : 'flow';
        slot.style.height = staged ? `${height}px` : '';
        if (!staged) copy.inert = false;
      });
      anchors = articles.map((article) => chapterPosition(article, reading));
      holdEnds = [...anchors];
      copies.forEach(({ slot, chapter }) => {
        if (!reading && slot.dataset.copyLayout === 'flow') {
          holdEnds[chapter] = Math.max(
            anchors[chapter],
            Math.min(
              anchors[chapter + 1] - innerHeight * 0.25,
              slot.getBoundingClientRect().bottom + scrollY - innerHeight * 0.45,
            ),
          );
        }
      });
      if (closing) {
        const rect = closing.getBoundingClientRect();
        portrait = {
          x: rect.left + rect.width / 2,
          y: rect.top + scrollY + rect.height / 2,
          diameter: Math.min(rect.width, rect.height),
        };
      }
      update();
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      queueSettle();
    };
    const scrollEnd = () => queueSettle(120);
    const interact = (event: Event) => {
      cancel();
      trackDeparture();
      nativeIntent = !(event.target as Element | null)?.closest?.(
        '[role="dialog"],nav,button,input,select,textarea',
      );
      queueSettle();
    };
    const touchStart = (event: Event) => {
      touching = true;
      interact(event);
    };
    const touchEnd = () => {
      touching = false;
      queueSettle();
    };
    const pointer = () => {
      nativeIntent = false;
      cancel();
    };
    const visible = () => {
      flight.current.active = !document.hidden;
      if (document.hidden) {
        nativeIntent = false;
        touching = false;
        cancel();
      }
      window.dispatchEvent(new Event('janus:flight'));
    };
    const restore = () => {
      nativeIntent = false;
      const id = location.hash.slice(1);
      if (id) jump(id, false, false);
    };
    const historyRestore = () => {
      nativeIntent = false;
      jump(location.hash.slice(1) || 'first-light', false, false);
    };
    const key = (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(
          event.key,
        )
      )
        pointer();
    };
    const resized = () => {
      pointer();
      measure();
    };
    const intersection = new IntersectionObserver(() => scroll(), {
      rootMargin: '-40% 0px -40% 0px',
    });
    articles.forEach((article) => intersection.observe(article));
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    copies.forEach(({ copy }) => resize.observe(copy));
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('scrollend', scrollEnd);
    window.addEventListener('wheel', interact, { passive: true });
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchend', touchEnd, { passive: true });
    window.addEventListener('touchcancel', touchEnd, { passive: true });
    window.addEventListener('pointerdown', pointer, { passive: true });
    window.addEventListener('keydown', key, true);
    window.addEventListener('resize', resized);
    window.addEventListener('hashchange', historyRestore);
    window.addEventListener('popstate', historyRestore);
    window.visualViewport?.addEventListener('scroll', scroll);
    window.visualViewport?.addEventListener('resize', resized);
    document.addEventListener('visibilitychange', visible);
    reduced.addEventListener('change', resized);
    visible();
    measure();
    restore();
    const initialY = scrollY;
    document.fonts.ready.then(() => {
      if (!disposed) {
        measure();
        if (Math.abs(scrollY - initialY) < 2 && location.hash) restore();
      }
    });
    return () => {
      disposed = true;
      cancel();
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('scrollend', scrollEnd);
      window.removeEventListener('wheel', interact);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchcancel', touchEnd);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('resize', resized);
      window.removeEventListener('hashchange', historyRestore);
      window.removeEventListener('popstate', historyRestore);
      window.visualViewport?.removeEventListener('scroll', scroll);
      window.visualViewport?.removeEventListener('resize', resized);
      document.removeEventListener('visibilitychange', visible);
      reduced.removeEventListener('change', resized);
      copies.forEach(({ slot, copy }) => {
        delete slot.dataset.copyLayout;
        slot.style.height = '';
        copy.inert = false;
      });
    };
  }, [root, flight, reading, jump, cancel]);
  return { active, jump, root, flight };
}

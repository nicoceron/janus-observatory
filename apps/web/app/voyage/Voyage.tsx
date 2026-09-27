'use client';

import dynamic from 'next/dynamic';
import Link from '../components/AppLink';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { chapters } from './worlds';
import { useJourneyScroll } from './use-journey-scroll';
import type { SystemPortrait } from '../../lib/system-portrait';
import s from './voyage.module.css';
import { SiteHeader } from '../components/SiteHeader';
import { SpaceBackdrop } from './SpaceBackdrop';
import { ExploreContext } from './WorldExplore';
import { Inspector, type ViewAdjustment } from './Inspector';
import type { Inspection } from './inspection';

const Space = dynamic(() => import('./Space'), { ssr: false });

function spatialContextAvailable() {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function Voyage({ children, systems }: { children: ReactNode; systems: SystemPortrait[] }) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [view, setView] = useState<ViewAdjustment>({ yaw: 0, zoom: 1, reset: 0 });
  const inspectionTrigger = useRef<HTMLElement | null>(null);
  const closeInspector = useCallback(() => {
    setInspection(null);
    requestAnimationFrame(() => inspectionTrigger.current?.focus({ preventScroll: true }));
  }, []);
  const selectObject = useCallback((selection: string) => {
    setInspection((current) => (current ? { ...current, selection } : null));
    setView({ yaw: 0, zoom: 1, reset: 0 });
  }, []);
  const openInspector = useCallback((world: number, selection: string, trigger: HTMLElement) => {
    inspectionTrigger.current = trigger;
    setInspection({ world, selection });
    setView({ yaw: 0, zoom: 1, reset: 0 });
  }, []);
  const [ready, setReady] = useState(false);
  const [mount, setMount] = useState(false);
  const [failed, setFailed] = useState(false);
  const reading = failed;
  const { active, jump, root, flight } = useJourneyScroll(reading);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    setInspection(null);
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFailed(!spatialContextAvailable());
      setMount(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (reading || !root.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        '[data-intro]',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 1.15,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      );
    }, root);
    return () => context.revert();
  }, [reading, root]);
  return (
    <ExploreContext.Provider
      value={{
        available: ready && !reading && !failed,
        open: openInspector,
      }}
    >
      <div
        ref={root}
        className={`${s.experience} ${reading ? s.reading : ''} ${inspection ? s.exploring : ''}`}
        data-voyage
        data-active-chapter={chapters[active]?.id}
        data-mode={reading ? 'reading' : 'full'}
        onClick={(event) => {
          const link =
            event.target instanceof Element
              ? event.target.closest<HTMLAnchorElement>('a[data-voyage-jump],a[href^="#"]')
              : null;
          if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          const id = link.dataset.voyageJump ?? link.hash.slice(1);
          if (!chapters.some((chapter) => chapter.id === id)) return;
          event.preventDefault();
          jump(id, true);
        }}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest('button,a,input,select,textarea,summary')
          )
            return;
          const next = event.key === 'ArrowDown' || event.key === 'PageDown',
            prev = event.key === 'ArrowUp' || event.key === 'PageUp';
          if (next || prev) {
            event.preventDefault();
            jump(chapters[Math.max(0, Math.min(chapters.length - 1, active + (next ? 1 : -1)))].id);
          }
        }}
      >
        <SpaceBackdrop flight={flight} />
        <a href="#first-light" className="skipLink">
          Skip to story
        </a>
        <Link href="/atlas" className="skipLink skipLinkSecondary">
          Skip story
        </Link>
        <SiteHeader
          inert={!!inspection}
          activeChapter={active}
          onJump={jump}
          onRetry={
            failed
              ? () => {
                  setReady(false);
                  setFailed(!spatialContextAvailable());
                }
              : undefined
          }
        />
        <div
          className={`${s.stage} ${inspection ? s.inspecting : ''}`}
          data-stage-status={failed ? 'fallback' : ready ? 'ready' : 'loading'}
        >
          {mount && !reading && !failed && (
            <Space
              systems={systems}
              inspection={inspection}
              onSelect={selectObject}
              view={view}
              flight={flight}
              reduced={false}
              onReady={onReady}
              onFailure={onFailure}
            />
          )}
          {inspection && (
            <Inspector
              inspection={inspection}
              system={systems[inspection.world]}
              onSelect={selectObject}
              onClose={closeInspector}
              onView={setView}
              view={view}
            />
          )}
          <div className={s.shade} aria-hidden="true" />
          <div className={s.grain} />
        </div>
        <div className={s.content} inert={!!inspection}>
          {children}
        </div>
      </div>
    </ExploreContext.Provider>
  );
}

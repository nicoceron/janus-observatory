'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useReducedMotionPreference } from '../components/MotionPreference';
import { chapters } from './worlds';
import { sceneAtScroll, type FlightState } from './scroll';
import type { SystemPortrait } from '../../lib/system-portrait';
import s from './voyage.module.css';

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
  const root = useRef<HTMLDivElement>(null);
  const flight = useRef<FlightState>({ progress: 0, active: true, pointerX: 0, pointerY: 0 });
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [mount, setMount] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reading, setReading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const readingAnchor = useRef<string | null>(null);
  const reduced = useReducedMotionPreference();
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFailed(!spatialContextAvailable());
      setMount(true);
      try {
        setResume(sessionStorage.getItem('janus-first-light'));
      } catch {
        /* Session persistence is optional. */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!root.current) return;
    const articles = Array.from(root.current.querySelectorAll<HTMLElement>('[data-chapter]'));
    let anchors: number[] = [],
      frame = 0;
    const measure = () => {
      anchors = articles.map((el) => Math.max(0, chapterPosition(el, reading)));
      update();
    };
    const update = () => {
      frame = 0;
      flight.current.progress = sceneAtScroll(window.scrollY, anchors);
      const index = Math.round(flight.current.progress);
      setActive(index);
      if (index > 0)
        try {
          sessionStorage.setItem('janus-first-light', chapters[index].id);
        } catch {
          /* Optional storage. */
        }
      window.dispatchEvent(new Event('janus:flight'));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const visible = () => {
      flight.current.active = !document.hidden;
      window.dispatchEvent(new Event('janus:flight'));
    };
    const intersection = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) scroll();
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    articles.forEach((el) => intersection.observe(el));
    const resize = new ResizeObserver(measure);
    resize.observe(root.current);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', visible);
    if (readingAnchor.current) {
      const article = document.getElementById(readingAnchor.current);
      if (article) window.scrollTo({ top: chapterPosition(article, reading), behavior: 'instant' });
      readingAnchor.current = null;
    }
    visible();
    measure();
    return () => {
      cancelAnimationFrame(frame);
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [reading]);
  useEffect(() => {
    if (reduced || reading || !root.current) return;
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
  }, [reduced, reading]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        menuButton.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menu]);
  const jump = (id: string, smoothScroll = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    window.scrollTo({
      top: chapterPosition(el, reading),
      behavior: smoothScroll && !reduced ? 'smooth' : 'instant',
    });
    el.focus({ preventScroll: true });
    setMenu(false);
  };
  return (
    <div
      ref={root}
      className={`${s.experience} ${reading ? s.reading : ''}`}
      data-voyage
      data-active-chapter={chapters[active]?.id}
      data-mode={reading ? 'reading' : reduced ? 'reduced' : 'full'}
      onClick={(event) => {
        const link =
          event.target instanceof Element
            ? event.target.closest<HTMLAnchorElement>('a[data-voyage-jump]')
            : null;
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        jump(link.dataset.voyageJump!, true);
      }}
      onPointerMove={(event) => {
        flight.current.pointerX = event.clientX / window.innerWidth - 0.5;
        flight.current.pointerY = 0.5 - event.clientY / window.innerHeight;
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
      <a href="#first-light" className="skipLink">
        Skip to story
      </a>
      <Link href="/atlas" className="skipLink skipLinkSecondary">
        Skip story
      </Link>
      <header className={s.header}>
        <Link className={s.brand} href="/" aria-label="Janus Observatory home">
          <span className={s.brandSymbol} aria-hidden="true">
            ◑
          </span>
          <span>
            JANUS<span className={s.brandSub}>OBSERVATORY</span>
          </span>
        </Link>
        <nav className={s.navigation} aria-label="Primary navigation">
          <Link href="/atlas">
            The atlas <span>↗</span>
          </Link>
          <Link href="/observatory">
            Observatory <span>↗</span>
          </Link>
          <button
            ref={menuButton}
            aria-expanded={menu}
            aria-controls="chapter-menu"
            onClick={() => setMenu(!menu)}
          >
            Index <span>{menu ? '−' : '+'}</span>
          </button>
        </nav>
      </header>
      {menu && (
        <nav id="chapter-menu" className={s.menu} aria-label="Story index">
          {chapters.map((chapter, i) => (
            <button
              key={chapter.id}
              onClick={() => jump(chapter.id)}
              aria-current={i === active ? 'step' : undefined}
            >
              <span>{String(i).padStart(2, '0')}</span>
              {chapter.label}
              <span>↗</span>
            </button>
          ))}
          <Link href="/sources">Sources & credits ↗</Link>
        </nav>
      )}
      <div
        className={s.stage}
        aria-hidden="true"
        data-stage-status={failed ? 'fallback' : ready ? 'ready' : 'loading'}
      >
        <div className={`${s.poster} ${ready && !reading ? s.posterHidden : ''}`}>
          <Image
            src="/assets/planets/low-poly-origin-v3.webp"
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 70vw"
            preload
            quality={90}
          />
        </div>
        {mount && !reading && !failed && (
          <Space
            systems={systems}
            flight={flight}
            reduced={reduced}
            onReady={onReady}
            onFailure={onFailure}
          />
        )}
        <div className={s.shade} />
        <div className={s.grain} />
      </div>
      <div className={s.content}>{children}</div>
      <div className={s.controls} aria-label="Story controls">
        <div className={s.chapterProgress}>
          <span>{String(active).padStart(2, '0')}</span>
          <div>
            <i style={{ transform: `scaleX(${active / (chapters.length - 1)})` }} />
          </div>
          <span>{String(chapters.length - 1)}</span>
        </div>
        <span className={s.chapterName} aria-live="polite">
          {chapters[active]?.label}
        </span>
        <div className={s.controlActions}>
          {active === 0 && resume && <button onClick={() => jump(resume)}>Resume ↗</button>}
          <button
            onClick={() => {
              readingAnchor.current = chapters[active].id;
              setReady(false);
              setReading(!reading);
            }}
          >
            {reading ? 'Return to visual story' : 'Read without animation'}
          </button>
          {failed && !reading && (
            <button
              onClick={() => {
                setFailed(!spatialContextAvailable());
                setReady(false);
              }}
            >
              Retry 3D
            </button>
          )}
          <button
            aria-label="Previous chapter"
            disabled={active === 0}
            onClick={() => jump(chapters[active - 1].id)}
          >
            ↑
          </button>
          <button
            aria-label="Next chapter"
            disabled={active === 16}
            onClick={(e) => jump(chapters[active + 1].id, e.detail > 0)}
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}

function chapterPosition(el: HTMLElement, reading: boolean) {
  // Keep the mobile copy below the system portrait even when source links change its height.
  if (!reading && window.innerWidth <= 760 && el.dataset.world) {
    const inset = Number.parseFloat(getComputedStyle(el).paddingTop) - window.innerHeight * 0.49;
    return el.getBoundingClientRect().top + window.scrollY + Math.max(0, inset);
  }
  const inset =
    reading || el.dataset.layout === 'article'
      ? Number.parseFloat(getComputedStyle(el).paddingTop) - (window.innerWidth <= 760 ? 96 : 118)
      : Math.max(0, (el.offsetHeight - window.innerHeight) / 2);
  return el.getBoundingClientRect().top + window.scrollY + inset;
}

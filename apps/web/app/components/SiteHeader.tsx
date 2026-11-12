'use client';

import Link from './AppLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { chapters } from '../voyage/worlds';
import s from './SiteHeader.module.css';

type Props = {
  inert?: boolean;
  activeChapter?: number;
  /** Scenario names keyed by chapter id, shown beside each world in the chapter list. */
  chapterTitles?: Record<string, string>;
  onJump?: (id: string) => void;
  onRetry?: () => void;
};

const primary = [
  ['/', 'Story'],
  ['/atlas', 'Atlas'],
  ['/observatory', 'Observatory'],
] as const;

export function SiteHeader({
  inert = false,
  activeChapter,
  chapterTitles,
  onJump,
  onRetry,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return (
    <header className={s.header} ref={root} inert={inert} data-site-header>
      <Link
        aria-label="Janus Observatory home"
        className={s.brand}
        href="/"
        onClick={() => setOpen(false)}
      >
        <span className={s.symbol} aria-hidden="true" />
        <span className={s.wordmark}>Janus Observatory</span>
      </Link>
      <nav className={s.navigation} aria-label="Primary navigation">
        {primary.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'page' : undefined
            }
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
        <button
          ref={trigger}
          className={s.chaptersButton}
          aria-expanded={open}
          aria-controls="chapter-menu"
          onClick={() => setOpen(!open)}
        >
          Chapters
          <span className={s.chaptersIcon} data-open={open} aria-hidden="true" />
        </button>
      </nav>
      {open && (
        <nav id="chapter-menu" className={s.menu} aria-label="Story chapters">
          <ol>
            {chapters.map((chapter, i) => {
              const content = (
                <>
                  <span className={s.chapterNumber}>{String(i).padStart(2, '0')}</span>
                  <span className={s.chapterLabel}>{chapter.label}</span>
                  {chapterTitles?.[chapter.id] ? (
                    <span className={s.chapterTitle}>{chapterTitles[chapter.id]}</span>
                  ) : null}
                </>
              );
              return (
                <li key={chapter.id}>
                  {onJump ? (
                    <button
                      aria-current={i === activeChapter ? 'step' : undefined}
                      onClick={() => {
                        onJump(chapter.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </button>
                  ) : (
                    <Link href={`/#${chapter.id}`} onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
          <div className={s.menuFooter}>
            {onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  setOpen(false);
                }}
              >
                Retry 3D
              </button>
            )}
            <Link href="/sources" onClick={() => setOpen(false)}>
              Sources &amp; credits
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

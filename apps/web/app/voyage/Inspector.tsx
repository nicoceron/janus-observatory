'use client';
import { useEffect, useRef } from 'react';
import type { SystemPortrait } from '../../lib/system-portrait';
import { worlds } from './worlds';
import {
  objectSelections,
  selectionDescription,
  selectionName,
  systemSelections,
  type Inspection,
} from '../planets/explore';
import s from './voyage.module.css';
export type ViewAdjustment = { yaw: number; zoom: number; reset: number };
export function Inspector({
  inspection,
  system,
  onSelect,
  onClose,
  onView,
  view,
}: {
  inspection: Inspection;
  system: SystemPortrait;
  onSelect: (id: string) => void;
  onClose: () => void;
  onView: (view: ViewAdjustment) => void;
  view: ViewAdjustment;
}) {
  const dialog = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const { world, selection } = inspection,
    art = worlds[world];
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') ?? [],
      );
      const first = items[0],
        last = items.at(-1);
      if (!dialog.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
    };
  }, [onClose]);
  const objects = objectSelections(world);
  return (
    <div
      ref={dialog}
      className={s.inspector}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-title"
      aria-describedby="inspector-description"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className={s.inspectorHeader}>
        <div>
          <strong>
            {art.id} <i>·</i> {selectionName(selection)}
          </strong>
        </div>
        <button ref={close} onClick={onClose} aria-label="Close world explorer">
          Close <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className={s.inspectorTools} aria-label="Model view controls">
        <button
          aria-label="Rotate model left"
          onClick={() => onView({ ...view, yaw: view.yaw - 0.4 })}
        >
          ↶
        </button>
        <button
          aria-label="Rotate model right"
          onClick={() => onView({ ...view, yaw: view.yaw + 0.4 })}
        >
          ↷
        </button>
        <button
          aria-label="Zoom in"
          disabled={view.zoom >= 1.6}
          onClick={() => onView({ ...view, zoom: Math.min(1.6, view.zoom + 0.2) })}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          disabled={view.zoom <= 0.7}
          onClick={() => onView({ ...view, zoom: Math.max(0.7, view.zoom - 0.2) })}
        >
          −
        </button>
        <button onClick={() => onView({ yaw: 0, zoom: 1, reset: view.reset + 1 })}>
          Reset view
        </button>
      </div>
      <p className={s.inspectHint}>
        DRAG TO ROTATE <span>·</span> CLICK A LANDMARK TO INSPECT
      </p>
      <aside className={s.inspectorPanel}>
        <p className={s.inspectKicker}>
          {systemSelections(system).includes(selection) ? 'WORLD STUDY' : 'OBJECT STUDY'}{' '}
          <span>/{art.id}</span>
        </p>
        <h2 id="inspector-title">{selectionName(selection)}</h2>
        <p id="inspector-description" className={s.inspectDescription} aria-live="polite">
          {selectionDescription(world, selection, system)}
        </p>
        <nav className={s.inspectWorlds} aria-label="Select a world">
          {systemSelections(system).map((id) => (
            <button key={id} aria-pressed={id === selection} onClick={() => onSelect(id)}>
              {selectionName(id)}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </nav>
        {(selection === 'Earth' || objects.includes(selection)) && (
          <div className={s.inspectObjects}>
            <p>LANDMARKS</p>
            <div>
              {objects.map((id) => (
                <button key={id} aria-pressed={id === selection} onClick={() => onSelect(id)}>
                  {selectionName(id)}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className={s.inspectCredit}>
          Original interpretive low-poly artwork. Architecture, sizes and distances are
          illustrative; counts and extents follow published scenario values.
        </p>
        <a className={s.inspectSource} href={`/atlas/${art.id.toLowerCase()}`}>
          Read the scenario & sources ↗
        </a>
      </aside>
    </div>
  );
}

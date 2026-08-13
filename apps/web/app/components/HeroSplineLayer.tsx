'use client';

import { useEffect, useState } from 'react';

const sceneUrl = 'https://app.spline.design/file/f5454200-ebd6-49c9-9e41-ea232c88cb61?view=preview';

function supportsWebGl(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}

export function HeroSplineLayer() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !supportsWebGl()) return;

    let activated = false;
    let visible = true;
    const hero = document.getElementById('top');
    const enable = () => {
      activated = true;
      if (visible) setEnabled(true);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!activated) return;
        setEnabled(visible);
        if (!visible) setLoaded(false);
      },
      { rootMargin: '200px' },
    );

    if (hero) observer.observe(hero);

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(enable, { timeout: 1_200 });
      return () => {
        observer.disconnect();
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = setTimeout(enable, 600);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <iframe
      aria-hidden="true"
      className={`heroSpline${loaded ? ' heroSplineLoaded' : ''}`}
      onLoad={() => setLoaded(true)}
      referrerPolicy="strict-origin-when-cross-origin"
      src={sceneUrl}
      tabIndex={-1}
      title="Animated Solar System background"
    />
  );
}

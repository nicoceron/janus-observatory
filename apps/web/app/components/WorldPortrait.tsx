'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import styles from './WorldPortrait.module.css';
const PortraitCanvas = dynamic(() => import('./PortraitCanvas'), { ssr: false });
export function WorldPortrait({ world }: { world: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear((current) => current || entry.isIntersecting);
        setActive(entry.isIntersecting && !document.hidden);
      },
      { rootMargin: '80px' },
    );
    if (root.current) observer.observe(root.current);
    const visibility = () => {
      const rect = root.current?.getBoundingClientRect();
      setActive(!document.hidden && !!rect && rect.bottom > 0 && rect.top < innerHeight);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <div ref={root} className={styles.portrait} data-world-portrait={`S${world + 1}`}>
      <noscript>
        <p className={styles.fallback}>
          The 3D illustration needs JavaScript. The complete scenario record is available below.
        </p>
      </noscript>
      {near && !failed && (
        <PortraitCanvas world={world} active={active} onFailure={() => setFailed(true)} />
      )}
      <p className={failed ? styles.fallback : 'srOnly'}>
        {failed ? '3D view unavailable. ' : ''}Original illustrative model of scenario S{world + 1}.
        The scenario description and data remain available below.
      </p>
    </div>
  );
}

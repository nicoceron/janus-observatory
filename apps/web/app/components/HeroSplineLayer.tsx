'use client';

import { useEffect, useRef, useState } from 'react';

import { useReducedMotionPreference } from './MotionPreference';

const orbitingBodies = [
  { color: '#d7e8ff', cx: 522, cy: 328, radius: 5 },
  { color: '#c8dfd1', cx: 568, cy: 374, radius: 7 },
  { color: '#b8f15c', cx: 618, cy: 426, radius: 11 },
  { color: '#d29368', cx: 674, cy: 482, radius: 6 },
  { color: '#c6a56d', cx: 750, cy: 558, radius: 18 },
  { color: '#d5c49d', cx: 822, cy: 630, radius: 15 },
  { color: '#8bbfc4', cx: 878, cy: 686, radius: 9 },
  { color: '#7697c5', cx: 922, cy: 730, radius: 8 },
] as const;

export function HeroSplineLayer() {
  const rootRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    if (reducedMotion) return;
    const hero = document.getElementById('top');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '200px',
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !visible) return;

    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let animationFrame = 0;
    let disposeMotion: (() => void) | undefined;

    const updateScrollState = () => {
      animationFrame = 0;
      const hero = root.closest('.hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      root.style.setProperty('--hero-scroll-progress', progress.toFixed(4));
    };
    const requestScrollUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateScrollState);
    };

    const activate = async () => {
      try {
        const gsapModule = await import('gsap');
        if (cancelled) return;
        const gsap = gsapModule.gsap;
        const context = gsap.context(() => {
          gsap.set(root, { opacity: 1 });
          gsap.fromTo(
            root.querySelectorAll('.heroOrbitTrace'),
            { opacity: 0, strokeDashoffset: 1 },
            {
              duration: 1.8,
              ease: 'power3.out',
              opacity: 0.2,
              stagger: 0.11,
              strokeDashoffset: 0,
            },
          );
          gsap.to(root.querySelector('.heroOrbitAssembly'), {
            duration: 150,
            ease: 'none',
            repeat: -1,
            rotate: 360,
            transformOrigin: '618px 426px',
          });
          gsap.to(root.querySelectorAll('.heroOrbitBody'), {
            duration: 5.8,
            ease: 'sine.inOut',
            repeat: -1,
            stagger: { each: 0.42, from: 'center' },
            y: (index: number) => (index % 2 === 0 ? -5 : 5),
            yoyo: true,
          });
          gsap.fromTo(
            root.querySelector('.heroAcquisitionReticle'),
            { opacity: 0, rotate: -8, scale: 0.88 },
            {
              delay: 0.5,
              duration: 1.4,
              ease: 'power3.out',
              opacity: 0.68,
              rotate: 0,
              scale: 1,
              transformOrigin: '618px 426px',
            },
          );
        }, root);
        disposeMotion = () => context.revert();
        setReady(true);
      } catch {
        // The local poster remains the complete hero if the optional tween chunk is unavailable.
      }
    };

    updateScrollState();
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate);

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: 900 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
        window.removeEventListener('scroll', requestScrollUpdate);
        window.removeEventListener('resize', requestScrollUpdate);
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        disposeMotion?.();
      };
    }

    const timeoutId = setTimeout(activate, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', requestScrollUpdate);
      window.removeEventListener('resize', requestScrollUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      disposeMotion?.();
    };
  }, [reducedMotion, visible]);

  if (reducedMotion || !visible) return null;

  return (
    <svg
      aria-hidden="true"
      className={`heroSpline heroOrbitField${ready ? ' heroSplineLoaded' : ''}`}
      data-motion-source="native-svg-gsap"
      preserveAspectRatio="xMidYMid slice"
      ref={rootRef}
      role="presentation"
      viewBox="0 0 1000 1000"
    >
      <defs>
        <radialGradient id="janus-hero-signal" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#dfffb0" stopOpacity="0.92" />
          <stop offset="0.2" stopColor="#b8f15c" stopOpacity="0.34" />
          <stop offset="1" stopColor="#b8f15c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="heroOrbitAssembly" fill="none">
        {[82, 132, 190, 254, 330, 408].map((radius, index) => (
          <ellipse
            className="heroOrbitTrace"
            cx="618"
            cy="426"
            key={radius}
            opacity={0.12 + index * 0.018}
            rx={radius}
            ry={radius * 0.43}
            stroke={index === 2 ? '#b8f15c' : '#b7d1c2'}
            strokeDasharray={index % 2 === 0 ? '1' : '0.08 0.035'}
            strokeWidth={index === 2 ? 1.2 : 0.72}
            pathLength="1"
            transform={`rotate(${-34 + index * 7} 618 426)`}
          />
        ))}
      </g>

      <path
        className="heroTrajectory"
        d="M 346 762 C 470 642, 512 504, 618 426 C 716 354, 818 268, 966 184"
        pathLength="1"
      />

      <g className="heroOrbitBodies">
        {orbitingBodies.map((body, index) => (
          <g className="heroOrbitBody" key={`${body.cx}-${body.cy}`}>
            <circle
              cx={body.cx}
              cy={body.cy}
              fill={body.color}
              opacity={index === 2 ? 0.96 : 0.58}
              r={body.radius}
            />
            <circle
              cx={body.cx}
              cy={body.cy}
              fill="none"
              opacity={index === 2 ? 0.35 : 0.12}
              r={body.radius + 7}
              stroke={body.color}
              strokeWidth="0.8"
            />
          </g>
        ))}
      </g>

      <g className="heroAcquisitionReticle" fill="none" stroke="#dfffb0">
        <circle cx="618" cy="426" r="38" opacity="0.45" strokeWidth="0.8" />
        <circle cx="618" cy="426" r="23" opacity="0.22" strokeDasharray="3 5" />
        <path d="M 565 426 H 593 M 643 426 H 671 M 618 373 V 401 M 618 451 V 479" />
      </g>

      <g className="heroTelemetryMark" transform="translate(824 192)">
        <path d="M 0 12 H 72 M 60 0 L 72 12 L 60 24" />
        <text x="0" y="-9">
          EXTRASOLAR VIEW / 01
        </text>
      </g>
    </svg>
  );
}

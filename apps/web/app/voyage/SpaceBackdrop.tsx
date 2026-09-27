'use client';
import { useEffect, useId, useRef, type RefObject } from 'react';
import type { FlightState } from './scroll';
import { skyPose } from './sky-pose';
import s from './voyage.module.css';
/** Static SVG stars with compositor-only depth and reflected light. No extra canvas. */
export function SpaceBackdrop({ flight }: { flight?: RefObject<FlightState> }) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    if (!root.current || !flight) return;
    const el = root.current;
    const lights = el.querySelectorAll<HTMLElement>('[data-space-light]');
    const stars = el.querySelectorAll<SVGElement>('[data-space-stars]');
    const galaxy = el.querySelector<SVGElement>('[data-space-galaxy]');
    const state = { progress: flight.current.progress };
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const paint = () => {
      const pose = skyPose(media.matches ? 0 : state.progress);
      lights.forEach((light, i) => {
        light.style.opacity = pose.light[i].toFixed(4);
        light.style.transform = `translate3d(${pose.x * (i + 1)}%, ${pose.y}%, 0)`;
      });
      stars.forEach((layer, i) => {
        layer.style.transform = `translate3d(${i ? pose.nearX : pose.x}%, ${i ? pose.nearY : pose.y}%, 0) scale(${pose.scale})`;
      });
      if (galaxy) {
        galaxy.style.transform = `translate3d(${pose.x * 0.5}%, ${pose.y * 0.6}%, 0) rotate(${pose.galaxyAngle}deg)`;
        galaxy.style.opacity = String(pose.galaxyOpacity);
      }
      el.dataset.skyProgress = state.progress.toFixed(3);
    };
    const update = () => {
      state.progress = flight.current.progress;
      paint();
    };
    paint();
    window.addEventListener('janus:flight', update);
    media.addEventListener('change', update);
    return () => {
      window.removeEventListener('janus:flight', update);
      media.removeEventListener('change', update);
    };
  }, [flight]);
  const random = (n: number) => {
    // Integer multiplication is identical in Node, V8, SpiderMonkey and JavaScriptCore.
    let bits = (n + 842) | 0;
    bits = Math.imul(bits ^ (bits >>> 16), 0x21f0aaad);
    bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
    return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
  };
  return (
    <div ref={root} className={s.spaceBackdrop} data-space-backdrop aria-hidden="true">
      <div className={`${s.spaceLight} ${s.spaceBlue}`} data-space-light />
      <div className={`${s.spaceLight} ${s.spaceAmber}`} data-space-light />
      <div className={`${s.spaceLight} ${s.spaceViolet}`} data-space-light />
      <svg
        className={s.galacticBand}
        data-space-galaxy
        viewBox="0 0 1600 1100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`${id}-dust`}>
            <stop stopColor="#8a9bb7" stopOpacity=".28" />
            <stop offset=".36" stopColor="#586079" stopOpacity=".15" />
            <stop offset="1" stopColor="#222d46" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-rift`}>
            <stop stopColor="#000" stopOpacity=".95" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform="rotate(-32 1000 550)">
          {Array.from({ length: 24 }, (_, i) => (
            <ellipse
              key={i}
              cx={300 + i * 65}
              cy={545 + (random(i + 400) - 0.5) * 95}
              rx={130 + random(i + 500) * 110}
              ry={35 + random(i + 600) * 90}
              fill={`url(#${id}-dust)`}
            />
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse
              key={i}
              cx={360 + i * 100}
              cy={550 + Math.sin(i * 1.2) * 18}
              rx={90}
              ry={12 + random(i + 700) * 24}
              fill={`url(#${id}-rift)`}
            />
          ))}
        </g>
      </svg>
      {[0, 1].map((layer) => (
        <svg
          key={layer}
          data-space-stars
          viewBox="0 0 1600 1100"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id={`${id}-star-${layer}`}>
              <stop stopColor="#e5edff" stopOpacity=".5" />
              <stop offset=".18" stopColor="#a3bde0" stopOpacity=".2" />
              <stop offset="1" stopColor="#799bb9" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 180 }, (_, n) => {
            const i = n * 2 + layer;
            const clustered = n < 65;
            const u = random(i * 3) * 1750 - 650;
            const v = (random(i * 3 + 1) - 0.5) * 100;
            const x = clustered ? 1000 + u * 0.848 + v * 0.53 : random(i * 3) * 1600;
            const y = clustered ? 550 - u * 0.53 + v * 0.848 : random(i * 3 + 1) * 1100;
            return (
              <g key={i}>
                {i % 83 === 0 && (
                  <circle
                    cx={x.toFixed(2)}
                    cy={y.toFixed(2)}
                    r="10"
                    fill={`url(#${id}-star-${layer})`}
                  />
                )}
                <circle
                  cx={x.toFixed(2)}
                  cy={y.toFixed(2)}
                  r={i % 17 === 0 ? 1.35 : i % 5 === 0 ? 0.75 : 0.45}
                  fill={i % 11 === 0 ? '#f6e6cf' : '#e4e9f0'}
                  opacity={(0.12 + random(i * 3 + 2) * 0.43).toFixed(3)}
                />
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}

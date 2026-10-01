'use client';

import { useState } from 'react';
import s from './voyage.module.css';

export type ChartWorld = {
  id: string;
  title: string;
  population: number;
  energy: number;
  color: string;
  populationDisplay: string;
  energyDisplay: string;
};

export function CivilizationChart({ worlds }: { worlds: ChartWorld[] }) {
  const [selected, setSelected] = useState('S9');
  const world = worlds.find((w) => w.id === selected) ?? worlds[0];
  const minX = Math.floor(Math.log10(Math.min(...worlds.map((w) => w.population)))) - 1;
  const maxX = Math.ceil(Math.log10(Math.max(...worlds.map((w) => w.population))));
  const minY = Math.floor(Math.log10(Math.min(...worlds.map((w) => w.energy))));
  const maxY = Math.ceil(Math.log10(Math.max(...worlds.map((w) => w.energy)))) + 1;
  const x = (value: number) => 85 + ((Math.log10(value) - minX) / (maxX - minX)) * 680;
  const y = (value: number) => 370 - ((Math.log10(value) - minY) / (maxY - minY)) * 310;
  // Scenarios with identical reported values share one point and one label. The remaining
  // labels alternate above and below the diagonal so neighbours never overprint.
  const grouped = new Map<string, ChartWorld[]>();
  for (const w of worlds) {
    const key = `${w.population}|${w.energy}`;
    grouped.set(key, [...(grouped.get(key) ?? []), w]);
  }
  const points = [...grouped.values()].sort((a, b) => a[0].population - b[0].population);
  const labels = points.map((group, i) => {
    const [first] = group,
      last = i === points.length - 1,
      above = !last && i % 2 === 0;
    return {
      key: group.map((w) => w.id).join('-'),
      text: group.map((w) => w.id).join(' · '),
      color: first.color,
      active: group.some((w) => w.id === selected),
      x: x(first.population) + (last ? 16 : above ? -11 : 11),
      y: y(first.energy) + (last ? 4 : above ? -9 : 17),
      anchor: above ? ('end' as const) : ('start' as const),
    };
  });
  return (
    <div className={s.chart}>
      <div className={s.chartHeading}>
        <span>POPULATION × ANNUAL ENERGY USE</span>
        <span>LOGARITHMIC AXES</span>
      </div>
      <svg viewBox="0 0 850 440" role="img" aria-labelledby="chart-title chart-description">
        <title id="chart-title">Ten civilizations at very different scales</title>
        <desc id="chart-description">
          Published population and annual energy use, with logarithmic axes. Select a scenario below
          for exact values; an equivalent data table follows.
        </desc>
        {Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i).map((t) => (
          <g key={t}>
            <path d={`M85 ${y(10 ** t)}H780`} className={s.gridLine} />
            <text x="65" y={y(10 ** t) + 4} textAnchor="end">
              10
              <tspan dy="-5" fontSize="8">
                {t}
              </tspan>
            </text>
          </g>
        ))}
        {Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i).map((t) => (
          <g key={t}>
            <path d={`M${x(10 ** t)} 60V370`} className={s.gridLine} />
            <text x={x(10 ** t)} y="400" textAnchor="middle">
              10
              <tspan dy="-5" fontSize="8">
                {t}
              </tspan>
            </text>
          </g>
        ))}
        <text x="20" y="35">
          J / year
        </text>
        <text x="780" y="430" textAnchor="end">
          Population
        </text>
        <path d={`M85 ${y(world.energy)}H${x(world.population)}V370`} className={s.crosshair} />
        {worlds.map((w) => (
          <g key={w.id} opacity={w.id === selected ? 1 : 0.7}>
            <circle
              cx={x(w.population)}
              cy={y(w.energy)}
              r={w.id === selected ? 12 : 5}
              fill={w.color}
              fillOpacity={w.id === selected ? 0.13 : 0.8}
              stroke={w.color}
            />
            <circle
              cx={x(w.population)}
              cy={y(w.energy)}
              r={w.id === selected ? 4 : 2}
              fill={w.color}
            />
            <circle
              cx={x(w.population)}
              cy={y(w.energy)}
              r="16"
              fill="transparent"
              onMouseEnter={() => setSelected(w.id)}
            >
              <title>{`${w.id}: ${w.title}. Population ${w.populationDisplay}. Annual energy ${w.energyDisplay} J.`}</title>
            </circle>
          </g>
        ))}
        {labels.map((label) => (
          <text
            key={label.key}
            x={label.x}
            y={label.y}
            fill={label.color}
            opacity={label.active ? 1 : 0.8}
            textAnchor={label.anchor}
            aria-hidden="true"
          >
            {label.text}
          </text>
        ))}
      </svg>
      <div className={s.chartSelector} role="group" aria-label="Inspect a civilization">
        {worlds.map((w) => (
          <button key={w.id} aria-pressed={selected === w.id} onClick={() => setSelected(w.id)}>
            {w.id}
          </button>
        ))}
      </div>
      <div className={s.chartReadout} aria-live="polite">
        <strong>
          {world.id} / {world.title}
        </strong>
        <span>
          {world.populationDisplay}
          <small>Population</small>
        </span>
        <span>
          {world.energyDisplay} J<small>Annual energy use</small>
        </span>
      </div>
      <details className={s.dataDetails}>
        <summary>Read the data table</summary>
        <div className={s.tableScroll}>
          <table>
            <caption>Published scenario population and annual energy use</caption>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">Population</th>
                <th scope="col">Energy / year (J)</th>
              </tr>
            </thead>
            <tbody>
              {worlds.map((w) => (
                <tr key={w.id}>
                  <th scope="row">
                    {w.id} · {w.title}
                  </th>
                  <td>{w.population.toLocaleString('en')}</td>
                  <td>{w.energy.toExponential()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export type SignalWorld = {
  id: string;
  title: string;
  signals: {
    id: string;
    short: string;
    status: string;
    label: string;
    features: string[];
    href: string;
    source: string;
  }[];
};
export function SignalMatrix({ worlds }: { worlds: SignalWorld[] }) {
  const [selected, setSelected] = useState('S9');
  const world = worlds.find((w) => w.id === selected) ?? worlds[0];
  return (
    <div className={s.signalPanel}>
      <div className={s.matrixLegend}>
        <span>◉ Signature reported</span>
        <span>— No signature reported by this method</span>
      </div>
      <div className={s.tableScroll}>
        <table className={s.matrix}>
          <caption className="srOnly">
            Published observing strategies. Empty outcomes are method-specific, never proof of no
            technology.
          </caption>
          <thead>
            <tr>
              <th scope="col">WORLD</th>
              {world.signals.map((m) => (
                <th scope="col" key={m.id}>
                  <abbr title={m.label}>{m.short}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worlds.map((w) => (
              <tr key={w.id} data-selected={w.id === selected}>
                <th scope="row">
                  <button aria-pressed={w.id === selected} onClick={() => setSelected(w.id)}>
                    {w.id}
                    <span>{w.title}</span>
                  </button>
                </th>
                {w.signals.map((m) => (
                  <td key={m.id}>
                    <a
                      href={m.href}
                      aria-label={`${w.id}, ${m.label}: ${m.status.replaceAll('_', ' ')}. ${m.features.join('; ')}. ${m.source}`}
                      title={
                        m.features.length ? m.features.join(' · ') : m.status.replaceAll('_', ' ')
                      }
                    >
                      {m.features.length ? (
                        <span className={s.detected}>◉</span>
                      ) : (
                        <span className={s.undetected}>—</span>
                      )}
                    </a>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.signalReadout} aria-live="polite">
        <p>
          {world.id} / {world.title}
        </p>
        {world.signals.map((m) => (
          <div key={m.id}>
            <strong>{m.short}</strong>
            <span>
              {m.features.length ? m.features.join(' · ') : m.status.replaceAll('_', ' ')}
            </span>
          </div>
        ))}
      </div>
      <p className={s.finePrint}>
        Published categorical results under the paper’s instrument assumptions. The symbols are not
        detection probabilities.{' '}
        <a href={`/observatory?scenario=${world.id}&instrument=habitable_worlds_observatory`}>
          Inspect assumptions and evidence ↗
        </a>
      </p>
    </div>
  );
}

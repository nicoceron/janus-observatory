'use client';

import { useMemo, useState } from 'react';

import styles from './SourceLedger.module.css';

export type LedgerKind = 'paper' | 'dataset' | 'linked resource' | 'artifact' | 'asset';

export type LedgerEntry = {
  id: string;
  title: string;
  subtitle: string;
  kind: LedgerKind;
  version: string;
  rights: string;
  licenseHref?: string;
  use: string;
  locator?: string;
  href: string;
  telemetryId: string;
  sourceAgency?: string;
  retrievedAt?: string;
  displaySize?: string;
  modifications?: string[];
};

export type LedgerFilter = 'all' | 'scholarship' | 'data' | 'artifacts' | 'assets';

const filters: Array<{ id: LedgerFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'scholarship', label: 'Papers' },
  { id: 'data', label: 'Data and code' },
  { id: 'artifacts', label: 'Fiction' },
  { id: 'assets', label: 'Artwork and media' },
];

const kindLabels: Record<LedgerKind, string> = {
  paper: 'Paper',
  dataset: 'Dataset',
  'linked resource': 'Linked resource',
  artifact: 'Fiction',
  asset: 'Artwork and media',
};

function matchesFilter(kind: LedgerKind, filter: LedgerFilter) {
  if (filter === 'all') return true;
  if (filter === 'scholarship') return kind === 'paper';
  if (filter === 'data') return kind === 'dataset' || kind === 'linked resource';
  if (filter === 'artifacts') return kind === 'artifact';
  return kind === 'asset';
}

export function filterLedgerEntries(entries: LedgerEntry[], filter: LedgerFilter, query: string) {
  const normalized = query.trim().toLocaleLowerCase('en');
  return entries.filter((entry) => {
    if (!matchesFilter(entry.kind, filter)) return false;
    if (!normalized) return true;
    return [
      entry.id,
      entry.title,
      entry.subtitle,
      entry.version,
      entry.rights,
      entry.use,
      entry.locator ?? '',
      entry.sourceAgency ?? '',
      entry.retrievedAt ?? '',
      entry.displaySize ?? '',
      ...(entry.modifications ?? []),
    ]
      .join(' ')
      .toLocaleLowerCase('en')
      .includes(normalized);
  });
}

export function SourceLedger({ entries }: { entries: LedgerEntry[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const visibleEntries = useMemo(
    () => filterLedgerEntries(entries, filter, query),
    [entries, filter, query],
  );

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          Search sources
          <input
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Title, creator, license…"
            type="search"
            value={query}
          />
        </label>
        <div className={styles.filters} role="group" aria-label="Source type">
          {filters.map((option) => (
            <button
              aria-pressed={filter === option.id}
              key={option.id}
              onClick={() => setFilter(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.resultCount} aria-live="polite">
        Showing {visibleEntries.length} of {entries.length}
      </p>
      {visibleEntries.length > 0 ? (
        <ol className={styles.ledger}>
          {visibleEntries.map((entry, index) => (
            <li className={styles.entry} id={entry.id} key={entry.id}>
              <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.entryIdentity}>
                <span className={styles.kind}>{kindLabels[entry.kind]}</span>
                <h3>{entry.title}</h3>
                <p>{entry.subtitle}</p>
              </div>
              <dl className={styles.entryMeta}>
                <div>
                  <dt>Version</dt>
                  <dd>{entry.version}</dd>
                </div>
                <div>
                  <dt>License</dt>
                  <dd>
                    {entry.rights}
                    {entry.licenseHref ? (
                      <>
                        {' · '}
                        <a href={entry.licenseHref} rel="noreferrer" target="_blank">
                          Terms ↗
                        </a>
                      </>
                    ) : null}
                  </dd>
                </div>
              </dl>
              <div className={styles.provenance}>
                <p className={styles.locator}>
                  {entry.locator ?? entry.use}
                  <br />
                  {entry.locator ? entry.use : null}
                </p>
                {entry.sourceAgency || entry.retrievedAt || entry.modifications ? (
                  <details>
                    <summary>Where it came from</summary>
                    <dl>
                      {entry.sourceAgency ? (
                        <div>
                          <dt>From</dt>
                          <dd>{entry.sourceAgency}</dd>
                        </div>
                      ) : null}
                      {entry.retrievedAt ? (
                        <div>
                          <dt>Downloaded</dt>
                          <dd>{entry.retrievedAt}</dd>
                        </div>
                      ) : null}
                      {entry.displaySize ? (
                        <div>
                          <dt>Largest size shown</dt>
                          <dd>{entry.displaySize}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {entry.modifications && entry.modifications.length > 0 ? (
                      <ol>
                        {entry.modifications.map((modification) => (
                          <li key={modification}>{modification}</li>
                        ))}
                      </ol>
                    ) : (
                      <p>Not modified.</p>
                    )}
                  </details>
                ) : null}
              </div>
              <a
                data-telemetry-event="source_link"
                data-telemetry-value={entry.telemetryId}
                href={entry.href}
                rel="noreferrer"
                target="_blank"
              >
                Open ↗
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>Nothing matches. Try another word or filter.</p>
      )}
    </div>
  );
}

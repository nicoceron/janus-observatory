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
  { id: 'all', label: 'All records' },
  { id: 'scholarship', label: 'Papers' },
  { id: 'data', label: 'Data + code' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'assets', label: 'Production assets' },
];

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
          Search the evidence and rights ledger
          <input
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Title, evidence ID, creator, version…"
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
        {visibleEntries.length} of {entries.length} records shown
      </p>
      {visibleEntries.length > 0 ? (
        <ol className={styles.ledger}>
          {visibleEntries.map((entry, index) => (
            <li className={styles.entry} id={entry.id} key={entry.id}>
              <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.entryIdentity}>
                <span className={styles.kind}>{entry.kind}</span>
                <h3>{entry.title}</h3>
                <p>{entry.subtitle}</p>
              </div>
              <dl className={styles.entryMeta}>
                <div>
                  <dt>Version</dt>
                  <dd>{entry.version}</dd>
                </div>
                <div>
                  <dt>Rights</dt>
                  <dd>
                    {entry.rights}
                    {entry.licenseHref ? (
                      <>
                        {' · '}
                        <a href={entry.licenseHref} rel="noreferrer" target="_blank">
                          License terms ↗
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
                    <summary>Provenance + modifications</summary>
                    <dl>
                      {entry.sourceAgency ? (
                        <div>
                          <dt>Source agency</dt>
                          <dd>{entry.sourceAgency}</dd>
                        </div>
                      ) : null}
                      {entry.retrievedAt ? (
                        <div>
                          <dt>Retrieved</dt>
                          <dd>{entry.retrievedAt}</dd>
                        </div>
                      ) : null}
                      {entry.displaySize ? (
                        <div>
                          <dt>Maximum display size</dt>
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
                      <p>No local derivative; no modification history applies.</p>
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
                Open source ↗
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>No admitted record matches this search and filter.</p>
      )}
    </div>
  );
}

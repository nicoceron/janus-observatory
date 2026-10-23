import type { Metadata } from 'next';
import { AssetLedgerSchema } from '@janus/domain/asset';

import assetLedger from '../../../../data/assets/ledger.json';
import sourceCatalog from '../../../../data/sources/catalog.json';
import styles from '../components/InformationPages.module.css';
import { InnerPage } from '../components/InnerPage';
import { canonicalDatasetEntries } from './dataset-entries';
import { SourceLedger, type LedgerEntry } from './SourceLedger';

export const metadata: Metadata = {
  title: 'Sources',
  description:
    'The papers, data, artwork and fonts behind Janus Observatory, with versions, licenses and links.',
  alternates: { canonical: '/sources' },
  openGraph: {
    title: 'Sources · Janus Observatory',
    description: 'Every paper, dataset, artwork and font behind Janus Observatory, with credits.',
    url: '/sources',
  },
};

const paperSourceIds = [
  'JANUS-PAPER-01',
  'JANUS-PAPER-02',
  'JANUS-PAPER-03',
  'JANUS-PAPER-04',
  'JANUS-PAPER-05',
] as const;
const parsedAssetLedger = AssetLedgerSchema.parse(assetLedger);

/** Rights as a visitor would say them; the ledger keeps its own exact wording. */
function readableRights(value: string) {
  if (value === 'metadata_missing') return 'No license stated';
  if (value === 'all_rights_reserved') return 'All rights reserved';
  if (value === 'Creative Commons Attribution 4.0 International') return 'CC BY 4.0';
  if (/^(Project|Original project)/.test(value)) return 'Original to Janus Observatory';
  return value;
}

const linkOnlyNote = 'Linked only. No license is stated, so we don’t copy it.';

const paperEntries: LedgerEntry[] = sourceCatalog.papers.map((paper, index) => ({
  id: `source-${paperSourceIds[index]}`,
  title: paper.title,
  subtitle: paper.creators.join(', '),
  kind: 'paper',
  version: paper.version,
  rights: paper.license,
  licenseHref: paper.licenseUrl,
  use: '',
  locator: `DOI ${paper.doi}`,
  href: paper.canonicalUrl,
  telemetryId: paperSourceIds[index],
}));

const linkedEntries: LedgerEntry[] = sourceCatalog.linkedResources.map((resource) => ({
  id: `linked-${resource.id}`,
  title: resource.title,
  subtitle: resource.creators.join(', '),
  kind: 'linked resource',
  version: resource.version,
  rights: readableRights(resource.license ?? resource.rightsStatus),
  use: linkOnlyNote,
  href: resource.canonicalUrl,
  telemetryId: resource.id === 'janus.code.technocycles' ? 'JANUS-CODE-01' : 'JANUS-DATA-02',
}));

const zenodoEntry: LedgerEntry = {
  id: 'linked-JANUS-DATA-01',
  title: 'Project Janus worldbuilding pipelines',
  subtitle: `${sourceCatalog.zenodoCollection.files.length} scenario documents on Zenodo`,
  kind: 'linked resource',
  version: sourceCatalog.zenodoCollection.version,
  rights: readableRights(sourceCatalog.zenodoCollection.rightsStatus),
  use: linkOnlyNote,
  href: sourceCatalog.zenodoCollection.canonicalUrl,
  telemetryId: 'JANUS-DATA-01',
};

const assetEntries: LedgerEntry[] = parsedAssetLedger.entries.map((asset) => ({
  id: `asset-${asset.id}`,
  title: asset.title,
  subtitle: `${asset.creator}${asset.scenarioId ? ` · ${asset.scenarioId}` : ''}`,
  kind: asset.kind === 'artifact' ? 'artifact' : 'asset',
  version: asset.sourceVersion,
  rights: readableRights(asset.license ?? asset.rightsStatus),
  licenseHref: asset.licenseUrl,
  use: asset.requiredCreditText,
  locator: asset.derivativePublicPath
    ? 'A modified copy is stored on this site'
    : 'Linked, not copied to this site',
  href: asset.directFileUrls[0] ?? asset.sourceUrl,
  telemetryId: asset.id,
  sourceAgency: asset.sourceAgency,
  retrievedAt: asset.retrievedAt,
  displaySize: asset.maxDisplaySize
    ? `${asset.maxDisplaySize.widthPx} × ${asset.maxDisplaySize.heightPx} px`
    : undefined,
  modifications: asset.transformations,
}));

const ledgerEntries = [
  ...paperEntries,
  ...canonicalDatasetEntries,
  ...linkedEntries,
  zenodoEntry,
  ...assetEntries,
];

export default function SourcesPage() {
  return (
    <InnerPage
      lede="The papers, data, artwork and fonts behind this site, with versions, licenses and links."
      title="Every claim has an address."
    >
      <section className={styles.section}>
        <h2>Linked, not copied</h2>
        <div className={styles.sectionBody}>
          <p>
            The ten worldbuilding documents behind the scenarios are published on{' '}
            <a href={sourceCatalog.zenodoCollection.canonicalUrl} rel="noreferrer" target="_blank">
              Zenodo
            </a>{' '}
            without a stated license, so we cite and link them but don’t reproduce them. The same
            goes for the authors’ collapse-model code and its summary data.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Credits</h2>
        <div className={styles.sectionBody}>
          <p>
            Designed and built by <a href="https://dardo.studio/">Dardo</a>, an independent creative
            studio in Bogotá. Janus Observatory is an independent project. It isn’t commissioned or
            endorsed by the Project Janus researchers or by NASA.
          </p>
          <p>
            The worlds, settlements, observer and telescope are original low-poly artwork made with
            Three.js and Blender, with code assistance from OpenAI Codex and Anthropic Claude.
            They’re illustrations, not NASA imagery or Project Janus research material.
          </p>
          <p>
            Earlier versions used planet maps from Solar System Scope / INOVE (CC BY 4.0, based on
            NASA imagery and elevation data), and they stay credited below. Atmosphere and
            instrument results come from the papers’ tables, never from screenshots of their charts.
          </p>
          <p>
            Type: <a href="/licenses/newsreader-OFL.txt">Newsreader</a> by Production Type and{' '}
            <a href="/licenses/hanken-grotesk-OFL.txt">Hanken Grotesk</a>, both under the SIL Open
            Font License 1.1 and served from this site.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ledger-title">
        <h2 id="ledger-title">Search every source</h2>
        <div className={styles.sectionBody}>
          <SourceLedger entries={ledgerEntries} />
        </div>
      </section>
    </InnerPage>
  );
}

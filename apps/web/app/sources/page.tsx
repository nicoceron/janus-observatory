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
    'Searchable scholarly, canonical-data, linked-resource, artifact-rights, and production-asset ledger for Janus Observatory.',
  alternates: { canonical: '/sources' },
  openGraph: {
    title: 'Sources · Janus Observatory',
    description:
      'Exact versions, locators, reuse policies, checksums, credits, and rights boundaries behind Janus Observatory.',
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

const paperEntries: LedgerEntry[] = sourceCatalog.papers.map((paper, index) => ({
  id: `source-${paperSourceIds[index]}`,
  title: paper.title,
  subtitle: paper.creators.join(', '),
  kind: 'paper',
  version: paper.version,
  rights: paper.license,
  licenseHref: paper.licenseUrl,
  use: paper.reusePolicy,
  locator: `${paperSourceIds[index]} · ${paper.doi}`,
  href: paper.canonicalUrl,
  telemetryId: paperSourceIds[index],
}));

const linkedEntries: LedgerEntry[] = sourceCatalog.linkedResources.map((resource) => ({
  id: `linked-${resource.id}`,
  title: resource.title,
  subtitle: resource.creators.join(', '),
  kind: 'linked resource',
  version: resource.version,
  rights: resource.license ?? resource.rightsStatus,
  use: resource.reusePolicy,
  locator: resource.id,
  href: resource.canonicalUrl,
  telemetryId: resource.id === 'janus.code.technocycles' ? 'JANUS-CODE-01' : 'JANUS-DATA-02',
}));

const zenodoEntry: LedgerEntry = {
  id: 'linked-JANUS-DATA-01',
  title: 'Project Janus worldbuilding pipelines',
  subtitle: `${sourceCatalog.zenodoCollection.files.length} scenario PDFs · Zenodo record 11174443`,
  kind: 'linked resource',
  version: sourceCatalog.zenodoCollection.version,
  rights: sourceCatalog.zenodoCollection.rightsStatus,
  use: sourceCatalog.zenodoCollection.reusePolicy,
  locator: 'JANUS-DATA-01 · license metadata blank',
  href: sourceCatalog.zenodoCollection.canonicalUrl,
  telemetryId: 'JANUS-DATA-01',
};

const assetEntries: LedgerEntry[] = parsedAssetLedger.entries.map((asset) => ({
  id: `asset-${asset.id}`,
  title: asset.title,
  subtitle: `${asset.creator}${asset.scenarioId ? ` · ${asset.scenarioId}` : ''}`,
  kind: asset.kind === 'artifact' ? 'artifact' : 'asset',
  version: asset.sourceVersion,
  rights: asset.license ?? asset.rightsStatus,
  licenseHref: asset.licenseUrl,
  use: asset.requiredCreditText,
  locator: asset.derivativePublicPath
    ? `Public derivative ${asset.derivativePublicPath} · ${asset.derivativeChecksum ?? 'checksum pending'}`
    : asset.admissionStatus === 'link_only'
      ? 'Link only · no local source or derivative checksum'
      : `${asset.admissionStatus.replaceAll('_', ' ')} · no public derivative bundled`,
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
      eyebrow="Source ledger · evidence cutoff 2026-08-12"
      lede="Search every scholarly record, exact canonical-data locator, link-only resource, creative artifact, and admitted production asset."
      title="Every claim has an address."
    >
      <section className={styles.section}>
        <h2>Rights before rendering</h2>
        <div className={styles.sectionBody}>
          <p>
            Zenodo record 11174443 contains all ten worldbuilding pipelines. Its license metadata is
            blank in the audited record. The site may link and cite it, but does not bundle or
            substantially reproduce those PDFs until reuse rights are clarified. The public
            technocycles repository and aggregate CSV follow the same link-only rule while their
            license remains undeclared.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Credits and interpretation</h2>
        <div className={styles.sectionBody}>
          <p>
            The story, atlas and observatory share original low-poly Three.js geometry and
            Blender-authored world details. Their surfaces, settlements, observer and telescope are
            illustrative artwork, created with code assistance from OpenAI Codex. They are not NASA
            mission renders or Project Janus research artifacts. No raster planet textures or
            generated posters are used by these current 3D views.
          </p>
          <p>
            Historical texture and poster assets retain their credits and rights records in the
            ledger below. Solar System Scope / INOVE reference maps are licensed CC BY 4.0 and based
            on NASA imagery and elevation data. Atmospheric fingerprints and instrument results use
            the canonical Table 1 and structured Figure 6 transcriptions, never screenshots or
            digitized plot pixels.
          </p>
          <p>
            Typography: <a href="/licenses/chakra-petch-OFL.txt">Chakra Petch</a>,{' '}
            <a href="/licenses/space-grotesk-OFL.txt">Space Grotesk</a> and{' '}
            <a href="/licenses/ibm-plex-mono-OFL.txt">IBM Plex Mono</a>, licensed under the SIL Open
            Font License 1.1 and served locally.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ledger-title">
        <h2 id="ledger-title">Search the admitted ledger</h2>
        <div className={styles.sectionBody}>
          <SourceLedger entries={ledgerEntries} />
        </div>
      </section>
    </InnerPage>
  );
}

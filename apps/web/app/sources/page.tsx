import type { Metadata } from 'next';

import sourceCatalog from '../../../../data/sources/catalog.json';
import assetLedger from '../../../../data/assets/ledger.json';
import { InnerPage } from '../components/InnerPage';

export const metadata: Metadata = { title: 'Sources' };

export default function SourcesPage() {
  return (
    <InnerPage
      eyebrow="Source ledger · evidence cutoff 2026-08-12"
      lede="The scholarly records currently admitted to the canonical scientific pipeline."
      title="Every claim has an address."
    >
      <section className="proseSection">
        <h2>Core scholarly sources</h2>
        <div className="sourceCards">
          {sourceCatalog.papers.map((paper) => (
            <article className="sourceCard" key={paper.id}>
              <span>{paper.version}</span>
              <h3>{paper.title}</h3>
              <p>{paper.creators.join(', ')}</p>
              <dl>
                <div>
                  <dt>Evidence ID</dt>
                  <dd>{paper.id}</dd>
                </div>
                <div>
                  <dt>Rights</dt>
                  <dd>{paper.license}</dd>
                </div>
                <div>
                  <dt>Use</dt>
                  <dd>{paper.reusePolicy}</dd>
                </div>
              </dl>
              <a href={paper.canonicalUrl} rel="noreferrer" target="_blank">
                Open canonical record ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="proseSection">
        <h2>Scenario worldbuilding PDFs</h2>
        <p>
          Zenodo record 11174443 contains all ten worldbuilding pipelines. Its license metadata is
          blank in the audited record. The site may link and cite it, but does not bundle or
          substantially reproduce those PDFs until reuse rights are clarified.
        </p>
        <a
          className="inlineAction"
          href={sourceCatalog.zenodoCollection.canonicalUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open Zenodo record ↗
        </a>
      </section>

      <section className="proseSection">
        <h2>Credits and agency assets</h2>
        <p>
          The hero progressively enhances an AI-enhanced poster with Caner Sevince&apos;s animated
          CC0 Spline scene, “Solar System – Basic.” The spatial globe uses an optimized derivative
          of the admitted NASA Earth texture. Scenario surfaces and orbital structures are original
          interpretive geometry. The animated observer combines Ndevisuals&apos; “Cute Alien
          Character” under CC BY 4.0 with Usman Ahmed Gill&apos;s “Telescope” under the Fab Standard
          License. Janus Observatory adds the Blender performance rig, telescope-viewing animation,
          staging, and web optimization. It is not a NASA mission render or a Project Janus research
          artifact.
        </p>
        <div className="sourceCards">
          {assetLedger.entries
            .filter(({ derivativePublicPath }) => Boolean(derivativePublicPath))
            .map((asset) => (
              <article className="sourceCard" key={asset.id}>
                <span>{asset.sourceVersion}</span>
                <h3>{asset.title}</h3>
                <p>{asset.requiredCreditText}</p>
                <dl>
                  <div>
                    <dt>Rights</dt>
                    <dd>{asset.license}</dd>
                  </div>
                  <div>
                    <dt>Source hash</dt>
                    <dd>{asset.sourceChecksum}</dd>
                  </div>
                  <div>
                    <dt>Derivative</dt>
                    <dd>{asset.derivativePublicPath}</dd>
                  </div>
                  <div>
                    <dt>Transform</dt>
                    <dd>{(asset.transformations ?? []).join(' ')}</dd>
                  </div>
                </dl>
                <a href={asset.sourceUrl} rel="noreferrer" target="_blank">
                  Open source record ↗
                </a>
              </article>
            ))}
        </div>
      </section>
    </InnerPage>
  );
}

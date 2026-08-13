import { scenarioIds, type ScenarioId } from '@janus/domain';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getScenarioProfile, scientificNotation } from '../../../lib/canonical';
import { InnerPage } from '../../components/InnerPage';

type ScenarioPageProps = { params: Promise<{ scenario: string }> };

export const dynamicParams = false;

function parseScenario(value: string): ScenarioId | null {
  const candidate = value.toUpperCase();
  return scenarioIds.includes(candidate as ScenarioId) ? (candidate as ScenarioId) : null;
}

export function generateStaticParams() {
  return scenarioIds.map((scenario) => ({ scenario: scenario.toLowerCase() }));
}

export async function generateMetadata({ params }: ScenarioPageProps): Promise<Metadata> {
  const scenarioId = parseScenario((await params).scenario);
  if (!scenarioId) return {};
  const profile = getScenarioProfile(scenarioId);
  return { title: `${scenarioId} · ${profile.morphology.mythMetaphor}` };
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const scenarioId = parseScenario((await params).scenario);
  if (!scenarioId) notFound();
  const profile = getScenarioProfile(scenarioId);

  return (
    <InnerPage
      eyebrow={`Atlas record · ${profile.id}`}
      lede={`A source-preserving view of ${profile.morphology.mythMetaphor}. Canonical values are reported/transcribed; explanatory labels remain editorial.`}
      title={profile.morphology.mythMetaphor}
    >
      <nav className="scenarioPagination" aria-label="Scenario records">
        {scenarioIds.map((id) => (
          <Link
            aria-current={id === profile.id ? 'page' : undefined}
            href={`/atlas/${id.toLowerCase()}`}
            key={id}
          >
            {id}
          </Link>
        ))}
      </nav>

      <section className="recordSummary">
        <div>
          <span>Global factor</span>
          <strong>{profile.morphology.globalFactor}</strong>
        </div>
        <div>
          <span>Technology cluster</span>
          <strong>{profile.morphology.technologyCluster}</strong>
        </div>
        <div>
          <span>Population</span>
          <strong>{scientificNotation(profile.growth.population)}</strong>
        </div>
        <div>
          <span>Annual energy</span>
          <strong>{scientificNotation(profile.growth.annualEnergyUseJ)} J / year</strong>
        </div>
        <div>
          <span>Growth state</span>
          <strong>{profile.growth.growthState}</strong>
        </div>
        <div>
          <span>Growth rate</span>
          <strong>
            {profile.growth.annualGrowthRate === null
              ? 'Not numeric in table'
              : `${(profile.growth.annualGrowthRate * 100).toFixed(2)}% / year`}
          </strong>
        </div>
      </section>

      <section className="recordSection">
        <header>
          <p className="eyebrow">Published observing matrix</p>
          <h2>What each method lists</h2>
        </header>
        <div className="recordGrid">
          {profile.observations.map((observation) => (
            <article key={observation.id}>
              <span>
                {observation.short} · {observation.mode}
              </span>
              <h3>{observation.label}</h3>
              {observation.result.signatures.length > 0 ? (
                <ul>
                  {observation.result.signatures.map((signature) => (
                    <li key={signature}>{signature}</li>
                  ))}
                </ul>
              ) : (
                <p>No signature listed in Figure 6. This is not a claim of no technology.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="recordSection">
        <header>
          <p className="eyebrow">Earth atmosphere · Table 1</p>
          <h2>Canonical inputs</h2>
        </header>
        <div className="comparisonScroller">
          <table>
            <caption>Published future-Earth atmosphere values for {profile.id}</caption>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Value</th>
                <th scope="col">Unit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(profile.atmosphere).map(([id, row]) => (
                <tr key={id}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value ?? 'Published ellipsis'}</td>
                  <td>{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="recordSection">
        <header>
          <p className="eyebrow">Planetary and system traces</p>
          <h2>Separate dimensions</h2>
        </header>
        <div className="recordColumns">
          <div>
            <h3>System signatures listed</h3>
            {profile.system.length > 0 ? (
              <ul>
                {profile.system.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            ) : (
              <p>None listed in Table 8.</p>
            )}
          </div>
          <div>
            <h3>Reported collapse/recovery outcome</h3>
            <p>{profile.collapse.reportedResults.summary}</p>
            <dl>
              <div>
                <dt>Mean duty cycle</dt>
                <dd>
                  {profile.collapse.reportedResults.meanDutyCycle ?? 'Not transcribed from prose'}
                </dd>
              </div>
              <div>
                <dt>Mean collapse count</dt>
                <dd>
                  {profile.collapse.reportedResults.meanCollapseCount ??
                    'Figure-only / not transcribed'}
                </dd>
              </div>
              <div>
                <dt>Precision</dt>
                <dd>{profile.collapse.reportedResults.precision.replace('_', ' ')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="recordSources">
        <a href="https://arxiv.org/abs/2409.00067v3" rel="noreferrer" target="_blank">
          Scenario paper · Tables 5, 6, 8, 9 ↗
        </a>
        <a href="https://arxiv.org/abs/2511.20329v2" rel="noreferrer" target="_blank">
          Observing paper · Table 1, Figure 6 ↗
        </a>
        <a href="https://arxiv.org/abs/2604.13774v1" rel="noreferrer" target="_blank">
          Collapse paper · Table 4 and reported outcomes ↗
        </a>
      </div>
    </InnerPage>
  );
}

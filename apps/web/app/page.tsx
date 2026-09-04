import { scenarioIds } from '@janus/domain/scenario';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ObservatorySlice } from './ObservatorySlice';
import { HeroSplineBoundary } from './components/HeroSplineBoundary';
import { StoryExperience } from './story/StoryExperience';
import { siteDescription } from '../lib/site';

export const metadata: Metadata = {
  title: 'Ten Futures, One System',
  description: siteDescription,
  alternates: { canonical: '/' },
};

const principles = [
  ['01', 'Possibilities', 'Ten self-consistent scenarios; no probability rank or forecast.'],
  ['02', 'Incomplete evidence', 'A non-detection belongs to a method, not to a civilization.'],
  ['03', 'Auditable values', 'Canonical runtime values resolve to a versioned source locator.'],
  ['04', 'Resilient story', 'The central result survives no WebGL and reduced motion.'],
] as const;

export default function Home() {
  return (
    <main id="main">
      <a className="skipLink" href="#main-content">
        Skip to story
      </a>
      <a className="skipLink skipLinkSecondary" href="#observatory">
        Skip story
      </a>

      <nav className="nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Janus Observatory home">
          <span className="wordmarkMark" aria-hidden="true">
            J
          </span>
          <span>Janus Observatory</span>
        </a>
        <div className="navLinks">
          <a href="#story">Story</a>
          <Link href="/observatory">Observatory</Link>
          <Link href="/atlas">Atlas</Link>
          <Link href="/research">Research</Link>
          <Link href="/methods">Methods</Link>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="heroImageField" aria-hidden="true">
          <Image
            alt=""
            className="heroImage"
            fill
            preload
            quality={90}
            sizes="(max-width: 880px) 100vw, 68vw"
            src="/assets/hero/solar-system-basic-v1.webp"
          />
          <HeroSplineBoundary />
        </div>

        <div className="heroCopy">
          <p className="eyebrow">Project Janus · Year 3026</p>
          <h1>
            Ten futures.
            <br />
            <span>One system.</span>
          </h1>
          <p className="lede">
            An interactive, evidence-backed atlas asking how technological civilizations endure,
            collapse, expand—and whether anyone else could see them.
          </p>
          <a className="primaryAction" href="#main-content">
            Begin first light <span aria-hidden="true">↘</span>
          </a>
          <p className="heroQualifier">
            Scenarios are possibilities—not forecasts, rankings, or equally weighted probabilities.
          </p>
        </div>

        <div className="scenarioRail" aria-label="Ten Project Janus scenario identifiers">
          {scenarioIds.map((id) => (
            <span key={id}>{id}</span>
          ))}
        </div>
      </section>

      <div id="main-content">
        <StoryExperience />
        <ObservatorySlice />
      </div>

      <section className="mission" id="mission">
        <header className="sectionHeader">
          <p className="eyebrow">Scientific guardrails</p>
          <p className="sectionIndex">001—004</p>
        </header>
        <div className="workstreamGrid">
          {principles.map(([index, title, description]) => (
            <article className="workstream" key={index}>
              <span className="workstreamIndex">{index}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="missionLinks">
          <Link href="/atlas">Open all ten scenarios</Link>
          <Link href="/observatory">Open full Observatory</Link>
          <Link href="/methods">Read methods</Link>
          <Link href="/sources">Inspect sources</Link>
          <Link href="/research/concordia">Concordia experiment</Link>
          <Link href="/accessibility">Accessibility and controls</Link>
        </div>
      </section>

      <footer>
        <p>Scientific truth before spectacle.</p>
        <p>All ten scenarios · canonical data 2026-08-12</p>
      </footer>
    </main>
  );
}

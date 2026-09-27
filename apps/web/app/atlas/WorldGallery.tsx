'use client';
import Link from '../components/AppLink';
import { useState } from 'react';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { WorldPortrait } from '../components/WorldPortrait';
import s from './atlas.module.css';
export function WorldGallery() {
  const [world, setWorld] = useState(2);
  const profile = allScenarioProfiles[world];
  return (
    <section className={s.worldGallery} aria-label="Explore the ten worlds">
      <div className={s.galleryCopy}>
        <span className={s.galleryId}>{profile.id}</span>
        <h2>{profile.morphology.mythMetaphor}</h2>
        <p>{profile.morphology.canonicalSummary.value}</p>
        <Link href={`/atlas/${profile.id.toLowerCase()}`}>Explore this civilization ↗</Link>
      </div>
      <WorldPortrait world={world} />
      <noscript>
        <nav aria-label="Scenario records">
          {allScenarioProfiles.map((p) => (
            <p key={p.id}>
              <Link href={`/atlas/${p.id.toLowerCase()}`}>
                {p.id}: {p.morphology.mythMetaphor}
              </Link>
            </p>
          ))}
        </nav>
      </noscript>
      <div className={s.galleryChoices} role="group" aria-label="Preview a world">
        {allScenarioProfiles.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setWorld(i)}
            aria-pressed={i === world}
            aria-label={`${p.id}: ${p.morphology.mythMetaphor}`}
          >
            {p.id}
          </button>
        ))}
      </div>
    </section>
  );
}

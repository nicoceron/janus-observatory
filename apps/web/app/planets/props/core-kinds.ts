import { writeFileSync } from 'node:fs';
import { presentSignals } from '../../../lib/world-signals';
import { buildWorld } from '../catalog';
import { qualities } from '../model';
import { propGeometry } from './library';
import { kitUsed } from './pack';
import './kit.test-setup';

/**
 * List the kit models the opening Earth needs, so the export can put them in the small `core`
 * pack that loads first. Run with `pnpm exec tsx apps/web/app/planets/props/core-kinds.ts` after
 * a kit export, then export again.
 */
kitUsed.clear();
for (const quality of Object.values(qualities)) {
  const world = buildWorld('present', presentSignals, quality);
  for (const group of [...world.instances, ...world.movers]) propGeometry(group.kind);
}
const kinds = [...kitUsed].sort();
writeFileSync('scripts/blender/kit/core-kinds.json', JSON.stringify(kinds, null, 1) + '\n');
process.stdout.write(`The opening Earth uses ${kinds.length} kit models.\n`);

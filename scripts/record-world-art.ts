import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const names = [
  'worlds.ts',
  'origin-world.ts',
  'WorkingModels.ts',
  'activity-motion.ts',
  'activity-corridor.ts',
  'landmark-plan.ts',
  'plan-life-route.ts',
  'route-finishing.ts',
  'Airfield.ts',
  'system-layout.ts',
  'spatial-targets.ts',
  'companion-reveal.ts',
  'optical-travel.ts',
  'canvas-metadata.ts',
  'Telescope.tsx',
  'scroll.ts',
  'use-journey-scroll.ts',
  'chapter-settle.ts',
  'sky-pose.ts',
  'Space.tsx',
  'SpaceBackdrop.tsx',
  'StoryBody.tsx',
  'BlenderAssets.tsx',
  'activity-paths.generated.json',
  'Planet.tsx',
  'terrain.ts',
  'WorldStructures.tsx',
  'sculpture.ts',
  'PlanetDetails.ts',
  'planet-surface.ts',
  'WorldBiomes.ts',
  'WorldActivity.tsx',
  'Space.tsx',
  'StoryBody.tsx',
  'ScenarioObjects.ts',
  'ScenarioBiomes.ts',
  'SystemGeometry.ts',
  'modeling.ts',
  'Vessels.ts',
  'LifeModels.ts',
  'LifeActor.tsx',
  'life-plan.ts',
  'life-routes.ts',
  'life-geometry.ts',
  'WorldClouds.tsx',
  'cloud-motion.ts',
  'HabitatModels.ts',
  'MachineModels.ts',
  'Mechanisms.ts',
  'ObjectFinish.ts',
  'WorldLandmarks.tsx',
  'InspectionScene.tsx',
  'Inspector.tsx',
  'inspection.ts',
  'WorldExplore.tsx',
  'Voyage.tsx',
  'voyage.module.css',
];
const files = [
    ...names.map((name) => 'apps/web/app/voyage/' + name),
    'scripts/generate-activity-paths.ts',
    'apps/web/app/page.tsx',
    'apps/web/app/components/PortraitCanvas.tsx',
    'apps/web/app/components/WorldPortrait.tsx',
    'apps/web/app/components/WorldPortrait.module.css',
    'apps/web/app/components/SiteHeader.module.css',
  ],
  hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const sourceChecksum = 'sha256:' + hash.digest('hex');
const path = 'data/assets/ledger.json',
  ledger = JSON.parse(await readFile(path, 'utf8'));
const entry = ledger.entries.find((item: { id: string }) =>
  /^janus.low-poly.worlds.v[67]$/.test(item.id),
);
const old = entry.sourceChecksum;
if (entry.id !== 'janus.low-poly.worlds.v7')
  entry.notes.push(
    `Connected worlds v7 replaces ${old}. Source-selected Luna, Mars, Venus and extended-system models now occupy the main story portrait on demand. Decorative road strips are removed; remaining roads meet oriented modeled entrances, fit their vehicles and exclude background obstacles. Prepared routes remain original interpretive artwork. Earlier source and visual evidence remains in docs/qa/purposeful-worlds/. The unchanged origin poster retains its v6 source receipt.`,
  );
entry.id = 'janus.low-poly.worlds.v7';
entry.title = 'Janus spatial systems, star field and connected transport';
entry.sourceVersion = 'planet-polish-v25-2026-09-30';
if (!entry.notes.some((note: string) => note.startsWith('Airfield correction v10')))
  entry.notes.push(
    'Airfield correction v10 replaces ' +
      old +
      '. Starting Earth now has cleared grass airfields, connected aprons, hangars, windsocks and parked aircraft; S3 retains a distinct paved regional field. The SVG sky uses integer arithmetic to eliminate cross-engine hydration mismatches. Evidence: docs/qa/airfield-correction/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Open systems v9')))
  entry.notes.push(
    'Open systems v9 retains the previous source hash ' +
      old +
      '. All canonical-selected bodies now appear together; traversable route shortcuts and distinct transport surfaces replace coarse grid bends. The continuous sky is original SVG and Three.js geometry. Evidence: docs/qa/open-systems/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Spatial systems v11')))
  entry.notes.push(
    'Spatial systems v11 replaces ' +
      old +
      '. Responsive three-dimensional composition replaces rows and permanent captions. Luna stays near Earth; other destinations occupy distinct camera depths. Hover and keyboard-focus names follow actual body projections. Camera distances and sizes are interpretive, not orbital measurements. Existing Blender geometry is unchanged. Evidence: docs/qa/spatial-systems/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Organic reveal v12')))
  entry.notes.push(
    'Organic reveal v12 replaces ' +
      old +
      '. Adjacent systems retain their companions across the chapter midpoint, and stage their Earth simultaneously. Bodies emerge from camera-aligned positions behind Earth and return there on exit. Reveal and backscroll use absolute scroll progress; no opacity fade or body-scale pop is added. Depth, assets and canonical selections are unchanged. Evidence: docs/qa/organic-reveal/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Story cleanup v13')))
  entry.notes.push(
    'Story cleanup v13 replaces ' +
      old +
      '. Removed decorative captions, repeated off-world source lists and the bottom story toolbar. Homepage motion is always full per the explicit product request. Existing planet geometry, companions, source selections and behind-Earth reveal are unchanged. Evidence: docs/qa/story-cleanup/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Telescope flow v14')))
  entry.notes.push(
    'Telescope flow v14 replaces ' +
      old +
      '. Camera aligns on approach, passes through the open barrel, then holds a clear source-selected S9 Earth view. Decorative reticle removed. Closing Earth is projected from a section-owned DOM anchor and scrolls with the epilogue. No external assets or canonical scientific values changed. Evidence: docs/qa/telescope-flow/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Shared worlds v15')))
  entry.notes.push(
    'Shared worlds v15 replaces ' +
      old +
      '. Atlas, ten scenario records and Observatory now reuse the story Planet renderer and existing Blender assets. Visible portraits animate with one demand-driven canvas; offscreen and hidden portraits park. Redundant canvas metadata writes are skipped and expensive diagnostic snapshots sample at 10 Hz while visual motion remains per frame. No scientific data or model geometry changed. Evidence: docs/qa/release-polish/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Navigation performance v16')))
  entry.notes.push(
    'Navigation performance v16 replaces ' +
      old +
      '. Shared navigation replaces separate story and inner headers. Adaptive supersampling stays between native CSS resolution and 1.5 DPR, retaining geometry, lighting and full animation. Worlds stage around the current chapter, with all ten retained during the overview transition; hidden libraries skip repeated projection and metadata work. No scientific data, model files or asset rights changed. Evidence: docs/qa/navigation-performance/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Full resolution v17')))
  entry.notes.push(
    'Full resolution v17 replaces ' +
      old +
      '. Removed adaptive resolution: the original fixed 1-to-1.5 DPR policy remains stable under load. Compressed Blender assets decode on one short-lived worker; immutable local matrices are reused, and procedural terrain is built only when its Blender part is absent. Lossless gzip transport preserves every model byte. No model geometry, canonical data or source rights changed. Evidence: docs/qa/cloudflare-release/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Planet polish v18')))
  entry.notes.push(
    'Planet polish v18 replaces ' +
      old +
      '. Opening Earth adds coastal research and sailing traffic; aircraft use runway acceleration, cruise, descent and rolling turns. Authored berths connect to shore and reserve hull clearance. Blender-native transport facilities and cloud masses replace ambiguous surfaces. Lunar craters and Martian valleys belong to their terrain; S2 quarry benches retain an access ramp. Fixed 1-to-1.5 DPR and lossless model transport remain unchanged. Evidence: docs/qa/planet-polish-2026-09-20/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Traffic clearance v19')))
  entry.notes.push(
    'Traffic clearance v19 replaces ' +
      old +
      '. Opening Earth coastal routes occupy separate waterways. Offline route planning reserves complete turning hulls and prior piers; every shore-connected landing stays outside the entire swept route. Hand-placed rocks, gardens, pools and trees relocate onto unobstructed land; river strips stop at open water. Both desktop and mobile coastal layouts and surrounding scene geometry are checked. No runtime physics, dependency, canonical data or resolution changes. Evidence: docs/qa/traffic-correction/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Orbit crops v20')))
  entry.notes.push(
    'Orbit crops v20 replaces ' +
      old +
      '. All airborne actors follow continuous inclined world circuits with tangent headings, constant speed and settlement clearance. Airfields remain grounded scenery. Opening crop plots use individual leafy vegetables and growing stalks in open soil, without wooden rails. Editable Blender preview motion matches the browser. Waterway reservations, fixed resolution and canonical scientific data are preserved. Evidence: docs/qa/orbit-crops/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Deep space v21')))
  entry.notes.push(
    'Deep space v21 replaces ' +
      old +
      '. Black sky with independently composited star layers and restrained chapter lighting. GSAP ScrollToPlugin unifies interruptible anchor navigation; deep links and history align to the measured chapter anchors. Quintic portrait handoffs retain behind-Earth companions. No geometry, canonical data, resolution or Blender export changes. Evidence: docs/qa/deep-space/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Galactic settle v22')))
  entry.notes.push(
    'Galactic settle v22 replaces ' +
      old +
      '. Original SVG galactic dust, concentrated stars and restrained halos add spatial structure. Native wheel and touch scrolling settle only near chapter portraits after input ends, release departed anchors, and leave articles and reduced motion free. No new media, dependencies, resolution or model changes. Evidence: docs/qa/galactic-settle/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Chapter sync v23')))
  entry.notes.push(
    'Chapter sync v23 replaces ' +
      old +
      '. Narrative, planets and sky consume one absolute chapter presentation. Single semantic copy nodes stage in measured desktop slots; flow layouts hold their world through reading. Independent renderer and sky easing removed. Geometry, full resolution, canonical data and source rights remain unchanged. Evidence: docs/qa/chapter-sync/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Inspector text v24')))
  entry.notes.push(
    'Inspector text v24 replaces ' +
      old +
      '. The inert story layer is hidden as one composited group during model inspection, preventing explicitly visible anchored narrative from appearing behind enlarged planets or assets. Layout, scroll position, focus restoration, sky, models, resolution and canonical data remain unchanged. Evidence: docs/qa/inspector-text/.',
  );
if (!entry.notes.some((note: string) => note.startsWith('Planet polish v25')))
  entry.notes.push(
    'Planet polish v25 replaces ' +
      old +
      '. Coastlines follow the terrain contour instead of stepped facets, with a beach rim and one cliff face per segment. Clouds sit closer to the land. S1 land reads as a grey city plate with low-rise blocks; S2 benches, fence and excavator are wrapped onto the globe over a carved pit; S7 and S8 ruins stand on grounded piers. Venus is a pale cloud deck and asteroids are lobed bodies. Routes were re-planned offline; canonical data, resolution and rights are unchanged. Evidence: docs/qa/planet-polish-2026-09-30/.',
  );
entry.sourceChecksum = sourceChecksum;
entry.notes[0] =
  'Source checksum covers the concatenated UTF-8 files, in this order: ' + files.join(', ') + '.';
entry.transformations = [
  'Original faceted Three.js geometry, articulated activity on prepared routes between modeled entrances, independently moving clouds, simultaneously visible source-selected Solar System bodies and original star field in the story, and a single-canvas interactive explorer. Background props respect road corridors and stay merged; selectable focal objects retain separate meshes. No external model or texture is reproduced.',
];
await writeFile(path, JSON.stringify(ledger, null, 2) + '\n');
await writeFile(
  'docs/qa/planet-polish-2026-09-30/art-source.json',
  JSON.stringify(
    { id: entry.id, version: entry.sourceVersion, sourceChecksum, files, verified: true },
    null,
    2,
  ) + '\n',
);
console.log(sourceChecksum);

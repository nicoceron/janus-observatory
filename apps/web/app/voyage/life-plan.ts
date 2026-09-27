import type { WorldArt } from './worlds';
import type { LifeSubject } from './LifeActor';
import type { ObjectKind } from './ScenarioObjects';
import type { MapPoint } from './planet-surface';
export type ActivityStop = {
  label: string;
  at: MapPoint;
  landmark?: ObjectKind;
  access?: [number, number];
};
export type LifePlan = {
  subject: LifeSubject;
  route: 'road' | 'surface' | 'water' | 'wildlife' | 'flight' | 'hover';
  from: ActivityStop;
  to: ActivityStop;
  travel: number;
  dwell: number;
  size: number;
  purpose: string;
};
/** Authored story actions, never a census or a claim that the papers specify these machines. */
export const lifePlans: Record<WorldArt['form'], LifePlan[]> = {
  origin: [
    {
      subject: { type: 'aircraft', kind: 'regional-plane' },
      route: 'flight',
      from: { label: 'Coastal airfield', at: [-48, -12] },
      to: { label: 'Inland airfield', at: [49, 20] },
      travel: 34,
      dwell: 12,
      size: 0.46,
      purpose: 'A passenger aircraft circles the globe above the settlements and clouds.',
    },
    {
      subject: { type: 'vessel', kind: 'research-skiff' },
      route: 'water',
      from: { label: 'Coastal research pier', at: [-42, 0] },
      to: { label: 'Coastal field station', at: [-40, -32] },
      travel: 36,
      dwell: 9,
      size: 0.64,
      purpose:
        'A working coastal boat carries instruments between shore stations, slowing to berth at each pier.',
    },
    {
      subject: { type: 'vessel', kind: 'cutter' },
      route: 'water',
      from: { label: 'Village landing', at: [66, 6] },
      to: { label: 'Sheltered bay', at: [84, -30] },
      travel: 46,
      dwell: 10,
      size: 0.56,
      purpose: 'A small sailing boat crosses the bay between coastal landings.',
    },
  ],
  ecumenopolis: [
    {
      subject: { type: 'vehicle', kind: 'city-car' },
      route: 'road',
      from: { label: 'Distribution depot', at: [-45, 11], landmark: 'depot', access: [0, 0.22] },
      to: { label: 'Ration checkpoint', at: [-30, -16], landmark: 'checkpoint', access: [0, 0.23] },
      travel: 16,
      dwell: 7,
      size: 0.66,
      purpose:
        'A controlled supply run stops at the distribution depot and ration checkpoint. The repeated stops interpret S1’s centralized allocation.',
    },
    {
      subject: { type: 'aircraft', kind: 'survey-drone' },
      route: 'hover',
      from: { label: 'Observation tower', at: [39, 4], landmark: 'watchtower' },
      to: { label: 'Checkpoint inspection', at: [-30, -16], landmark: 'checkpoint' },
      travel: 18,
      dwell: 8,
      size: 0.73,
      purpose: 'A ducted surveillance drone continuously patrols above the monitored city.',
    },
  ],
  extraction: [
    {
      subject: { type: 'vehicle', kind: 'haul-truck' },
      route: 'road',
      from: {
        label: 'Extraction loading yard',
        at: [28, -22],
        landmark: 'derrick',
        access: [0.15, 0.18],
      },
      to: { label: 'Ore conveyor', at: [39, 4], landmark: 'conveyor', access: [-0.24, 0] },
      travel: 18,
      dwell: 8,
      size: 0.75,
      purpose:
        'One heavy hauler carries ore from the extraction yard to the conveyor. It stops, tips its bed, and returns for another load.',
    },
  ],
  arcadia: [
    {
      subject: { type: 'vessel', kind: 'ferry' },
      route: 'water',
      from: { label: 'Civic quay', at: [-45, -5] },
      to: { label: 'Garden quay', at: [45, 2] },
      travel: 25,
      dwell: 6,
      size: 0.75,
      purpose:
        'A solar catamaran connects two community quays. Its broad passenger deck and docking pauses interpret shared transport in S3.',
    },
    {
      subject: { type: 'aircraft', kind: 'regional-plane' },
      route: 'flight',
      from: { label: 'Coastal airfield', at: [-58, 21] },
      to: { label: 'Regional airfield', at: [49, -18] },
      travel: 36,
      dwell: 12,
      size: 0.46,
      purpose:
        'A twin-propeller regional airplane circles above the communities, interpreting regional transport.',
    },
  ],
  wilderness: [
    {
      subject: { type: 'vessel', kind: 'canoe' },
      route: 'water',
      from: { label: 'Seasonal landing', at: [0, -30] },
      to: { label: 'Gathering shore', at: [30, -42] },
      travel: 29,
      dwell: 9,
      size: 0.78,
      purpose:
        'A timber canoe links two seasonal landings. Its paddle strokes stop at shore; the craft fits S4’s portable tools and seasonal movement.',
    },
    {
      subject: { type: 'animal', kind: 'deer' },
      route: 'wildlife',
      from: { label: 'Woodland shelter', at: [-19, 10] },
      to: { label: 'Browsing clearing', at: [-1, 28] },
      travel: 16,
      dwell: 12,
      size: 0.6,
      purpose:
        'A single deer walks between shelter and a browsing clearing, then stops to feed. This species is an artistic choice for S4’s woodland.',
    },
  ],
  symbiosis: [
    {
      subject: { type: 'animal', kind: 'bio-ray' },
      route: 'hover',
      from: { label: 'Growth chamber', at: [-30, -16], landmark: 'growth-pod' },
      to: { label: 'Living canopy', at: [28, -22], landmark: 'bio-arch' },
      travel: 17,
      dwell: 8,
      size: 0.72,
      purpose:
        'An imagined living pollinator circles above the growing canopy. Membrane wings and a feeding proboscis express engineered biology.',
    },
  ],
  engineered: [
    {
      subject: { type: 'machine', kind: 'maintenance-walker' },
      route: 'surface',
      from: { label: 'Life-support manifold', at: [-6, -46], landmark: 'manifold' },
      to: { label: 'Thermal radiator', at: [28, -17], landmark: 'radiator' },
      travel: 20,
      dwell: 10,
      size: 0.72,
      purpose:
        'A six-legged service machine crosses the pressure shell, braces at a service point, and lowers its inspection tool. It maintains S6’s fragile life-support infrastructure.',
    },
  ],
  reclaimed: [
    {
      subject: { type: 'vehicle', kind: 'cargo-cycle' },
      route: 'road',
      from: { label: 'Local workshop', at: [9, 25], landmark: 'workshop', access: [0, 0.25] },
      to: { label: 'Seed store', at: [30, -19], landmark: 'seed-bank', access: [0, 0.23] },
      travel: 22,
      dwell: 7,
      size: 0.73,
      purpose:
        'A cargo tricycle carries locally made supplies from the workshop to the seed store. The wheels stop during the delivery.',
    },
    {
      subject: { type: 'vessel', kind: 'cutter' },
      route: 'water',
      from: { label: 'Mill landing', at: [-53, 14] },
      to: { label: 'Regional landing', at: [-48, -48] },
      travel: 30,
      dwell: 8,
      size: 0.63,
      purpose:
        'A rigged sailing cutter carries supplies between regional landings. Wind-driven craft complement the working mills and local production of S7.',
    },
  ],
  fractured: [
    {
      subject: { type: 'machine', kind: 'salvage-crane' },
      route: 'road',
      from: { label: 'Recovery clearing', at: [62, -48] },
      to: { label: 'Salvage yard', at: [28, -22], landmark: 'salvage', access: [0, 0.22] },
      travel: 23,
      dwell: 10,
      size: 0.72,
      purpose:
        'A tracked recovery crane retrieves a broken structural beam and unloads it at the salvage yard. Its exposed winch, tracks and reused steel fit S8’s specialized tools and degraded systems.',
    },
  ],
  // S9's principal machinery belongs in its separately selected system works; quiet Earth is deliberate.
  'machine-swarm': [],
  duality: [
    {
      subject: { type: 'vessel', kind: 'sail-barge' },
      route: 'water',
      from: { label: 'Orchard landing', at: [-44, -8] },
      to: { label: 'Common store landing', at: [40, 12] },
      travel: 34,
      dwell: 11,
      size: 0.68,
      purpose:
        'A broad, shallow cargo barge carries orchard crates between coastal stores. Its balanced lug sail and open hold distinguish restored Earth’s local transport from the autonomous infrastructure beyond it.',
    },
  ],
};
export function globeRadius(art: WorldArt) {
  return art.form === 'engineered' ? 0.84 : 1;
}

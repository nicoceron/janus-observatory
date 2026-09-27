import type { SystemPortrait } from '../../lib/system-portrait';
import { worlds } from './worlds';
import { lifePlans } from './life-plan';
// Keep this small descriptive registry independent of the deferred Three.js model builders.
export type Inspection = { world: number; selection: string };
export const bodyNames: Record<string, string> = {
  Earth: 'Earth',
  Moon: 'Luna',
  Mars: 'Mars',
  Venus: 'Venus',
  asteroids: 'Asteroid works',
  outer: 'Outer settlements',
  kuiper: 'Kuiper outpost',
  solar: 'Solar collectors',
};
export const objectNames: Record<string, string> = {
  checkpoint: 'Ration checkpoint',
  tenement: 'Linked residences',
  watchtower: 'Observation tower',
  depot: 'Distribution depot',
  hauler: 'Mining hauler',
  derrick: 'Extraction derrick',
  conveyor: 'Ore conveyor',
  reservoir: 'Resource reservoir',
  courtyard: 'Garden courtyard',
  pavilion: 'Civic pavilion',
  terrace: 'Terraced home',
  glasshouse: 'Community glasshouse',
  camp: 'Seasonal camp',
  rack: 'Drying rack',
  store: 'Raised storehouse',
  totem: 'Carved wayfinder',
  'growth-pod': 'Growth chamber',
  'bio-arch': 'Living architecture',
  synthesis: 'Biosynthesis works',
  'petal-house': 'Petal house',
  reactor: 'Pressure core',
  radiator: 'Thermal radiator',
  manifold: 'Life-support manifold',
  control: 'Monitoring station',
  watermill: 'Restored watermill',
  workshop: 'Local workshop',
  'seed-bank': 'Seed store',
  windmill: 'Wind-powered mill',
  bunker: 'Sheltered entrance',
  salvage: 'Salvage yard',
  'broken-dish': 'Damaged antenna',
  pylon: 'Broken power network',
  gift: 'Machine-made gift',
  canopy: 'Communal canopy',
  'regional-plane': 'Regional airplane',
  'survey-drone': 'Checkpoint surveillance drone',
  'maintenance-walker': 'Life-support maintenance walker',
  'salvage-crane': 'Tracked recovery crane',
  'sail-barge': 'Orchard cargo barge',
  'city-car': 'Electric city car',
  'haul-truck': 'Loaded mine truck',
  'community-bus': 'Community shuttle',
  'bio-transit': 'Biosynthetic transit',
  'service-rover': 'Maintenance rover',
  'cargo-cycle': 'Cargo tricycle',
  'salvage-rover': 'Salvage rover',
  cutter: 'Sailing cutter',
  ferry: 'Solar passenger ferry',
  canoe: 'Wooden canoe',
  'research-skiff': 'Research skiff',
  deer: 'Woodland deer',
  ibex: 'Mountain ibex',
  crane: 'Flying crane',
  'bio-ray': 'Biosynthetic glider',
  'lunar-base': 'Lunar settlement',
  'mars-base': 'Mars settlement',
  aerostat: 'Venus aerostat',
  'venus-facility': 'Venus surface facility',
  'orbital-habitat': 'Orbital habitat',
  'machine-station': 'Orbital machine works',
  'machine-facility': 'Machine surface works',
};
export const landmarkKinds = [
  ['checkpoint', 'tenement', 'watchtower', 'depot'],
  ['hauler', 'derrick', 'conveyor', 'reservoir'],
  ['courtyard', 'pavilion', 'terrace', 'glasshouse'],
  ['camp', 'rack', 'store', 'totem'],
  ['growth-pod', 'bio-arch', 'synthesis', 'petal-house'],
  ['reactor', 'radiator', 'manifold', 'control'],
  ['watermill', 'workshop', 'seed-bank', 'windmill'],
  ['bunker', 'salvage', 'broken-dish', 'pylon'],
  ['gift'],
  ['canopy', 'windmill', 'store'],
];
export function systemSelections(system: SystemPortrait) {
  return ['Earth', ...system.bodies.map((b) => b.body), ...system.features];
}
export function objectSelections(world: number) {
  const plan = lifePlans[worlds[world].form];
  return [
    ...landmarkKinds[world].map((k) => 'landmark:' + k),
    ...plan.map((job) => job.subject.type + ':' + job.subject.kind),
    ...(world === 9 ? ['orbital-habitat'] : []),
  ];
}

export function selectionName(id: string) {
  return bodyNames[id] ?? objectNames[id.split(':').at(-1)!] ?? id;
}
/** A study follows the published activity layer; surface work does not imply an aerostat. */
export function companionStudy(world: number, selection: string, system: SystemPortrait) {
  const body = system.bodies.find((item) => item.body === selection);
  if (!body) return null;
  if (body.activity === 'orbital') return world === 8 ? 'machine-station' : 'orbital-habitat';
  if (world === 8) return selection === 'Venus' ? 'venus-facility' : 'machine-facility';
  if (selection === 'Moon') return 'lunar-base';
  if (selection === 'Mars') return 'mars-base';
  if (selection === 'Venus') return body.activity === 'surface' ? 'venus-facility' : 'aerostat';
  return null;
}
export function selectionDescription(world: number, id: string, system: SystemPortrait) {
  const art = worlds[world];
  const job = lifePlans[art.form].find((job) => job.subject.type + ':' + job.subject.kind === id);
  if (job) return job.purpose;
  if (id === 'Earth')
    return art.caption + ' Select a surface object to discover its construction and movement.';
  const body = system.bodies.find((b) => b.body === id);
  if (body)
    return body.activity === 'orbital'
      ? 'This portrait keeps the published activity in orbit. Select and rotate the habitat to inspect its pressure structure.'
      : id === 'Moon'
        ? world === 7
          ? 'Regolith-covered shelters, protected access and a compact utility yard interpret the lunar refuge in this scenario.'
          : 'Connected pressure modules, airlocks and a separate power and thermal yard give the lunar settlement a readable structure.'
        : id === 'Mars'
          ? world === 4
            ? 'An engineered garden world, with biosynthetic structures and a connected settlement.'
            : 'A separate Martian landscape, with a pressure settlement adapted to this scenario.'
          : world === 8
            ? 'Machine-built apertures and thermal hardware distinguish this transformed Venus.'
            : body.activity === 'surface'
              ? 'An anchored process complex, thermal equipment and insulated pressure links interpret this scenario’s surface activity on Venus.'
              : 'A buoyant lifting envelope carries suspended living spaces above the cloud world.';
  if (id.startsWith('vessel:'))
    return id.endsWith('canoe')
      ? 'A tapered timber hull, recessed interior, cross seats and a shaped paddle accompany this seasonal, craft-based world.'
      : 'A shaped hull and inset deck carry the vessel. Curved sails and tensioned rigging, or a glazed solar cabin, make its construction visible from every side.';
  if (id.startsWith('vehicle:'))
    return 'A purpose-built surface vehicle with wheel assemblies, readable glazing and working equipment. In the world view it follows a terrain-supported route.';
  if (id.startsWith('animal:'))
    return id.endsWith('bio-ray')
      ? 'An imagined biosynthetic creature, with a cambered membrane and layered, articulated wings. Its anatomy is an artistic invention.'
      : 'An artistic animal study with a defined body silhouette and articulated limbs. Its presence gives the landscape a sense of life, not a scientific species inventory.';
  if (id === 'machine-station' || id === 'machine-facility')
    return 'Autonomous trusses, thermal surfaces and articulated construction arms give the machine civilization its own engineering language.';
  if (id === 'orbital-habitat')
    return 'A cutaway of an inhabited pressure cylinder with a visible green interior, structural rings, docking ends and unequal service wings. An interpretation of autonomous life beyond Earth.';
  if (id === 'lunar-base' || id === 'mars-base')
    return 'Separate pressure modules connect through a service hub. Airlocks, power arrays, thermal fins and ground access form a complete settlement.';
  if (id === 'aerostat')
    return 'A long lifting envelope supports a glazed gondola on suspension cables, with lightweight solar outriggers.';
  if (id === 'venus-facility' && world === 8)
    return 'A manufactured aperture, braced rim and radial machinery interpret autonomous surface works on Venus. This is an artistic construction, not a reported engineering design.';
  if (id === 'venus-facility')
    return 'Insulated pressure vessels, service bridges and thermal assemblies stand on a braced surface foundation. This is an artistic interpretation of S6’s surface activity on Venus.';
  if (id === 'solar')
    return 'A separate solar construction study, representing the machine civilization beyond Earth. Collector sizes and spacing are interpretive.';
  if (id === 'outer' || id === 'asteroids' || id === 'kuiper')
    return 'An artistic study of this scenario’s published system activity. Shapes, structures and distances are illustrative.';
  return [
    'Controlled access, observation and distributed supplies shape this piece of the centralized city.',
    'Resource extraction, handling and storage shape this working industrial assembly.',
    'Open, shared spaces and small-scale civic infrastructure shape this garden community.',
    'Portable shelter, craft and seasonal use guide the materials and construction.',
    'Ribbed organic surfaces and engineered growth guide this biosynthetic architecture.',
    'Pressure, heat and material flows guide this piece of planetary life-support equipment.',
    'Repair, local fabrication and renewable flows give this reused structure a new purpose.',
    'Fragmented knowledge, salvage and protected access shape this remnant of repeated collapse.',
    'A small technological gift on an otherwise quiet Earth, after the machine civilization has moved beyond it.',
    'Restrained local infrastructure accompanies the restored Earth and its autonomous off-world counterpart.',
  ][world];
}

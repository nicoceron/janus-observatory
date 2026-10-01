/**
 * What each low-poly world depicts, in words. Every sentence is an interpretation of a Project
 * Janus narrative summary (JANUS-PAPER-01, Section 3.2.1) or of a published table cell, and is
 * labelled interpretive wherever it appears. This module stays free of Three.js so the explorer
 * and portraits can describe a world before, or without, WebGL.
 */
export type LandmarkStory = { id: string; name: string; description: string };
export type Offworld = 'Moon' | 'Mars' | 'Venus';
export type WorldStory = {
  id: string;
  depiction: string;
  landmarks: LandmarkStory[];
  bodies: Partial<Record<Offworld, string>>;
};

export const worldStories: WorldStory[] = [
  {
    id: 'S1',
    depiction:
      'A uniform, rationed city covers the land and spills onto sea platforms, watched from one central tower and a lattice of monitoring satellites. Smog dims the planet while elites circle above in clean orbital settlements.',
    landmarks: [
      {
        id: 'watchtower',
        name: 'Central watchtower',
        description:
          'One spire rises over the capital, ringed with observation decks and a sweeping searchlight. It interprets rule by one and a highly monitored urban landscape.',
      },
      {
        id: 'allocation-blocks',
        name: 'Allocation blocks',
        description:
          'Identical blocks laid on a single grid. Their sameness interprets strict resource allocation under scarcity; how far the grid spreads follows the published surface-modification fraction.',
      },
      {
        id: 'elite-settlement',
        name: 'Elite orbital settlement',
        description:
          'A clean rotating habitat with a green interior, far above the smog. It interprets the elites who live in space settlements.',
      },
    ],
    bodies: {
      Moon: 'A built-over Moon of grid districts and sodium lights, drawn from S1’s published lunar surface modification and illumination.',
      Mars: 'A few small lit outposts, matching the small Martian values published for S1.',
      Venus: 'Only orbital hardware is drawn at Venus, where S1 reports a satellite belt.',
    },
  },
  {
    id: 'S2',
    depiction:
      'Rising seas and spreading deserts squeeze a stressed Earth. Rival corporate enclaves, open-pit mines and monoculture fields compete for what remains, and an unplanned swarm of satellites crowds orbit.',
    landmarks: [
      {
        id: 'enclave',
        name: 'Corporate enclave',
        description:
          'A walled compound of glass towers in one company’s colour. Several rival enclaves interpret rule by the few and entrenched competition for scarce resources.',
      },
      {
        id: 'pit-mine',
        name: 'Open-pit mine',
        description:
          'Terraced benches step down into an extraction pit beside a spoil heap. It illustrates the struggle for resources; the form is artistic.',
      },
      {
        id: 'platform',
        name: 'Offshore rig',
        description:
          'A drilling platform on stilts with a flare stack, working the shelf sea. An illustration of the extraction frontier under climate stress.',
      },
    ],
    bodies: {
      Moon: 'A domed lunar resort and works, interpreting cities on the Moon that support industry and tourism.',
      Mars: 'A small mining town, interpreting Martian cities that support industry and tourism.',
    },
  },
  {
    id: 'S3',
    depiction:
      'Clear seas, restored forests and many small garden towns spread evenly across every continent, with no dominant capital. A single orbital tether keeps Earth the hub of a civilization that also reaches the Moon, Mars and the outer Solar System.',
    landmarks: [
      {
        id: 'garden-town',
        name: 'Garden town',
        description:
          'Low white homes with planted roofs around a shared glasshouse. Towns of similar size, evenly spaced, interpret decentralized power and post-scarcity plenty.',
      },
      {
        id: 'tether',
        name: 'Orbital tether and hub',
        description:
          'A slender cable rises from the equator to a ring-shaped transfer hub. It interprets Earth remaining civilization’s hub; the structure is invented for illustration.',
      },
      {
        id: 'wind-commons',
        name: 'Wind commons',
        description:
          'A shared field of turbines. It illustrates abundant energy held in common rather than by a central power.',
      },
    ],
    bodies: {
      Moon: 'A small lunar settlement, interpreting the scenario’s small off-world outposts.',
      Mars: 'A small Martian settlement, interpreting the scenario’s small off-world outposts.',
    },
  },
  {
    id: 'S4',
    depiction:
      'Wild forests, grasslands and restored ice cover Earth. People live in small seasonal camps that drift with the year, beside the overgrown ruin of a former high-technology age. One derelict satellite still circles.',
    landmarks: [
      {
        id: 'camp',
        name: 'Seasonal camp',
        description:
          'Hide tents around a fire. The camps slowly shift across the land, interpreting settlements that migrate with seasonal and planetary cycles.',
      },
      {
        id: 'relic-tower',
        name: 'Overgrown relic tower',
        description:
          'A broken high-rise reclaimed by plants. It interprets life after the peak of high technology.',
      },
      {
        id: 'stone-circle',
        name: 'Ritual circle',
        description:
          'Standing stones in a ring. It interprets rituals and oral traditions that reinforce belonging to the biosphere.',
      },
    ],
    bodies: {},
  },
  {
    id: 'S5',
    depiction:
      'Almost the whole surface has been redesigned: engineered gardens in bold designed colours, living towers and luminous reefs. The published surface modification covers most of the planet, and the scenario’s very bright artificial light glows from its biosynthetic cities.',
    landmarks: [
      {
        id: 'bloom-spire',
        name: 'Biosynthetic spire',
        description:
          'A grown tower of stacked living chambers opening like petals. It interprets a reengineered biosphere and biosynthetic enhancement.',
      },
      {
        id: 'garden-cell',
        name: 'Engineered garden cell',
        description:
          'A hexagonal planted cell of designed vegetation. The patchwork interprets a biosphere that has become part of the technosphere.',
      },
      {
        id: 'seed-pods',
        name: 'Growth pods',
        description:
          'Glowing pods where designed organisms are grown. An illustration, not a reported technology.',
      },
    ],
    bodies: {
      Moon: 'A luminous, reworked Moon, following the high lunar surface modification and illumination published for S5.',
      Mars: 'Terraformed Mars: seas in the lowlands, engineered vegetation and bright settlements interpret the scenario’s terraforming and its large published Martian values.',
      Venus:
        'A dense ring of orbital hardware reflects the very large satellite-belt value published for Venus in S5.',
    },
  },
  {
    id: 'S6',
    depiction:
      'Engineered life-support plating covers most of Earth, land and sea, under a heavy chemical haze. Warning lights pulse across a system held in precise balance, and an orbital regulator hangs over it on a single tether.',
    landmarks: [
      {
        id: 'regulator',
        name: 'Life-support regulator',
        description:
          'Pressure vessels and pipework around a control dome. It interprets nanoscale engineering that regulates biological processes, maintained by laboring populations.',
      },
      {
        id: 'thermal-stack',
        name: 'Thermal stack',
        description:
          'Cooling towers venting into the haze. They illustrate the very high industrial pollution published for S6.',
      },
      {
        id: 'hanging-regulator',
        name: 'Suspended regulator',
        description:
          'A blade-shaped control station hangs from one tether high above the planet. Its form alludes to the scenario’s title and to fragile, precisely calibrated life support; it is not a reported structure.',
      },
    ],
    bodies: {
      Moon: 'An industrial Moon covered in plating, following the high lunar surface modification published for S6.',
      Mars: 'A transformed, plated Mars under industrial haze, interpreting the technosphere that has transformed Mars.',
      Venus: 'A first foothold on Venus, interpreting work that has only begun there.',
    },
  },
  {
    id: 'S7',
    depiction:
      'Forests and clear water have returned. Villages of whitewashed houses, windmills and terraced fields cluster into regions, each linked by footpaths and a radio mast rather than by any global network.',
    landmarks: [
      {
        id: 'windmill',
        name: 'Village windmill',
        description:
          'Mechanical power from the wind. It interprets simple technologies integrated with planetary cycles and local production.',
      },
      {
        id: 'radio-mast',
        name: 'Regional radio mast',
        description:
          'A lattice mast at the centre of each region. It interprets knowledge moving through regional networks; S7 is among the scenarios listed with radio leakage.',
      },
      {
        id: 'terraces',
        name: 'Terraced fields',
        description:
          'Stepped fields that hold soil and water, illustrating local agriculture aligned with nature.',
      },
    ],
    bodies: {},
  },
  {
    id: 'S8',
    depiction:
      'Ruined cities, a silenced machine core and scorched ground mark an earlier AI catastrophe. Survivors gather among the ruins while sealed bunkers shelter the elite. Lights brighten and fade in a slow cycle, echoing the scenario’s oscillating growth.',
    landmarks: [
      {
        id: 'silent-core',
        name: 'Silenced machine core',
        description:
          'A dark, cracked monument at the centre of scorched ground. It interprets the AI catastrophe named in the scenario; its form is invented.',
      },
      {
        id: 'bunker',
        name: 'Bunker entrance',
        description:
          'A sealed hatch in the hills with a faint light, interpreting elites sheltering underground.',
      },
      {
        id: 'ruin',
        name: 'Ruined tower',
        description:
          'A broken tower amid rubble. It illustrates degraded systems knowledge after collapse.',
      },
    ],
    bodies: {
      Moon: 'A single hidden hatch on the Moon, interpreting elites sheltering there; S8’s published lunar values are tiny.',
    },
  },
  {
    id: 'S9',
    depiction:
      'Earth looks almost untouched, like a world before farming, and Table 6 reports no surface technosignature for it. A few crystalline gifts stand quietly in the landscape and sparse machine nodes circle high above. The machine civilization’s works are elsewhere: on Mars, Venus and around the Sun.',
    landmarks: [
      {
        id: 'gift',
        name: 'Crystalline gift',
        description:
          'A quiet, self-contained crystal left for the people of Earth. It interprets the scenario’s net-zero technological gifts; the form is invented.',
      },
      {
        id: 'machine-node',
        name: 'Orbital machine node',
        description:
          'A dark faceted node with a thin halo, standing for S9’s small published satellite belt around Earth.',
      },
    ],
    bodies: {
      Moon: 'Only a few orbital nodes are drawn at the Moon, where S9 reports a small satellite belt.',
      Mars: 'Mars rebuilt entirely as machine lattice, following the complete surface modification published for S9.',
      Venus:
        'Venus rebuilt entirely as machine lattice, following the complete surface modification published for S9.',
    },
  },
  {
    id: 'S10',
    depiction:
      'A restored, flowering Earth lives within growth limits, and Table 6 reports no surface technosignature for it. Above it, a ring of autonomous habitats marks the schism: the part of the commonwealth that embraced technology has moved into orbit and beyond.',
    landmarks: [
      {
        id: 'habitat-ring',
        name: 'Habitat ring',
        description:
          'Rotating habitat cylinders on a shared orbital rail. They interpret autonomous systems expanding through orbital space.',
      },
      {
        id: 'departure',
        name: 'Deep-space sail',
        description: 'A light-sail craft leaving orbit, illustrating expansion into deep space.',
      },
      {
        id: 'grove',
        name: 'Restored grove',
        description:
          'Old-growth trees in a protected valley, interpreting an Earth restored under growth limits.',
      },
    ],
    bodies: {
      Moon: 'Autonomous works cover most of the Moon, following S10’s high published lunar surface modification.',
      Mars: 'Autonomous works cover most of Mars, following S10’s high published Martian surface modification.',
      Venus:
        'Floating stations above the clouds and orbital hardware, following S10’s published Venus pollution and satellite values.',
    },
  },
];

export const presentDepiction =
  'Present-day Earth, the one world we know: today’s coastlines, ice, forests and deserts, with lights at the largest cities.';

export const featureStories: Record<string, string> = {
  asteroids:
    'Mining rigs on small asteroids illustrate the asteroid mining listed for this scenario in Table 8.',
  outer:
    'A settled moon beside a ringed giant illustrates the outer-planet settlements listed in Table 8.',
  kuiper: 'An icy outpost illustrates the Kuiper belt mining listed in Table 8.',
  solar:
    'A swarm of collectors around the Sun illustrates the Dyson sphere listed for S9 in Table 8.',
};

export function worldStory(world: number) {
  return worldStories[world];
}

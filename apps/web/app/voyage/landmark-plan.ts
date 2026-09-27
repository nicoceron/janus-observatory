import type { WorldArt } from './worlds';
import type { MapPoint } from './planet-surface';

/** Shared art layout keeps background clearance, entrances and working routes aligned. */
export function landmarkCoordinates(form: WorldArt['form']): MapPoint[] {
  if (form === 'extraction')
    return [
      [-30, -16],
      [24, -35],
      [60, 14],
      [-45, 11],
    ];
  if (form === 'ecumenopolis')
    return [
      [-27, -28],
      [28, -22],
      [39, 4],
      [-64, 22],
    ];
  if (form === 'reclaimed')
    return [
      [-13, 5],
      [9, 25],
      [30, -19],
      [-45, 11],
    ];
  if (form === 'engineered')
    return [
      [-31, 17],
      [28, -17],
      [-6, -46],
      [58, 14],
    ];
  if (form === 'machine-swarm')
    return [
      [-31, 7],
      [28, -19],
      [3, 43],
      [45, 20],
    ];
  return [
    [-30, -16],
    [28, -22],
    [39, 4],
    [-45, 11],
  ];
}

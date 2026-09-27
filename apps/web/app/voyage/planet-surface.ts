import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { terrainGeometry } from './terrain';
import type { WorldArt } from './worlds';
export type MapPoint = [number, number];

/** Project small roads and settlements onto the actual flat faces, only during mesh construction. */
export class Ground {
  private mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private ray = new THREE.Raycaster();
  private hits: THREE.Intersection[] = [];
  constructor(
    art: WorldArt,
    readonly scale: number,
    mobile: boolean,
    layer: 'terrain' | 'shell' = 'terrain',
  ) {
    this.mesh = new THREE.Mesh(
      layer === 'shell' ? new THREE.IcosahedronGeometry(1.08, 1) : terrainGeometry(art, mobile),
      new THREE.MeshBasicMaterial(),
    );
    this.mesh.scale.setScalar(layer === 'shell' ? 1 : scale);
    this.mesh.updateMatrixWorld(true);
  }
  direction(lon: number, lat: number) {
    const a = THREE.MathUtils.degToRad(lon),
      b = THREE.MathUtils.degToRad(lat);
    return new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
  }
  project(n: THREE.Vector3, lift = 0.007) {
    // Ray.intersectTriangle uses exact barycentric edge comparisons. At a Float32 shared
    // edge, retry within the geometry's coordinate precision; never substitute a fake radius.
    for (const epsilon of [0, 2e-7, -2e-7]) {
      const sample = n.clone();
      sample.x += epsilon;
      sample.y += epsilon * 0.37;
      sample.z += epsilon * 0.61;
      sample.normalize();
      this.ray.set(sample.clone().multiplyScalar(3), sample.clone().negate());
      this.hits.length = 0;
      this.ray.intersectObject(this.mesh, false, this.hits);
      if (this.hits.length) return this.hits[0].point.clone().addScaledVector(n, lift);
    }
    throw new Error('Planet detail has no supporting terrain face at ' + n.toArray().join(','));
  }
  pose(lon: number, lat: number, lift = 0.006) {
    const n = this.direction(lon, lat);
    return new THREE.Matrix4().compose(
      this.project(n, lift),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n),
      new THREE.Vector3(1, 1, 1),
    );
  }
  trail(
    s: Sculpture,
    sites: MapPoint[],
    width: number,
    color: string,
    lift = 0.007,
    minimumHeight = 0,
  ) {
    const points: THREE.Vector3[] = [];
    for (let j = 0; j < sites.length - 1; j++) {
      const a = this.direction(...sites[j]),
        b = this.direction(...sites[j + 1]);
      const steps = Math.max(2, Math.ceil(a.angleTo(b) * 32));
      for (let i = 0; i < steps; i++)
        points.push(
          a
            .clone()
            .lerp(b, i / steps)
            .normalize(),
        );
    }
    points.push(this.direction(...sites.at(-1)!));
    const sides = points.map((n, i) => {
      const tangent = points[Math.min(i + 1, points.length - 1)]
        .clone()
        .sub(points[Math.max(0, i - 1)]);
      const across = new THREE.Vector3().crossVectors(n, tangent).normalize();
      return [-1, 1].map((side) =>
        this.project(
          n
            .clone()
            .addScaledVector(across, width * side)
            .normalize(),
          lift,
        ),
      );
    });
    const coordinates: number[] = [];
    for (let i = 0; i < sides.length - 1; i++) {
      const [a, b] = sides[i],
        [c, d] = sides[i + 1];
      if ([a, b, c, d].some((v) => v.length() - lift < minimumHeight)) continue;
      for (const v of [a, c, b, b, c, d]) coordinates.push(...v.toArray());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
    s.add(g, color);
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { presentEarth } from '../apps/web/app/voyage/origin-world';
import { worlds } from '../apps/web/app/voyage/worlds';
import { lifePlans } from '../apps/web/app/voyage/life-plan';

const root = process.cwd(),
  req = createRequire(join(root, 'apps/web/package.json'));
const THREE = await import(
  pathToFileURL(join(dirname(req.resolve('three')), 'three.module.js')).href
);
const { GLTFLoader } = await import(
  pathToFileURL(req.resolve('three/examples/jsm/loaders/GLTFLoader.js')).href
);
const { MeshoptDecoder } = await import(
  pathToFileURL(req.resolve('three/examples/jsm/libs/meshopt_decoder.module.js')).href
);
await MeshoptDecoder.ready;
const rows = [];
for (const art of [presentEarth, ...worlds])
  for (const mobile of [false, true]) {
    const jobs = lifePlans[art.form].filter((j) => j.route === 'flight' || j.route === 'hover');
    if (!jobs.length) continue;
    const world = art.form === 'origin' ? 'origin' : art.id.toLowerCase();
    const b = await readFile(
      `apps/web/public/assets/blender/v1/${world}/${mobile ? 'earth-mobile' : 'earth'}.glb`,
    );
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
    gltf.scene.updateMatrixWorld(true);

    const seed = JSON.parse(await readFile(`assets/blender/seeds/${world}.json`, 'utf8'));
    const tier = seed.tiers.find((t) => t.mobile === mobile);
    const normalized = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const get = (name) => {
      let found;
      gltf.scene.traverse((o) => {
        if (normalized(o.name) === normalized(name)) found = o;
      });
      if (!found) throw Error(name);
      return found;
    };
    const staticVertices = [];
    for (const spec of [
      { name: 'Terrain', matrix: new THREE.Matrix4() },
      { name: 'Structures', matrix: new THREE.Matrix4() },
      ...tier.sites.map((site) => ({
        name: 'Landmark_' + site.kind,
        matrix: new THREE.Matrix4().fromArray(site.matrix),
      })),
    ]) {
      get(spec.name).traverse((o) => {
        if (!o.isMesh) return;
        const v = o.geometry.getAttribute('position');
        for (let i = 0; i < v.count; i++)
          staticVertices.push(
            new THREE.Vector3()
              .fromBufferAttribute(v, i)
              .applyMatrix4(o.matrixWorld)
              .applyMatrix4(spec.matrix),
          );
      });
    }
    for (const job of jobs) {
      const body = get(`Life_${job.subject.type}_${job.subject.kind}_body`);
      const box = new THREE.Box3().setFromObject(body, true).expandByScalar(0.005);
      const path = tier.jobs.find((j) => j.subject.kind === job.subject.kind);
      const hits = [];
      let poses = 0;
      for (let i = 0; i <= 192; i++) {
        const yaw = 0;
        poses++;
        const q = new THREE.Quaternion()
          .fromArray(path.rotations[i])
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
        const inv = new THREE.Matrix4()
          .compose(
            new THREE.Vector3().fromArray(path.points[i]),
            q,
            new THREE.Vector3().setScalar(job.size * path.radius),
          )
          .invert();
        const p = new THREE.Vector3();
        for (const v of staticVertices) {
          p.copy(v).applyMatrix4(inv);
          if (box.containsPoint(p)) {
            hits.push({ index: i, yaw, point: v.toArray() });
            break;
          }
        }
      }
      rows.push({
        world,
        mobile,
        kind: job.subject.kind,
        poses,
        hits,
        clear: hits.length === 0,
      });
    }

    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }
await mkdir('docs/qa/orbit-crops', { recursive: true });
await writeFile(
  'docs/qa/orbit-crops/native-flight-clearance.json',
  JSON.stringify(rows, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      passed: rows.every((r) => r.clear),
      flyers: rows.length,
      poses: rows.reduce((sum, r) => sum + r.poses, 0),
      failures: rows.filter((r) => !r.clear),
    },
    null,
    2,
  ),
);
if (rows.some((r) => !r.clear)) process.exitCode = 1;

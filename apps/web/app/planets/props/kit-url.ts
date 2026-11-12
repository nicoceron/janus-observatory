import manifest from './kit.generated.json';

type Pack = { path: string; sha256: string };

/** Where a kit pack is fetched from; the hash keeps a new export from meeting an old cache. */
export function kitPackUrl(name: string) {
  const pack = (manifest.packs as Record<string, Pack>)[name];
  if (!pack) throw new Error(`No kit pack named ${name}.`);
  return `${pack.path}?v=${pack.sha256.slice(0, 12)}`;
}

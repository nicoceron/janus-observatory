/** One shared DOM registry; the spatial frame loop supplies camera-projected positions. */
const targets = new Map<string, HTMLButtonElement>();
export function bindSpatialTarget(world: number, id: string, button: HTMLButtonElement | null) {
  const key = `${world}:${id}`;
  if (button) targets.set(key, button);
  else targets.delete(key);
}
export function hideSpatialTarget(world: number, id: string) {
  const target = targets.get(`${world}:${id}`);
  if (!target || target.dataset.spatialVisible === 'false') return;
  target.dataset.spatialVisible = 'false';
  target.style.opacity = '0';
  target.style.pointerEvents = 'none';
  target.tabIndex = -1;
  target.setAttribute('aria-hidden', 'true');
}
export function hideSpatialTargets(exceptWorld = -1) {
  for (const [key, target] of targets) {
    if (key.startsWith(`${exceptWorld}:`)) continue;
    if (target.dataset.spatialVisible === 'false') continue;
    target.dataset.spatialVisible = 'false';
    target.style.opacity = '0';
    target.style.pointerEvents = 'none';
    target.tabIndex = -1;
    target.setAttribute('aria-hidden', 'true');
  }
}
export function placeSpatialTarget(
  world: number,
  id: string,
  x: number,
  y: number,
  diameter: number,
  depth: number,
) {
  const target = targets.get(`${world}:${id}`);
  if (!target) return;
  const hit = Math.max(44, diameter);
  target.style.transform = `translate3d(${(x - hit / 2).toFixed(2)}px,${(y - hit / 2).toFixed(2)}px,0)`;
  target.style.width = `${hit.toFixed(2)}px`;
  target.style.height = `${hit.toFixed(2)}px`;
  target.style.setProperty('--body-radius', `${diameter / 2}px`);
  target.style.zIndex = `${Math.round(30 + depth)}`;
  if (target.dataset.spatialVisible !== 'true') {
    target.style.opacity = '1';
    target.style.pointerEvents = 'auto';
    target.dataset.spatialVisible = 'true';
    target.tabIndex = 0;
    target.removeAttribute('aria-hidden');
  }
  target.dataset.projectedCenter = `${x.toFixed(2)},${y.toFixed(2)}`;
  target.dataset.depth = depth.toFixed(2);
}

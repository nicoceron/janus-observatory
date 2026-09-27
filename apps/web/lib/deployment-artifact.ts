import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Workers have no checkout filesystem. Read the same verified bytes from the asset binding. */
export async function readDeploymentArtifact(path: string, localRead: () => Promise<Buffer>) {
  if (process.env.JANUS_CLOUDFLARE !== 'true') return localRead();
  const { env } = getCloudflareContext();
  const response = await env.ASSETS.fetch(`http://assets.local/cdn-cgi/janus-artifacts/${path}`);
  if (!response.ok) throw new Error(`Release artifact unavailable: ${path}`);
  return Buffer.from(await response.arrayBuffer());
}

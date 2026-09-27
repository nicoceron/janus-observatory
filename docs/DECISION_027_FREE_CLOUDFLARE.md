# Decision 027: fixed resolution and Cloudflare Free

User direction: optimize without lowering resolution, then deploy on Cloudflare for free.

The previous adaptive supersampling control is removed. Both canvases retain their original fixed `dpr={[1, 1.5]}`; load never changes resolution. Geometry, lighting and animation remain unchanged. Immutable Blender local transforms are calculated once while their world transforms continue following animated parents. Procedural terrain is constructed only when its Blender replacement is absent. Meshopt decoding uses one worker with an idle cleanup; serialized loading and bounded caches remain.

The 59 existing GLBs receive lossless gzip transport in the deployment staging directory. Original files remain unchanged. Staging decompresses every output and requires byte identity, records both hashes, and serves a .gz variant decoded by native DecompressionStream; browsers without this API receive the original GLB. JavaScript and fonts receive immutable caching; model caching remains bounded to permit future asset revisions.

Keep Next.js and its route handlers through the official OpenNext Cloudflare adapter. Its documented read-only Static Assets incremental cache with cache interception serves the pre-rendered pages without R2, KV, D1, paid image optimization or queues. Downloads read the same manifest-verified bytes through the ASSETS binding because Workers have no checkout filesystem. The normal Node server retains its local reader. Provider calls and the research preview remain disabled. Canonical review status remains candidate_pending_independent_review.

Dependency decision: Next 16.3.3 meets OpenNext 1.20.6's supported patch range; Wrangler 4.131.2 handles deployment. No framework migration or custom animation dependencies. Keep the account on Workers Free; fail if the compressed bundle exceeds its 3 MiB limit. Free worker requests have daily and CPU limits; no hardware-independent frame-rate or unlimited-function guarantee is made.

Sources read: installed Next static-export and deployment guides; https://opennext.js.org/cloudflare/get-started ; https://opennext.js.org/cloudflare/caching ; https://developers.cloudflare.com/workers/static-assets/headers/ ; https://developers.cloudflare.com/workers/platform/limits/ ; https://threejs.org/docs/pages/Object3D.html ; Meshopt's official JavaScript README and installed decoder.

Verification receipts and deployment status: docs/qa/cloudflare-release/.

The adapter imports local environment files by default. Staging deliberately clears its generated next-env module; deployment values come exclusively from Wrangler bindings. A post-bundle scan rejects any local provider credential in deployable code or assets. No credentials are uploaded for this free core release.

Cloudflare runtime QA reproduced the upstream Next 16.3 segment-prefetch loop (11,704 requests in the failing Firefox trace). All internal links use a shared Next Link wrapper with documented `prefetch={false}`. Click navigation and server rendering remain unchanged. An idle-request regression test requires zero speculative requests. Upstream reports: https://github.com/opennextjs/opennextjs-cloudflare/issues/1334 and https://github.com/opennextjs/opennextjs-aws/issues/1212 .

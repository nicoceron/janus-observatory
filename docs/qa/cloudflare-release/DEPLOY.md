# Cloudflare release

Production target: https://janus-observatory.nicocerond.workers.dev

The existing account was verified in Cloudflare's dashboard as Workers **Free ($0)**. This deployment uses Workers Static Assets and OpenNext's read-only static cache. No paid services, storage subscriptions, AI calls, image transformations or domain purchases are required. Worker requests remain subject to the Free account's 100,000/day and 10 ms CPU limits. Public model/font/JavaScript asset requests bypass the application worker.

## Commands

From the repository root:

- `pnpm build:cloudflare` builds Next.js, stages byte-identical compressed model variants and verified downloads, removes local runtime environment values from adapter output, and checks the Worker fits the 3 MiB free bundle limit. It also scans deployable code/assets for local provider credentials.
- `pnpm preview:cloudflare` serves the actual Workers runtime on port 3100 after building.
- `pnpm deploy:cloudflare` builds and deploys the current checkout using Wrangler's authenticated account.

`JANUS_PUBLIC_BASE_URL` defaults to the production Workers URL. Override it at build time if a custom domain is connected later. Provider and research-preview flags remain false. No local provider credentials are included in the deployment.

The existing Cloudflare Git integration points at `main`; this delivery uses a direct upload of the current working checkout. Do not assume its old `pnpm run build` / `npx wrangler deploy` configuration publishes this release. A future Git deployment should use `pnpm build:cloudflare` and `pnpm --filter @janus/web exec opennextjs-cloudflare deploy`, from the branch containing the finished source and assets.

This is the visual/core release. Existing independent scientific review statuses remain unchanged, and the health endpoint continues to identify the pending review accurately.

## Performance boundary

Dynamic resolution is removed; original fixed 1–1.5 DPR remains. The earlier 18-to-32 FPS result depended on lowering supersampling and is not claimed for this release. Here, optimization reduces transfer and avoidable decode/transform/allocation work while retaining the same rendering pixels and models. Device-specific GPU limits still apply.

`model-transfer.json` records 59 losslessly compressed model variants, original and compressed SHA-256 hashes, and total transfer sizes. Browsers supporting DecompressionStream request `.glb.gz`; older browsers request the original `.glb`. All retain the same Meshopt decoder and approved model detail. Decoding uses one worker where supported, then releases it after five idle seconds. A browser without workers uses the same decoder on the main thread.

Final verification and public deployment identifiers are recorded in REPORT.md and deployment.json after publication.

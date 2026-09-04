# Janus Observatory release and rollback runbook

This runbook describes an immutable, provider-neutral deployment. A release artifact is the
application build plus the exact generated-data manifest that was built with it. The core Story,
Observatory, and Atlas must remain usable when WebGL and every AI provider are unavailable.

## Release modes

- **Internal candidate:** generated data may retain `candidate_not_reviewed`; the Research
  Companion remains off. This mode must not be represented as a reviewed public data release.
- **Public core release:** canonical review is signed, rights checks pass, and the core application
  ships with `JANUS_RESEARCH_PREVIEW_ENABLED=false` unless the separate AI release gate passes.
- **Public Research release:** all public-core gates plus provider canaries, prompt-injection tests,
  golden-answer evaluation, citation auditing, timeout behavior, and rate limiting pass against the
  deployed provider configuration.

## Required deployment inputs

Use Node 24, pnpm 10.10.0, Python 3.12 or newer, and the `uv` version pinned in CI. Record these
immutable identifiers in the release record:

1. Git commit and deployment artifact ID.
2. `data/generated/manifest.json` `dataVersion` and file checksums.
3. `data/assets/ledger.json` `ledgerVersion` and review timestamp.
4. Provider model IDs and embedding index hash when Research is enabled.
5. Reviewer identities and dates for scientific, editorial, accessibility, security, and rights
   gates. Human reviews cannot be inferred from an automated pass.

Copy `.env.example` into the deployment secret/configuration system. Never expose server keys with
a `NEXT_PUBLIC_` prefix. Set `JANUS_PUBLIC_BASE_URL` to the final HTTPS origin. Generate independent
random values for `JANUS_RATE_LIMIT_SALT` and `JANUS_TELEMETRY_HASH_SALT`.

Research admission is independently bounded by `JANUS_RESEARCH_RATE_LIMIT` per window and the
process-wide `JANUS_RESEARCH_MAX_CONCURRENCY` permit count. The process-local concurrency cap keeps
one instance from accumulating an unbounded retrieval/provider queue; production still needs a
shared edge or datastore limit across replicas. Research never trusts raw `X-Forwarded-For` or
`X-Real-IP`. To enable per-client buckets, configure a dedicated
`JANUS_RESEARCH_TRUSTED_IP_HEADER` plus a random `JANUS_RESEARCH_PROXY_SECRET`; the trusted edge must
strip inbound copies, overwrite that dedicated header with one validated IP, and add
`X-Janus-Proxy-Auth` only on the backend hop. Standard forwarding header names are rejected even
when configured. Missing, malformed, or unauthenticated proxy configuration falls back to a coarse
direct-client bucket; only its salted SHA-256 key is held in memory, and neither raw addresses nor
that key are logged. The disabled preview returns before body parsing, identity admission, index
loading, or provider calls.

The application enforces a static-first Content Security Policy that permits self-hosted Next.js
and R3F/Three resources while rejecting every frame origin. The decorative hero motion is a local
SVG/GSAP layer and makes no third-party runtime request. Inline scripts and styles remain allowed
because the static App Router shell and authored React styles require them; production does not
allow general JavaScript `eval`. Tightening this to nonce-based script/style directives would force
dynamic rendering, so it is a separate architecture decision rather than an undocumented release
tweak.

Do not enable `JANUS_ENABLE_HTTPS_UPGRADE` or `JANUS_ENABLE_HSTS` on local HTTP, a preview hostname,
or until the final origin serves valid HTTPS. `JANUS_ENABLE_HTTPS_UPGRADE=true` adds the CSP
`upgrade-insecure-requests` directive only after the application origin is HTTPS-ready; inferring this
from `NODE_ENV=production` breaks local production smoke tests in Safari because the browser upgrades
self-hosted HTTP scripts and styles to HTTPS. HSTS remains a separate opt-in and must wait until every
included subdomain is HTTPS-ready. TLS termination, HTTP-to-HTTPS redirect, certificate renewal, and
inbound HSTS behavior must be verified at the edge before promotion. The HSTS header deliberately
omits `preload`; joining the browser preload list requires a separate irreversible-domain review.

Public operational telemetry is cookieless and off unless
`NEXT_PUBLIC_JANUS_TELEMETRY_ENABLED=true`. Its endpoint accepts only bounded route names, Core Web
Vitals, device tier, reduced-motion/WebGL state, and the enumerated interaction events. It rejects
query strings and arbitrary text; it never accepts Research questions or provider reasoning.
By default, telemetry does not trust `X-Forwarded-For` or any other caller-supplied identity header.
If per-client edge rate limiting is needed, configure `JANUS_TELEMETRY_TRUSTED_IP_HEADER` and a random
`JANUS_TELEMETRY_PROXY_SECRET`, then make the trusted reverse proxy strip inbound copies, overwrite the
configured IP header, and attach the secret as `X-Janus-Proxy-Auth` only on the backend hop. Without
that authenticated boundary, requests use a coarse direct-client bucket and no network identifier is
logged.

## Reproducible preflight

Run from a clean checkout with the source files admitted by the source manifest available:

```bash
pnpm install --frozen-lockfile
uv sync --project pipeline --extra dev --locked
uv run --project pipeline janus-generate
git diff --exit-code -- data/generated
pnpm check
pnpm test:e2e
```

`janus-generate` writes deterministic release candidates, review packets, the lexical corpus,
versioned JSON/CSV downloads, and the independent-collapse validation report. A diff means the
release does not match the committed generated data and must stop for review.

Before public promotion, confirm all of the following:

- `/api/health` returns an operational core, the expected data version, the expected asset-ledger
  version/count, and the expected lexical-index hash. Its separate `canonicalDataReview` object must
  match the signed review artifact. The endpoint deliberately does not declare the whole service
  release-ready because provider, rights, deployment, security, accessibility, and other human
  release gates are assessed elsewhere.
- `/api/health/agent` exposes configuration state but no secret values.
- the review artifact still says `reviewed` only when an independent reviewer actually signed it;
- all rights, provenance, canonical-data, link/citation, bundle, build, Playwright, and axe gates
  pass in CI;
- desktop and target mobile devices meet the recorded LCP, INP, CLS, frame-rate, memory, initial
  payload, and deferred-path payload budgets;
- keyboard-only, reduced-motion, no-WebGL, 200%/400% zoom, VoiceOver, NVDA, touch, and context-loss
  checks have dated receipts;
- the Zenodo pipeline PDFs and all-rights-reserved artifacts remain link-only unless the ledger
  contains item-specific permission.

## Deployment and smoke checks

Build once and promote the same immutable artifact between environments. Do not regenerate data in
the runtime container.

1. Deploy with `JANUS_RESEARCH_PREVIEW_ENABLED=false` and `JANUS_AGENT_LIVE_ENABLED=false`.
2. Check `/`, `/observatory`, `/atlas`, all `/atlas/s1` through `/atlas/s10`, `/methods`, `/sources`,
   `/accessibility`, `/research`, `/api/health`, `robots.txt`, `sitemap.xml`, and the social image.
3. Exercise Begin, Read, Skip, Restart, keyboard step navigation, instrument switching, a three-way
   URL-backed comparison, structured-data disclosures, reduced motion, and the no-WebGL poster.
4. Confirm that a blank observation cell is described as not evaluated/listed for that method and
   never as proof of no technology.
5. If Research passed its separate release gate, enable the preview UI first while live calls remain
   off, verify lexical cited answers and fail-closed behavior, then enable live calls in a canary
   deployment. Promote only after the deployed provider probes and golden-answer evaluation pass.
6. Hybrid retrieval has a separate controlled-index gate. Follow
   [HYBRID_RETRIEVAL.md](HYBRID_RETRIEVAL.md); a configured provider without the matching prebuilt
   index must continue to report and serve lexical fallback.

## Monitoring and alert thresholds

Route structured platform logs and metrics to the deployment's retained monitoring sink. Alert on:

- `/api/health` non-2xx or a data/index/ledger hash that differs from the release record;
- five-minute HTTP 5xx rate above 1%, Research error rate above 5%, or Research p95 latency above
  its configured timeout budget;
- rate-limit saturation, provider circuit-open state, citation-audit failures, or an unsupported
  canonical claim;
- p75 LCP above 2.5 seconds, INP above 200 milliseconds, or CLS above 0.1 for a sustained release
  window, split by route/device tier/reduced-motion/WebGL fallback;
- runtime asset/chunk budget regressions or repeated WebGL context loss.

Do not store Research questions by default. Logs may include operational stage names, allowlisted
tool names, source IDs, model/version IDs, latency, token counts, cache status, error codes, and the
validated public telemetry envelope. Never log API keys, raw provider reasoning, retrieved prompt
injection text, or unhashed network identifiers.

## Rollback

Rollback is preferred over an in-place data or code repair when a release changes canonical facts,
citations, rights, accessibility, core navigation, or availability.

1. Immediately set `JANUS_AGENT_LIVE_ENABLED=false` for an AI-only incident. If the Research UI or
   index is implicated, also set `JANUS_RESEARCH_PREVIEW_ENABLED=false`; the core experience remains
   available.
2. For a core/data/rights incident, stop promotion and route traffic to the previously recorded
   immutable application artifact and its matching generated-data manifest. Never pair old code
   with new generated data or mutate generated files in production.
3. Purge only the affected CDN artifact after the previous release is serving; preserve logs and
   checksums for incident review.
4. Verify `/api/health` hashes against the previous release record and repeat the core smoke path.
5. Record impact, detection, data/model/asset versions, rollback artifact, and corrective action.
   A corrected release must repeat every affected gate; it does not resume from the failed step.

External provider, manual accessibility, scientific/editorial sign-off, and third-party permission
are release authorities, not code-completion claims. If one is unavailable, ship only the mode whose
gates are honestly satisfied.

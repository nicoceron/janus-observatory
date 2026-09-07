# Janus cinematic review

Isolated Remotion 4.0.520 workspace. No production Next.js imports or dependencies.
The two compositions are review artifacts, not replacement website videos:

- JanusSequenceReview: all 31 actual desktop browser frames, 77.5 seconds.
- ObserverForwardReverse: the 180 authored Blender frames forward and backward, 12 seconds.

## Reproduce

From this directory:

```sh
npm ci
node stage-review.mjs
npm run lint
npx remotion studio --no-open --port=3300
npx remotion render src/index.ts ObserverForwardReverse ../../docs/qa/cinematic-rebuild/observer-forward-reverse.mp4 --codec=h264 --crf=18 --concurrency=4
npx remotion render src/index.ts JanusSequenceReview ../../docs/qa/cinematic-rebuild/sequence-review.mp4 --codec=h264 --crf=18 --concurrency=4
```

Run the browser capture test and Blender authoring script first; staging copies their actual
outputs into the ignored public/review directory. Captures are evidence of state/layout,
not proof of smooth runtime playback. Inspect the live website as well as the contact sheets.

Original Blender assets and admitted CC BY 4.0 Earth textures retain their credits in
../../data/assets/ledger.json (repository path data/assets/ledger.json).
The character and stellar structure are fictional interpretations, not scientific evidence.

For the 2026-09-05 character-v2 browser review, use `node stage-review.mjs --browser-only` and
render `JanusSequenceReview` to `../../docs/qa/refinement/sequence-review.mp4`. This deliberately
does not refresh or relabel the older v1 Blender action frames as v2. Runtime motion is checked
separately by the native browser capture script.

Remotion's free license covers individuals and organizations of up to three people. A larger
organization must confirm its company license: https://www.remotion.dev/docs/license/pricing.
No paid license or generative-video credits were purchased. The workspace is not published.

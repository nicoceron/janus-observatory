# Fab observer source intake

The public story derivative at
`apps/web/public/assets/models/janus-alien-observer-v4.glb` combines two user-selected Fab
assets. Their exact contribution and downstream transformations are recorded in
`data/assets/ledger.json`.

## Controlled source inputs

- **Cute Alien Character** — Ndevisuals —
  [Fab listing](https://www.fab.com/listings/e659c1e0-d53c-4146-b877-a5496d0a7598) — CC BY
  4.0 — expected package `cute-alien-character.zip` — SHA-256
  `b887ace9d23987347ce20310c08d2e04b4359948fcffeadbba018598f9a42ba1`.
- **Telescope** — Usman Ahmed Gill —
  [Fab listing](https://www.fab.com/listings/ad439e6a-e804-468b-93ac-f1b6d649a883) — Fab
  Standard License — expected package `telescope.zip` — SHA-256
  `57a20d0a8f6ca782ba8aee4595685b0ac66a4f06f91ae75aae7baa36db6bce4b`.

The packages, extracted source files, and editable combined `.blend` are intentionally ignored.
Obtain them through Fab under the applicable license; do not commit or redistribute the telescope
as a standalone source asset.

## Rebuild

Extract the packages into the paths consumed by `build_fab_observer.py`, then run:

```sh
/opt/homebrew/bin/blender -b --python assets/sources/fab/build_fab_observer.py
```

The script separates the authored arm meshes, creates shoulder and wrist controls, and builds a
four-second reach/focus/settle loop with body, blink, and antenna secondary motion. It also renders
Blender QA frames, preserves an editable local derivative, and exports the web GLB. The admitted
derivative checksum is recorded in the asset ledger after contact-sheet and glTF validation.

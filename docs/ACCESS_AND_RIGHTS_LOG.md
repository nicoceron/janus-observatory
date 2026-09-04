# Access and rights log

This log records access claims separately from public reuse rights. Access to a private workspace or
permission to inspect research material does not automatically authorize public redistribution.

## 2026-08-30 — Complete asset-ledger publication contract

- All 33 asset records now identify the source agency, an evidence-backed retrieval/review date,
  and a maximum decoded raster size or explicit `null`. Dates were normalized to `YYYY-MM-DD` from
  dates already recorded in source versions, generation records, decisions, or this log; no
  unrecorded time of day was invented.
- Link-only records explicitly contain no local source checksum, derivative checksum, public path,
  or transformation history. `approved`, `link_only`, and `excluded` describe project admission
  separately from the underlying license/rights status.
- Each of the 24 public-derivative records retains original and derivative SHA-256 values plus a
  human-readable history and machine-checkable applied/allowed transformation sets. Those records
  cover 23 files because the two licensed sources in the combined observer GLB intentionally share
  one derivative group and checksum.
- Validation now decodes WebP/JPEG MIME and dimensions, validates GLB 2 headers and byte length,
  checks exact responsive Earth tiers, rejects accidental duplicate public paths, and confirms that
  every file below `apps/web/public/assets` is admitted.

Interpretation: an `approved` rights record may still have no local derivative. A `link_only` record
is discoverable and citable but cannot imply local custody or redistribution. See
`docs/DECISION_006_ASSET_LEDGER_PUBLICATION_CONTRACT.md` for the full contract.

## 2026-08-29 — Responsive Earth texture derivatives

- The existing 4096 × 2048 Earth day, night, and packed bump/roughness/cloud JPEGs remain pinned to
  Three.js commit `2431a09f46f34c560bc8e44b33be0e567723d5b9`. The Three.js example credits
  Solar System Scope and identifies the textures as CC BY 4.0.
- Janus Observatory generated 2048 × 1024 and 1024 × 512 WebP variants directly from those pinned
  files with cwebp 1.6.0, method 6, sharp YUV conversion, and metadata removal. Day and night use
  quality 88; the packed channel map uses quality 94. The exact commands, source checksums,
  derivative checksums, modification notices, and public paths are recorded separately for all six
  derivatives in `data/assets/ledger.json`.
- The runtime treats day/night as sRGB and the packed map as non-color channel data. Low/mobile
  devices receive the 1K set, the bounded medium tier receives 2K, and only a wide, explicitly
  high-capacity desktop receives the retained 4K set.

Interpretation: these are responsive presentation derivatives of admitted CC BY 4.0 textures, not
new scientific datasets or NASA Black Marble products. The packed map remains a high-quality lossy
derivative of an already-lossy JPEG and requires rendered visual QA for bump, roughness, and clouds.

## 2026-08-13 — Fab alien observer and telescope

- The project owner selected “Cute Alien Character” by Ndevisuals from Fab under CC BY 4.0 and
  “Telescope” by Usman Ahmed Gill under the Fab Standard License. The applicable Fab EULA was
  accepted to obtain the source packages.
- Original package SHA-256 values are
  `b887ace9d23987347ce20310c08d2e04b4359948fcffeadbba018598f9a42ba1` (alien) and
  `57a20d0a8f6ca782ba8aee4595685b0ac66a4f06f91ae75aae7baa36db6bce4b` (telescope).
- Janus Observatory separates the source character's mirrored sleeve, cuff, and hand meshes and
  adds object-level controls for both shoulders and the near wrist, a four-second
  anticipate/lean/reach/focus/settle performance, body motion, blink and antenna secondary motion,
  named telescope optical-axis locators, scene staging, and web export. The 1.1 MB combined
  derivative is `apps/web/public/assets/models/janus-alien-observer-v4.glb`, SHA-256
  `4eff902d4a81bd124674a1f25c164a7326dbf9cc97e6f33801d2279d280c2527`. The ignored editable
  Blender derivative is SHA-256
  `caaf1ab1cd4a9e8cd02a7cb1b02a0d1453e25f460f74dc6d00ffb93e6e1f5039`.
- The downloaded packages, extracted files, and editable `.blend` remain ignored controlled inputs.
  The Fab telescope source is not redistributed as a standalone asset.

Interpretation: the combined scene is a licensed, fictional observer visualization—not a Project
Janus artifact, NASA mission render, HWO design, or validated scientific instrument. Credits,
permitted transformations, checksums, and public path are recorded in `data/assets/ledger.json`.

## 2026-08-12 — Direct Project Janus content authorization

- The project owner supplied a Slack screenshot of a direct exchange with Jacob Haqq-Misra.
- The owner asked: “Am I authorized to take every content ever made in Project Janus?”
- Jacob replied: “Yes you are!” and quoted the BMS handbook section “Intellectual Property and
  Inventions,” which says intellectual property generated through the company remains with the
  inventor and the company lays no claim to affiliated individuals' copyrights, patents, or other
  intellectual property.
- The unchanged evidence file is preserved in ignored permission intake as
  `incoming/permissions/2026-08-12-jacob-haqq-misra-project-janus-content-authorization.jpg`.
- SHA-256:
  `9a960327ca5ca5a87dfead03363bc9540255b8eef2401e43ebf28154a1c60083`.

Interpretation: this is strong direct evidence that Jacob authorizes the project owner to use
Project Janus content within Jacob's authority and that BMS does not claim affiliated creators'
intellectual property. It is not a chain-of-title document for every contributor, does not grant
Jacob rights owned by other artifact creators, and does not by itself override the blank Zenodo
license field or the item-specific “all rights reserved” notices. Those records remain link-only
until the relevant rights holder gives specific reuse permission or a compatible public license is
recorded.

## 2026-08-12 — Project Janus Slack access

- The project owner reported direct membership in the private `project-janus` Slack channel and a
  direct contact route to Jacob Haqq-Misra and George Profitiliotis.
- The project owner stated that Jacob explicitly authorized access to the relevant Project Janus
  material.
- Screenshots supplied in the working conversation show Jacob posting an update about new artifacts
  and show `jacob@bmsis.org` in his Slack contact card.
- This establishes a credible direct acquisition route. It does not, by itself, establish permission
  to redistribute blank-license scenario PDFs or all-rights-reserved creative works.

Action: use Slack DMs or the private Project Janus channel for the requests in
`docs/ACQUISITION_GUIDE.md`. Export or screenshot the complete reply, including sender and date, and
store it in the appropriate ignored `incoming/permissions/` directory.

## 2026-08-12 — Newly published artifacts

The live public artifacts page lists five additions beyond the original three-item inventory:

| ID     | Title                                                   | Creator            | Rights shown publicly                         | Observatory status                               |
| ------ | ------------------------------------------------------- | ------------------ | --------------------------------------------- | ------------------------------------------------ |
| S3.2.3 | Children's Doll: Toying with Reality                    | Taylor Michaels    | All rights reserved                           | Link only pending permission                     |
| S3.2.4 | Aelin's Journal                                         | Taylor Michaels    | All rights reserved                           | Link only pending permission                     |
| S4.2.1 | Luna's Travels: Sketches of the Eastern Crescent Plains | Clara Mae Gonzales | All rights reserved                           | Link only pending permission                     |
| S6.2.5 | Testimony of the First Water                            | Snehal Gupta       | All rights reserved                           | Link only pending permission                     |
| S8.2.2 | Technician's Manual for Civilizational Resilience       | Yareli S Arenas    | CC BY 4.0; generative-AI assistance disclosed | Eligible after checksum and attribution manifest |

Source: [official Project Janus artifacts page](https://futures.bmsis.org/artifacts), inspected live
on 2026-08-12. The public page displays artifact ID S6.2.5 while the linked brochure filename appears
as `S2.6.5.pdf`; retain that discrepancy in provenance metadata rather than silently correcting it.

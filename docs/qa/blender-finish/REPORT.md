# Blender finishing: delivery and verification

Presentation baseline: the 2026-09-12 [open-systems pass](../open-systems/REPORT.md) supersedes the single-body story tabs and revises the Earth roads. Native model and resource receipts in this folder now include that subsequent pass.

2026-09-12, America/Bogota. Local Blender source, web integration and acceptance record. Receipt timestamps use UTC.

## Delivery

The [editable-source guide](../../../assets/blender/README.md) links **11 Blender 5.2.1 LTS files containing 48 scenes**: origin Earth, ten scenario Earths, and 37 canonical-selected companion/system portraits. **59 compressed runtime GLBs** provide desktop/mobile Earth libraries and the selected off-world scenes. Their combined size is **15,848,444 bytes**; the largest is **831,636 bytes**. The editable source files total **7,990,993 bytes**. These are catalog sizes, not initial downloads.

Models retain named construction meshes, materials and editable geometry. Earth timelines preview routes, clouds and articulated joints. Disposable export copies are merged only within semantic parts, preserving moving pivots, and compressed with the installed official glTF exporter. The web keeps one canvas, loads the visible portrait, serializes decoding and retains at most two settled libraries. Native geometry bounds frame architectural closeups; keyboard-accessible DOM controls provide the same object selection and rotation functions.

[Art direction](../../BLENDER_WORLD_ART_DIRECTION.md), [Decision 020](../../DECISION_020_BLENDER_FINISHING.md), [art manifest](art-manifest.json) and the [asset ledger](../../../data/assets/ledger.json) record source versions, transformations and original-art admission. All 59 derivatives have verified source and output checksums. Artwork version is `blender-finish-v8-2026-09-11`.

Canonical destination selection comes from `JANUS-PAPER-01`, `arXiv:2409.00067v3`, Tables 6 and 8, with cited scenario descriptions informing interpretation. Geometry, species, dimensions and movement are **interpretive artwork**, not scientific measurements or forecasts. Unselected destinations do not establish absence. S1 Venus and S9 Luna are orbital portraits; S5/S10 Venus are atmospheric; S6 Venus has surface works; S9 Venus has an autonomous machine aperture. S5 Mars has open gardens, while Luna retains contained pressure facilities. Canonical scientific values were not changed.

## Visual review

The [native review manifest](final-render-manifest.json) binds **144 front/quarter/rear images across 48 scenes** to final model hashes. Changed geometry was rerendered; [differential review](differential-review.json) records the changed and byte-identical files. Each scenario was also reviewed in the running site, including its selected destinations and individual objects. Earlier iteration images are retained as history; use the final browser delivery manifest for current views.

| Finding                                                 | Finished correction                                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated or indistinct off-world construction           | Scenario-specific settlements, industrial systems, autonomous machines, biological structures and ice extraction. All 37 off-world structural signatures are distinct, ignoring paint and names.                       |
| Crowded moons, orbital works and ringed bodies          | Greater physical separation, corrected elevations and clear silhouettes across three native angles.                                                                                                                    |
| Buried Venus aerostat cabins                            | Raised complete atmospheric assemblies, with visible sky between cabin and planet in front, quarter and rear views.                                                                                                    |
| Kuiper objects resembled asteroid yards                 | Cleaved two-lobed ice bodies, portal drills, separated power/support sites and scenario-specific processing.                                                                                                           |
| Bare mills and weak construction detail                 | Door/window recesses, lintels, sills, masonry, fascia, gable vents, race, axle and connected wheel construction.                                                                                                       |
| Disconnected canoe crew and paddle grip                 | Connected seated anatomy and separate articulated upper arms, forearms and hands targeting the moving paddle in Blender and the site. Reviewed through 24 stroke frames.                                               |
| Unsupported cargo-cycle fork                            | Fork blades terminate at the front axle; rear axle and cargo supports connect to the load platform.                                                                                                                    |
| Floating manifold components                            | Common skid, correctly sized vessel saddles, valve-to-bus pipes and bus supports.                                                                                                                                      |
| S9 Venus inspection showed the wrong structure          | Both native inspection asset and procedural fallback now show its autonomous aperture.                                                                                                                                 |
| Cropped portraits, crowded closeups and S9 scroll jumps | Height-aware planet framing, actual exported bounds for static landmarks, upper-biased architectural closeups, compact destination labels and reserved footer space. Inspector return preserves exact scroll position. |

The original aircraft, moving transport, seasonal craft, wildlife, biological growth and machine activity remain scenario-specific. The alien/telescope interaction and motion passed regression checks alongside the new model integration.

## Verification

- [Geometry audit](geometry-audit.json): all **59 GLBs decoded**, 11 source checksums and required semantic parts verified; finite geometry and budget checks passed. Maximum decoded geometry per file: **2,668,320 bytes**. Geometry uniqueness alone is not evidence of visual quality; renders and browser views were reviewed separately.
- [Unit tests](unit-final.log): **117 passed in 30 files**. [Typecheck](typecheck-framing.log), [lint](lint-framing.log), [production build](build-web-final.log) and [bundle audit](bundle-final.log) passed.
- [Browser regression](e2e-final.log): **44 passed, 6 intentional skips** across Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit. [Fallback regression](e2e-fallback.log): **10 passed**. [Native closeup rotation/reset](e2e-framing.log): **5 passed**. Total: **59 passing checks**. Skips limit alien pixel-motion assertions to Chromium and desktop destination-row checks to desktop profiles.
- [Direct mesh-click check](mesh-click.json): clicking the visible S7 Blender watermill in the canvas opened its native closeup successfully; before/after screenshots are retained.
- Those checks cover source-selected asset readiness, retry after failed GLB loading, WebGL failure, JavaScript-disabled content, persistent canvas identity, world navigation, keyboard/focus, reduced motion, telescope entry/exit/backscroll, S9 destination layout and native closeup rotation/reset.
- [Full motion receipt](browser/final-capture.json): **94 story portraits, 186 screenshots, 49 motion frames and 192 exact stillness checks**, with no captured console errors or failed model requests. Motion includes canoe, airplane, ferry, deer, maintenance walker and sail barge. This precedes the final static manifold/framing changes; those changes do not alter the life-actor motion branch.
- [Final browser delivery manifest](browser-delivery-manifest.json) records final image and model hashes and distinguishes current stills from retained motion evidence. The final pass passed all 94 story portraits, 186 screenshots and 186 exact stillness checks, with no captured errors or failed model requests. Serial desktop/phone captures cover every source-selected portrait, study and desktop Earth object, model readiness and scroll preservation.
- [Assets](assets-final.log), [canonical data](canonical-final.log), [sources](sources-final.log) and [links/citations](links-final.log) passed. The existing published growth-rate discrepancy warning remains explicit; neither published value was silently reconciled.
- Initial home JavaScript: **193,783 gzip bytes** against 256,000. Conservative complete-journey totals are approximately **11.99 MB desktop / 17.14 MB mobile**, below the **20,971,520-byte** budget. Mobile includes both Earth tiers because detailed inspection uses desktop libraries. See [delivery metrics](delivery-metrics.json) for exact totals and [bundle audit](bundle-final.log) for accounting assumptions.

## Resource limits and measured use

Native jobs ran serially with **two CPU threads**, nice adjustment 12, a **4 GiB sampled RSS ceiling**, build/review deadlines and memory-headroom checks. The final eleven-file build took **20.161 seconds** with a largest sampled owned RSS of **374,751,232 bytes**. The largest successful review process across the recorded attempts used **1,382,858,752 bytes (1.29 GiB)**. Sampling occurs every 0.5 seconds; these figures exclude other applications and GPU memory.

The runner refuses conflicting background Blender work, and only terminates its own process group on a guardrail violation. A previously inspected idle Blender GUI was left untouched. All final native jobs exited; no rendering job remains running. Browser QA was serial with one page at a time. The full motion receipt observed at most two settled model libraries and **3,836,286 decoded bytes**; this is a buffer estimate, not total browser memory.

## Limits

Verified locally at port 3200; no deployment is claimed. Physical-phone frame rate, long-session thermals and low-memory GPU behavior were not measured. Bounded jobs and payload/memory checks reduce load, but cannot establish crash immunity on every computer. Scientific data and content retain their existing reviewed provenance; original model design remains interpretive.

# Decision 016: scenario identities and the worlds beyond Earth

2026-09-08 · `codex/janus-first-light`.

The user accepted the living low-poly art and asked for more scenario-specific objects, less
repetition and the Moon/Mars/other locations described in Project Janus. Preserve the accepted
character performance, opening Earth and native scroll story. Refine the ten scenario portraits.

## Sources and interpretation

Read the locked foundational paper, arXiv:2409.00067v3, especially rendered page 11 (Section 3.2),
Table 6 (planetary signatures) and Table 8 (system signatures). Inspect all ten locked Zenodo
pipeline documents for narrative and human-needs context. The latter remain link-only: no PDF,
copied artwork or substantial pipeline text is added to the public app.

| Scenario | Narrative cue                                                 | Original visual interpretation                                                              |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| S1       | Centralized resource control and privileged space settlements | Surveillance lenses, ration gates, linked tenements and civic towers                        |
| S2       | Resource competition, industry and tourism                    | Freight machinery, conveyors, derricks and fortified compounds                              |
| S3       | Distributed abundance and small off-world settlements         | Open civic pavilions, varied garden homes and community infrastructure                      |
| S4       | Seasonal migration and artisanal subsistence                  | Temporary shelters, drying racks, canoes and varied forest species                          |
| S5       | Biosynthetic enhancement and terraforming                     | Growth chambers, ribbed organic buildings and a garden Mars                                 |
| S6       | Fragile planetary life support                                | Different reactors, radiators and pressure systems; engineered Mars and Venus               |
| S7       | Ecological repair and regional knowledge networks             | Waterworks, workshops, seed storage and adaptive reuse                                      |
| S8       | Repeated collapse and elite lunar/underground shelters        | Armored hatches, salvage, broken communications and lunar shelters                          |
| S9       | Machine civilization leaves Earth                             | Sparse gifts on a natural Earth, varied machine structures and a solar collector vignette   |
| S10      | Restored Earth and autonomous systems beyond it               | Restrained surface settlement, distinct inhabited orbital structures and off-world habitats |

All designs, dimensions, counts, spacing, terrain and architectures are interpretive. They are
not reconstructions or encodings of canonical measurements. Companions form a system portrait,
not an orbit diagram: displayed sizes and distances are not to scale.

## Data boundary

A deterministic server-side view derives named companion bodies from positive published Table 6
cells and extended activity from Table 8. It preserves field SourceRefs. Null/unlisted cells do
not establish absence, and the view explicitly represents a selected published footprint rather
than a complete inventory. The client receives body/activity identifiers only; no scientific
values or new factual records are authored in component literals or generated at runtime.
Canonical generated files and shared data schemas remain unchanged.

World labels and the structured published-footprint list live in DOM. Three.js only builds and
positions geometry. Labels use documented Vector3 projection. Review installed Next.js client
boundary guidance and Three.js geometry/projection source documentation before implementation.

## Construction and verification

Replace regular repeated prop bands with irregular clusters, multiple building silhouettes and
scenario-specific focal objects. Reuse basic geometric primitives while varying the constructed
objects themselves. Static details remain merged. Companion objects have bounded geometry and
disposal, and their complete visibility state derives from scroll progress. Preserve reduced
motion, fallback, deterministic jumps and the observer/telescope interaction.

No dependency or shared schema change. Version the original world art in the asset ledger with
the complete source checksum; retain v3 evidence. Validate provenance selection, geometry budgets,
all scenario portraits on desktop/portrait, motion, keyboard/reversal, fallback, build, payloads,
formatting and citations. The handoff records measured outcomes and remaining device limitations.

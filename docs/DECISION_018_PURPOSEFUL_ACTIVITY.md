# Decision 018: distinct actors with reasons to move

2026-09-08, user-directed refinement of Decision 017 on `codex/janus-first-light`.

The user rejected the generic oval traffic loops and repeated casts with cosmetic differences.
The opening airplane had also been dropped from the active cast while its unused old builder
remained. The baseline review in `qa/purposeful-worlds/before/loop-review.jpg` shows the resulting
racetrack behavior. Its failure is narrative and motion coherence, irrespective of prior passing
interaction and geometry tests.

Replace generic type slots and automatic duplicate actors with authored activities. Every activity
names two destinations, an action, a specific machine or animal, a travel duration and a rest/task.
Each scenario has a different active cast. Shared background vegetation remains a reusable art
language; moving actors must express the scenario rather than fill the scene.

| Scenario | Activity and reason                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Origin   | Regional airplane linking airfields; restores the aircraft in the opening world.                                                   |
| S1       | Controlled supply trip between depot and checkpoint; a ducted surveillance drone travels from tower to checkpoint and scans.       |
| S2       | One heavy truck moves ore to the conveyor, tips its bed and returns empty.                                                         |
| S3       | Shared passenger ferry between quays and regional airplane between airfields; no generic bus or decorative bird.                   |
| S4       | Timber canoe between seasonal landings; one deer walks to a clearing and browses.                                                  |
| S5       | Biosynthetic pollinator moves between living structures; generic car and skiff removed.                                            |
| S6       | Six-legged service walker braces and lowers a tool at life-support equipment; no reskinned rover.                                  |
| S7       | Operated cargo tricycle delivers between workshop and seed store; sailing cutter links regional landings; mills remain functional. |
| S8       | Tracked recovery crane carries salvaged structure to its yard, lowers its load and returns; no reskinned rover.                    |
| S9       | Quiet Earth deliberately has no decorative traffic cast. The gift and separately inspected machine system carry its identity.      |
| S10      | Shallow cargo barge with balanced lug sail and orchard crates; autonomous expansion stays in the separate system views.            |

The source interpretation uses the unchanged generated morphology summaries and Section 3.2.1 of
arXiv:2409.00067v3. Vehicles, species, exact tasks, destinations and routes are original interpretive
art, not claims that the papers prescribe those technologies or a physical simulation. The canonical
release and body inclusion rules are unchanged.

Open routes connect terrain-supported approaches. Ground paths avoid water and cliff jumps;
aircraft altitude follows a smooth climb/descent independently of terrain steps. Arrival, rest,
turn and return states are continuous. Wheels and leg motion derive from traveled distance, with
zero movement during task pauses. Working assemblies and cargo are separate articulated parts.
The explorer remains a single canvas with DOM descriptions, keyboard controls and source links.

Terrain graph planning is prepared offline by `scripts/generate-activity-paths.ts`. Its generated
JSON is original art geometry, separate from canonical scientific data. The browser restores the
prepared meshes and poses rather than solving routes while the user scrolls. No dependency was
added. The generator, source geometry and generated paths are included in the asset checksum.

Documentation consulted before implementation: installed Next.js Server and Client Components
guide; [Three.js CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html) for open
paths and [Quaternion](https://threejs.org/docs/pages/Quaternion.html) for continuous orientation.
Animation review follows the existing contact-sheet and motion-coherence quality gate.

Verification, visual receipts, source and asset versions, and remaining limitations are recorded
in [the activity review](qa/purposeful-worlds/REPORT.md).

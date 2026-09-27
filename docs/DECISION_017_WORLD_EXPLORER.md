# Decision 017: individual worlds and inspectable living miniatures

2026-09-08. User-directed refinement of Decision 016, on `codex/janus-first-light`.

The baseline contact sheet showed overlapping companion silhouettes, unreadably small props,
static clouds close to the terrain, crude vessels and birds, and no surface traffic. Review all
ten world portraits before changing them. Preserve the accepted lore, native story navigation,
observer/telescope performance, low-poly art direction and scientific boundaries.

Give the main world a larger uninterrupted portrait. Move companions into a deliberate world
explorer: each body receives the whole view, with explicit controls instead of a crowded ring of
satellites. The same WebGL canvas serves story and explorer; DOM controls provide body selection,
object descriptions, keyboard access, focus restoration, Escape and a source route. Pointer motion
no longer moves the scene. Drag rotation is an intentional interaction inside the explorer only.

## Individual audit and model direction

| World | Keep                             | Rework and add                                                                                                  |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| S1    | Controlled skyline               | Articulated city traffic, finished checkpoint/tenement/depot details, connected lunar pressure district         |
| S2    | Excavation silhouette            | Loaded multi-axle haulers, loading equipment and lunar extraction yard                                          |
| S3    | Civic gardens                    | Glazed passenger ferry, community shuttle, civic joinery, greenhouse and research habitats                      |
| S4    | Forest and peaks                 | Proper canoe, walking deer, articulated cranes, camp fabric and practical craft equipment                       |
| S5    | Engineered biosphere             | Curved organic architecture, articulated bio-ray, biological transit, garden Mars and suspended Venus aerostats |
| S6    | Engineered shell                 | Moving maintenance rovers, service plumbing, thermal hardware and pressure settlements                          |
| S7    | Adaptive reuse                   | Shaped sailing cutter, cargo cycle, walking ibex, functional-looking mill/workshop assemblies                   |
| S8    | Fracture and ruins               | Salvage rover, braced ruins, buried lunar shelters with access and utilities                                    |
| S9    | Quiet Earth, machine expansion   | Wildlife and ferry on Earth; separately inspected machine worlds and solar construction                         |
| S10   | Restored Earth, autonomous space | Wildlife and light transport; enlarged pressure habitat and connected off-world infrastructure                  |

All object geometry, routes, species, dimensions and architecture are original interpretive art.
Body inclusion still comes from the canonical Table 6/Table 8 view; no component invents scientific
values. Orbital-only entries remain orbital-only. Locked arXiv:2409.00067v3 and pipeline narrative
references are unchanged, as are generated data and shared schemas.

Use documented Three.js BufferGeometry/CatmullRomCurve3 and R3F pointer events/controls. Lofted
cross-sections and cambered membranes replace flattened primitive vessels and fauna. Precompute
terrain routes; no per-frame terrain raycasts. Separate cloud layers drift above the surface.
Activity stops in hidden scenes and reduced motion. Geometry and materials are disposed.

No dependency changes. Existing loading/frame budgets remain acceptance gates. Validate geometry,
route support, interaction/focus/escape, all worlds at desktop and portrait sizes, motion contact
sheets, original-art ledger/checksums, canonical data, tests, build and measured payloads. Record
actual results and environment limitations in the handoff rather than asserting physical-device
performance from a desktop viewport.

## Integration details

The geometry guard retains a 20,000-triangle ceiling on the merged ambient world and allows
12,000 triangles for one independently inspected companion. The former combined companion-ring
budget no longer describes the rendered scene: companions are generated on selection and one is
shown at a time. The inventory guard remains below 40,000 triangles per source-selected system;
it is not a claim that every inventory mesh is mounted together.

Ground traffic and focal objects project onto the actual triangulated terrain or engineered shell.
Routes are prepared once, include closed-loop orientation samples, and are verified for water or
land support. Mill rotors, articulated limbs, wheels, wings and vessel roll remain separate moving
parts. Geometry bounds fit object studies; individual story framing protects controls from foliage.

The dialog records the clicked invoker explicitly because Safari does not consistently focus a
button on pointer activation. Closing restores that element without scrolling. Native browser
scroll padding reserves the fixed story toolbar area when links or keyboard focus are brought
into view, following the documented CSS scroll-padding behavior.

Documentation consulted: [Three.js BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry),
[CatmullRomCurve3](https://threejs.org/docs/#api/en/extras/curves/CatmullRomCurve3),
[R3F events](https://r3f.docs.pmnd.rs/api/events),
[Drei controls](https://drei.docs.pmnd.rs/controls/introduction), installed Next.js client-component
and R3F Canvas implementation documentation, and
[CSS scroll padding](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-padding-bottom).

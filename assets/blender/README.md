# Editable Janus worlds

Open these source files in **Blender 5.2**. Each opens on its assembled Earth scene; use the **Scene** dropdown to switch to a companion or system destination. `Moon` is the scene name for Luna.

| Source                       | Scenes available                                          |
| ---------------------------- | --------------------------------------------------------- |
| [origin.blend](origin.blend) | Earth                                                     |
| [s1.blend](s1.blend)         | Earth, Moon, Mars, Venus, asteroids, outer                |
| [s2.blend](s2.blend)         | Earth, Moon, Mars, asteroids                              |
| [s3.blend](s3.blend)         | Earth, Moon, Mars, asteroids, outer                       |
| [s4.blend](s4.blend)         | Earth                                                     |
| [s5.blend](s5.blend)         | Earth, Moon, Mars, Venus, asteroids, outer, kuiper        |
| [s6.blend](s6.blend)         | Earth, Moon, Mars, Venus, asteroids, kuiper               |
| [s7.blend](s7.blend)         | Earth                                                     |
| [s8.blend](s8.blend)         | Earth, Moon                                               |
| [s9.blend](s9.blend)         | Earth, Moon, Mars, Venus, asteroids, outer, kuiper, solar |
| [s10.blend](s10.blend)       | Earth, Moon, Mars, Venus, asteroids, outer, kuiper        |

Inventory comes from the [model receipts](../../docs/qa/blender-finish/), which record scene names, exports and checksums. Scene names include the world prefix, for example `S5 • Mars`. The sources produce 59 web GLBs: two Earth detail tiers per source and 37 selected companion/system portraits.

## Editing

- In the Outliner, expand **Earth • editable assembly** or the destination's **native editable construction** collection. Construction pieces retain descriptive names for frames, panels, rigging, joints and other details. **Studio** collections contain lights and cameras.
- Earth instances share editable mesh data with the excluded **Library • desktop** collection. Edit a component in **Edit Mode** to update its linked instances. Make its mesh single-user first when changing only one instance. Object transforms position an instance; mesh edits change its shape.
- Keep semantic parents and local joint pivots intact. Bodies, wheels, limbs, paddles, propellers and mill mechanisms are separate parts so their articulation survives export. Enable the Library collection only when inspecting these parts in local coordinates.
- Airports, connected piers and other route facilities are editable `Activity_<actor>_stops` / `Activity_<actor>_road` library meshes. Their assembled instances and the website use those same semantic parts. Route centerlines remain authored offline; changing a berth or runway requires regenerating the route samples as well as the model.
- `Cloud_*` library objects retain a **Fused cumulus silhouette** voxel Remesh modifier. The source stays editable; only the disposable GLB export copy applies this modifier. Lunar craters and the Mars canyon are modeled into their native terrain mesh, rather than floating overlays.
- Earth's timeline contains a **40-second preview at 24 fps**, frames **1–960**, for authored trips, joints and clouds. Scrub or play it to inspect motion. The website continues to use its R3F motion controller; these Blender previews do not replace its live routes, pauses or reduced-motion behavior.
- The artwork uses geometry, vertex colors and Blender materials. There are no external image textures to relink. These are interpretive miniatures; their architecture, dimensions and object counts are not scientific measurements.

## Regenerating a source

**Save manual edits under a separate filename before rebuilding.** The generated `.blend` and corresponding GLBs are overwritten by a build. Saving a manual variant does not automatically update the website; repeatable changes belong in the Blender authoring scripts and must be exported, reviewed and admitted with new checksums.

From the repository root, regenerate the art exchange only when its inputs have changed, then build the chosen world through the serial guard:

```sh
pnpm exec tsx scripts/export-blender-seeds.ts
python3 scripts/run-blender-worlds.py --worlds s5 --phase build
python3 scripts/run-blender-worlds.py --worlds s5 --phase review
```

Omit `--worlds s5` to process all eleven sources serially. `--resume` skips only matching successful receipts. Builds write the `.blend` here, web assets under `apps/web/public/assets/blender/v1/`, and logs/resource receipts under `docs/qa/blender-finish/`. After the complete output set has been reviewed, `pnpm exec tsx scripts/record-blender-art.ts` verifies it and records source/derivative hashes in the asset ledger.

The guard launches one private background Blender process group at reduced priority with **two CPU threads** and a default **4 GiB sampled RSS cap**. It requires at least 4 GiB available memory at launch and stops its own job if free + inactive memory falls below 2 GiB. Other Blender processes block launch unless an already inspected idle GUI is explicitly identified with `--idle-gui-pid PID`; that GUI must remain below the monitored CPU/RSS limits and is never modified or stopped. Logs retain the measured resource use and any guard interruption.

For visual intent, see [world art direction](../../docs/BLENDER_WORLD_ART_DIRECTION.md). For the source/export contract, see [Decision 020](../../docs/DECISION_020_BLENDER_FINISHING.md). Verification results and remaining limitations belong in the [QA report](../../docs/qa/blender-finish/REPORT.md); source/export availability alone does not establish final visual acceptance.

The September 20 geometry, cloud and transport refinements are documented in [Decision 028](../../docs/DECISION_028_PLANET_POLISH.md) and the [dated review](../../docs/qa/planet-polish-2026-09-20/REPORT.md).

The September 30 contour coastlines, lower clouds, globe-wrapped S2 pit, grounded ruins, Venus cloud deck and lobed asteroids are documented in [Decision 034](../../docs/DECISION_034_CONTOUR_COASTS_AND_EXPERIENCE_POLISH.md) and its [review](../../docs/qa/planet-polish-2026-09-30/REPORT.md). Terrain facets receive the faceted water material only where their colour matches the world's ocean colour, so green land and pale beaches keep the mineral finish.

# Decision 014: sculpted low-poly worlds and an alien astronomer

Date: 2026-09-07. Branch: `codex/janus-first-light`.

The user rejected the previous procedural models and requested a complete low-poly redesign,
including the alien. This decision supersedes Decision 013's art direction while retaining its
native scroll, persistent canvas, scientific data, accessible article and telescope interaction.

The models are rebuilt around visible polygon faces, matte materials, limited palettes and a few
deliberate landmarks per world. Surface-noise shaders, smooth weather shells, dense scatter and
the cephalopod anatomy are removed. Ten miniature worlds have distinct constructed silhouettes. Planet yaw is bounded to keep each
world's defining landmarks visible during a long reading pause.
The new observer is an original articulated alien astronomer with a sculpted face, clothed torso,
jointed arms, hands and legs. The telescope is rebuilt in the same faceted visual language.

All geography, structures, proportions and anatomy are original artistic interpretation. Runtime
scientific values and generated canonical data remain unchanged. The four original-art ledger
records and fallback poster are versioned with new source/derivative checksums. No dependency or
shared schema change is required.

References read: installed Next.js server/client and lazy-loading guides; official Three.js
PolyhedronGeometry, BufferGeometry and MeshStandardMaterial documentation. The animation quality
gate is applied to silhouette, subject dominance, motion coherence and sampled-frame aesthetics.
Final verification and accepted captures are recorded in `docs/qa/low-poly/REPORT.md`.

## Detail iteration: v2

The user accepted the low-poly direction and requested more detailed planets. Preserve the
silhouettes, matte palettes, observer, telescope and chapter choreography. Add authored details
at a smaller scale: city facades and transit, quarry machinery and haul routes, settlement plots,
branching rivers and bridges, botanical gardens, shell insets, climbing vines, fractured roads,
sail ribs and habitat paneling. These are fictional decorative features, not new scientific claims.

`Sculpture` is extracted into a shared geometry builder. `PlanetDetails` projects routes and
small settlements onto the actual faceted terrain using Three.js Raycaster during construction.
The result joins the existing landmarks in one colored mesh per world. No per-frame raycasting,
additional per-feature draw calls, dependency or shared schema change is introduced. Mobile
retains the same visual identity with fewer tiny plants, low-rise blocks and fasteners.

Documentation consulted for this refinement: installed Next.js client-component documentation
and official Three.js BufferGeometry, ExtrudeGeometry and Raycaster references. World and poster
artwork move to ledger version v2; observer and telescope remain v1. The v1 evidence stays in place;
the new verification and captures are recorded in `docs/qa/low-poly-detail/REPORT.md`.

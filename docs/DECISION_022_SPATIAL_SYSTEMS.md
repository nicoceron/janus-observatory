# Decision 022: worlds in space, names on demand

2026-09-12. User-directed replacement of the catalog composition in Decision 021.

The story keeps every canonically selected destination visible together, but removes rows,
permanent captions, arrows and the museum-style system headings. Earth anchors the composition;
Luna sits nearby, while Mars, Venus and the extended-system destinations occupy different camera
depths and apparent sizes. The close-up inspector remains available by clicking a body.

The starting composition is responsive. Its anchors become three-dimensional positions using
the existing perspective camera. Luna follows a restrained local arc; the other destinations
have very slow drift through depth rather than orbiting Earth. Camera depth, projected size,
spacing and motion are original interpretive art. They are not ephemerides, orbital distances,
relative planetary radii, or a map of the real Solar System. Solar infrastructure's background
placement is a camera-composition choice, not a claim that the Sun is beyond the Kuiper belt.

One frame loop projects the actual body transforms into DOM click targets after updating the
camera. Targets no longer inherit the scrolling prose's position. Names appear only on hover
or keyboard focus, with a visible focus outline and at least 44-pixel hit regions. Inactive
systems are removed from keyboard and accessibility navigation. Planet targets precede the prose
links in DOM order so mobile keyboard traversal does not scroll away from the scene first. Opening and closing the
inspector preserves the existing focus-return behavior. Reduced motion freezes the composition;
static source-backed prose remains available without WebGL or JavaScript.

No new dependencies, textures, geometry exports or rendering contexts. Existing serial model
loading and the 48 MiB decoded-asset cap remain in place. DOM transforms update in the existing
R3F frame loop without React state updates per frame; accessibility visibility only changes when
a target enters or leaves the active scene.

Documentation consulted: master plan, installed Next.js client-component documentation, and
installed React Three Fiber frame-loop hook documentation. Canonical data and citations are
unchanged. Verification and limitations: [spatial systems QA](qa/spatial-systems/REPORT.md).

## Organic reveal correction, 2026-09-14

The user identified companions popping into their final positions. Their former mount condition
switched at rounded chapter boundaries, and the incoming Earth's idle staging could lag behind
its companions. Neighboring systems now remain mounted through the handoff, with Earth and
companions staged together. At most the two sides of a transition are visible; hidden neighbors
do not acquire model leases. The existing 48 MiB cache cap and serial loader remain unchanged.

A camera-ray-aligned start position puts each body behind Earth's opaque sphere. Smooth,
slightly staggered paths uncover them as the system arrives and return them behind Earth as it
leaves. Position depends on absolute scroll progress, so backscroll retraces the same reveal.
This uses geometric occlusion, without opacity fades or scale-in effects. Reduced motion and
chapter jumps retain complete static target states. Hidden companions cannot receive pointer
or keyboard focus. See [organic reveal verification](qa/organic-reveal/REPORT.md).

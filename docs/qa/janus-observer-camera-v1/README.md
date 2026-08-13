# Observer camera quality gate

Accepted after reviewing the five-frame contact sheet at desktop viewport size.

- The alien silhouette remains readable from the wide shot through the reach.
- The active hand, eye, eyepiece, and telescope share the frame before the camera closes in.
- The camera stays outside the character and telescope meshes; the iris masks the final handoff instead of clipping through geometry.
- The 3D action and camera path are driven by the same scroll progress, so backscroll and jumps are deterministic.
- The final ocular frame preserves the persistent world and hands control to the sourced observation view.

The report's high-difference warning between `03-eyepiece.png` and `04-iris.png` is expected: that pair deliberately samples the optical blackout transition, not an animation flicker or silhouette failure.

# Observer-to-spectrum motion review

The contact sheet samples the scroll-driven handoff at a 1600 × 1000 viewport: observer staging,
authored reach, external-camera dolly, editorial occlusion, HWO S1 readout, and LIFE S2 readout.

## Acceptance findings

- The character and telescope retain separate readable silhouettes before the cut.
- Runtime animation stops at the authored observing-contact pose rather than scrubbing into the
  deeper source loop.
- The camera remains outside both models and closes distance toward the observer; it does not enter
  the eyepiece, objective, or telescope tube.
- The full-frame occlusion is an editorial transition into a separate DOM/SVG spectrum scene.
- Spectrum states contain no repeated 3D planet. They provide structured text and an accessible SVG
  equivalent.
- HWO and LIFE use different labeled wavelength ranges. The curves are explicitly explanatory and
  are not presented as recovered PSG/LIFEsim outputs.

The automated frame-difference report produced no high-jump warning. The scene was also checked in
the Chromium story regression at desktop and mobile viewports.

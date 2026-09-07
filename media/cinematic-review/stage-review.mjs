import { cp, mkdir } from "node:fs/promises";

await mkdir(new URL("./public/review/", import.meta.url), { recursive: true });
await cp(
  new URL("../../docs/qa/cinematic-rebuild/browser/", import.meta.url),
  new URL("./public/review/browser/", import.meta.url),
  { recursive: true },
);
if (!process.argv.includes("--browser-only")) {
  await cp(
    new URL(
      "../../docs/qa/cinematic-rebuild/observer/motion/",
      import.meta.url,
    ),
    new URL("./public/review/observer/", import.meta.url),
    { recursive: true },
  );
}
console.log(
  process.argv.includes("--browser-only")
    ? "Staged current browser captures only; older Blender action frames were not refreshed."
    : "Staged actual browser captures and Blender action frames for offline review.",
);

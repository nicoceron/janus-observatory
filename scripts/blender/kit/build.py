"""Kit command line. Run through scripts/kit.py, which serialises Blender jobs:

  python3 scripts/kit.py list
  python3 scripts/kit.py review --kinds house,car --out /tmp/sheet.png [--columns 4] [--cell 420]
                                [--azimuth 35] [--elevation 24] [--true-scale] [--shadows]
  python3 scripts/kit.py review --module people --out /tmp/people.png
  python3 scripts/kit.py stats [--module people]
  python3 scripts/kit.py export

Models are original interpretive artwork; nothing here reads or writes scientific data.
"""

from __future__ import annotations

import argparse
import importlib
import json
import pkgutil
import sys
import time
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from kit import export, jk, review  # noqa: E402
import kit.assets as assets_package  # noqa: E402

PUBLIC = ROOT / "apps/web/public/assets/kit/v1"
MANIFEST = ROOT / "apps/web/app/planets/props/kit.generated.json"
SOURCES = ROOT / "assets/blender/kit"
CORE_KINDS = Path(__file__).with_name("core-kinds.json")


BROKEN: list[str] = []


def load_modules(only: str | None = None, tolerant: bool = False):
    """Import the model modules. `tolerant` skips a module that fails to import (work in
    progress) instead of stopping, and records it in BROKEN."""
    for info in pkgutil.iter_modules(assets_package.__path__):
        if info.name.startswith("_") or (only and info.name not in only.split(",")):
            continue
        try:
            importlib.import_module(f"kit.assets.{info.name}")
        except Exception as error:  # noqa: BLE001
            if not tolerant:
                raise
            BROKEN.append(info.name)
            print(f"SKIPPED module {info.name}: {type(error).__name__}: {error}")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def base_of(kind: str) -> str:
    return kind if kind in jk.REGISTRY else kind[:-5]


def entry_of(kind: str) -> dict:
    return jk.REGISTRY[base_of(kind)]


def select(args) -> list[str]:
    """Kinds named by --kinds (a `-dark` twin is allowed) or --module, else every kind."""
    names = jk.kinds()
    if getattr(args, "kinds", None):
        wanted = args.kinds.split(",")
        missing = [k for k in wanted if base_of(k) not in jk.REGISTRY]
        if missing:
            raise SystemExit(f"Unknown kinds: {missing}")
        return wanted
    if getattr(args, "module", None):
        modules = {f"kit.assets.{m}" for m in args.module.split(",")}
        out = []
        for k in names:
            if jk.REGISTRY[k]["module"] not in modules:
                continue
            out.append(k)
            if getattr(args, "dark", False) and jk.REGISTRY[k]["dark"]:
                out.append(k + "-dark")
        return out
    return names


def cmd_list(args):
    for kind in select(args):
        entry = entry_of(kind)
        print(f"{kind:24s} {entry['module'].split('.')[-1]:14s} tint={entry['tint']}")


def cmd_stats(args):
    total = 0
    over = []
    for kind in select(args):
        if kind not in jk.REGISTRY:
            continue
        a, baked = jk.build(kind)
        tris = sum(len(d["position"]) // 9 for d in baked.values())
        lo, hi = review._bounds(baked)
        entry = entry_of(kind)
        # Budgets count authored triangles; backs the bake adds to open surfaces are extra.
        flag = "" if tris - a.backs <= entry["budget"] else f"  OVER BUDGET {entry['budget']}"
        if flag:
            over.append(kind)
        total += tris
        # Sizes are reported in the web frame: width (x), height (y), depth (z).
        print(
            f"{kind:24s} {tris:6d}t  w={hi.x - lo.x:5.2f} h={hi.z - lo.z:5.2f} d={hi.y - lo.y:5.2f}"
            f"  z0={lo.z:5.2f}  parts={','.join(baked)}{flag}"
        )
    print(f"TOTAL {total} triangles; over budget: {over or 'none'}")


def cmd_review(args):
    reset()
    items = []
    for kind in select(args):
        _, baked = jk.build(base_of(kind))
        items.append((kind, baked, args.tint or entry_of(kind)["tint"], kind != base_of(kind)))
    if not items:
        raise SystemExit("Nothing to review.")
    out = review.render_sheet(
        items,
        args.out,
        columns=args.columns,
        cell=args.cell,
        azimuth=args.azimuth,
        elevation=args.elevation,
        true_scale=args.true_scale,
        shadows=args.shadows,
        labels=not args.no_labels,
        frames=args.frames,
    )
    print("TURNTABLE" if args.frames else "SHEET", out)


def cmd_export(args):
    started = time.time()
    names = [k for k in jk.kinds() if not jk.REGISTRY[k].get("preview")]
    core = set(json.loads(CORE_KINDS.read_text())) if CORE_KINDS.exists() else set()
    # Load order on the site: the opening Earth, the observer and telescope, the props of the
    # other worlds, then their one-off landmarks and the Solar System bodies.
    packs: dict[str, dict] = {"core": {}, "observer": {}, "worlds": {}, "landmarks": {}}

    def pack_of(kind: str) -> str:
        if kind.startswith("obs-"):
            return "observer"
        if kind in core or not core:
            return "core"
        if kind.startswith(("lm-", "sys-")) or kind == "plinth":
            return "landmarks"
        return "worlds"

    over = []
    failed = []
    for kind in list(names):
        try:
            a, baked = jk.build(kind)
        except Exception as error:  # noqa: BLE001
            if not args.tolerant:
                raise
            failed.append(kind)
            names.remove(kind)
            print(f"SKIPPED kind {kind}: {type(error).__name__}: {error}")
            continue
        entry = entry_of(kind)
        tris = sum(len(d["position"]) // 9 for d in baked.values()) - a.backs
        if tris > entry["budget"]:
            over.append(f"{kind} ({tris} > {entry['budget']})")
        packs[pack_of(kind)][kind] = (baked, entry)
    if over and not args.allow_over:
        raise SystemExit("Over triangle budget: " + ", ".join(over))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    manifest = {"version": export.VERSION, "packs": {}, "kinds": {}}
    for pack_name, models in packs.items():
        if not models:
            continue
        data = None
        if pack_name == "core":
            from kit import earth

            data = {"earth": earth.encode()}
        raw, kinds = export.pack(models, data)
        receipt = export.write_pack(PUBLIC / f"kit-{pack_name}.bin", raw)
        manifest["packs"][pack_name] = {"path": f"/assets/kit/v1/kit-{pack_name}.bin", **receipt}
        for kind, info in kinds.items():
            manifest["kinds"][kind] = {"pack": pack_name, **info}
        print(f"PACK {pack_name}: {len(models)} kinds, {receipt['bytes']} bytes gzip, {receipt['rawBytes']} raw")
    # A `-dark` twin shares its lit model's geometry; only its panes are drawn unlit.
    for kind in names:
        if jk.REGISTRY[kind]["dark"]:
            manifest["kinds"][kind + "-dark"] = {**manifest["kinds"][kind], "of": kind}
    manifest["kinds"] = dict(sorted(manifest["kinds"].items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"MANIFEST {MANIFEST.relative_to(ROOT)}: {len(manifest['kinds'])} kinds")
    if not args.no_sources:
        write_sources(names)
    if BROKEN or failed:
        print(f"INCOMPLETE: skipped modules {BROKEN}, kinds {failed}")
    print(f"DONE in {time.time() - started:.1f}s")


def cmd_earth(args):
    """Preview the shared Earth relief as an equirectangular image."""
    import numpy as np

    from kit import earth

    f = earth.fields()
    h, w = f["land"].shape
    scale = args.scale
    land = f["land"] > 0
    rgb = np.zeros((h, w, 3))
    sea = np.clip(-f["land"] / 12, 0, 1)[..., None]
    rgb[:] = np.array([0.16, 0.42, 0.62]) * (1 - sea) + np.array([0.05, 0.14, 0.3]) * sea
    ground = np.array([0.45, 0.62, 0.3])
    ground = ground * (1 - f["dry"][..., None]) + np.array([0.85, 0.72, 0.45]) * f["dry"][..., None]
    ground = ground * (1 - f["lush"][..., None] * 0.8) + np.array([0.12, 0.4, 0.18]) * f["lush"][..., None] * 0.8
    ground = ground * (1 - f["range"][..., None]) + np.array([0.9, 0.9, 0.92]) * f["range"][..., None]
    rgb[land] = ground[land]
    rgb = np.repeat(np.repeat(rgb, scale, axis=0), scale, axis=1)
    rgba = np.concatenate([rgb, np.ones((*rgb.shape[:2], 1))], axis=2).astype(np.float32)
    image = bpy.data.images.new("earth", w * scale, h * scale)
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = args.out
    image.file_format = "PNG"
    image.save()
    print("EARTH", args.out, f"land fraction {land.mean():.3f}")


def write_sources(names: list[str]):
    """One editable .blend per authoring module: every model as a named object on a grid."""
    SOURCES.mkdir(parents=True, exist_ok=True)
    by_module: dict[str, list[str]] = {}
    for kind in names:
        by_module.setdefault(jk.REGISTRY[kind]["module"].split(".")[-1], []).append(kind)
    for module, kinds in by_module.items():
        reset()
        scene = bpy.context.scene
        scene.name = f"Kit • {module}"
        columns = max(1, round(len(kinds) ** 0.5 * 1.3))
        cursor_x = 0.0
        row_y = 0.0
        row_depth = 0.0
        for i, kind in enumerate(kinds):
            _, baked = jk.build(kind)
            obj = review.make_object(kind, baked, jk.REGISTRY[kind]["tint"])
            obj["kit_has_dark_twin"] = bool(jk.REGISTRY[kind]["dark"])
            lo, hi = review._bounds(baked)
            width, depth = hi.x - lo.x, hi.y - lo.y
            if i % columns == 0 and i:
                cursor_x = 0.0
                row_y += row_depth + 1.5
                row_depth = 0.0
            obj.location = (cursor_x - lo.x, row_y - lo.y, 0)
            obj["kit_kind"] = kind
            obj["kit_default_tint"] = jk.REGISTRY[kind]["tint"]
            cursor_x += width + 1.2
            row_depth = max(row_depth, depth)
        review.studio(scene)
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES / f"{module}.blend"), compress=True)
        print(f"SOURCE assets/blender/kit/{module}.blend: {len(kinds)} models")


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(prog="kit")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("list", "stats", "review"):
        p = sub.add_parser(name)
        p.add_argument("--kinds")
        p.add_argument("--module")
        p.add_argument("--dark", action="store_true", help="include -dark variants with --module")
        if name == "review":
            p.add_argument("--out", required=True)
            p.add_argument("--columns", type=int, default=4)
            p.add_argument("--cell", type=int, default=420)
            p.add_argument("--azimuth", type=float, default=35)
            p.add_argument("--elevation", type=float, default=24)
            p.add_argument("--true-scale", action="store_true")
            p.add_argument("--shadows", action="store_true")
            p.add_argument("--tint")
            p.add_argument("--no-labels", action="store_true")
            p.add_argument(
                "--frames",
                type=int,
                default=0,
                help="render a turntable of this many frames into the --out directory",
            )
    p = sub.add_parser("earth")
    p.add_argument("--out", required=True)
    p.add_argument("--scale", type=int, default=4)
    p = sub.add_parser("export")
    p.add_argument("--allow-over", action="store_true")
    p.add_argument("--no-sources", action="store_true")
    p.add_argument("--tolerant", action="store_true", help="skip modules and kinds that fail")
    args = parser.parse_args(argv)
    if args.command == "earth":
        return cmd_earth(args)
    load_modules(
        getattr(args, "module", None) if args.command != "export" and not getattr(args, "kinds", None) else None,
        tolerant=getattr(args, "tolerant", False),
    )
    {"list": cmd_list, "stats": cmd_stats, "review": cmd_review, "export": cmd_export}[args.command](args)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)

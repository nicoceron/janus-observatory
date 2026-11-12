"""Kit delivery: a compact binary pack plus a JSON manifest the web app imports synchronously.

Pack layout (little endian), stored gzip-compressed on disk:
  "JKIT" | u32 version | u32 jsonBytes | json (utf-8, space padded to 4) | payload
The json holds `kinds`: kind -> { tint, min, max, parts: { part: [vertexCount, triangleCount,
offset] } }, and `data`: name -> { offset, bytes, ...metadata } for raw blobs such as the Earth
relief (see earth.py).
Parts are base, tint, glass, metal, glow and lit (window panes; see jk.PARTS).
Each part's payload, at `offset` from the payload start (4-byte aligned):
  u16 x[v] y[v] z[v]   position, quantised over the kind's bounding box, delta coded per stream
  i8  nx[v] ny[v] nz[v]
  u8  r[v] g[v] b[v]    sRGB, delta coded per stream
  pad to 2
  u16 index[t * 3]      high-water-mark coded: 0 = the next unseen vertex, k = (mark - index)
Positions, normals and bounds are in the WEB frame: x right, y up, z toward the viewer.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import struct
from array import array

from . import jk

VERSION = 1


def to_web(x: float, y: float, z: float) -> tuple[float, float, float]:
    return (x, z, -y)


def _index(baked_part: dict, lo, span):
    """Quantise, weld identical corners and order vertices by first use."""
    p, n, c = baked_part["position"], baked_part["normal"], baked_part["color"]
    lookup: dict[tuple, int] = {}
    verts: list[tuple] = []
    indices: list[int] = []
    for i in range(0, len(p), 3):
        wx, wy, wz = to_web(p[i], p[i + 1], p[i + 2])
        nx, ny, nz = to_web(n[i], n[i + 1], n[i + 2])
        key = (
            round((wx - lo[0]) / span[0] * 65535),
            round((wy - lo[1]) / span[1] * 65535),
            round((wz - lo[2]) / span[2] * 65535),
            max(-127, min(127, round(nx * 127))),
            max(-127, min(127, round(ny * 127))),
            max(-127, min(127, round(nz * 127))),
            round(jk.linear_to_srgb(c[i]) * 255),
            round(jk.linear_to_srgb(c[i + 1]) * 255),
            round(jk.linear_to_srgb(c[i + 2]) * 255),
        )
        index = lookup.get(key)
        if index is None:
            index = len(verts)
            lookup[key] = index
            verts.append(key)
        indices.append(index)
    # Drop triangles that collapsed under quantisation.
    kept: list[int] = []
    for t in range(0, len(indices), 3):
        a, b, d = indices[t : t + 3]
        if a != b and b != d and a != d:
            kept += (a, b, d)
    return verts, kept


def _encode(verts: list[tuple], indices: list[int]) -> bytes:
    count = len(verts)
    if count > 65535:
        raise ValueError("A kit part is limited to 65535 vertices; split the model.")
    out = bytearray()
    for k in range(3):
        stream = array("H")
        previous = 0
        for v in verts:
            stream.append((v[k] - previous) & 0xFFFF)
            previous = v[k]
        out += stream.tobytes()
    for k in range(3, 6):
        out += array("b", (v[k] for v in verts)).tobytes()
    for k in range(6, 9):
        stream = array("B")
        previous = 0
        for v in verts:
            stream.append((v[k] - previous) & 0xFF)
            previous = v[k]
        out += stream.tobytes()
    if len(out) % 2:
        out += b"\0"
    mark = 0
    coded = array("H")
    for index in indices:
        if index == mark:
            coded.append(0)
            mark += 1
        else:
            coded.append(mark - index)
    out += coded.tobytes()
    while len(out) % 4:
        out += b"\0"
    return bytes(out)


def pack(models: dict[str, tuple[dict, dict]], data: dict[str, tuple[bytes, dict]] | None = None) -> tuple[bytes, dict]:
    """`models` maps kind -> (baked, registry entry). Returns (raw pack bytes, manifest kinds).

    `data` adds named binary blobs (for example the shared Earth relief) with their metadata.
    """
    header: dict[str, dict] = {}
    manifest: dict[str, dict] = {}
    payload = bytearray()
    blobs: dict[str, dict] = {}
    for name, (blob, meta) in (data or {}).items():
        blobs[name] = {**meta, "offset": len(payload), "bytes": len(blob)}
        payload += blob
        while len(payload) % 4:
            payload += b"\0"
    for kind, (baked, entry) in models.items():
        lo = [1e9, 1e9, 1e9]
        hi = [-1e9, -1e9, -1e9]
        for data in baked.values():
            p = data["position"]
            for i in range(0, len(p), 3):
                w = to_web(p[i], p[i + 1], p[i + 2])
                for k in range(3):
                    lo[k] = min(lo[k], w[k])
                    hi[k] = max(hi[k], w[k])
        span = [max(hi[k] - lo[k], 1e-6) for k in range(3)]
        parts: dict[str, list[int]] = {}
        triangles = 0
        for part in jk.PARTS:
            if part not in baked:
                continue
            verts, indices = _index(baked[part], lo, span)
            if not indices:
                continue
            # Re-order vertices by first use so indices stay small and local.
            order: dict[int, int] = {}
            for index in indices:
                if index not in order:
                    order[index] = len(order)
            ordered = [None] * len(order)
            for old, new in order.items():
                ordered[new] = verts[old]
            indices = [order[i] for i in indices]
            parts[part] = [len(ordered), len(indices) // 3, len(payload)]
            payload += _encode(ordered, indices)
            triangles += len(indices) // 3
        rounded = lambda values: [round(v, 5) for v in values]
        header[kind] = {"tint": entry["tint"], "min": rounded(lo), "max": rounded(hi), "parts": parts}
        manifest[kind] = {
            "tint": entry["tint"],
            "min": rounded(lo),
            "max": rounded(hi),
            "triangles": triangles,
            "parts": list(parts),
        }
    text = json.dumps({"kinds": header, "data": blobs}, separators=(",", ":")).encode()
    while len(text) % 4:
        text += b" "
    raw = b"JKIT" + struct.pack("<II", VERSION, len(text)) + text + bytes(payload)
    return raw, manifest


def write_pack(path, raw: bytes) -> dict:
    """Write a deterministic gzip of the pack and return its receipt."""
    data = gzip.compress(raw, compresslevel=9, mtime=0)
    with open(path, "wb") as handle:
        handle.write(data)
    return {
        "bytes": len(data),
        "rawBytes": len(raw),
        "sha256": hashlib.sha256(data).hexdigest(),
    }

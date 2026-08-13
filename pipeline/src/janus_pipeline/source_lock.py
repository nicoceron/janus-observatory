"""Download the declared Janus corpus and emit a checksum-locked manifest."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from pypdf import PdfReader

WORKSPACE = Path(__file__).resolve().parents[3]
CATALOG_PATH = WORKSPACE / "data/sources/catalog.json"
FILES_PATH = WORKSPACE / "data/sources/files"
MANIFEST_PATH = WORKSPACE / "data/sources/manifest.json"


def file_digest(path: Path, algorithm: str) -> str:
    digest = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(client: httpx.Client, source: dict[str, Any]) -> Path:
    destination = FILES_PATH / source["filename"]
    temporary = destination.with_suffix(f"{destination.suffix}.part")

    with client.stream("GET", source["directFileUrl"]) as response:
        response.raise_for_status()
        with temporary.open("wb") as stream:
            for chunk in response.iter_bytes():
                stream.write(chunk)
    temporary.replace(destination)

    if destination.read_bytes()[:4] != b"%PDF":
        raise ValueError(f"Downloaded source is not a PDF: {source['id']}")
    if expected_size := source.get("size"):
        if destination.stat().st_size != expected_size:
            raise ValueError(
                f"Size mismatch for {source['id']}: "
                f"expected {expected_size}, received {destination.stat().st_size}"
            )
    if upstream := source.get("upstreamChecksum"):
        algorithm, expected_digest = upstream.split(":", maxsplit=1)
        actual_digest = file_digest(destination, algorithm)
        if actual_digest != expected_digest:
            raise ValueError(
                f"Upstream checksum mismatch for {source['id']}: "
                f"expected {expected_digest}, received {actual_digest}"
            )
    return destination


def expand_catalog(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    entries = [dict(paper) for paper in catalog["papers"]]
    collection = catalog["zenodoCollection"]
    base_url = "https://zenodo.org/api/records/11174443/files"
    for file in collection["files"]:
        entry = {
            key: value
            for key, value in collection.items()
            if key not in {"files"}
        }
        entry.update(
            {
                "id": f"janus.pipeline.{file['scenario']}",
                "title": f"Scenario {file['scenario'].upper()} - {file['title']}",
                "directFileUrl": f"{base_url}/{quote(file['upstreamFilename'])}/content",
                "filename": file["filename"],
                "size": file["size"],
                "upstreamChecksum": file["upstreamChecksum"],
                "notes": [
                    "The Zenodo record exposes no license metadata; retained as a "
                    "controlled research input."
                ],
            }
        )
        entries.append(entry)
    return entries


def build_manifest_entry(source: dict[str, Any], path: Path, retrieved_at: str) -> dict[str, Any]:
    entry = {
        key: value
        for key, value in source.items()
        if key not in {"filename", "size"}
    }
    entry.update(
        {
            "localPath": str(path.relative_to(WORKSPACE)),
            "sha256": file_digest(path, "sha256"),
            "bytes": path.stat().st_size,
            "pageCount": len(PdfReader(path).pages),
            "mimeType": "application/pdf",
            "retrievedAt": retrieved_at,
        }
    )
    return entry


def lock_sources() -> dict[str, Any]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    sources = expand_catalog(catalog)
    if len(sources) != 15:
        raise ValueError(f"Expected 15 Janus source documents, catalog declared {len(sources)}")

    FILES_PATH.mkdir(parents=True, exist_ok=True)
    retrieved_at = datetime.now(UTC).isoformat(timespec="seconds")
    manifest_entries: list[dict[str, Any]] = []

    headers = {"User-Agent": "JanusObservatory/0.1 source-lock"}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=60) as client:
        for source in sources:
            path = download(client, source)
            manifest_entries.append(build_manifest_entry(source, path, retrieved_at))
            print(f"locked {source['id']} ({path.stat().st_size} bytes)")

    manifest = {
        "schemaVersion": catalog["schemaVersion"],
        "generatedAt": retrieved_at,
        "entries": manifest_entries,
    }
    MANIFEST_PATH.write_text(
        f"{json.dumps(manifest, indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    manifest = lock_sources()
    print(f"wrote {MANIFEST_PATH.relative_to(WORKSPACE)} with {len(manifest['entries'])} entries")


if __name__ == "__main__":
    main()

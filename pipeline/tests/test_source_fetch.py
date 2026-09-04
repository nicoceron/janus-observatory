import hashlib
import io
import json
from pathlib import Path

import httpx
import pytest
from pypdf import PdfWriter

from janus_pipeline.source_fetch import SourceFetchError, fetch_locked_sources, verify_local_sources


def pdf_bytes() -> bytes:
    output = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.write(output)
    return output.getvalue()


def manifest_entry(source_id: str, filename: str, contents: bytes) -> dict[str, object]:
    return {
        "id": source_id,
        "directFileUrl": f"https://sources.example/{filename}",
        "localPath": f"data/sources/files/{filename}",
        "sha256": hashlib.sha256(contents).hexdigest(),
        "bytes": len(contents),
        "pageCount": 1,
        "mimeType": "application/pdf",
    }


def write_manifest(workspace: Path, entries: list[dict[str, object]]) -> Path:
    path = workspace / "data" / "sources" / "manifest.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({"schemaVersion": "1.0.0", "entries": entries}), encoding="utf-8")
    return path


def test_fetch_installs_all_verified_files_without_changing_manifest(tmp_path: Path) -> None:
    contents = pdf_bytes()
    entries = [
        manifest_entry("source.one", "one.pdf", contents),
        manifest_entry("source.two", "two.pdf", contents),
    ]
    manifest_path = write_manifest(tmp_path, entries)
    manifest_before = manifest_path.read_bytes()
    first_destination = tmp_path / str(entries[0]["localPath"])
    first_destination.parent.mkdir(parents=True)
    first_destination.write_bytes(b"old input")
    extra_file = first_destination.parent / "unmanaged-note.txt"
    extra_file.write_text("preserve me", encoding="utf-8")

    def handler(request: httpx.Request) -> httpx.Response:
        filename = request.url.path.rsplit("/", 1)[-1]
        return httpx.Response(
            200,
            headers={
                "Content-Type": "application/octet-stream, application/octet-stream",
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(contents)),
            },
            stream=httpx.ByteStream(contents),
            request=request,
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        fetched = fetch_locked_sources(manifest_path, tmp_path, client)

    assert [source.id for source in fetched] == ["source.one", "source.two"]
    assert manifest_path.read_bytes() == manifest_before
    assert first_destination.read_bytes() == contents
    assert (tmp_path / str(entries[1]["localPath"])).read_bytes() == contents
    assert extra_file.read_text(encoding="utf-8") == "preserve me"
    assert len(verify_local_sources(manifest_path, tmp_path)) == 2


def test_failed_fetch_leaves_every_existing_destination_unchanged(tmp_path: Path) -> None:
    contents = pdf_bytes()
    entries = [
        manifest_entry("source.one", "one.pdf", contents),
        manifest_entry("source.two", "two.pdf", contents),
    ]
    manifest_path = write_manifest(tmp_path, entries)
    destinations = [tmp_path / str(entry["localPath"]) for entry in entries]
    for index, destination in enumerate(destinations):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(f"original-{index}".encode())

    def handler(request: httpx.Request) -> httpx.Response:
        body = contents if request.url.path.endswith("one.pdf") else contents + b"changed"
        return httpx.Response(
            200,
            headers={"Content-Type": "application/pdf"},
            stream=httpx.ByteStream(body),
            request=request,
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(SourceFetchError, match="exceeded its locked size"):
            fetch_locked_sources(manifest_path, tmp_path, client)

    assert [destination.read_bytes() for destination in destinations] == [
        b"original-0",
        b"original-1",
    ]


def test_fetch_rejects_non_pdf_mime_before_installing(tmp_path: Path) -> None:
    contents = pdf_bytes()
    entry = manifest_entry("source.one", "one.pdf", contents)
    manifest_path = write_manifest(tmp_path, [entry])

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"Content-Type": "text/html"},
            stream=httpx.ByteStream(contents),
            request=request,
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(SourceFetchError, match="did not return a PDF MIME type"):
            fetch_locked_sources(manifest_path, tmp_path, client)

    assert not (tmp_path / str(entry["localPath"])).exists()


def test_manifest_cannot_escape_ignored_source_root(tmp_path: Path) -> None:
    contents = pdf_bytes()
    entry = manifest_entry("source.one", "one.pdf", contents)
    entry["localPath"] = "data/sources/files/../../canonical/overwrite.pdf"
    manifest_path = write_manifest(tmp_path, [entry])

    with pytest.raises(SourceFetchError, match="must stay inside data/sources/files"):
        fetch_locked_sources(manifest_path, tmp_path)

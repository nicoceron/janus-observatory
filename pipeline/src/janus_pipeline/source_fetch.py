"""Fetch the committed source lock without changing its metadata.

All downloads are staged and verified before any declared local file is replaced. The source
manifest is deliberately read-only: changing a source version or checksum remains the separate,
reviewed ``janus-source-lock`` workflow.
"""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx
from pypdf import PdfReader

WORKSPACE = Path(__file__).resolve().parents[3]
MANIFEST_PATH = WORKSPACE / "data" / "sources" / "manifest.json"
SOURCE_ROOT = WORKSPACE / "data" / "sources" / "files"
PDF_MAGIC = b"%PDF-"
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")


class SourceFetchError(RuntimeError):
    """Raised when the committed source lock cannot be reproduced exactly."""


@dataclass(frozen=True)
class LockedSource:
    id: str
    direct_file_url: str
    local_path: Path
    destination: Path
    sha256: str
    bytes: int
    page_count: int
    mime_type: str


def _require_public_https_url(value: Any, source_id: str) -> str:
    if not isinstance(value, str):
        raise SourceFetchError(f"{source_id} is missing directFileUrl.")
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise SourceFetchError(f"{source_id} directFileUrl must be a public HTTPS URL.")
    hostname = parsed.hostname.casefold()
    if hostname == "localhost" or hostname.endswith(".local"):
        raise SourceFetchError(f"{source_id} directFileUrl is not public.")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        if not address.is_global:
            raise SourceFetchError(f"{source_id} directFileUrl is not public.")
    return value


def _locked_source(raw: Any, workspace: Path, source_root: Path) -> LockedSource:
    if not isinstance(raw, dict):
        raise SourceFetchError("Every source manifest entry must be an object.")
    source_id = raw.get("id")
    if not isinstance(source_id, str) or not source_id:
        raise SourceFetchError("Every source manifest entry requires an ID.")
    direct_file_url = _require_public_https_url(raw.get("directFileUrl"), source_id)

    local_path_value = raw.get("localPath")
    if not isinstance(local_path_value, str) or not local_path_value:
        raise SourceFetchError(f"{source_id} is missing localPath.")
    local_path = Path(local_path_value)
    if local_path.is_absolute() or ".." in local_path.parts:
        raise SourceFetchError(f"{source_id} localPath must stay inside data/sources/files.")
    destination = (workspace / local_path).resolve(strict=False)
    try:
        destination.relative_to(source_root)
    except ValueError as error:
        raise SourceFetchError(
            f"{source_id} localPath must stay inside data/sources/files."
        ) from error
    if destination == source_root or destination.suffix.casefold() != ".pdf":
        raise SourceFetchError(f"{source_id} localPath must name a PDF file.")

    expected_sha256 = raw.get("sha256")
    if not isinstance(expected_sha256, str) or not SHA256_PATTERN.fullmatch(expected_sha256):
        raise SourceFetchError(f"{source_id} is missing a valid SHA-256 lock.")
    expected_bytes = raw.get("bytes")
    if (
        not isinstance(expected_bytes, int)
        or isinstance(expected_bytes, bool)
        or expected_bytes <= 0
    ):
        raise SourceFetchError(f"{source_id} is missing a positive byte-size lock.")
    expected_pages = raw.get("pageCount")
    if (
        not isinstance(expected_pages, int)
        or isinstance(expected_pages, bool)
        or expected_pages <= 0
    ):
        raise SourceFetchError(f"{source_id} is missing a positive page-count lock.")
    mime_type = raw.get("mimeType")
    if mime_type != "application/pdf":
        raise SourceFetchError(f"{source_id} must declare mimeType application/pdf.")

    return LockedSource(
        id=source_id,
        direct_file_url=direct_file_url,
        local_path=local_path,
        destination=destination,
        sha256=expected_sha256,
        bytes=expected_bytes,
        page_count=expected_pages,
        mime_type=mime_type,
    )


def load_locked_sources(
    manifest_path: Path = MANIFEST_PATH,
    workspace: Path = WORKSPACE,
) -> tuple[bytes, list[LockedSource]]:
    """Load and strictly validate the immutable fetch fields in the committed manifest."""

    manifest_bytes = manifest_path.read_bytes()
    try:
        raw_manifest = json.loads(manifest_bytes)
    except json.JSONDecodeError as error:
        raise SourceFetchError(f"Source manifest is not valid JSON: {error}") from error
    entries = raw_manifest.get("entries") if isinstance(raw_manifest, dict) else None
    if not isinstance(entries, list) or not entries:
        raise SourceFetchError("Source manifest must contain at least one entry.")

    source_root = (workspace / "data" / "sources" / "files").resolve(strict=False)
    sources = [_locked_source(entry, workspace.resolve(), source_root) for entry in entries]
    ids = [source.id for source in sources]
    destinations = [source.destination for source in sources]
    if len(ids) != len(set(ids)):
        raise SourceFetchError("Source manifest IDs must be unique.")
    if len(destinations) != len(set(destinations)):
        raise SourceFetchError("Source manifest localPath values must be unique.")
    return manifest_bytes, sources


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _verify_pdf(path: Path, source: LockedSource) -> None:
    if not path.is_file() or path.is_symlink():
        raise SourceFetchError(f"{source.id} local source is not a regular file.")
    actual_bytes = path.stat().st_size
    if actual_bytes != source.bytes:
        raise SourceFetchError(
            f"{source.id} size mismatch: expected {source.bytes}, received {actual_bytes}."
        )
    with path.open("rb") as stream:
        if stream.read(len(PDF_MAGIC)) != PDF_MAGIC:
            raise SourceFetchError(f"{source.id} does not have PDF magic bytes.")
    actual_sha256 = _sha256(path)
    if actual_sha256 != source.sha256:
        raise SourceFetchError(
            f"{source.id} SHA-256 mismatch: expected {source.sha256}, received {actual_sha256}."
        )
    try:
        actual_pages = len(PdfReader(path).pages)
    except Exception as error:
        raise SourceFetchError(f"{source.id} is not a readable PDF: {error}") from error
    if actual_pages != source.page_count:
        raise SourceFetchError(
            f"{source.id} page-count mismatch: expected {source.page_count}, "
            f"received {actual_pages}."
        )


def verify_local_sources(
    manifest_path: Path = MANIFEST_PATH,
    workspace: Path = WORKSPACE,
) -> list[LockedSource]:
    """Require every ignored build input and verify it against the committed lock."""

    _, sources = load_locked_sources(manifest_path, workspace)
    for source in sources:
        if not source.destination.exists():
            raise SourceFetchError(f"Missing locked source file: {source.local_path}.")
        _verify_pdf(source.destination, source)
    return sources


def _remote_mime_is_pdf(response: httpx.Response) -> bool:
    content_types = {
        item.split(";", maxsplit=1)[0].strip().casefold()
        for item in response.headers.get("content-type", "").split(",")
        if item.strip()
    }
    if content_types & {"application/pdf", "application/x-pdf"}:
        return True
    if content_types != {"application/octet-stream"}:
        return False
    disposition = response.headers.get("content-disposition", "")
    match = re.search(r"filename\*?=(?:UTF-8''|\")?([^\";]+)", disposition, re.IGNORECASE)
    return bool(match and match.group(1).strip().casefold().endswith(".pdf"))


def _download(client: httpx.Client, source: LockedSource, staging_path: Path) -> None:
    staging_path.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", source.direct_file_url) as response:
        response.raise_for_status()
        _require_public_https_url(str(response.url), source.id)
        if not _remote_mime_is_pdf(response):
            received = response.headers.get("content-type", "missing")
            raise SourceFetchError(f"{source.id} did not return a PDF MIME type ({received}).")
        content_length = response.headers.get("content-length")
        if content_length is not None:
            try:
                declared_bytes = int(content_length)
            except ValueError as error:
                raise SourceFetchError(
                    f"{source.id} returned an invalid Content-Length."
                ) from error
            if declared_bytes != source.bytes:
                raise SourceFetchError(
                    f"{source.id} HTTP size mismatch: expected {source.bytes}, "
                    f"received {declared_bytes}."
                )

        received_bytes = 0
        with staging_path.open("xb") as stream:
            for chunk in response.iter_raw():
                received_bytes += len(chunk)
                if received_bytes > source.bytes:
                    raise SourceFetchError(
                        f"{source.id} exceeded its locked size of {source.bytes} bytes."
                    )
                stream.write(chunk)
            stream.flush()
            os.fsync(stream.fileno())
    _verify_pdf(staging_path, source)


def _commit_staged(sources: list[LockedSource], staging_root: Path) -> None:
    backup_root = staging_root / "backups"
    states: list[tuple[LockedSource, Path, bool]] = []
    try:
        for index, source in enumerate(sources):
            staged = staging_root / "downloads" / f"{index:03d}.pdf"
            destination = source.destination
            destination.parent.mkdir(parents=True, exist_ok=True)
            backup = backup_root / f"{index:03d}.pdf"
            had_original = destination.exists()
            states.append((source, backup, had_original))
            if had_original:
                if destination.is_symlink() or not destination.is_file():
                    raise SourceFetchError(
                        f"Refusing to replace non-regular destination: {source.local_path}."
                    )
                backup.parent.mkdir(parents=True, exist_ok=True)
                os.replace(destination, backup)
            os.replace(staged, destination)
    except Exception as error:
        rollback_errors: list[str] = []
        for source, backup, had_original in reversed(states):
            try:
                if source.destination.exists():
                    source.destination.unlink()
                if had_original and backup.exists():
                    os.replace(backup, source.destination)
            except OSError as rollback_error:
                rollback_errors.append(f"{source.id}: {rollback_error}")
        if rollback_errors:
            raise SourceFetchError(
                f"Source installation failed ({error}); rollback also failed: "
                + "; ".join(rollback_errors)
            ) from error
        raise


def fetch_locked_sources(
    manifest_path: Path = MANIFEST_PATH,
    workspace: Path = WORKSPACE,
    client: httpx.Client | None = None,
) -> list[LockedSource]:
    """Download and atomically install every file declared by the committed manifest."""

    manifest_bytes, sources = load_locked_sources(manifest_path, workspace)
    source_root = (workspace / "data" / "sources" / "files").resolve(strict=False)
    source_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".locked-source-fetch-", dir=source_root) as temporary:
        staging_root = Path(temporary)

        def fetch_with(active_client: httpx.Client) -> None:
            for index, source in enumerate(sources):
                _download(active_client, source, staging_root / "downloads" / f"{index:03d}.pdf")

        if client is None:
            headers = {
                "Accept": "*/*",
                "Accept-Encoding": "identity",
                "User-Agent": "JanusObservatory/0.1 locked-fetch",
            }
            with httpx.Client(headers=headers, follow_redirects=True, timeout=60) as active_client:
                fetch_with(active_client)
        else:
            fetch_with(client)

        if manifest_path.read_bytes() != manifest_bytes:
            raise SourceFetchError("Source manifest changed during fetch; nothing was installed.")
        _commit_staged(sources, staging_root)

    verify_local_sources(manifest_path, workspace)
    return sources


def main() -> None:
    try:
        sources = fetch_locked_sources()
    except (SourceFetchError, httpx.HTTPError, OSError) as error:
        raise SystemExit(f"locked source fetch failed: {error}") from error
    total_bytes = sum(source.bytes for source in sources)
    print(
        f"fetched and verified {len(sources)} locked PDFs ({total_bytes} bytes); "
        "source manifest unchanged"
    )


if __name__ == "__main__":
    main()

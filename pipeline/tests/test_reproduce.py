from pathlib import Path

import pytest

import janus_pipeline.reproduce as reproduce


def test_strict_check_refuses_metadata_only_fallback(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    manifest_path = tmp_path / "data" / "sources" / "manifest.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text(
        """{
          "schemaVersion": "1.0.0",
          "entries": [{
            "id": "source.one",
            "directFileUrl": "https://sources.example/one.pdf",
            "localPath": "data/sources/files/one.pdf",
            "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "bytes": 100,
            "pageCount": 1,
            "mimeType": "application/pdf"
          }]
        }""",
        encoding="utf-8",
    )
    monkeypatch.setattr(reproduce, "MANIFEST_PATH", manifest_path)
    monkeypatch.setattr(reproduce, "WORKSPACE", tmp_path)

    with pytest.raises(
        SystemExit, match="strict reproducibility requires the complete source lock"
    ):
        reproduce.strict_check(tmp_path / "generated")


def test_strict_check_replays_resilience_before_accepting_generated_data(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[str] = []
    monkeypatch.setattr(reproduce, "verify_local_sources", lambda *_: [object(), object()])
    monkeypatch.setattr(reproduce, "verify_resilience_report", lambda: calls.append("resilience"))
    monkeypatch.setattr(reproduce, "check_release", lambda _output: calls.append("release"))

    reproduce.strict_check(tmp_path / "generated")

    assert calls == ["resilience", "release"]

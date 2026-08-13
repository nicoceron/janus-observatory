from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from types import SimpleNamespace

import pytest

from janus_concordia.concordia_runner import DEFAULT_CONFIG, _build_plan, _run_with_concordia
from janus_concordia.contract import validate_run_record


def test_pinned_concordia_executes_with_an_offline_provider(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    pytest.importorskip("concordia")
    openai = pytest.importorskip("openai")

    class FakeCompletions:
        def create(self, *, messages: list[dict[str, str]], **_: object) -> object:
            prompt = messages[-1]["content"]
            if "Extract a terminal state" in prompt:
                content = json.dumps(
                    {
                        "population": None,
                        "annualEnergyUseJ": None,
                        "growthState": None,
                    }
                )
            elif "Return exactly one allowed value and nothing else:" in prompt:
                yes_option = re.search(r"\(([a-z])\) Yes", prompt)
                if yes_option is None:
                    pytest.fail("Offline provider received an unexpected choice prompt")
                content = yes_option.group(1)
            else:
                content = "The bounded council exercise is ready for review."
            message = SimpleNamespace(content=content)
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    class FakeOpenAI:
        def __init__(self, **_: object) -> None:
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr(openai, "OpenAI", FakeOpenAI)
    monkeypatch.setenv("CONCORDIA_API_KEY", "offline-test-key")
    plan = _build_plan(DEFAULT_CONFIG, "S4")
    run_path = _run_with_concordia(plan, tmp_path)

    run = validate_run_record(json.loads(run_path.read_text(encoding="utf-8")))
    transcript_bytes = (tmp_path / "transcript.json").read_bytes()
    assert run["targetScenarioId"] == "S4"
    assert run["outcome"] == {
        "population": None,
        "annualEnergyUseJ": None,
        "growthState": None,
    }
    assert run["transcriptSha256"] == hashlib.sha256(transcript_bytes).hexdigest()

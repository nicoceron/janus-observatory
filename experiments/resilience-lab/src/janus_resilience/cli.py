"""Command-line entry points for the resilience-lab experiment."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

from .dataset import DatasetConfig, generate_dataset, summarize_dataset, write_dataset_gzip
from .event_sim import simulate_events
from .params import (
    canonical_path,
    canonical_source_ref,
    load_anchors,
    load_reported,
    sample_perturbed,
)
from .persistence import load_presence_flags, persistence_table
from .provenance import environment_record, git_commit, implementation_record, utc_now
from .sensitivity import ParamSpace, morris_elementary_effects, sobol_indices
from .surrogate import evaluate_benchmark, load_dataset
from .survival import (
    aalen_johansen,
    kaplan_meier,
    nelson_aalen,
    restricted_mean_survival_time,
)
from .validation import run_replication

EXPERIMENT_ROOT = Path(__file__).resolve().parents[2]
REPORTS = EXPERIMENT_ROOT / "reports"
GENERATED = EXPERIMENT_ROOT / "data" / "generated"
REPLICATION_REPORT = REPORTS / "replication-report.json"
RELEASE_REPLICATION_RUNS = 20000
REPLICATION_RESULT_KEYS = (
    "experiment",
    "overallVerdict",
    "ensembleSizes",
    "seeds",
    "toleranceRationale",
    "scenarios",
)

DESIGN_BOUNDS = {
    "r": (0.0001, 0.006),
    "R0": (400.0, 2700.0),
    "delta": (0.1, 2.5),
    "cf": (0.2, 1.0),
    "rd": (0.0, 100.0),
    "rf": (0.1, 1.0),
    "h": (0.0, 0.005),
}


def _write_report(name: str, payload: dict) -> Path:
    REPORTS.mkdir(parents=True, exist_ok=True)
    path = REPORTS / name
    path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")
    print(f"wrote {path}")
    return path


def _provenance_header(topic: str) -> dict:
    return {
        "topic": topic,
        "generatedAt": utc_now(),
        "gitCommit": git_commit(EXPERIMENT_ROOT.parents[1]),
        "environment": environment_record(),
    }


def build_replication_report(n_large: int) -> dict:
    report = run_replication(n_large=n_large)
    report.update(
        {
            "canonicalStatus": "noncanonical",
            "evidenceKind": "reimplemented",
            "authorCodeUsed": False,
            "canonicalSource": canonical_source_ref(),
            "implementation": implementation_record(EXPERIMENT_ROOT, canonical_path()),
            **_provenance_header("replication"),
        }
    )
    return report


def _result_payload(report: dict) -> dict:
    return {key: report.get(key) for key in REPLICATION_RESULT_KEYS}


def verify_replication_report(
    report_path: Path = REPLICATION_REPORT,
    expected_runs: int = RELEASE_REPLICATION_RUNS,
) -> dict:
    """Recompute and exactly verify the committed independent report.

    Time, environment, and repository metadata are receipts rather than scientific
    outputs, so replay compares the deterministic result payload while separately
    binding the report to the complete implementation file set and canonical input.
    """

    report = json.loads(report_path.read_text(encoding="utf-8"))
    expected_identity = {
        "canonicalStatus": "noncanonical",
        "evidenceKind": "reimplemented",
        "authorCodeUsed": False,
        "canonicalSource": canonical_source_ref(),
        "implementation": implementation_record(EXPERIMENT_ROOT, canonical_path()),
    }
    identity = {key: report.get(key) for key in expected_identity}
    if identity != expected_identity:
        raise ValueError(
            "replication report is stale or mislabeled: implementation/canonical receipt "
            "does not match the current independent experiment"
        )

    expected = run_replication(n_large=expected_runs)
    if _result_payload(report) != _result_payload(expected):
        raise ValueError(
            "replication report does not exactly replay from the current implementation, "
            f"canonical input, seed, and {expected_runs}-run ensemble"
        )
    if report.get("overallVerdict") != "pass":
        raise ValueError("replication report is not eligible for publication: verdict is not pass")
    return report


def _km_median_years(km) -> float | None:
    below = (km.survival < 0.5).any()
    if not below:
        return None
    return float(km.times[int(np.searchsorted(-km.survival, -0.5))])


def _scenario_ensemble(sid: str, n: int, seed_offset: int) -> tuple:
    anchors = load_anchors()
    base = anchors[sid]
    draws = sample_perturbed(base, n, np.random.default_rng(12345 + seed_offset))
    outcomes = simulate_events(draws, window=1000)
    return base, draws, outcomes


def cmd_replicate(args: argparse.Namespace) -> int:
    report = build_replication_report(n_large=args.runs)
    _write_report("replication-report.json", report)
    print(f"replication verdict: {report['overallVerdict']}")
    return 0 if report["overallVerdict"] == "pass" else 1


def cmd_verify(args: argparse.Namespace) -> int:
    try:
        report = verify_replication_report(args.report)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"resilience report verification failed: {error}", file=sys.stderr)
        return 1
    print(
        "verified independent resilience report: "
        f"{report['ensembleSizes']['large']} seeded runs per scenario, "
        f"{len(report['scenarios'])} scenarios, verdict {report['overallVerdict']}"
    )
    return 0


def cmd_survival(args: argparse.Namespace) -> int:
    del args
    horizons = [100, 250, 500, 1000]
    scenarios = []
    for sid in sorted(load_anchors(), key=lambda s: int(s[1:])):
        _, _, outcomes = _scenario_ensemble(sid, n=20000, seed_offset=17)
        km = kaplan_meier(outcomes.first_collapse_year, ~outcomes.censored)
        aj = aalen_johansen(
            outcomes.first_collapse_year,
            ~outcomes.censored,
            outcomes.first_cause.astype(str),
        )

        aj_times = aj.times
        cif_rows: dict[str, dict[str, float]] = {}
        for h in horizons:
            idx = int(np.searchsorted(aj_times, h, side="right")) - 1
            res = round(float(aj.cif_resource[max(idx, 0)]), 5)
            haz = round(float(aj.cif_hazard[max(idx, 0)]), 5)
            cif_rows[str(h)] = {
                "resource": res,
                "hazard": haz,
                "total": round(res + haz, 5),
            }

        naive_mean = float(np.where(outcomes.censored, 1000, outcomes.first_collapse_year).mean())
        scenarios.append(
            {
                "scenarioId": sid,
                "runs": int(outcomes.duty_cycle.size),
                "kaplanMeierMedianYears": _km_median_years(km),
                "restrictedMeanCollapseFreeYears": round(
                    restricted_mean_survival_time(km, 1000), 2
                ),
                "cumulativeIncidenceAtYears": cif_rows,
                "nelsonAalenFinal": round(
                    float(nelson_aalen(outcomes.first_collapse_year, ~outcomes.censored)[-1]), 5
                ),
                "naiveMeanFirstCollapse": round(naive_mean, 2),
                "censoredFraction": round(float(outcomes.censored.mean()), 5),
            }
        )
    report = {
        **_provenance_header("survival"),
        "note": (
            "Kaplan-Meier and Aalen-Johansen estimates treat never-collapsed runs as "
            "right-censored at year 1000, unlike the paper-style truncated mean shown "
            "for contrast."
        ),
        "scenarios": scenarios,
    }
    _write_report("survival-report.json", report)
    return 0


def cmd_sensitivity(args: argparse.Namespace) -> int:
    names = tuple(DESIGN_BOUNDS)
    space = ParamSpace(
        names=names,
        lows=np.array([DESIGN_BOUNDS[n][0] for n in names]),
        highs=np.array([DESIGN_BOUNDS[n][1] for n in names]),
    )

    from .analytics import expected_metrics as em

    def analytic_output(field):
        def fn(p):
            values = [
                em(
                    r0=p["R0"][i],
                    delta=p["delta"][i],
                    h=p["h"][i],
                    rd=int(round(p["rd"][i])),
                    rf=p["rf"][i],
                )
                for i in range(len(p["R0"]))
            ]
            return np.array([getattr(m, field) for m in values])

        return fn

    analytic_duty = analytic_output("expected_duty_cycle")
    analytic_count = analytic_output("expected_collapses")

    def simulated_duty(p):
        arrays = {
            "r": np.full(len(p["R0"]), 0.001),
            **{name: p[name] for name in names if name != "r"},
        }
        return simulate_events(arrays, window=1000, seed=987654321).duty_cycle

    n_base = args.base_samples
    n_reps = int(getattr(args, "sobol_replicates", 1) or 1)
    report = {
        **_provenance_header("global_sensitivity"),
        "method": (
            "Saltelli-style Sobol first-order and total-order indices on independent "
            "uniform designs (replicated for Monte Carlo standard errors); Morris "
            "elementary effects in unit-cube coordinates"
        ),
        "baseSamples": n_base,
        "sobolReplicates": n_reps,
        "designBounds": {n: list(DESIGN_BOUNDS[n]) for n in names},
        "sobol": {
            key: sobol_indices(fn, space, n_base=n_base, n_replicates=n_reps)
            for key, fn in (
                ("analytic_expected_duty_cycle", analytic_duty),
                ("analytic_expected_collapses", analytic_count),
                ("simulated_duty_cycle_crn", simulated_duty),
            )
        },
        "morris_analytic_duty": morris_elementary_effects(analytic_duty, space),
    }
    _write_report("sensitivity-report.json", report)
    return 0


def cmd_dataset(args: argparse.Namespace) -> int:
    config = DatasetConfig(
        n_design_points=args.points,
        replicates_per_point=args.replicates,
    )
    header, rows, manifest = generate_dataset(config)
    GENERATED.mkdir(parents=True, exist_ok=True)
    csv_path = (
        GENERATED / f"janus-resilience-level2-{config.n_design_points}x{config.replicates_per_point}.csv.gz"  # noqa: E501
    )
    checksum = write_dataset_gzip(csv_path, header, rows)
    summary = summarize_dataset(rows)
    summary_payload = {
        **_provenance_header("level2_dataset"),
        "file": str(csv_path.relative_to(EXPERIMENT_ROOT)),
        "sha256": checksum,
        "manifest": manifest,
        "summary": summary,
    }
    _write_report("dataset-summary.json", summary_payload)
    print(json.dumps(summary, indent=2))
    return 0


def cmd_surrogate(args: argparse.Namespace) -> int:
    dataset_files = sorted(GENERATED.glob("janus-resilience-level2-*.csv.gz"))
    if not dataset_files:
        print("no generated dataset found; run the `dataset` command first")
        return 1
    dataset = load_dataset(dataset_files[-1])
    rows = evaluate_benchmark(dataset, include_sklearn_models=not args.no_sklearn)
    report = {
        **_provenance_header("surrogate_benchmark"),
        "datasetFile": dataset_files[-1].name,
        "note": (
            "Point-level metrics average replicate runs per design point first, removing "
            "stochastic seed noise from the parameter-response comparison. Coverage is "
            "the empirical rate of split-conformal 90% bands containing run-level truth."
        ),
        "results": rows,
    }
    _write_report("surrogate-benchmark.json", report)
    return 0


def cmd_persistence(args: argparse.Namespace) -> int:
    del args
    observability_path = (
        EXPERIMENT_ROOT.parents[1] / "data" / "canonical" / "observability" / "figure-6.json"
    )
    flags = load_presence_flags(observability_path)

    ours = {}
    for sid in sorted(load_anchors(), key=lambda s: int(s[1:])):
        _, _, outcomes = _scenario_ensemble(sid, n=20000, seed_offset=17)
        ours[sid] = float(outcomes.duty_cycle.mean())

    reported_rows = []
    for sid, res in load_reported().items():
        if res.mean_duty_cycle is not None:
            reported_rows.append((sid, res.mean_duty_cycle))
    reported = dict(reported_rows)

    report = {
        **_provenance_header("persistence"),
        "equation": "p_i = {Dc + min[Ti / Tspan, 1 - Dc]} * delta_i   (JANUS-PAPER-05 Eq. 7)",
        "lifetimes": {"no2": "~hours-days", "cfc11": 55, "cfc12": 140, "cf4": 50000},
        "presenceFlagProvenance": {
            "sourceId": "janus.observability.apjl-figure-6",
            "evidenceKind": "derived",
        },
        "usingReimplementedDutyCycles": {
            "evidenceKind": "reimplemented",
            "rows": persistence_table(ours, "reimplemented", flags),
        },
        "usingReportedDutyCycles": {
            "evidenceKind": "reported",
            "coverageNote": "only scenarios whose canonical record includes a numeric duty cycle",
            "rows": persistence_table(reported, "reported", flags),
        },
    }
    _write_report("persistence-report.json", report)
    return 0


def cmd_figures(args: argparse.Namespace) -> int:
    from .plots import render_figures

    selected = args.figures.split(",") if args.figures else None
    return render_figures(selected)


def cmd_report(args: argparse.Namespace) -> int:
    from .report import build_report

    build_report(compile_pdf=not args.no_compile)
    return 0


def cmd_all(args: argparse.Namespace) -> int:
    status = cmd_replicate(args)
    status |= cmd_survival(args)
    status |= cmd_sensitivity(args)
    status |= cmd_dataset(args)
    status |= cmd_surrogate(args)
    status |= cmd_persistence(args)
    return status


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="janus-resilience")
    sub = parser.add_subparsers(dest="command", required=True)

    rep = sub.add_parser("replicate", help="replicate paper Monte Carlo outcomes and validate")
    rep.add_argument("--runs", type=int, default=20000)
    rep.set_defaults(func=cmd_replicate)

    verify = sub.add_parser(
        "verify", help="recompute and verify the committed independent replication report"
    )
    verify.add_argument("--report", type=Path, default=REPLICATION_REPORT)
    verify.set_defaults(func=cmd_verify)

    surv = sub.add_parser("survival", help="KM + Aalen-Johansen competing-risk analysis")
    surv.set_defaults(func=cmd_survival)

    sens = sub.add_parser("sensitivity", help="Sobol + Morris global sensitivity analysis")
    sens.add_argument("--base-samples", type=int, default=1024)
    sens.add_argument("--sobol-replicates", type=int, default=4)
    sens.set_defaults(func=cmd_sensitivity)

    ds = sub.add_parser("dataset", help="generate the Level-2 continuous-parameter dataset")
    ds.add_argument("--points", type=int, default=8192)
    ds.add_argument("--replicates", type=int, default=8)
    ds.set_defaults(func=cmd_dataset)

    sur = sub.add_parser("surrogate", help="run the surrogate benchmark on a generated dataset")
    sur.add_argument("--no-sklearn", action="store_true")
    sur.set_defaults(func=cmd_surrogate)

    pers = sub.add_parser("persistence", help="observation probabilities via paper Eq. 7")
    pers.set_defaults(func=cmd_persistence)

    figs = sub.add_parser("figures", help="render all report figures into reports/figures/")
    figs.add_argument(
        "--figures", default="", help="comma-separated subset (e.g. replication,survival)"
    )
    figs.set_defaults(func=cmd_figures)

    rep = sub.add_parser("report", help="build the LaTeX report (and PDF when tectonic exists)")
    rep.add_argument("--no-compile", action="store_true")
    rep.set_defaults(func=cmd_report)

    allp = sub.add_parser("all", help="run every stage")
    allp.add_argument("--runs", type=int, default=20000)
    allp.add_argument("--points", type=int, default=8192)
    allp.add_argument("--replicates", type=int, default=8)
    allp.add_argument("--base-samples", type=int, default=1024)
    allp.add_argument("--sobol-replicates", type=int, default=4)
    allp.add_argument("--no-sklearn", action="store_true")

    def _run_all(ns):
        return cmd_all(ns)

    allp.set_defaults(func=_run_all)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

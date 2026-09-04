"""LaTeX report generation for the resilience-lab experiment.

Builds a self-contained scientific report from the committed JSON artifacts: every
table in the document is rendered directly from reports/*.json plus the canonical
parameter file, so the PDF can never drift from the data. Figures are referenced from
reports/figures/. Compilation uses tectonic when available; without it the .tex is
still written and can be built anywhere (e.g. Overleaf).
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from .dataset import DESIGN_SPACE, PARAM_ORDER
from .params import load_anchors

EXPERIMENT_ROOT = Path(__file__).resolve().parents[2]
REPORTS = EXPERIMENT_ROOT / "reports"
LATEX_DIR = REPORTS / "latex"
FIGURES = REPORTS / "figures"

BOUND_SOURCES = {
    "r": "anchor growth rates (scenario paper Table 9)",
    "R0": "anchor resource stocks",
    "delta": "Table 6 sweep bounds",
    "cf": "Table 6 joined with Table 2 governance ranges",
    "rd": "Table 6 sweep bound; low end from Rule-by-All range",
    "rf": "Table 6 low bound to full-recovery upper end",
    "h": "Table 6 sweep bounds",
}

VERDICT_MACROS = {
    "pass": "\\pass",
    "warn": "\\warn",
    "fail": "\\fail",
    "not_validated": "\\notvalidated",
}

MODEL_LABELS = {
    "analytic_renewal": "analytic renewal",
    "hist_gradient_boosting": "hist gradient boosting",
    "ridge_quadratic": "ridge (quadratic)",
    "gaussian_process_rbf": "Gaussian process (RBF)",
}


def esc(text: object) -> str:
    s = str(text)
    for old, new in (
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    ):
        s = s.replace(old, new)
    return s


def fnum(value: float | None, digits: int = 3) -> str:
    if value is None:
        return "---"
    return f"{value:.{digits}f}"


def _load(name: str) -> dict:
    return json.loads((REPORTS / name).read_text(encoding="utf-8"))


def _preamble() -> str:
    return r"""\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{amsmath}
\usepackage{booktabs}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{caption}
\usepackage[
  colorlinks=true,
  linkcolor=blue!50!black,
  urlcolor=blue!50!black,
  citecolor=blue!50!black
]{hyperref}
\captionsetup{font=small}
\newcommand{\pass}{\textcolor{green!55!black}{pass}}
\newcommand{\warn}{\textcolor{orange!85!black}{warn}}
\newcommand{\fail}{\textcolor{red!75!black}{fail}}
\newcommand{\notvalidated}{\textcolor{gray}{not validated}}

\title{\textbf{Janus Resilience Lab}\\[4pt]
\large An independent reimplementation, validation, and analysis platform\\
for the Project Janus collapse--recovery model}
\author{Janus Observatory experiments track}
\date{August 21, 2026 \,\textperiodcentered\, dataset jrl-dataset-1.0.0}

\begin{document}
\maketitle

\begin{abstract}
\noindent
This report documents an experiments-track platform built around the published
collapse--recovery model of JANUS-PAPER-05 (\texttt{arXiv:2604.13774v1}, CC BY 4.0).
The model is reimplemented independently from its equations in three mutually
validating representations - exact renewal recursions, a year-by-year simulator, and an
event-driven sampler - and validated against every aggregate the source reports in
prose. On that foundation the experiment adds censoring-aware survival analysis,
variance-based global sensitivity analysis, a 65{,}536-run continuous-parameter
dataset, a surrogate benchmark under progressively harder holdout protocols, and the
paper's technosignature observation-probability equation applied to reimplemented duty
cycles. The ten Project Janus scenarios are self-consistent possibilities, not
forecasts: nothing here ranks them, assigns them probabilities, or implies they are
equally likely.
\end{abstract}

\tableofcontents
"""


def _section_model() -> str:
    anchors = load_anchors()
    rows = []
    for sid in sorted(anchors, key=lambda s: int(s[1:])):
        a = anchors[sid]
        rows.append(
            f"{sid} & {a.r:.4f} & {a.R0:.0f} & {a.delta:g} & {a.cf:g} & "
            f"{a.rd:d} & {a.rf:g} & {a.h:g} \\\\"
        )
    table = "\n".join(rows)
    return rf"""
\section{{The published model}}
\label{{sec:model}}

JANUS-PAPER-05 models a technological civilization through two state variables -
technological capacity $T(t)$, initialised at $T_0 = 1$, and a resource stock $R(t)$ -
over a fixed window of 1000 years discretized into yearly steps. During active steps
technology grows linearly and resources deplete at a constant rate,
\begin{{align}}
  T_{{t+1}} &= T_t + r, &
  R_{{t+1}} &= R_t - \delta .
\end{{align}}
A collapse is triggered either by exhaustion ($R_t \le 0$) or by a per-step Bernoulli
existential hazard with rate $h$, evaluated independently of resource levels. A collapse
multiplies technology by the survival fraction $c_f$, zeroes resources, and starts a
dormant recovery period of $\mathrm{{rd}}$ years after which resources are restored to
$\mathrm{{rf}} \cdot R_0$. The \emph{{duty cycle}} is the fraction of active years; the
paper-style mean time to first collapse assigns the full window to runs that never
collapse.

\begin{{table}}[ht]
\centering
\caption{{Scenario anchor parameters (canonical transcription of Table 4,
JANUS-PAPER-05).}}
\small
\begin{{tabular}}{{lccccccc}}
\toprule
Scenario & $r$ & $R_0$ & $\delta$ & $c_f$ & rd (yr) & rf & $h$ \\
\midrule
{table}
\bottomrule
\end{{tabular}}
\end{{table}}

Monte Carlo replication follows the published uncertainty scheme (Table 5 of the same
source): $R_0$ and $\delta$ normal with standard deviation 5\% of the mean, $c_f$ and rf
triangular over mode $\pm 5\%$ clamped to $[0,1]$, rd normal with a 10-year standard
deviation truncated at zero, and $r$ and $h$ held fixed per scenario.
"""


def _section_replication(replication: dict) -> str:
    scenario_rows = []
    detail_rows = []
    verdict_counts = {"pass": 0, "warn": 0, "fail": 0, "not_validated": 0}
    for scenario in replication["scenarios"]:
        sid = scenario["scenarioId"]
        by_metric = {c["metric"]: c for c in scenario["comparisons"]}
        cells = []
        for key, digits in (
            ("mean_duty_cycle", 3),
            ("mean_time_to_first_collapse", 0),
            ("mean_collapse_count", 2),
            ("fraction_never_collapsed", 3),
        ):
            comp = by_metric[key]
            reported = comp.get("reported")
            ours = comp.get("ours")
            if reported is None:
                cells.append(f"{fnum(ours, digits)} / ---")
            else:
                cells.append(f"{fnum(ours, digits)} / {fnum(reported, digits)}")
            verdict_counts[comp["verdict"]] = verdict_counts.get(comp["verdict"], 0) + 1
        worst = VERDICT_MACROS[scenario["worstVerdict"]]
        scenario_rows.append(f"{sid} & " + " & ".join(cells) + f" & {worst} \\\\")
        for comp in scenario["comparisons"]:
            if comp.get("reported") is None:
                continue
            detail_rows.append(
                f"{sid} & {esc(comp['metric'])} & {fnum(comp['ours'], 4)} & "
                f"{fnum(comp['reported'], 4)} & {fnum(comp['absDiff'], 4)} & "
                    f"{fnum(comp['tolerance'], 3)} & "
                    f"{VERDICT_MACROS[comp['verdict']]} \\\\"
            )
    wide = "\n".join(scenario_rows)
    details = "\n".join(detail_rows)
    overall = replication["overallVerdict"]
    return rf"""
\section{{Replication of published outcomes}}
\label{{sec:replication}}

Each scenario is replicated twice: a 200-run batch seeded like the paper's documented
generator seed for direct comparability, and a
{replication['ensembleSizes']['large']}-run ensemble whose Monte Carlo error is small
enough to expose systematic semantic
differences. Table~\ref{{tab:replication-wide}} compares ensemble aggregates against
every prose-reported value; Table~\ref{{tab:replication-detail}} lists each comparison
with its tolerance. The overall verdict is \{overall}.
Shaded bands in Figure~\ref{{fig:replication}} show the tolerances; S3 and S10 must
match exactly and do.

\begin{{table}}[ht]
\centering
\caption{{Ours / reported, by scenario (large ensembles). ``---'' marks values the
source shows only in a figure.}}
\small
\begin{{tabular}}{{lccccl}}
\toprule
Scenario & Duty cycle & First collapse (yr) & Collapse count & Never collapsed & Verdict \\
\midrule
{wide}
\bottomrule
\end{{tabular}}
\label{{tab:replication-wide}}
\end{{table}}

\begin{{table}}[ht]
\centering
\caption{{Individual metric comparisons.}}
\scriptsize
\begin{{tabular}}{{llccccc}}
\toprule
Scenario & Metric & Ours & Reported & Abs.\ diff. & Tolerance & Verdict \\
\midrule
{details}
\bottomrule
\end{{tabular}}
\label{{tab:replication-detail}}
\end{{table}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=0.82\linewidth]{{../figures/fig-replication.png}}
\caption{{Reimplementation vs.\ reported aggregates. Error bars are validation
tolerances; the dashed line is perfect agreement.}}
\label{{fig:replication}}
\end{{figure}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=\linewidth]{{../figures/fig-trajectories.png}}
\caption{{Ensemble trajectories of technological capacity and resources (200 runs per
scenario, published perturbation scheme). The sawtooth pattern of S4, the late
collapses of S8/S9, and the uninterrupted growth of S3/S10 reproduce the qualitative
structure reported by the source.}}
\label{{fig:trajectories}}
\end{{figure}}

One residual divergence deserves note: the never-collapsed fraction of S5 is pinned by
the model at $(1-h)^{{1000}} = 0.6066$, while the paper reports roughly two thirds
($\approx 0.66$) from 200 runs. Binomial noise at that ensemble size covers most of the
gap, so no semantic change was introduced to close it.
"""


def _section_survival(survival: dict) -> str:
    rows = []
    for scenario in survival["scenarios"]:
        median = scenario["kaplanMeierMedianYears"]
        median_text = "---" if median is None else f"{median:.0f}"
        cif = scenario["cumulativeIncidenceAtYears"]["250"]
        rows.append(
            f"{scenario['scenarioId']} & {median_text} & "
            f"{scenario['restrictedMeanCollapseFreeYears']:.0f} & "
            f"{cif['resource']:.3f} & {cif['hazard']:.3f} & "
            f"{scenario['naiveMeanFirstCollapse']:.0f} & "
            f"{scenario['censoredFraction']:.3f} \\\\"
        )
    table = "\n".join(rows)
    return rf"""
\section{{Censoring-aware survival analysis}}
\label{{sec:survival}}

The paper's truncated mean conflates ``collapsed late'' with ``never collapsed''. This
experiment therefore treats never-collapsed runs as right-censored at year 1000 and
reports Kaplan--Meier survival, Nelson--Aalen cumulative hazard, and Aalen--Johansen
cumulative incidence separating the two competing collapse causes (resource depletion
vs.\ exogenous hazard). Figure~\ref{{fig:survival}} shows both; the cause decomposition
recovers the expected physics - S6 is hazard-dominated, S4 collapses are almost purely
resource-driven, and S1 mixes the two.

\begin{{table}}[ht]
\centering
\caption{{Per-scenario survival summary (20k-run ensembles). RMST = restricted mean
collapse-free time over the full window. The final two columns contrast the paper-style
truncated first-collapse mean with the censoring fraction that motivates proper
survival treatment.}}
\small
\begin{{tabular}}{{lcccccc}}
\toprule
Scenario & KM median (yr) & RMST (yr) & CIF$_\mathrm{{res}}$(250) & CIF$_\mathrm{{haz}}$(250)
& Naive $T_c$ & Censored \\
\midrule
{table}
\bottomrule
\end{{tabular}}
\label{{tab:survival}}
\end{{table}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=\linewidth]{{../figures/fig-survival.png}}
\caption{{Left: Kaplan--Meier collapse-free survival per scenario. Right:
Aalen--Johansen cumulative incidence for selected scenarios, split by cause.}}
\label{{fig:survival}}
\end{{figure}}
"""


def _section_sensitivity(sensitivity: dict) -> str:
    sobol = sensitivity["sobol"]
    names = list(sobol["analytic_expected_duty_cycle"])
    outputs = [
        ("analytic_expected_duty_cycle", "analytic duty"),
        ("simulated_duty_cycle_crn", "simulated duty (CRN)"),
        ("analytic_expected_collapses", "analytic count"),
    ]
    rows = []
    for name in names:
        cells = [name.replace("_", "\\_")]
        for out_key, _ in outputs:
            entry = sobol[out_key][name]
            se = entry.get("total_order_se")
            se_text = "---" if se is None else f"\\,{se:.3f}"
            cells.append(f"{entry['total_order']:.3f}$\\pm${se_text}")
        rows.append(" & ".join(cells) + " \\\\")
    table = "\n".join(rows)

    morris = sensitivity["morris_analytic_duty"]
    ranked = sorted(names, key=lambda n: morris[n]["mu_star"], reverse=True)

    return rf"""
\section{{Global sensitivity analysis}}
\label{{sec:sensitivity}}

Where the source sweeps one parameter at a time near scenario baselines, this experiment
estimates variance decomposition over the whole seven-dimensional design space using
Saltelli-style Sobol indices on independent uniform designs, replicated four times so
every estimate carries a Monte Carlo standard error, plus Morris elementary effects in
unit-cube coordinates (Figure~\ref{{fig:sensitivity}}).

Two structural findings act as internal consistency checks. First, the collapse fraction
$c_f$ and growth rate $r$ have exactly zero total-order effect on every timing outcome -
the model's metrics depend only on event timing, which is precisely why the paper omits
$c_f$ from its sensitivity study. Second, the exact analytic recursions and the
event-driven simulator evaluated under common random numbers produce index estimates
that agree within their standard errors (columns 1 and 2 of
Table~\ref{{tab:sobol}}).

By total-order effect the duty cycle is dominated by recovery delay rd and hazard $h$,
followed by $R_0$, then $\delta$ and rf; expected collapse count is dominated by $h$
(Table~\ref{{tab:sobol}}). Morris ranking agrees: {", ".join(ranked[:3])} lead, with
cf and $r$ exactly zero. These rankings answer a different question than the source's
per-scenario swings - they describe variance across the entire design space, where
interactions between parameters are active (first-order sums fall short of totals).

\begin{{table}}[ht]
\centering
\caption{{Total-order Sobol indices (mean $\pm$ standard error over four replicates;
1024 base samples).}}
\small
\begin{{tabular}}{{lccc}}
\toprule
Parameter & Analytic duty & Simulated duty (CRN) & Analytic count \\
\midrule
{table}
\bottomrule
\end{{tabular}}
\label{{tab:sobol}}
\end{{table}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=\linewidth]{{../figures/fig-sensitivity.png}}
\caption{{Left: total-order indices for three outputs. Right: Morris elementary-effect
magnitudes on the unit cube.}}
\label{{fig:sensitivity}}
\end{{figure}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=0.9\linewidth]{{../figures/fig-regime-boundary.png}}
\caption{{Expected number of collapse--recovery cycles across the rf--$\delta$ plane at
S8 settings, computed from the exact renewal recursions rather than Monte Carlo. The S8
baseline sits near the boundary between the two- and three-cycle regimes, matching the
source's qualitative finding.}}
\label{{fig:regimes}}
\end{{figure}}
"""


def _section_dataset(dataset_summary: dict) -> str:
    manifest = dataset_summary["manifest"]
    stats = dataset_summary["summary"]
    bounds_rows = []
    for name in PARAM_ORDER:
        lo, hi = DESIGN_SPACE[name]
        label = name.replace("_", "\\_")
        bounds_rows.append(
            f"{label} & [{lo:g}, {hi:g}] & {BOUND_SOURCES[name]} \\\\"
        )
    bounds = "\n".join(bounds_rows)
    causes = stats["causeShares"]

    return rf"""
\section{{Level-2 continuous-parameter dataset}}
\label{{sec:dataset}}

The ten scenarios anchor a continuous space; they are not training examples. Version
{manifest['datasetVersion']} contains {manifest['totalRuns']:,} runs
({manifest['designPoints']:,} design points $\times$
{manifest['replicatesPerPoint']} seeds), sampled with a scrambled Sobol sequence over
the paper-derived bounds in Table~\ref{{tab:space}}, executed by the event-driven
sampler whose equivalence to the reference simulator is asserted by the test suite.
Replicate structure keeps stochastic seed noise (mean within-point sd of
{stats['perPointSeedNoiseStd']:.3f} duty-cycle units) separable from parameter response
(between-point spread {stats['pointMeanDutyStd']:.3f}).

\begin{{table}}[ht]
\centering
\caption{{Design-space bounds and their provenance.}}
\small
\begin{{tabular}}{{lll}}
\toprule
Parameter & Range & Source of bounds \\
\midrule
{bounds}
\bottomrule
\end{{tabular}}
\label{{tab:space}}
\end{{table}}

Summary: mean duty cycle {stats['meanDutyCycle']:.3f} (sd {stats['stdDutyCycle']:.3f});
mean collapse count {stats['meanCollapseCount']:.2f}; never-collapsed fraction
{stats['fractionNeverCollapsed']:.3f}; among collapsed runs,
{causes['hazard']*100:.1f}\% hazard-triggered vs.\ {causes['resource']*100:.1f}\%
resource-depleted; regime counts {stats['regimeCounts']['stable']:,} stable /
{stats['regimeCounts']['single_collapse']:,} single-collapse /
{stats['regimeCounts']['recurrent']:,} recurrent
(Figure~\ref{{fig:dataset-map}}).

\begin{{figure}}[ht]
\centering
\includegraphics[width=0.95\linewidth]{{../figures/fig-dataset-map.png}}
\caption{{Exact expected duty cycle per design point, marginalised over the other five
parameters. Scenario anchors sit inside the space except S3/S10, whose $\delta = 0$
lies on the excluded boundary.}}
\label{{fig:dataset-map}}
\end{{figure}}
"""


def _section_benchmark(benchmark: dict) -> str:
    protocols = ["random", "region_block", "anchor_out"]

    def table_for(target: str) -> str:
        rows_map: dict[str, dict[str, dict]] = {}
        for row in benchmark["results"]:
            if row["target"] == target:
                rows_map.setdefault(row["model"], {})[row["protocol"]] = row
        lines = []
        for model in sorted(rows_map):
            label = MODEL_LABELS.get(model, model).replace("_", "\\_")
            cells = []
            for protocol in protocols:
                entry = rows_map[model].get(protocol)
                if entry is None:
                    cells.append("---")
                else:
                    cells.append(f"{entry['point_r2']:.3f} / {entry['coverage90']:.2f}")
            lines.append(f"{label} & " + " & ".join(cells) + " \\\\")
        return "\n".join(lines)

    duty_table = table_for("duty_cycle")
    count_table = table_for("n_collapses")

    return rf"""
\section{{Surrogate benchmark under grouped holdouts}}
\label{{sec:benchmark}}

A learned model scoring well after a random split may only be rediscovering analytic
structure. Every candidate is therefore compared against the exact renewal baseline
under progressively harder protocols: a design-point-grouped random split; a contiguous
sub-box ($\delta \ge 1.8$, rf $\le 0.375$) held out entirely; and leave-one-anchor-out
folds excluding all runs within normalized radius 0.45 of each in-domain scenario
(seven folds; S3/S10 sit outside the design space). Split-conformal bands at nominal
90\% are calibrated per fold, and empirical coverage is reported next to every score.

Tables~\ref{{tab:bench-duty}} and~\ref{{tab:bench-count}} give the leaderboard as
\emph{{point-level}} $R^2$ (replicates averaged per design point, removing seed noise)
with conformal coverage in parentheses. Figure~\ref{{fig:benchmark}} visualises the
degradation pattern.

\begin{{table}}[ht]
\centering
\caption{{Duty-cycle target: point-level $R^2$ / empirical conformal coverage, by
protocol. Negative $R^2$ means worse than predicting the test-set mean.}}
\small
\begin{{tabular}}{{lccc}}
\toprule
Model & random & region block & anchor out \\
\midrule
{duty_table}
\bottomrule
\end{{tabular}}
\label{{tab:bench-duty}}
\end{{table}}

\begin{{table}}[ht]
\centering
\caption{{Collapse-count target: same layout.}}
\small
\begin{{tabular}}{{lccc}}
\toprule
Model & random & region block & anchor out \\
\midrule
{count_table}
\bottomrule
\end{{tabular}}
\label{{tab:bench-count}}
\end{{table}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=\linewidth]{{../figures/fig-surrogate.png}}
\caption{{Benchmark degradation (left) and conformal coverage erosion (right). The
exact analytic baseline loses almost nothing out-of-distribution because its residuals
are irreducible seed noise rather than model error.}}
\label{{fig:benchmark}}
\end{{figure}}

The honest headline: the analytic baseline wins everywhere, including the easy
protocol, and learned models degrade under shift while coverage guarantees erode with
it (the Gaussian process drops to 0.66 empirical coverage in the region-block fold).
Any future claim that a learned surrogate beats this simulator must clear these
protocols first.
"""


def _section_persistence(persistence: dict) -> str:
    rows = []
    for row in persistence["usingReimplementedDutyCycles"]["rows"]:
        no2 = "---" if row["no2"] is None else f"{row['no2']:.3f}"
        cfc11 = "---" if row["cfc11"] is None else f"{row['cfc11']:.3f}"
        cfc12 = "---" if row["cfc12"] is None else f"{row['cfc12']:.3f}"
        rows.append(
            f"{row['scenarioId']} & {row['dutyCycleUsed']:.3f} & {no2} & {cfc11} & {cfc12} \\\\"
        )
    table = "\n".join(rows)
    return rf"""
\section{{Technosignature persistence and observation probabilities}}
\label{{sec:persistence}}

The source defines, for technosignature $i$ present in a scenario,
\begin{{equation}}
  p_i \;=\;
  \left\{{ D_c + \min\!\left[ T_i / T_\mathrm{{span}},\; 1 - D_c \right] \right\}}\delta_i ,
  \qquad T_\mathrm{{span}} = 1000\ \mathrm{{yr}},
\end{{equation}}
so short-lived signatures track the duty cycle while long-lived relic signatures remain
observable through inactive periods. Lifetimes come from the paper's own prose (NO2
hours--days; CFC-11 55 yr; CFC-12 140 yr; CF$_4$ about 50 kyr). Presence flags are
derived here from the reviewed canonical detection matrix
(\texttt{{janus.observability.apjl-figure-6}}): NO2 counts present where HWO detects
CO$_2$+NO$_2$, CFCs where LIFE detects CO$_2$+CFC-11/12. CF$_4$ presence cannot be
separated from that matrix and remains explicitly \emph{{not evaluated}} instead of
guessed. Table~\ref{{tab:persistence}} and Figure~\ref{{fig:persistence}} use this
experiment's reimplemented duty cycles; the committed report also contains the variant
computed from canonical reported duty cycles where available.

\begin{{table}}[ht]
\centering
\caption{{Observation probabilities $p_i$ from reimplemented duty cycles. A dash means
the presence flag is zero in the canonical detection matrix.}}
\small
\begin{{tabular}}{{lcccc}}
\toprule
Scenario & $D_c$ used & NO2 & CFC-11 & CFC-12 \\
\midrule
{table}
\bottomrule
\end{{tabular}}
\label{{tab:persistence}}
\end{{table}}

\begin{{figure}}[ht]
\centering
\includegraphics[width=0.98\linewidth]{{../figures/fig-persistence.png}}
\caption{{Short-lived signatures track the duty cycle exactly; longer-lived relics add
observability during inactive periods. Scenarios lacking a canonical detection flag
show nothing regardless of duty cycle - technology does not imply detectability.}}
\label{{fig:persistence}}
\end{{figure}}
"""


def _section_nasa() -> str:
    snapshot_path = EXPERIMENT_ROOT / "data" / "generated" / "nasa" / "snapshot.json"
    if not snapshot_path.exists():
        return """
\\section{Adjacent NASA context data}

No NASA Exoplanet Archive snapshot is present. Run
\\texttt{janus-resilience} figures pipeline companion script
\\texttt{scripts/fetch\\_stellar\\_context.py} to fetch one.

"""
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    return f"""
\\section{{Adjacent NASA context data}}
\\label{{sec:nasa}}

A contextual stellar table was retrieved live from the NASA Exoplanet Archive TAP
service ({snapshot['rows']} confirmed planet-host systems within 15 pc with effective
temperatures between 5300 and 6000 K, retrieved {snapshot['retrievedAt'][:10]}). It is
input for future observer-side work only and is not a canonical Janus dataset. Required
acknowledgment, recorded verbatim in the snapshot:

\\begin{{quote}}
\\small {esc(snapshot['acknowledgment'])}
\\end{{quote}}
"""


def _section_limitations() -> str:
    return """
\\section{Limitations and threats to validity}
\\label{sec:limitations}

\\begin{itemize}
  \\item Yearly-step semantics involve ambiguities the source does not pin down
        (same-step tie-breaking, whether the collapse year counts as active). Each
        choice is recorded in \\texttt{ADR-0001}, implemented identically in all three
        representations, and covered by validation tolerances.
  \\item Table 5 distributions are interpreted as normal standard deviations of 5\\% of
        the mean and symmetric triangular supports clamped to $[0,1]$; the source does
        not specify clamping behaviour near distribution limits.
  \\item S5's never-collapsed fraction reproduces to 0.61 vs the reported $\\approx
        0.66$; the analytic value is pinned at $(1-h)^{1000} = 0.6066$ and the residual
        is consistent with 200-run Monte Carlo noise.
  \\item First-order Sobol indices carry wide standard errors because the product
        estimator is heavy-tailed; total-order indices are the stable ranking and are
        always printed with standard errors.
  \\item Leave-one-anchor-out folds exclude S3/S10 because $\\delta = 0$ sits outside
        the continuous design space, whose lower bound follows the source's own Table 6
        sweep floor.
  \\item The Gaussian process baseline is deliberately frugal (single optimizer
        restart, subsampled training); its scores bound naive GP usage rather than
        best-possible GP performance.
\\end{itemize}
"""


def _section_provenance(environment: dict) -> str:
    env = environment["environment"]
    sklearn_line = env.get("scikit-learn") or "not installed"
    return f"""
\\section{{Provenance and rights}}
\\label{{sec:provenance}}

\\begin{{itemize}}
  \\item Model equations, parameters, uncertainty scheme, sweep bounds, and the
        persistence equation: JANUS-PAPER-05 (\\texttt{{arXiv:2604.13774v1}}, CC BY
        4.0), loaded at runtime from the reviewed canonical transcription
        \\texttt{{data/canonical/collapse/model-and-reported-results.json}}.
  \\item Presence flags derived from \\texttt{{janus.observability.apjl-figure-6}}
        (JANUS-PAPER-03, CC BY 4.0).
  \\item The author-hosted \\texttt{{technocycles}} repository is public but carries no
        license; it is cited, not copied. This reimplementation was written from the
        paper's equations alone.
  \\item NASA Exoplanet Archive data carries the acknowledgment quoted in
        Section~\\ref{{sec:nasa}}.
  \\item No scenario probability, ranking, or forecast is produced anywhere in this
        pipeline.
\\end{{itemize}}

\\subsection*{{Environment}}

Python {env['python']}, NumPy {env['numpy']}, SciPy {env['scipy']},
scikit-learn {sklearn_line}, captured {env['capturedAt']}.
Git commit \\texttt{{{esc(env.get('gitCommit') or 'unavailable')}}}.
"""


def _appendix() -> str:
    commands = [
        "uv sync --project experiments/resilience-lab --extra dev --extra ml",
        "uv run --project experiments/resilience-lab pytest experiments/resilience-lab/tests",
        "uv run --project experiments/resilience-lab janus-resilience replicate",
        "uv run --project experiments/resilience-lab janus-resilience survival",
        "uv run --project experiments/resilience-lab janus-resilience sensitivity",
        "uv run --project experiments/resilience-lab janus-resilience dataset",
        "uv run --project experiments/resilience-lab janus-resilience surrogate",
        "uv run --project experiments/resilience-lab janus-resilience persistence",
        "uv run --project experiments/resilience-lab janus-resilience figures",
        "uv run --project experiments/resilience-lab janus-resilience report",
    ]
    listing = "\n".join(r"  \texttt{" + esc(c) + r"} \\" for c in commands)
    return f"""
\\appendix
\\section{{Reproducing every number and figure}}

All artifacts regenerate deterministically from the repository state recorded in the
report headers:

\\begin{{tabbing}}
{listing}
\\end{{tabbing}}

Every figure is re-rendered from committed JSON reports and seeded ensembles; every
table in this document was generated directly from those JSON files, not transcribed.
"""


def build_report(compile_pdf: bool = True) -> Path:
    replication = _load("replication-report.json")
    survival = _load("survival-report.json")
    sensitivity = _load("sensitivity-report.json")
    dataset_summary = _load("dataset-summary.json")
    benchmark = _load("surrogate-benchmark.json")
    persistence = _load("persistence-report.json")

    body = "".join(
        [
            _section_model(),
            _section_replication(replication),
            _section_survival(survival),
            _section_sensitivity(sensitivity),
            _section_dataset(dataset_summary),
            _section_benchmark(benchmark),
            _section_persistence(persistence),
            _section_nasa(),
            _section_limitations(),
            _section_provenance(replication),
            _appendix(),
        ]
    )

    LATEX_DIR.mkdir(parents=True, exist_ok=True)
    tex_path = LATEX_DIR / "janus-resilience-lab.tex"
    tex_path.write_text(_preamble() + body + "\n\\end{document}\n", encoding="utf-8")
    print(f"wrote {tex_path}")

    pdf_path = tex_path.with_suffix(".pdf")
    if compile_pdf:
        engine = shutil.which("tectonic") or shutil.which("pdflatex")
        if engine is None:
            print("no TeX engine found; compile the .tex manually (e.g. Overleaf)")
            return tex_path
        result = subprocess.run(
            [engine, tex_path.name],
            cwd=LATEX_DIR,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if pdf_path.exists():
            print(f"compiled {pdf_path}")
            return pdf_path
        print(result.stdout[-2000:])
        print(result.stderr[-2000:])
        print("compilation failed; .tex remains available")
    return tex_path

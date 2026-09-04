"""Surrogate benchmarking with grouped holdouts and conformal intervals.

A model scoring well after a random split may only be rediscovering the simulator's
analytic structure. The benchmark therefore compares every candidate against the EXACT
renewal-recursion baseline under progressively harder evaluation protocols:

  random       - design-point-grouped random split (the easy case),
  region_block - an entire contiguous parameter sub-box held out from training,
  anchor_out   - all runs near one named scenario anchor held out, one anchor per fold.

Targets are the duty cycle (primary) and collapse count; both are fully observed within
the window, so no censoring distortion enters the regression targets - censored timing
is handled by survival analysis instead. Point-level scores average each design point's
replicates first, separating the parameter response from stochastic seed noise.
Split-conformal calibration turns any point predictor into a distribution-free band
whose empirical coverage is reported rather than assumed.

scikit-learn is an optional extra; the analytic and ridge baselines run on NumPy alone.
"""

from __future__ import annotations

import csv
import gzip
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .analytics import expected_metrics
from .dataset import PARAM_ORDER

FEATURE_NAMES = PARAM_ORDER

ANCHOR_RADIUS = 0.45


@dataclass(frozen=True)
class Dataset:
    features: np.ndarray
    duty_cycle: np.ndarray
    n_collapses: np.ndarray
    censored: np.ndarray
    point_id: np.ndarray
    regime: list[str]

    @property
    def n_runs(self) -> int:
        return self.features.shape[0]


def load_dataset(path: Path) -> Dataset:
    with gzip.open(path, "rt", newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        col = {name: i for i, name in enumerate(header)}
        rows = list(reader)
    feats = np.array([[float(r[col[c]]) for c in FEATURE_NAMES] for r in rows])
    return Dataset(
        features=feats,
        duty_cycle=np.array([float(r[col["duty_cycle"]]) for r in rows]),
        n_collapses=np.array([int(r[col["n_collapses"]]) for r in rows], dtype=float),
        censored=np.array([r[col["censored"]] == "1" for r in rows]),
        point_id=np.array([int(r[col["point_id"]]) for r in rows]),
        regime=[r[col["regime"]] for r in rows],
    )


def _normalized(features: np.ndarray) -> np.ndarray:
    lows = np.array([0.0001, 400.0, 0.1, 0.2, 0.0, 0.1, 0.0])
    highs = np.array([0.006, 2700.0, 2.5, 1.0, 100.0, 1.0, 0.005])
    return (features - lows) / (highs - lows)


def analytic_baseline(features: np.ndarray, target: str) -> np.ndarray:
    """Exact renewal-recursion prediction; requires no training data."""
    out = np.empty(features.shape[0])
    cache: dict[tuple, float] = {}
    getters = {
        "duty_cycle": lambda m: m.expected_duty_cycle,
        "n_collapses": lambda m: m.expected_collapses,
        "censored": lambda m: m.prob_never_collapsed,
    }
    getter = getters[target]
    for i, row in enumerate(features):
        key = tuple(row.round(9))
        if key not in cache:
            cache[key] = getter(
                expected_metrics(
                    r0=row[1],
                    delta=row[2],
                    h=row[6],
                    rd=int(round(row[4])),
                    rf=row[5],
                )
            )
        out[i] = cache[key]
    return out


class RidgeBaseline:
    """Closed-form ridge regression on unit-normalized features plus quadratic terms."""

    def __init__(self, lam: float = 1e-3):
        self.lam = lam

    def _design(self, X: np.ndarray) -> np.ndarray:
        Xn = _normalized(X)
        return np.concatenate((np.ones((Xn.shape[0], 1)), Xn, Xn * Xn), axis=1)

    def fit(self, X: np.ndarray, y: np.ndarray) -> RidgeBaseline:
        D = self._design(X)
        gram = D.T @ D
        self.beta_ = np.linalg.solve(gram + self.lam * len(y) * np.eye(gram.shape[0]), D.T @ y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self._design(X) @ self.beta_


class GradientBoostBaseline:
    """HistGradientBoostingRegressor wrapper; requires the `ml` extra."""

    def __init__(self, random_state: int = 0):
        self.random_state = random_state
        self.model = None

    def fit(self, X: np.ndarray, y: np.ndarray) -> GradientBoostBaseline:
        from sklearn.ensemble import HistGradientBoostingRegressor

        self.model = HistGradientBoostingRegressor(
            max_iter=400,
            learning_rate=0.06,
            max_leaf_nodes=31,
            early_stopping=False,
            random_state=self.random_state,
        )
        self.model.fit(_normalized(X), y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.asarray(self.model.predict(_normalized(X)))


class GaussianProcessBaseline:
    """RBF + white-noise GP on a subsample; requires the `ml` extra.

    Deliberately frugal (single optimizer restart, small subsample): this baseline
    exists to show how an untuned GP behaves under distribution shift, not to
    represent best-possible GP performance.
    """

    def __init__(self, max_train: int = 1500, random_state: int = 0):
        self.max_train = max_train
        self.random_state = random_state
        self.model = None

    def fit(self, X: np.ndarray, y: np.ndarray) -> GaussianProcessBaseline:
        from sklearn.gaussian_process import GaussianProcessRegressor
        from sklearn.gaussian_process.kernels import RBF, ConstantKernel, WhiteKernel

        rng = np.random.default_rng(self.random_state)
        idx = rng.choice(X.shape[0], size=min(self.max_train, X.shape[0]), replace=False)
        kernel = ConstantKernel(1.0) * RBF(
            length_scale=np.full(len(FEATURE_NAMES), 0.3)
        ) + WhiteKernel(noise_level=1e-4, noise_level_bounds=(1e-8, 1e1))
        self.model = GaussianProcessRegressor(
            kernel=kernel,
            normalize_y=True,
            n_restarts_optimizer=0,
            random_state=self.random_state,
        )
        self.model.fit(_normalized(X[idx]), y[idx])
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.asarray(self.model.predict(_normalized(X)))


def conformal_interval(
    predictor,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    coverage: float = 0.9,
    cal_fraction: float = 0.25,
    seed: int = 0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Split-conformal absolute-residual band around any fitted predictor."""
    rng = np.random.default_rng(seed)
    n_cal = max(int(len(y_train) * cal_fraction), 50)
    cal_idx = rng.choice(len(y_train), size=n_cal, replace=False)
    cal_mask = np.zeros(len(y_train), dtype=bool)
    cal_mask[cal_idx] = True

    predictor.fit(X_train[cal_mask], y_train[cal_mask])
    residuals = np.abs(y_train[cal_mask] - predictor.predict(X_train[cal_mask]))
    level = min(np.ceil((n_cal + 1) * coverage) / n_cal, 1.0)
    width = float(np.quantile(residuals, level))

    predictor.fit(X_train, y_train)
    preds = predictor.predict(X_test)
    return preds, preds - width, preds + width


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    err = y_pred - y_true
    ss_res = float(np.sum(err**2))
    ss_tot = float(np.sum((y_true - y_true.mean()) ** 2))
    return {
        "rmse": round(float(np.sqrt(np.mean(err**2))), 6),
        "mae": round(float(np.mean(np.abs(err))), 6),
        "r2": round(1.0 - ss_res / ss_tot, 6) if ss_tot > 0 else 0.0,
    }


def splits_for_protocol(
    dataset: Dataset,
    protocol: str,
    seed: int = 0,
) -> list[dict[str, np.ndarray]]:
    """Train/test masks for one protocol; returns a list to support anchor folds.

    Splits are grouped by design point everywhere so replicates of one parameter set
    never straddle the train/test boundary.
    """
    rng = np.random.default_rng(seed)
    points = np.unique(dataset.point_id)

    if protocol == "random":
        order = rng.permutation(points.size)
        n_test = int(0.25 * points.size)
        test_points = set(points[order[:n_test]].tolist())
        test = np.array([pid in test_points for pid in dataset.point_id])
        return [{"name": "random", "train": ~test, "test": test, "test_runs": int(test.sum())}]

    if protocol == "region_block":
        delta = dataset.features[:, FEATURE_NAMES.index("delta")]
        rf = dataset.features[:, FEATURE_NAMES.index("rf")]
        test = (delta >= 1.8) & (rf <= 0.375)
        return [
            {
                "name": "region_block(delta>=1.8 & rf<=0.375)",
                "train": ~test,
                "test": test,
                "test_runs": int(test.sum()),
            }
        ]

    if protocol == "anchor_out":
        from .params import load_anchors

        folds = []
        for sid, anchor in load_anchors().items():
            if anchor.delta <= 0:
                continue
            if not anchor_vec_in_space(anchor):
                continue
            vec = np.array([getattr(anchor, name) for name in FEATURE_NAMES])
            dist = np.linalg.norm(_normalized(dataset.features) - _normalized(vec[None, :]), axis=1)
            test = dist <= ANCHOR_RADIUS
            if test.sum() < 64 or (~test).sum() < 100:
                continue
            folds.append(
                {
                    "name": f"holdout_{sid}",
                    "train": ~test,
                    "test": test,
                    "test_runs": int(test.sum()),
                }
            )
        return folds

    raise ValueError(f"unknown protocol: {protocol}")


def anchor_vec_in_space(anchor) -> bool:
    bounds = {
        "r": (0.0001, 0.006),
        "R0": (400.0, 2700.0),
        "delta": (0.1, 2.5),
        "cf": (0.2, 1.0),
        "rd": (0.0, 100.0),
        "rf": (0.1, 1.0),
        "h": (0.0, 0.005),
    }
    lows = {name: bounds[name][0] for name in FEATURE_NAMES}
    highs = {name: bounds[name][1] for name in FEATURE_NAMES}
    return all(lows[name] <= getattr(anchor, name) <= highs[name] for name in FEATURE_NAMES)


def _point_level(y: np.ndarray, point_id: np.ndarray, test: np.ndarray):
    ids = np.unique(point_id[test])
    means = np.array([y[test][point_id[test] == pid].mean() for pid in ids])
    return ids, means


def evaluate_benchmark(
    dataset: Dataset,
    protocols: tuple[str, ...] = ("random", "region_block", "anchor_out"),
    include_sklearn_models: bool = True,
    seed: int = 7,
) -> list[dict]:
    """Run every (protocol, target, model) cell and collect metric rows."""
    rows_out: list[dict] = []
    targets = ("duty_cycle", "n_collapses")

    def model_factories(target: str) -> list[tuple[str, object]]:
        entries: list[tuple[str, object]] = [
            ("analytic_renewal", None),
            ("ridge_quadratic", RidgeBaseline()),
        ]
        if include_sklearn_models:
            try:
                import sklearn  # noqa: F401

                entries.append(("hist_gradient_boosting", GradientBoostBaseline(random_state=seed)))
                if target == "duty_cycle":
                    entries.append(
                        ("gaussian_process_rbf", GaussianProcessBaseline(random_state=seed))
                    )
            except ImportError:
                pass
        return entries

    for protocol in protocols:
        folds = splits_for_protocol(dataset, protocol, seed=seed)
        for target in targets:
            y = dataset.duty_cycle if target == "duty_cycle" else dataset.n_collapses
            for model_name, predictor in model_factories(target):
                fold_rows: list[dict] = []
                covered = 0.0
                total = 0
                widths: list[float] = []
                for fold in folds:
                    train, test = fold["train"], fold["test"]
                    if predictor is None:
                        preds = analytic_baseline(dataset.features[test], target)
                        cal_resid = np.abs(
                            y[train][:4000]
                            - analytic_baseline(dataset.features[train][:4000], target)
                        )
                        lo, hi = preds - float(np.quantile(cal_resid, 0.9)), preds + float(
                            np.quantile(cal_resid, 0.9)
                        )
                    else:
                        try:
                            preds, lo, hi = conformal_interval(
                                predictor,
                                dataset.features[train],
                                y[train],
                                dataset.features[test],
                                seed=seed,
                            )
                        except ImportError:
                            break
                    metrics = regression_metrics(y[test], preds)
                    covered += float(((y[test] >= lo) & (y[test] <= hi)).sum())
                    total += int(test.sum())
                    widths.append(float(np.mean(hi - lo)))
                    point_ids, point_truth = _point_level(y, dataset.point_id, test)
                    point_pred = np.array(
                        [preds[dataset.point_id[test] == pid].mean() for pid in point_ids]
                    )
                    point_metrics = regression_metrics(point_truth, point_pred)
                    fold_rows.append(
                        {**metrics, **{f"point_{k}": v for k, v in point_metrics.items()}}
                    )

                if not fold_rows:
                    continue
                agg = {
                    key: round(float(np.mean([r[key] for r in fold_rows])), 6)
                    for key in fold_rows[0]
                }
                rows_out.append(
                    {
                        "protocol": protocol,
                        "target": target,
                        "model": model_name,
                        "folds": len(fold_rows),
                        "meanTestRuns": round(
                            float(
                                np.mean(
                                    [
                                        fold.get("test_runs", int(fold["test"].sum()))
                                        for fold in folds
                                    ]
                                )
                            ),
                            1,
                        ),
                        "coverage90": round(covered / max(total, 1), 4),
                        "meanIntervalWidth": round(float(np.mean(widths)), 6),
                        **agg,
                    }
                )
    return rows_out

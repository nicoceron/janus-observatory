import numpy as np

from janus_resilience.dataset import PARAM_ORDER
from janus_resilience.surrogate import (
    Dataset,
    RidgeBaseline,
    analytic_baseline,
    conformal_interval,
    regression_metrics,
    splits_for_protocol,
)


def _tiny_dataset(n_points: int = 40, reps: int = 4, seed: int = 0) -> Dataset:
    rng = np.random.default_rng(seed)
    points = rng.random((n_points, len(PARAM_ORDER)))
    feats = np.repeat(points, reps, axis=0)

    def duty(row):
        r, R0, delta, cf, rd, rf, h = row
        horizon = (R0 - 300) / 2400 * 2 + 0.2
        return min(horizon / 2.5, 1.0) * (1 - min(h * 200, 1)) * rf ** 0.5 + delta * 1e-4

    duty_vals = np.array([duty(row) for row in feats])
    duty_vals = np.clip(duty_vals + rng.normal(0, 0.005, size=feats.shape[0]), 0, 1)
    counts = np.round(duty_vals * 8)
    return Dataset(
        features=feats,
        duty_cycle=duty_vals,
        n_collapses=counts,
        censored=counts == 0,
        point_id=np.repeat(np.arange(n_points), reps),
        regime=["recurrent"] * feats.shape[0],
    )


def test_ridge_learns_smooth_response():
    data = _tiny_dataset()
    model = RidgeBaseline().fit(data.features, data.duty_cycle)
    preds = model.predict(data.features)
    rmse = regression_metrics(data.duty_cycle, preds)["rmse"]
    assert rmse < 0.15


def test_analytic_baseline_is_deterministic_and_finite():
    data = _tiny_dataset(n_points=10)
    a = analytic_baseline(data.features, "duty_cycle")
    b = analytic_baseline(data.features, "duty_cycle")
    np.testing.assert_array_equal(a, b)
    assert np.isfinite(a).all()


def test_random_split_groups_by_point():
    data = _tiny_dataset()
    folds = splits_for_protocol(data, "random", seed=1)
    train, test = folds[0]["train"], folds[0]["test"]
    assert not (set(data.point_id[train]) & set(data.point_id[test]))
    assert abs(test.mean() - 0.25) < 0.15


def test_conformal_band_covers_mostly():
    rng = np.random.default_rng(3)
    X = rng.random((800, len(PARAM_ORDER)))
    y = X[:, 0] + rng.normal(0, 0.05, size=800)
    preds, lo, hi = conformal_interval(RidgeBaseline(), X[:600], y[:600], X[600:], coverage=0.9)
    coverage = ((y[600:] >= lo) & (y[600:] <= hi)).mean()
    assert 0.75 <= coverage <= 1.0
    assert (lo <= preds).all() and (preds <= hi).all()

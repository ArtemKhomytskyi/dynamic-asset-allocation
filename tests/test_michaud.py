"""Tests for Michaud resampling and out-of-sample return alignment."""

import numpy as np
import pandas as pd

from src.michaud import (
    compute_michaud_returns,
    generate_michaud_weight_history,
    generate_resampled_weights,
    simulate_capital_market_assumptions,
)


def _synthetic_returns(periods=18):
    """Create a stable five-asset monthly return panel."""
    rng = np.random.default_rng(7)
    dates = pd.date_range("2018-01-31", periods=periods, freq="ME")
    common = rng.normal(0.006, 0.008, size=(periods, 1))
    residual = rng.normal(0.002, 0.01, size=(periods, 5))
    return pd.DataFrame(
        common + residual,
        index=dates,
        columns=list("ABCDE"),
    )


def test_capital_market_simulation_is_reproducible():
    """Verify a fixed random state reproduces simulated assumptions exactly."""
    returns = _synthetic_returns(12)
    expected = returns.mean() * 12
    covariance = returns.cov() * 12
    first = simulate_capital_market_assumptions(expected, covariance, 12, 42)
    second = simulate_capital_market_assumptions(expected, covariance, 12, 42)
    pd.testing.assert_series_equal(first[0], second[0])
    pd.testing.assert_frame_equal(first[1], second[1])


def test_resampled_weights_are_finite_and_respect_constraints():
    """Verify averaged resampled weights are valid long-only capped weights."""
    weights = generate_resampled_weights(_synthetic_returns(12), n_resamples=3)
    assert np.isclose(weights.sum(), 1.0)
    assert np.isfinite(weights).all()
    assert (weights >= -1e-8).all()
    assert (weights <= 0.25 + 1e-8).all()


def test_resampled_weights_are_reproducible():
    """Verify repeated resampling uses the configured deterministic seed."""
    returns = _synthetic_returns(12)
    first = generate_resampled_weights(returns, n_resamples=3)
    second = generate_resampled_weights(returns, n_resamples=3)
    pd.testing.assert_series_equal(first, second)


def test_michaud_history_has_no_look_ahead_bias():
    """Verify data at and after t cannot alter the weight computed at t."""
    returns = _synthetic_returns()
    original = generate_michaud_weight_history(returns, window=12, n_resamples=2)
    first_date = original.index[0]
    altered = returns.copy()
    altered.loc[first_date:] = altered.loc[first_date:] * 50
    recomputed = generate_michaud_weight_history(
        altered,
        window=12,
        n_resamples=2,
    )
    np.testing.assert_allclose(
        original.loc[first_date],
        recomputed.loc[first_date],
        atol=1e-8,
    )


def test_michaud_returns_are_complete_and_turnover_non_negative():
    """Verify next-period net returns are complete and turnover is non-negative."""
    returns = _synthetic_returns()
    weights = generate_michaud_weight_history(returns, window=12, n_resamples=2)
    diagnostics = compute_michaud_returns(weights, returns, transaction_cost_bps=5)
    assert diagnostics.index.equals(weights.index[1:])
    assert not diagnostics.isna().any().any()
    assert np.isfinite(
        diagnostics.drop(columns="weight_date").to_numpy(dtype=float)
    ).all()
    assert (diagnostics["turnover"] >= 0).all()
    assert (
        diagnostics["portfolio_return"]
        <= diagnostics["gross_return"] + 1e-12
    ).all()

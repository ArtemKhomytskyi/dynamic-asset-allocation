"""Tests for Hierarchical Risk Parity allocation and information timing."""

import numpy as np
import pandas as pd

from src.hrp import (
    compute_hrp_returns,
    compute_hrp_turnover,
    generate_hrp_weight_history,
    optimize_hrp,
)


def _synthetic_returns(periods=18):
    """Create a stable five-asset monthly return panel."""
    rng = np.random.default_rng(17)
    dates = pd.date_range("2018-01-31", periods=periods, freq="ME")
    factor = rng.normal(0.004, 0.012, size=(periods, 1))
    residual = rng.normal(0.001, 0.018, size=(periods, 5))
    return pd.DataFrame(
        factor + residual,
        index=dates,
        columns=list("ABCDE"),
    )


def test_hrp_weights_are_finite_long_only_and_fully_invested():
    """Verify HRP produces valid portfolio weights."""
    weights = optimize_hrp(_synthetic_returns(12))
    assert np.isclose(weights.sum(), 1.0)
    assert np.isfinite(weights).all()
    assert (weights >= -1e-12).all()


def test_hrp_history_has_no_look_ahead_bias():
    """Verify returns at and after t cannot affect the HRP weight at t."""
    returns = _synthetic_returns()
    original = generate_hrp_weight_history(returns, window=12)
    first_date = original.index[0]
    altered = returns.copy()
    altered.loc[first_date:] = altered.loc[first_date:] * 100
    recomputed = generate_hrp_weight_history(altered, window=12)
    np.testing.assert_allclose(
        original.loc[first_date],
        recomputed.loc[first_date],
        atol=1e-12,
    )


def test_hrp_return_and_weight_dates_align_without_missing_values():
    """Verify weights at t map to complete next-period returns at t+1."""
    returns = _synthetic_returns()
    weights = generate_hrp_weight_history(returns, window=12)
    diagnostics = compute_hrp_returns(weights, returns, transaction_cost_bps=5)
    assert weights.index.equals(returns.index[12:])
    assert diagnostics.index.equals(weights.index[1:])
    assert pd.DatetimeIndex(diagnostics["weight_date"]).equals(weights.index[:-1])
    assert not diagnostics.isna().any().any()
    assert np.isfinite(
        diagnostics.drop(columns="weight_date").to_numpy(dtype=float)
    ).all()


def test_hrp_turnover_is_non_negative():
    """Verify target and drift-aware HRP turnover cannot be negative."""
    returns = _synthetic_returns()
    weights = generate_hrp_weight_history(returns, window=12)
    target_turnover = compute_hrp_turnover(weights)
    diagnostics = compute_hrp_returns(weights, returns, transaction_cost_bps=5)
    assert (target_turnover >= 0).all()
    assert target_turnover.iloc[0] == 0.0
    assert (diagnostics["turnover"] >= 0).all()

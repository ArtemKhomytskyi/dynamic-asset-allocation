"""Tests for next-period Markowitz return alignment, costs, and turnover."""

import numpy as np
import pandas as pd

from src.markowitz_returns import compute_markowitz_realized_returns


def _synthetic_inputs():
    """Create monthly asset returns and target weights with known timing."""
    dates = pd.date_range("2020-01-31", periods=6, freq="ME")
    asset_returns = pd.DataFrame(
        {
            "A": [0.01, 0.03, -0.02, 0.04, 0.01, -0.01],
            "B": [0.00, -0.01, 0.02, 0.01, -0.02, 0.03],
            "C": [0.02, 0.01, 0.00, -0.01, 0.03, 0.02],
        },
        index=dates,
    )
    weight_history = pd.DataFrame(
        {
            "A": [0.50, 0.40, 0.30, 0.20],
            "B": [0.30, 0.30, 0.40, 0.50],
            "C": [0.20, 0.30, 0.30, 0.30],
        },
        index=dates[1:5],
    )
    return asset_returns, weight_history


def test_return_dates_align_with_next_period_returns():
    """Verify weights at t are applied only to the realized return at t+1."""
    asset_returns, weights = _synthetic_inputs()
    diagnostics = compute_markowitz_realized_returns(
        asset_returns, weights, transaction_cost_bps=0
    )

    assert diagnostics.index.equals(weights.index[1:])
    assert pd.DatetimeIndex(diagnostics["weight_date"]).equals(weights.index[:-1])
    expected_first = float(weights.iloc[0] @ asset_returns.loc[weights.index[1]])
    assert np.isclose(diagnostics["gross_return"].iloc[0], expected_first)


def test_realized_returns_have_no_look_ahead_bias():
    """Verify later observations cannot affect an earlier realized return."""
    asset_returns, weights = _synthetic_inputs()
    original = compute_markowitz_realized_returns(
        asset_returns, weights, transaction_cost_bps=0
    )
    altered = asset_returns.copy()
    altered.loc[weights.index[2]:] = 999.0
    recomputed = compute_markowitz_realized_returns(
        altered, weights, transaction_cost_bps=0
    )

    assert np.isclose(
        original["portfolio_return"].iloc[0],
        recomputed["portfolio_return"].iloc[0],
    )


def test_transaction_costs_reduce_or_equal_gross_returns():
    """Verify 5 bps costs are deducted from the corresponding gross return."""
    asset_returns, weights = _synthetic_inputs()
    diagnostics = compute_markowitz_realized_returns(
        asset_returns, weights, transaction_cost_bps=5
    )

    assert (
        diagnostics["portfolio_return"] <= diagnostics["gross_return"] + 1e-12
    ).all()
    np.testing.assert_allclose(
        diagnostics["gross_return"] - diagnostics["portfolio_return"],
        diagnostics["turnover"] * 5 / 10_000,
    )


def test_outputs_have_no_nan_and_turnover_is_non_negative():
    """Verify complete finite diagnostics and non-negative one-way turnover."""
    asset_returns, weights = _synthetic_inputs()
    diagnostics = compute_markowitz_realized_returns(
        asset_returns, weights, transaction_cost_bps=5
    )

    assert not diagnostics.isna().any().any()
    assert np.isfinite(
        diagnostics.drop(columns="weight_date").to_numpy(dtype=float)
    ).all()
    assert (diagnostics["turnover"] >= 0).all()
    assert diagnostics["turnover"].iloc[0] == 0.0


"""Tests for constrained Markowitz optimization and rolling information timing."""

import numpy as np
import pandas as pd
import pytest

from src.optimizers import (
    compute_portfolio_return,
    compute_portfolio_sharpe,
    compute_portfolio_volatility,
    generate_markowitz_weights,
    optimize_max_sharpe,
    optimize_min_variance,
    optimize_target_volatility,
    validate_weights,
)


@pytest.fixture(scope="module")
def capital_market_inputs():
    """Return stable five-asset expected-return and covariance test inputs."""
    assets = ["A", "B", "C", "D", "E"]
    expected_returns = pd.Series(
        [0.05, 0.07, 0.09, 0.11, 0.13], index=assets
    )
    covariance = pd.DataFrame(
        np.diag([0.020, 0.025, 0.030, 0.035, 0.040]),
        index=assets,
        columns=assets,
    )
    return expected_returns, covariance


@pytest.mark.parametrize("strategy", ["min_variance", "max_sharpe", "target_volatility"])
def test_optimization_weights_are_finite_and_satisfy_constraints(
    capital_market_inputs, strategy
):
    """Verify full investment, long-only bounds, caps, and finite output."""
    expected_returns, covariance = capital_market_inputs
    if strategy == "min_variance":
        weights = optimize_min_variance(expected_returns, covariance)
    elif strategy == "max_sharpe":
        weights = optimize_max_sharpe(expected_returns, covariance, 0.02)
    else:
        weights = optimize_target_volatility(
            expected_returns, covariance, target_volatility=0.10
        )

    assert validate_weights(weights)
    assert np.isclose(weights.sum(), 1.0)
    assert (weights >= -1e-8).all()
    assert (weights <= 0.25 + 1e-8).all()
    assert np.isfinite(weights).all()


def test_portfolio_metrics(capital_market_inputs):
    """Verify return, positive volatility, and Sharpe calculations."""
    expected_returns, covariance = capital_market_inputs
    weights = optimize_min_variance(expected_returns, covariance)
    portfolio_return = compute_portfolio_return(weights, expected_returns)
    volatility = compute_portfolio_volatility(weights, covariance)
    sharpe = compute_portfolio_sharpe(
        weights, expected_returns, covariance, risk_free_rate=0.02
    )

    assert volatility > 0
    assert np.isclose(sharpe, (portfolio_return - 0.02) / volatility)


def _rolling_returns(periods=70):
    """Create deterministic monthly returns for rolling optimization tests."""
    rng = np.random.default_rng(42)
    dates = pd.date_range("2015-01-31", periods=periods, freq="ME")
    common_factor = rng.normal(0.004, 0.015, size=(periods, 1))
    idiosyncratic = rng.normal(0.001, 0.020, size=(periods, 5))
    return pd.DataFrame(
        common_factor + idiosyncratic,
        index=dates,
        columns=["A", "B", "C", "D", "E"],
    )


def test_rolling_optimization_has_no_look_ahead_bias():
    """Verify that data at and after rebalance t cannot affect weights at t."""
    returns = _rolling_returns()
    original = generate_markowitz_weights(
        returns,
        window=36,
        strategy="min_variance",
        covariance_method="sample",
    )
    first_rebalance = original.index[0]
    altered = returns.copy()
    altered.loc[first_rebalance:] = altered.loc[first_rebalance:] * 100.0
    recomputed = generate_markowitz_weights(
        altered,
        window=36,
        strategy="min_variance",
        covariance_method="sample",
    )
    np.testing.assert_allclose(
        original.loc[first_rebalance],
        recomputed.loc[first_rebalance],
        atol=1e-8,
    )


def test_weight_history_aligns_with_rebalance_dates():
    """Verify monthly history dates after 36- and 60-month estimation windows."""
    returns = _rolling_returns()
    sample_36 = generate_markowitz_weights(
        returns,
        window=36,
        strategy="min_variance",
        covariance_method="sample",
    )
    ledoit_60 = generate_markowitz_weights(
        returns,
        window=60,
        strategy="min_variance",
        covariance_method="ledoit_wolf",
    )

    assert sample_36.index.equals(returns.index[36:])
    assert ledoit_60.index.equals(returns.index[60:])
    assert list(sample_36.columns) == list(returns.columns)
    assert list(ledoit_60.columns) == list(returns.columns)
    assert not sample_36.isna().any().any()
    assert not ledoit_60.isna().any().any()

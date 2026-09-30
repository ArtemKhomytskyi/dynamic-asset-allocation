"""Tests for deterministic equal-weight and 60/40 benchmark portfolios."""

import numpy as np
import pandas as pd
import pytest

from src.benchmarks import (
    compute_portfolio_returns,
    compute_rebalanced_benchmark_diagnostics,
    compute_rebalanced_benchmark_returns,
    create_equal_weight_weights,
    create_sixty_forty_weights,
)


@pytest.fixture(scope="module")
def metadata():
    """Load the project ETF metadata table."""
    return pd.read_csv("data/external/etf_metadata.csv")


@pytest.fixture(scope="module")
def core_returns():
    """Load the complete core monthly return matrix."""
    return pd.read_csv(
        "data/processed/returns_simple_core_23.csv",
        index_col="date",
        parse_dates=["date"],
    )


def test_equal_weight_weights_sum_to_one_and_are_identical(core_returns):
    """Verify the 1/N rule exactly."""
    weights = create_equal_weight_weights(core_returns.columns)
    assert np.isclose(weights.sum(), 1.0)
    assert weights.nunique() == 1
    assert np.allclose(weights, 1.0 / len(core_returns.columns))


def test_sixty_forty_weights_and_sleeves(core_returns, metadata):
    """Verify full investment and the declared equity and bond sleeve totals."""
    weights = create_sixty_forty_weights(core_returns.columns, metadata)
    asset_classes = metadata.set_index("ticker")["asset_class"].reindex(weights.index)
    assert np.isclose(weights.sum(), 1.0)
    assert np.isclose(weights[asset_classes == "Equity"].sum(), 0.60)
    assert np.isclose(weights[asset_classes == "Government Bonds"].sum(), 0.40)
    assert (weights >= 0).all()


def test_non_equity_and_non_government_bond_weights_are_zero(
    core_returns, metadata
):
    """Verify that other asset classes receive no 60/40 allocation."""
    weights = create_sixty_forty_weights(core_returns.columns, metadata)
    asset_classes = metadata.set_index("ticker")["asset_class"].reindex(weights.index)
    outside_sleeves = ~asset_classes.isin(["Equity", "Government Bonds"])
    assert (weights[outside_sleeves] == 0.0).all()


def test_benchmark_return_series_align_and_have_no_nan(core_returns, metadata):
    """Verify benchmark output dates and completeness."""
    weight_vectors = [
        create_equal_weight_weights(core_returns.columns),
        create_sixty_forty_weights(core_returns.columns, metadata),
    ]
    for weights in weight_vectors:
        benchmark_returns = compute_rebalanced_benchmark_returns(
            core_returns, weights, rebalance_frequency="M"
        )
        assert benchmark_returns.index.equals(core_returns.index)
        assert not benchmark_returns.isna().any()


def test_monthly_zero_cost_returns_match_constant_weight_formula(
    core_returns, metadata
):
    """Verify monthly zero-cost rebalancing against direct matrix multiplication."""
    weights = create_sixty_forty_weights(core_returns.columns, metadata)
    direct = compute_portfolio_returns(core_returns, weights)
    rebalanced = compute_rebalanced_benchmark_returns(
        core_returns,
        weights,
        rebalance_frequency="M",
        transaction_cost_bps=0,
    )
    np.testing.assert_allclose(rebalanced, direct)


def test_monthly_weight_history_and_turnover_reflect_drift(core_returns):
    """Verify applied target weights and one-way turnover from prior-month drift."""
    weights = create_equal_weight_weights(core_returns.columns)
    benchmark_returns, weight_history, turnover = (
        compute_rebalanced_benchmark_diagnostics(
            core_returns,
            weights,
            rebalance_frequency="M",
            transaction_cost_bps=0,
        )
    )

    assert weight_history.shape == core_returns.shape
    assert weight_history.index.equals(core_returns.index)
    assert list(weight_history.columns) == list(core_returns.columns)
    assert np.allclose(weight_history, weights.to_numpy())
    assert turnover.index.equals(core_returns.index)
    assert turnover.iloc[0] == 0.0

    first_asset_returns = core_returns.iloc[0]
    first_portfolio_return = float(weights @ first_asset_returns)
    drifted_weights = weights * (1.0 + first_asset_returns) / (
        1.0 + first_portfolio_return
    )
    expected_second_turnover = 0.5 * np.abs(weights - drifted_weights).sum()
    assert np.isclose(turnover.iloc[1], expected_second_turnover)
    assert not benchmark_returns.isna().any()

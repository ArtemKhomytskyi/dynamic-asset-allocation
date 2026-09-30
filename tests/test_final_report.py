"""Tests for the common-sample final strategy report."""

import numpy as np
import pandas as pd

from src.final_report import (
    FINAL_COLUMNS,
    _drawdown_series,
    _performance_metrics,
    build_final_strategy_comparison,
    build_ranking_tables,
)


def test_final_comparison_schema_and_strategy_coverage():
    """Verify the final table has the requested schema and twelve strategies."""
    comparison = build_final_strategy_comparison()
    assert comparison.shape == (12, 12)
    assert list(comparison.columns) == FINAL_COLUMNS
    assert comparison["strategy"].is_unique
    assert comparison.drop(columns=["strategy", "covariance_method"]).notna().all().all()


def test_final_comparison_uses_one_common_sample():
    """Verify every strategy return series uses identical realized dates."""
    comparison = build_final_strategy_comparison()
    returns = comparison.attrs["returns"]
    assert returns.shape == (159, 12)
    assert returns.index.min() == pd.Timestamp("2013-03-31")
    assert returns.index.max() == pd.Timestamp("2026-05-31")
    assert not returns.isna().any().any()


def test_final_performance_metric_formulas():
    """Verify wealth, drawdown, turnover, and diversification calculations."""
    dates = pd.date_range("2020-01-31", periods=4, freq="ME")
    returns = pd.Series([0.10, -0.20, 0.05, 0.02], index=dates)
    turnover = pd.Series([0.0, 0.10, 0.20, 0.30], index=dates)
    weights = pd.DataFrame(
        np.full((4, 4), 0.25),
        index=dates,
        columns=list("ABCD"),
    )
    metrics = _performance_metrics(returns, turnover, weights)
    assert np.isclose(metrics["final_wealth"], (1.0 + returns).prod())
    assert np.isclose(metrics["max_drawdown"], _drawdown_series(returns).min())
    assert np.isclose(metrics["annualized_turnover"], 0.20 * 12)
    assert np.isclose(metrics["average_effective_number_of_assets"], 4.0)
    assert np.isclose(metrics["average_herfindahl_index"], 0.25)


def test_ranking_tables_apply_correct_directions():
    """Verify higher-is-better and lower-is-better ranking directions."""
    comparison = build_final_strategy_comparison()
    rankings = build_ranking_tables(comparison)
    assert rankings["top_by_return.csv"]["annualized_geometric_return"].is_monotonic_decreasing
    assert rankings["top_by_sharpe.csv"]["sharpe_ratio"].is_monotonic_decreasing
    assert rankings["top_by_drawdown.csv"]["max_drawdown"].is_monotonic_decreasing
    assert rankings["top_by_turnover.csv"]["annualized_turnover"].is_monotonic_increasing

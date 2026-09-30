"""Tests for return calculations and annualization utilities."""

import numpy as np
import pandas as pd

from src.returns import (
    annualize_return,
    annualize_volatility,
    compute_excess_returns,
    compute_log_returns,
    compute_simple_returns,
    validate_returns,
)
from src.return_analysis import build_return_summary


def test_simple_and_log_return_formulas():
    """Verify one-period simple and continuously compounded formulas."""
    dates = pd.date_range("2020-01-31", periods=3, freq="ME")
    prices = pd.DataFrame({"ETF": [100.0, 110.0, 99.0]}, index=dates)

    simple = compute_simple_returns(prices)
    log_returns = compute_log_returns(prices)

    np.testing.assert_allclose(simple["ETF"], [0.10, -0.10])
    np.testing.assert_allclose(log_returns["ETF"], np.log([1.10, 0.90]))
    assert simple.index.equals(dates[1:])
    assert log_returns.index.equals(dates[1:])


def test_excess_return_formula():
    """Verify subtraction of a same-frequency risk-free rate."""
    returns = pd.Series([0.02, -0.01], index=pd.date_range("2020-01-31", periods=2, freq="ME"))
    excess = compute_excess_returns(returns, 0.005)
    np.testing.assert_allclose(excess, [0.015, -0.015])


def test_annualization_formulas():
    """Verify geometric-return and square-root-of-time annualization."""
    dates = pd.date_range("2020-01-31", periods=12, freq="ME")
    constant = pd.Series([0.01] * 12, index=dates)
    varying = pd.Series([0.01, -0.01] * 6, index=dates)

    assert np.isclose(annualize_return(constant), 1.01**12 - 1)
    assert np.isclose(
        annualize_volatility(varying), varying.std(ddof=1) * np.sqrt(12)
    )


def test_processed_price_panels_produce_complete_returns():
    """Verify first-row removal and completeness for both saved universes."""
    cases = [
        ("data/processed/prices_monthly_core_23.csv", 220, 23),
        ("data/processed/prices_monthly_extended_27.csv", 182, 27),
    ]
    for path, expected_rows, expected_columns in cases:
        prices = pd.read_csv(path, index_col="date", parse_dates=["date"])
        simple = compute_simple_returns(prices)
        log_returns = compute_log_returns(prices)
        assert simple.shape == (expected_rows, expected_columns)
        assert log_returns.shape == (expected_rows, expected_columns)
        assert validate_returns(simple)
        assert validate_returns(log_returns)


def test_return_summary_names_geometric_return_explicitly():
    """Verify that the summary labels its compounded annual metric precisely."""
    dates = pd.date_range("2020-01-31", periods=12, freq="ME")
    returns = pd.DataFrame({"ETF": [0.01] * 12}, index=dates)
    summary = build_return_summary(returns)

    assert "annualized_geometric_return" in summary.columns
    assert "annual_return" not in summary.columns

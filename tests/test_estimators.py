"""Tests for covariance estimators and look-ahead-safe rolling windows."""

import numpy as np
import pandas as pd

from src.estimators import (
    compute_expected_returns,
    compute_ledoit_wolf_covariance,
    compute_rolling_covariance,
    compute_rolling_expected_returns,
    compute_sample_covariance,
    get_estimation_window,
)


def _sample_returns():
    """Create a deterministic multivariate monthly return panel."""
    dates = pd.date_range("2020-01-31", periods=8, freq="ME")
    return pd.DataFrame(
        {
            "A": [0.01, 0.02, -0.01, 0.03, 0.00, 0.01, -0.02, 0.02],
            "B": [0.00, 0.01, 0.02, -0.01, 0.01, 0.03, 0.00, -0.02],
            "C": [-0.01, 0.00, 0.01, 0.02, -0.02, 0.01, 0.03, 0.00],
        },
        index=dates,
    )


def test_expected_returns_annualization():
    """Verify monthly arithmetic means and annualization."""
    returns = _sample_returns()
    np.testing.assert_allclose(
        compute_expected_returns(returns),
        returns.mean() * 12,
    )


def test_covariance_matrices_are_psd():
    """Verify sample and shrinkage covariance positive semidefiniteness."""
    returns = _sample_returns()
    for covariance in [
        compute_sample_covariance(returns),
        compute_ledoit_wolf_covariance(returns),
    ]:
        eigenvalues = np.linalg.eigvalsh(covariance.to_numpy())
        assert eigenvalues.min() >= -1e-12


def test_ledoit_wolf_dimensions_and_labels():
    """Verify that shrinkage output matches the asset dimension and order."""
    returns = _sample_returns()
    covariance = compute_ledoit_wolf_covariance(returns)
    assert covariance.shape == (3, 3)
    assert list(covariance.index) == list(returns.columns)
    assert list(covariance.columns) == list(returns.columns)


def test_estimation_window_ends_at_t_minus_one():
    """Verify that the rebalance-date observation is excluded."""
    returns = _sample_returns()
    rebalance_date = returns.index[4]
    window = get_estimation_window(returns, rebalance_date, 3)
    assert window.index.equals(returns.index[1:4])
    assert window.index.max() < rebalance_date


def test_rolling_expected_returns_use_only_prior_data():
    """Verify rolling means and immunity to values at or after rebalance time."""
    returns = _sample_returns()
    rolling = compute_rolling_expected_returns(returns, 3)
    first_rebalance = returns.index[3]
    expected = returns.iloc[:3].mean() * 12
    np.testing.assert_allclose(rolling.loc[first_rebalance], expected)

    altered = returns.copy()
    altered.loc[first_rebalance:, "A"] = 999.0
    altered_rolling = compute_rolling_expected_returns(altered, 3)
    np.testing.assert_allclose(
        altered_rolling.loc[first_rebalance], rolling.loc[first_rebalance]
    )


def test_rolling_covariance_windows_and_no_look_ahead():
    """Verify rolling covariance count, dimensions, and t-1 information cutoff."""
    returns = _sample_returns()
    rolling = compute_rolling_covariance(returns, 3, method="sample")
    assert list(rolling) == list(returns.index[3:])
    assert all(matrix.shape == (3, 3) for matrix in rolling.values())

    first_rebalance = returns.index[3]
    altered = returns.copy()
    altered.loc[first_rebalance:, "B"] = -999.0
    altered_rolling = compute_rolling_covariance(altered, 3, method="sample")
    np.testing.assert_allclose(
        altered_rolling[first_rebalance], rolling[first_rebalance]
    )


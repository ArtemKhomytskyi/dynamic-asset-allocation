"""Expected-return and covariance estimators with look-ahead-safe windows."""

import pandas as pd
from sklearn.covariance import LedoitWolf

from src.returns import validate_returns


PERIODS_PER_YEAR = 12


def _validate_return_panel(returns):
    """Validate a multivariate return panel for estimation."""
    validate_returns(returns)
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("Covariance estimation requires a pandas DataFrame.")
    if len(returns) < 2:
        raise ValueError("At least two return observations are required.")
    return True


def _validate_window(window):
    """Validate a rolling estimation-window length."""
    if not isinstance(window, int) or isinstance(window, bool) or window < 2:
        raise ValueError("window must be an integer of at least two observations.")
    return True


def compute_expected_returns(returns, annualize=True):
    """Estimate arithmetic mean returns, optionally annualized from monthly data."""
    validate_returns(returns)
    expected_returns = returns.mean()
    return expected_returns * PERIODS_PER_YEAR if annualize else expected_returns


def compute_sample_covariance(returns, annualize=True):
    """Estimate the sample covariance matrix from monthly returns."""
    _validate_return_panel(returns)
    covariance = returns.cov(ddof=1)
    covariance.index.name = "ticker"
    covariance.columns.name = None
    return covariance * PERIODS_PER_YEAR if annualize else covariance


def compute_ledoit_wolf_covariance(returns, annualize=True):
    """Estimate a Ledoit-Wolf shrinkage covariance matrix."""
    _validate_return_panel(returns)
    estimator = LedoitWolf(assume_centered=False).fit(returns.to_numpy())
    covariance = pd.DataFrame(
        estimator.covariance_,
        index=returns.columns,
        columns=returns.columns,
    )
    covariance.index.name = "ticker"
    return covariance * PERIODS_PER_YEAR if annualize else covariance


def get_estimation_window(returns, end_date, window):
    """Return exactly `window` observations strictly before rebalance date t."""
    validate_returns(returns)
    _validate_window(window)
    end_timestamp = pd.Timestamp(end_date)
    eligible_history = returns.loc[returns.index < end_timestamp]
    estimation_window = eligible_history.tail(window).copy()
    if len(estimation_window) != window:
        raise ValueError(
            f"Only {len(estimation_window)} observations are available before "
            f"{end_timestamp.date()}; {window} are required."
        )
    if estimation_window.index.max() >= end_timestamp:
        raise RuntimeError("Estimation window includes the rebalance date or future data.")
    return estimation_window


def compute_rolling_expected_returns(returns, window):
    """Estimate annualized means using only the `window` months before each date."""
    _validate_return_panel(returns)
    _validate_window(window)
    if len(returns) <= window:
        raise ValueError("Returns must include a rebalance date after the initial window.")
    estimates = []
    rebalance_dates = returns.index[window:]
    for rebalance_date in rebalance_dates:
        history = get_estimation_window(returns, rebalance_date, window)
        estimates.append(compute_expected_returns(history, annualize=True))
    return pd.DataFrame(estimates, index=rebalance_dates, columns=returns.columns)


def compute_rolling_covariance(returns, window, method="sample"):
    """Return date-keyed covariance matrices estimated through t-1 only."""
    _validate_return_panel(returns)
    _validate_window(window)
    if len(returns) <= window:
        raise ValueError("Returns must include a rebalance date after the initial window.")
    normalized_method = method.strip().lower().replace("-", "_")
    estimators = {
        "sample": compute_sample_covariance,
        "ledoit_wolf": compute_ledoit_wolf_covariance,
        "ledoitwolf": compute_ledoit_wolf_covariance,
    }
    if normalized_method not in estimators:
        raise ValueError("method must be 'sample' or 'ledoit_wolf'.")

    covariance_estimates = {}
    for rebalance_date in returns.index[window:]:
        history = get_estimation_window(returns, rebalance_date, window)
        covariance_estimates[rebalance_date] = estimators[normalized_method](
            history, annualize=True
        )
    return covariance_estimates

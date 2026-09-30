"""Return calculation, validation, and annualization utilities."""

import numpy as np
import pandas as pd


def _validate_prices(prices):
    """Validate a price series or panel before calculating returns."""
    if not isinstance(prices, (pd.Series, pd.DataFrame)):
        raise TypeError("Prices must be a pandas Series or DataFrame.")
    if prices.empty or len(prices) < 2:
        raise ValueError("At least two price observations are required.")
    if prices.isna().any().any() if isinstance(prices, pd.DataFrame) else prices.isna().any():
        raise ValueError("Prices must not contain missing values.")
    values = prices.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Prices must contain only finite numeric values.")
    if (values <= 0).any():
        raise ValueError("Prices must be strictly positive.")
    if prices.index.has_duplicates or not prices.index.is_monotonic_increasing:
        raise ValueError("Price dates must be unique and monotonically increasing.")
    return True


def compute_simple_returns(prices):
    """Compute one-period simple returns and remove the initial undefined row."""
    _validate_prices(prices)
    simple_returns = prices.pct_change(fill_method=None).iloc[1:]
    validate_returns(simple_returns)
    return simple_returns


def compute_log_returns(prices):
    """Compute one-period continuously compounded returns."""
    _validate_prices(prices)
    log_returns = np.log(prices).diff().iloc[1:]
    validate_returns(log_returns)
    return log_returns


def compute_excess_returns(returns, risk_free_rate):
    """Subtract a risk-free rate expressed at the same frequency as returns."""
    validate_returns(returns)
    if np.isscalar(risk_free_rate):
        excess_returns = returns - float(risk_free_rate)
    elif isinstance(risk_free_rate, pd.Series):
        if isinstance(returns, pd.Series) and risk_free_rate.index.equals(returns.index):
            excess_returns = returns - risk_free_rate
        elif isinstance(returns, pd.DataFrame) and risk_free_rate.index.equals(returns.index):
            excess_returns = returns.sub(risk_free_rate, axis=0)
        elif isinstance(returns, pd.DataFrame) and risk_free_rate.index.equals(
            returns.columns
        ):
            excess_returns = returns.sub(risk_free_rate, axis=1)
        else:
            raise ValueError("Risk-free-rate index does not align with returns.")
    else:
        raise TypeError("Risk-free rate must be a scalar or pandas Series.")
    validate_returns(excess_returns)
    return excess_returns


def annualize_return(returns, periods_per_year=12):
    """Geometrically annualize periodic simple returns."""
    validate_returns(returns)
    if periods_per_year <= 0:
        raise ValueError("periods_per_year must be positive.")
    if (returns < -1).any().any() if isinstance(returns, pd.DataFrame) else (returns < -1).any():
        raise ValueError("Simple returns below -100% cannot be compounded.")
    compounded_growth = (1.0 + returns).prod()
    observation_counts = returns.count()
    return compounded_growth ** (periods_per_year / observation_counts) - 1.0


def annualize_volatility(returns, periods_per_year=12):
    """Annualize sample volatility using the square-root-of-time rule."""
    validate_returns(returns)
    if periods_per_year <= 0:
        raise ValueError("periods_per_year must be positive.")
    return returns.std(ddof=1) * np.sqrt(periods_per_year)


def validate_returns(returns):
    """Validate that a return series or panel is complete, finite, and ordered."""
    if not isinstance(returns, (pd.Series, pd.DataFrame)):
        raise TypeError("Returns must be a pandas Series or DataFrame.")
    if returns.empty:
        raise ValueError("Returns must not be empty.")
    if isinstance(returns, pd.DataFrame):
        if returns.columns.has_duplicates:
            raise ValueError("Return tickers must be unique.")
        if returns.isna().any().any():
            raise ValueError("Returns must not contain missing values.")
    elif returns.isna().any():
        raise ValueError("Returns must not contain missing values.")
    values = returns.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Returns must contain only finite numeric values.")
    if returns.index.has_duplicates or not returns.index.is_monotonic_increasing:
        raise ValueError("Return dates must be unique and monotonically increasing.")
    return True


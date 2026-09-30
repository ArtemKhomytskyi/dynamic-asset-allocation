"""Constrained Markowitz optimizers and look-ahead-safe rolling weight engine."""

import cvxpy as cp
import numpy as np
import pandas as pd

from src.config import MAX_WEIGHT, MIN_WEIGHT, RISK_FREE_RATE, TARGET_VOLATILITY
from src.estimators import (
    compute_expected_returns,
    compute_ledoit_wolf_covariance,
    compute_sample_covariance,
    get_estimation_window,
)
from src.returns import validate_returns


SOLVER_FALLBACK_ORDER = ("OSQP", "SCS", "ECOS")
OPTIMAL_STATUSES = {cp.OPTIMAL, cp.OPTIMAL_INACCURATE}


def _validate_inputs(expected_returns, covariance_matrix):
    """Validate and align expected returns with a symmetric PSD covariance matrix."""
    if not isinstance(expected_returns, pd.Series):
        raise TypeError("expected_returns must be a pandas Series.")
    if not isinstance(covariance_matrix, pd.DataFrame):
        raise TypeError("covariance_matrix must be a pandas DataFrame.")
    if expected_returns.empty or expected_returns.index.has_duplicates:
        raise ValueError("Expected returns must contain unique asset labels.")
    assets = expected_returns.index.tolist()
    if set(covariance_matrix.index) != set(assets) or set(
        covariance_matrix.columns
    ) != set(assets):
        raise ValueError("Covariance labels must exactly match expected-return assets.")

    covariance = covariance_matrix.reindex(index=assets, columns=assets).astype(float)
    expected = expected_returns.astype(float).reindex(assets)
    if not np.isfinite(expected.to_numpy()).all() or not np.isfinite(
        covariance.to_numpy()
    ).all():
        raise ValueError("Optimization inputs must contain only finite values.")
    covariance_values = (covariance.to_numpy() + covariance.to_numpy().T) / 2.0
    eigenvalues, eigenvectors = np.linalg.eigh(covariance_values)
    if eigenvalues.min() < -1e-8:
        raise ValueError(
            "Covariance matrix is not positive semidefinite; "
            f"minimum eigenvalue is {eigenvalues.min():.3e}."
        )
    if eigenvalues.min() < 0:
        covariance_values = eigenvectors @ np.diag(
            np.clip(eigenvalues, 0.0, None)
        ) @ eigenvectors.T
    return expected, covariance_values, assets


def _validate_bounds(n_assets, min_weight, max_weight):
    """Validate long-only per-asset bounds and full-investment feasibility."""
    if not np.isscalar(min_weight) or not np.isscalar(max_weight):
        raise TypeError("Weight bounds must be scalar values.")
    min_weight = float(min_weight)
    max_weight = float(max_weight)
    if min_weight < 0 or max_weight > 1 or min_weight > max_weight:
        raise ValueError("Bounds must satisfy 0 <= min_weight <= max_weight <= 1.")
    if n_assets * min_weight > 1.0 + 1e-12:
        raise ValueError("Minimum-weight constraint makes full investment infeasible.")
    if n_assets * max_weight < 1.0 - 1e-12:
        raise ValueError("Maximum-weight cap makes full investment infeasible.")
    return min_weight, max_weight


def _solve_with_fallback(problem):
    """Solve a CVXPY problem using OSQP, SCS, then ECOS when installed."""
    installed = set(cp.installed_solvers())
    attempts = []
    solver_options = {
        "OSQP": {
            "eps_abs": 1e-8,
            "eps_rel": 1e-8,
            "max_iter": 100_000,
            "polishing": True,
        },
        "SCS": {"eps": 1e-6, "max_iters": 100_000},
        "ECOS": {
            "abstol": 1e-8,
            "reltol": 1e-8,
            "feastol": 1e-8,
            "max_iters": 10_000,
        },
    }
    for solver in SOLVER_FALLBACK_ORDER:
        if solver not in installed:
            attempts.append(f"{solver}: not installed")
            continue
        try:
            problem.solve(
                solver=solver,
                warm_start=True,
                verbose=False,
                **solver_options[solver],
            )
        except Exception as error:
            attempts.append(f"{solver}: {type(error).__name__}: {error}")
            continue
        if problem.status in OPTIMAL_STATUSES:
            return solver, problem.status
        attempts.append(f"{solver}: status={problem.status}")
    raise RuntimeError(
        "Optimization failed after solver fallback. " + " | ".join(attempts)
    )


def _project_to_bounded_simplex(values, lower_bound, upper_bound):
    """Project numerical solver output onto the bounded fully invested simplex."""
    values = np.asarray(values, dtype=float).reshape(-1)
    low = float(np.min(values - upper_bound))
    high = float(np.max(values - lower_bound))
    for _ in range(200):
        midpoint = (low + high) / 2.0
        projected = np.clip(values - midpoint, lower_bound, upper_bound)
        if projected.sum() > 1.0:
            low = midpoint
        else:
            high = midpoint
    projected = np.clip(values - (low + high) / 2.0, lower_bound, upper_bound)
    if not np.isclose(projected.sum(), 1.0, atol=1e-10):
        raise RuntimeError("Unable to project solver weights onto the bounded simplex.")
    return projected


def _finalize_weights(values, assets, min_weight, max_weight, solver, status):
    """Clean solver output and return a validated labeled weight vector."""
    if values is None or not np.isfinite(np.asarray(values, dtype=float)).all():
        raise RuntimeError("Solver returned missing or non-finite portfolio weights.")
    projected = _project_to_bounded_simplex(values, min_weight, max_weight)
    weights = pd.Series(projected, index=assets, name="weight")
    validate_weights(weights)
    if (weights < min_weight - 1e-8).any() or (
        weights > max_weight + 1e-8
    ).any():
        raise RuntimeError("Final weights violate requested portfolio bounds.")
    weights.attrs["solver"] = solver
    weights.attrs["solver_status"] = status
    return weights


def optimize_min_variance(
    expected_returns,
    covariance_matrix,
    min_weight=0.0,
    max_weight=0.25,
):
    """Solve the long-only, capped global minimum-variance portfolio."""
    _, covariance, assets = _validate_inputs(expected_returns, covariance_matrix)
    min_weight, max_weight = _validate_bounds(
        len(assets), min_weight, max_weight
    )
    weights = cp.Variable(len(assets))
    constraints = [
        cp.sum(weights) == 1,
        weights >= min_weight,
        weights <= max_weight,
    ]
    problem = cp.Problem(
        cp.Minimize(cp.quad_form(weights, cp.psd_wrap(covariance))),
        constraints,
    )
    solver, status = _solve_with_fallback(problem)
    return _finalize_weights(
        weights.value, assets, min_weight, max_weight, solver, status
    )


def optimize_max_sharpe(
    expected_returns,
    covariance_matrix,
    risk_free_rate,
    min_weight=0.0,
    max_weight=0.25,
):
    """Solve the constrained tangency portfolio via a convex transformation."""
    expected, covariance, assets = _validate_inputs(
        expected_returns, covariance_matrix
    )
    min_weight, max_weight = _validate_bounds(
        len(assets), min_weight, max_weight
    )
    excess_returns = expected.to_numpy() - float(risk_free_rate)
    if excess_returns.max() <= 0:
        raise ValueError("Maximum Sharpe optimization requires a positive excess return.")

    scaled_weights = cp.Variable(len(assets))
    scale = cp.Variable(nonneg=True)
    constraints = [
        excess_returns @ scaled_weights == 1,
        cp.sum(scaled_weights) == scale,
        scaled_weights >= min_weight * scale,
        scaled_weights <= max_weight * scale,
        scale >= 1e-10,
    ]
    problem = cp.Problem(
        cp.Minimize(
            cp.quad_form(scaled_weights, cp.psd_wrap(covariance))
        ),
        constraints,
    )
    solver, status = _solve_with_fallback(problem)
    if scale.value is None or float(scale.value) <= 0:
        raise RuntimeError("Maximum Sharpe transformation returned an invalid scale.")
    raw_weights = np.asarray(scaled_weights.value).reshape(-1) / float(scale.value)
    return _finalize_weights(
        raw_weights, assets, min_weight, max_weight, solver, status
    )


def optimize_target_volatility(
    expected_returns,
    covariance_matrix,
    target_volatility,
    min_weight=0.0,
    max_weight=0.25,
):
    """Maximize expected return subject to an annualized volatility ceiling."""
    expected, covariance, assets = _validate_inputs(
        expected_returns, covariance_matrix
    )
    min_weight, max_weight = _validate_bounds(
        len(assets), min_weight, max_weight
    )
    if target_volatility <= 0:
        raise ValueError("target_volatility must be positive.")

    weights = cp.Variable(len(assets))
    constraints = [
        cp.sum(weights) == 1,
        weights >= min_weight,
        weights <= max_weight,
        cp.quad_form(weights, cp.psd_wrap(covariance))
        <= float(target_volatility) ** 2,
    ]
    problem = cp.Problem(
        cp.Maximize(expected.to_numpy() @ weights),
        constraints,
    )
    solver, status = _solve_with_fallback(problem)
    finalized = _finalize_weights(
        weights.value, assets, min_weight, max_weight, solver, status
    )
    realized_volatility = compute_portfolio_volatility(finalized, covariance_matrix)
    if realized_volatility > float(target_volatility) + 1e-4:
        raise RuntimeError(
            "Target-volatility solution exceeds its requested volatility ceiling."
        )
    return finalized


def compute_portfolio_return(weights, expected_returns):
    """Compute portfolio expected return from aligned asset expectations."""
    validate_weights(weights)
    if not isinstance(expected_returns, pd.Series):
        raise TypeError("expected_returns must be a pandas Series.")
    if set(weights.index) != set(expected_returns.index):
        raise ValueError("Weight and expected-return labels must match exactly.")
    expected = expected_returns.reindex(weights.index).astype(float)
    if not np.isfinite(expected.to_numpy()).all():
        raise ValueError("Expected returns must be finite.")
    return float(weights @ expected)


def compute_portfolio_volatility(weights, covariance_matrix):
    """Compute portfolio volatility from aligned weights and covariance."""
    validate_weights(weights)
    if not isinstance(covariance_matrix, pd.DataFrame):
        raise TypeError("covariance_matrix must be a pandas DataFrame.")
    if set(weights.index) != set(covariance_matrix.index) or set(
        weights.index
    ) != set(covariance_matrix.columns):
        raise ValueError("Weight and covariance labels must match exactly.")
    covariance = covariance_matrix.reindex(
        index=weights.index, columns=weights.index
    ).to_numpy(dtype=float)
    variance = float(weights.to_numpy() @ covariance @ weights.to_numpy())
    if variance < -1e-10:
        raise ValueError("Portfolio variance is negative; covariance is invalid.")
    return float(np.sqrt(max(variance, 0.0)))


def compute_portfolio_sharpe(
    weights,
    expected_returns,
    covariance_matrix,
    risk_free_rate,
):
    """Compute the portfolio Sharpe ratio from annualized inputs."""
    volatility = compute_portfolio_volatility(weights, covariance_matrix)
    if volatility <= 0:
        raise ValueError("Portfolio volatility must be positive for a Sharpe ratio.")
    portfolio_return = compute_portfolio_return(weights, expected_returns)
    return float((portfolio_return - float(risk_free_rate)) / volatility)


def validate_weights(weights):
    """Validate finite, long-only, unleveraged, fully invested portfolio weights."""
    if not isinstance(weights, pd.Series):
        raise TypeError("weights must be a pandas Series.")
    if weights.empty or weights.index.has_duplicates:
        raise ValueError("weights must contain unique labeled assets.")
    values = weights.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("weights must contain only finite values.")
    if (values < -1e-8).any():
        raise ValueError("Portfolio weights must be non-negative.")
    if (values > 1.0 + 1e-8).any():
        raise ValueError("Portfolio weights may not exceed 100%.")
    if not np.isclose(values.sum(), 1.0, atol=1e-8):
        raise ValueError("Portfolio weights must sum to one.")
    return True


def _rebalance_dates(index, window, rebalance_frequency):
    """Return eligible monthly, quarterly, or annual rebalance dates."""
    if not isinstance(window, int) or isinstance(window, bool) or window < 2:
        raise ValueError("window must be an integer of at least two months.")
    if len(index) <= window:
        raise ValueError("Returns do not contain a post-window rebalance date.")
    eligible = index[window:]
    normalized = rebalance_frequency.strip().upper()
    if normalized in {"M", "ME"}:
        return eligible
    if normalized in {"Q", "QE"}:
        return eligible[eligible.is_quarter_end]
    if normalized in {"A", "Y", "YE"}:
        return eligible[eligible.is_year_end]
    raise ValueError("rebalance_frequency must be monthly, quarterly, or annual.")


def generate_markowitz_weights(
    returns,
    window,
    strategy,
    covariance_method,
    rebalance_frequency="M",
):
    """Generate rolling Markowitz weights using only observations through t-1."""
    validate_returns(returns)
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("returns must be a pandas DataFrame.")
    normalized_strategy = strategy.strip().lower().replace("-", "_")
    strategy_aliases = {
        "min_variance": "min_variance",
        "max_sharpe": "max_sharpe",
        "target_volatility": "target_volatility",
        "target_vol": "target_volatility",
    }
    if normalized_strategy not in strategy_aliases:
        raise ValueError(
            "strategy must be min_variance, max_sharpe, or target_volatility."
        )
    normalized_strategy = strategy_aliases[normalized_strategy]

    normalized_covariance = covariance_method.strip().lower().replace("-", "_")
    covariance_aliases = {
        "sample": "sample",
        "ledoit": "ledoit_wolf",
        "ledoitwolf": "ledoit_wolf",
        "ledoit_wolf": "ledoit_wolf",
    }
    if normalized_covariance not in covariance_aliases:
        raise ValueError("covariance_method must be sample or ledoit_wolf.")
    normalized_covariance = covariance_aliases[normalized_covariance]
    covariance_estimator = (
        compute_sample_covariance
        if normalized_covariance == "sample"
        else compute_ledoit_wolf_covariance
    )

    rebalance_dates = _rebalance_dates(
        returns.index, window, rebalance_frequency
    )
    weight_rows = []
    solvers = []
    failures = []
    for rebalance_date in rebalance_dates:
        estimation_returns = get_estimation_window(returns, rebalance_date, window)
        expected = compute_expected_returns(estimation_returns, annualize=True)
        covariance = covariance_estimator(estimation_returns, annualize=True)
        try:
            if normalized_strategy == "min_variance":
                weights = optimize_min_variance(
                    expected,
                    covariance,
                    min_weight=MIN_WEIGHT,
                    max_weight=MAX_WEIGHT,
                )
            elif normalized_strategy == "max_sharpe":
                weights = optimize_max_sharpe(
                    expected,
                    covariance,
                    risk_free_rate=RISK_FREE_RATE,
                    min_weight=MIN_WEIGHT,
                    max_weight=MAX_WEIGHT,
                )
            else:
                weights = optimize_target_volatility(
                    expected,
                    covariance,
                    target_volatility=TARGET_VOLATILITY,
                    min_weight=MIN_WEIGHT,
                    max_weight=MAX_WEIGHT,
                )
        except Exception as error:
            failures.append(
                {
                    "date": rebalance_date,
                    "error": f"{type(error).__name__}: {error}",
                }
            )
            raise RuntimeError(
                f"{normalized_strategy} optimization failed at "
                f"{rebalance_date.date()} using {normalized_covariance}: {error}"
            ) from error
        weight_rows.append(weights.reindex(returns.columns).to_numpy())
        solvers.append(weights.attrs.get("solver", "unknown"))

    weight_history = pd.DataFrame(
        weight_rows,
        index=rebalance_dates,
        columns=returns.columns,
    )
    weight_history.index.name = "date"
    if not np.allclose(weight_history.sum(axis=1), 1.0, atol=1e-8):
        raise RuntimeError("Rolling optimization produced non-unit weight rows.")
    if (weight_history.to_numpy() < -1e-8).any() or (
        weight_history.to_numpy() > MAX_WEIGHT + 1e-8
    ).any():
        raise RuntimeError("Rolling optimization produced out-of-bounds weights.")
    weight_history.attrs["optimization_failures"] = failures
    weight_history.attrs["solvers"] = pd.Series(solvers).value_counts().to_dict()
    weight_history.attrs["strategy"] = normalized_strategy
    weight_history.attrs["covariance_method"] = normalized_covariance
    weight_history.attrs["window"] = window
    return weight_history


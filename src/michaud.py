"""Michaud resampling, out-of-sample evaluation, and reporting pipeline."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from joblib import Parallel, delayed
import numpy as np
import pandas as pd

from src.config import (
    MAX_WEIGHT,
    MIN_WEIGHT,
    RANDOM_SEED,
    RISK_FREE_RATE,
    TARGET_VOLATILITY,
    TRANSACTION_COST_BPS,
)
from src.estimators import (
    compute_expected_returns,
    compute_ledoit_wolf_covariance,
    compute_sample_covariance,
    get_estimation_window,
)
from src.markowitz_diversification import compute_diversification_metrics
from src.markowitz_returns import compute_markowitz_realized_returns
from src.optimizers import (
    optimize_max_sharpe,
    optimize_min_variance,
    optimize_target_volatility,
    validate_weights,
)
from src.returns import annualize_return, annualize_volatility, validate_returns


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"
CORE_RETURNS_PATH = PROCESSED_DIRECTORY / "returns_simple_core_23.csv"
MARKOWITZ_RETURN_PATH = (
    PROCESSED_DIRECTORY / "markowitz_returns_max_sharpe_ledoit_60m_core.csv"
)
MARKOWITZ_WEIGHT_PATH = TABLES_DIRECTORY / "weights_max_sharpe_ledoit_60m.csv"
MARKOWITZ_SUMMARY_PATH = TABLES_DIRECTORY / "markowitz_return_summary.csv"
MARKOWITZ_DIVERSIFICATION_PATH = (
    TABLES_DIRECTORY / "markowitz_diversification_summary.csv"
)

RESAMPLE_SIZES = (100, 250, 500)


def _validate_capital_market_assumptions(expected_returns, covariance_matrix):
    """Validate labels and numeric content of capital-market assumptions."""
    if not isinstance(expected_returns, pd.Series):
        raise TypeError("expected_returns must be a pandas Series.")
    if not isinstance(covariance_matrix, pd.DataFrame):
        raise TypeError("covariance_matrix must be a pandas DataFrame.")
    assets = expected_returns.index
    if assets.has_duplicates or len(assets) == 0:
        raise ValueError("Expected-return labels must be unique and non-empty.")
    if set(covariance_matrix.index) != set(assets) or set(
        covariance_matrix.columns
    ) != set(assets):
        raise ValueError("Covariance labels must match expected returns.")
    covariance = covariance_matrix.reindex(index=assets, columns=assets).astype(float)
    expected = expected_returns.astype(float)
    if not np.isfinite(expected.to_numpy()).all() or not np.isfinite(
        covariance.to_numpy()
    ).all():
        raise ValueError("Capital-market assumptions must be finite.")
    covariance_values = (covariance.to_numpy() + covariance.to_numpy().T) / 2.0
    if np.linalg.eigvalsh(covariance_values).min() < -1e-8:
        raise ValueError("covariance_matrix must be positive semidefinite.")
    return expected, pd.DataFrame(
        covariance_values,
        index=assets,
        columns=assets,
    )


def simulate_capital_market_assumptions(
    expected_returns,
    covariance_matrix,
    n_observations,
    random_state,
):
    """Draw one mean vector and covariance matrix from normal sampling theory.

    The mean is sampled from N(mu, Sigma / n). The covariance is an independent
    Wishart-equivalent draw obtained from n centered multivariate-normal draws.
    Inputs and outputs retain the same frequency and asset labels.
    """
    expected, covariance = _validate_capital_market_assumptions(
        expected_returns,
        covariance_matrix,
    )
    if not isinstance(n_observations, int) or isinstance(n_observations, bool):
        raise TypeError("n_observations must be an integer.")
    if n_observations < 2:
        raise ValueError("n_observations must be at least two.")
    rng = np.random.default_rng(random_state)
    covariance_values = covariance.to_numpy()
    simulated_expected = rng.multivariate_normal(
        expected.to_numpy(),
        covariance_values / n_observations,
        check_valid="raise",
    )
    centered_draws = rng.multivariate_normal(
        np.zeros(len(expected)),
        covariance_values,
        size=n_observations,
        check_valid="raise",
    )
    simulated_covariance = np.cov(centered_draws, rowvar=False, ddof=1)
    simulated_covariance = (
        simulated_covariance + simulated_covariance.T
    ) / 2.0
    return (
        pd.Series(simulated_expected, index=expected.index, name="expected_return"),
        pd.DataFrame(
            simulated_covariance,
            index=expected.index,
            columns=expected.index,
        ),
    )


def _normalize_covariance_method(covariance_method):
    """Normalize supported covariance-estimator labels."""
    normalized = covariance_method.strip().lower().replace("-", "_")
    aliases = {
        "sample": "sample",
        "ledoit": "ledoit_wolf",
        "ledoitwolf": "ledoit_wolf",
        "ledoit_wolf": "ledoit_wolf",
    }
    if normalized not in aliases:
        raise ValueError("covariance_method must be sample or ledoit_wolf.")
    return aliases[normalized]


def _normalize_strategy(strategy):
    """Normalize the optimization strategy used within each resample."""
    normalized = strategy.strip().lower().replace("-", "_")
    aliases = {
        "min_variance": "min_variance",
        "max_sharpe": "max_sharpe",
        "target_volatility": "target_volatility",
        "target_vol": "target_volatility",
    }
    if normalized not in aliases:
        raise ValueError(
            "strategy must be min_variance, max_sharpe, or target_volatility."
        )
    return aliases[normalized]


def _base_capital_market_assumptions(returns_window, covariance_method):
    """Estimate annualized capital-market assumptions from one return window."""
    validate_returns(returns_window)
    if not isinstance(returns_window, pd.DataFrame) or len(returns_window) < 2:
        raise ValueError("returns_window must be a multi-asset DataFrame.")
    method = _normalize_covariance_method(covariance_method)
    expected = compute_expected_returns(returns_window, annualize=True)
    estimator = (
        compute_sample_covariance
        if method == "sample"
        else compute_ledoit_wolf_covariance
    )
    covariance = estimator(returns_window, annualize=True)
    return expected, covariance


def _optimize_simulated_assumptions(
    expected_returns,
    covariance_matrix,
    n_observations,
    seed,
    strategy,
):
    """Simulate assumptions and solve one constrained portfolio."""
    simulated_expected, simulated_covariance = (
        simulate_capital_market_assumptions(
            expected_returns,
            covariance_matrix,
            n_observations,
            seed,
        )
    )
    if strategy == "min_variance":
        weights = optimize_min_variance(
            simulated_expected,
            simulated_covariance,
            min_weight=MIN_WEIGHT,
            max_weight=MAX_WEIGHT,
        )
    elif strategy == "max_sharpe":
        weights = optimize_max_sharpe(
            simulated_expected,
            simulated_covariance,
            risk_free_rate=RISK_FREE_RATE,
            min_weight=MIN_WEIGHT,
            max_weight=MAX_WEIGHT,
        )
    else:
        weights = optimize_target_volatility(
            simulated_expected,
            simulated_covariance,
            target_volatility=TARGET_VOLATILITY,
            min_weight=MIN_WEIGHT,
            max_weight=MAX_WEIGHT,
        )
    return weights.to_numpy()


def _generate_resampled_weight_draws(
    returns_window,
    n_resamples,
    covariance_method,
    strategy,
    random_state,
    parallel=None,
):
    """Return every optimized resample weight vector in deterministic order."""
    if not isinstance(n_resamples, int) or isinstance(n_resamples, bool):
        raise TypeError("n_resamples must be an integer.")
    if n_resamples < 1:
        raise ValueError("n_resamples must be positive.")
    strategy = _normalize_strategy(strategy)
    expected, covariance = _base_capital_market_assumptions(
        returns_window,
        covariance_method,
    )
    rng = np.random.default_rng(random_state)
    seeds = rng.integers(0, np.iinfo(np.uint32).max, size=n_resamples)
    jobs = (
        delayed(_optimize_simulated_assumptions)(
            expected,
            covariance,
            len(returns_window),
            int(seed),
            strategy,
        )
        for seed in seeds
    )
    if parallel is None:
        draws = [
            _optimize_simulated_assumptions(
                expected,
                covariance,
                len(returns_window),
                int(seed),
                strategy,
            )
            for seed in seeds
        ]
    else:
        draws = parallel(jobs)
    weight_draws = np.vstack(draws)
    if not np.isfinite(weight_draws).all():
        raise RuntimeError("A resampled optimization returned non-finite weights.")
    return weight_draws


def generate_resampled_weights(
    returns_window,
    n_resamples,
    covariance_method="ledoit_wolf",
    strategy="max_sharpe",
):
    """Average constrained optimal weights across simulated capital markets."""
    draws = _generate_resampled_weight_draws(
        returns_window,
        n_resamples,
        covariance_method,
        strategy,
        random_state=RANDOM_SEED,
    )
    weights = pd.Series(
        draws.mean(axis=0),
        index=returns_window.columns,
        name="weight",
    )
    validate_weights(weights)
    if (weights < MIN_WEIGHT - 1e-8).any() or (
        weights > MAX_WEIGHT + 1e-8
    ).any():
        raise RuntimeError("Averaged resampled weights violate configured bounds.")
    return weights


def generate_michaud_weight_history(
    returns,
    window=60,
    n_resamples=500,
    covariance_method="ledoit_wolf",
):
    """Generate monthly Michaud weights using only returns strictly before t."""
    validate_returns(returns)
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("returns must be a pandas DataFrame.")
    if not isinstance(window, int) or isinstance(window, bool) or window < 2:
        raise ValueError("window must be an integer of at least two months.")
    if len(returns) <= window:
        raise ValueError("Returns must contain a post-window rebalance date.")
    rows = []
    dates = returns.index[window:]
    for position, rebalance_date in enumerate(dates):
        estimation_window = get_estimation_window(returns, rebalance_date, window)
        draws = _generate_resampled_weight_draws(
            estimation_window,
            n_resamples,
            covariance_method,
            "max_sharpe",
            random_state=np.random.SeedSequence([RANDOM_SEED, position]),
        )
        rows.append(draws.mean(axis=0))
    history = pd.DataFrame(rows, index=dates, columns=returns.columns)
    history.index.name = "date"
    if not np.allclose(history.sum(axis=1), 1.0, atol=1e-8):
        raise RuntimeError("Michaud weight rows do not sum to one.")
    if (history.to_numpy() < MIN_WEIGHT - 1e-8).any() or (
        history.to_numpy() > MAX_WEIGHT + 1e-8
    ).any():
        raise RuntimeError("Michaud weight history violates configured bounds.")
    return history


def compute_michaud_returns(
    weights,
    realized_returns,
    transaction_cost_bps,
):
    """Compute drift-aware next-period Michaud returns and turnover diagnostics."""
    return compute_markowitz_realized_returns(
        realized_returns,
        weights,
        transaction_cost_bps=transaction_cost_bps,
    )


def _generate_nested_weight_histories(
    returns,
    window=60,
    resample_sizes=RESAMPLE_SIZES,
    covariance_method="ledoit_wolf",
    n_jobs=-1,
):
    """Generate nested histories while solving the largest draw set only once."""
    validate_returns(returns)
    sizes = tuple(sorted(set(resample_sizes)))
    if not sizes or sizes[0] < 1:
        raise ValueError("resample_sizes must contain positive integers.")
    dates = returns.index[window:]
    histories = {size: [] for size in sizes}
    with Parallel(n_jobs=n_jobs, backend="loky", batch_size="auto") as parallel:
        for position, rebalance_date in enumerate(dates):
            estimation_window = get_estimation_window(
                returns,
                rebalance_date,
                window,
            )
            draws = _generate_resampled_weight_draws(
                estimation_window,
                max(sizes),
                covariance_method,
                "max_sharpe",
                random_state=np.random.SeedSequence([RANDOM_SEED, position]),
                parallel=parallel,
            )
            for size in sizes:
                histories[size].append(draws[:size].mean(axis=0))
            if (position + 1) % 12 == 0 or position + 1 == len(dates):
                print(
                    f"Michaud resampling: {position + 1}/{len(dates)} "
                    "rebalance dates complete."
                )
    return {
        size: pd.DataFrame(
            rows,
            index=dates,
            columns=returns.columns,
        ).rename_axis("date")
        for size, rows in histories.items()
    }


def _maximum_drawdown(returns):
    """Calculate maximum drawdown from a simple-return series."""
    wealth = (1.0 + returns).cumprod()
    running_peak = wealth.cummax().clip(lower=1.0)
    return float((wealth / running_peak - 1.0).min())


def _michaud_summary_row(n_resamples, diagnostics, weights):
    """Build one Michaud performance, turnover, and diversification summary."""
    returns = diagnostics["portfolio_return"]
    volatility = float(annualize_volatility(returns))
    arithmetic_return = float(returns.mean() * 12)
    modeled_turnover = diagnostics["turnover"].iloc[1:]
    diversification = compute_diversification_metrics(weights)
    return {
        "n_resamples": n_resamples,
        "annualized_geometric_return": float(annualize_return(returns)),
        "annualized_volatility": volatility,
        "sharpe_ratio": (
            (arithmetic_return - RISK_FREE_RATE) / volatility
            if volatility > 0
            else np.nan
        ),
        "max_drawdown": _maximum_drawdown(returns),
        "annualized_turnover": float(modeled_turnover.mean() * 12),
        "average_effective_number_of_assets": float(
            diversification["effective_number_of_assets"].mean()
        ),
        "average_herfindahl_index": float(
            diversification["herfindahl_index"].mean()
        ),
    }


def _build_markowitz_comparison(michaud_summary):
    """Combine the saved max-Sharpe Ledoit-Wolf row with Michaud results."""
    markowitz_returns = pd.read_csv(MARKOWITZ_SUMMARY_PATH)
    markowitz_diversification = pd.read_csv(MARKOWITZ_DIVERSIFICATION_PATH)
    return_row = markowitz_returns.loc[
        (markowitz_returns["strategy"] == "max_sharpe")
        & (markowitz_returns["covariance_method"] == "ledoit_wolf")
    ]
    diversification_row = markowitz_diversification.loc[
        (markowitz_diversification["strategy"] == "max_sharpe")
        & (markowitz_diversification["covariance_method"] == "ledoit_wolf")
    ]
    if len(return_row) != 1 or len(diversification_row) != 1:
        raise ValueError("Saved Max Sharpe Ledoit-Wolf summaries are not unique.")
    markowitz = {
        "strategy": "Max Sharpe Ledoit-Wolf",
        "n_resamples": np.nan,
        "annualized_geometric_return": return_row.iloc[0][
            "annualized_geometric_return"
        ],
        "annualized_volatility": return_row.iloc[0]["annualized_volatility"],
        "sharpe_ratio": return_row.iloc[0]["sharpe_ratio"],
        "max_drawdown": return_row.iloc[0]["max_drawdown"],
        "annualized_turnover": return_row.iloc[0]["annualized_turnover"],
        "average_effective_number_of_assets": diversification_row.iloc[0][
            "average_effective_number_of_assets"
        ],
        "average_herfindahl_index": diversification_row.iloc[0][
            "average_herfindahl_index"
        ],
    }
    michaud_rows = michaud_summary.copy()
    michaud_rows.insert(
        0,
        "strategy",
        michaud_rows["n_resamples"].map(lambda value: f"Michaud {int(value)}"),
    )
    return pd.concat(
        [pd.DataFrame([markowitz]), michaud_rows],
        ignore_index=True,
    )


def _create_weight_heatmap(weights):
    """Plot the 500-resample Michaud allocation history."""
    fig, ax = plt.subplots(figsize=(15, 8), constrained_layout=True)
    heatmap = ax.imshow(
        weights.T.to_numpy(),
        aspect="auto",
        interpolation="nearest",
        cmap="viridis",
        vmin=0,
        vmax=MAX_WEIGHT,
    )
    colorbar = fig.colorbar(heatmap, ax=ax)
    colorbar.set_label("Portfolio weight")
    tick_positions = np.linspace(0, len(weights) - 1, 8, dtype=int)
    ax.set_xticks(tick_positions)
    ax.set_xticklabels(
        [weights.index[position].strftime("%Y-%m") for position in tick_positions],
        rotation=45,
        ha="right",
    )
    ax.set_yticks(np.arange(len(weights.columns)))
    ax.set_yticklabels(weights.columns)
    ax.set_title("Michaud 500-Resample Portfolio Weights")
    ax.set_xlabel("Rebalance date")
    ax.set_ylabel("ETF")
    fig.savefig(
        FIGURES_DIRECTORY / "michaud_weight_heatmap.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def _create_comparison_figures(diagnostics, comparison):
    """Create equity-curve, turnover, and diversification comparisons."""
    markowitz = pd.read_csv(
        MARKOWITZ_RETURN_PATH,
        index_col="date",
        parse_dates=["date"],
    )["portfolio_return"]
    return_series = {"Max Sharpe Ledoit-Wolf": markowitz}
    for size, frame in diagnostics.items():
        return_series[f"Michaud {size}"] = frame["portfolio_return"]
    returns = pd.concat(return_series, axis=1, join="inner")
    wealth = (1.0 + returns).cumprod()
    plt.style.use("ggplot")
    fig, ax = plt.subplots(figsize=(13, 8), constrained_layout=True)
    wealth.plot(ax=ax, linewidth=1.8)
    ax.set_title("Michaud Resampling vs Classical Maximum Sharpe")
    ax.set_xlabel("Date")
    ax.set_ylabel("Growth of $1")
    fig.savefig(
        FIGURES_DIRECTORY / "michaud_vs_markowitz_equity_curve.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 6), constrained_layout=True)
    ax.bar(comparison["strategy"], comparison["annualized_turnover"])
    ax.set_title("Annualized Portfolio Turnover")
    ax.set_ylabel("Annualized one-way turnover")
    ax.tick_params(axis="x", rotation=20)
    fig.savefig(
        FIGURES_DIRECTORY / "michaud_vs_markowitz_turnover.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6), constrained_layout=True)
    axes[0].bar(
        comparison["strategy"],
        comparison["average_effective_number_of_assets"],
    )
    axes[0].set_title("Average Effective Number of Assets")
    axes[0].tick_params(axis="x", rotation=20)
    axes[1].bar(
        comparison["strategy"],
        comparison["average_herfindahl_index"],
    )
    axes[1].set_title("Average Herfindahl Index")
    axes[1].tick_params(axis="x", rotation=20)
    fig.savefig(
        FIGURES_DIRECTORY / "michaud_vs_markowitz_diversification.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_michaud_analysis(n_jobs=-1):
    """Generate all requested core-universe Michaud artifacts."""
    returns = pd.read_csv(
        CORE_RETURNS_PATH,
        index_col="date",
        parse_dates=["date"],
    )
    TABLES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIRECTORY.mkdir(parents=True, exist_ok=True)
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    histories = _generate_nested_weight_histories(returns, n_jobs=n_jobs)
    diagnostics = {}
    summary_rows = []
    for size, weights in histories.items():
        weights.to_csv(
            TABLES_DIRECTORY / f"weights_michaud_{size}.csv",
            index_label="date",
            date_format="%Y-%m-%d",
        )
        diagnostic = compute_michaud_returns(
            weights,
            returns,
            transaction_cost_bps=TRANSACTION_COST_BPS,
        )
        diagnostics[size] = diagnostic
        diagnostic[["portfolio_return"]].to_csv(
            PROCESSED_DIRECTORY / f"michaud_returns_{size}.csv",
            index_label="date",
            date_format="%Y-%m-%d",
        )
        summary_rows.append(_michaud_summary_row(size, diagnostic, weights))
    summary = pd.DataFrame(summary_rows)
    summary.to_csv(TABLES_DIRECTORY / "michaud_summary.csv", index=False)
    comparison = _build_markowitz_comparison(summary)
    comparison.to_csv(
        TABLES_DIRECTORY / "markowitz_vs_michaud.csv",
        index=False,
    )
    _create_weight_heatmap(histories[max(RESAMPLE_SIZES)])
    _create_comparison_figures(diagnostics, comparison)
    return {
        "weights": histories,
        "diagnostics": diagnostics,
        "summary": summary,
        "comparison": comparison,
    }


def main():
    """Run the complete Michaud resampling analysis."""
    outputs = run_michaud_analysis()
    print(f"Saved {len(outputs['summary'])} Michaud strategy rows.")


if __name__ == "__main__":
    main()

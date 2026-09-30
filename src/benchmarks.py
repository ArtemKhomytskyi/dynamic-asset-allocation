"""Transparent equal-weight and 60/40 benchmark portfolio implementations."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.config import RISK_FREE_RATE
from src.returns import annualize_return, annualize_volatility, validate_returns


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"
METADATA_PATH = PROJECT_ROOT / "data" / "external" / "etf_metadata.csv"

UNIVERSE_RETURN_PATHS = {
    "core_23": PROCESSED_DIRECTORY / "returns_simple_core_23.csv",
    "extended_27": PROCESSED_DIRECTORY / "returns_simple_extended_27.csv",
}


def _validate_tickers(tickers):
    """Return a validated ticker list while preserving input order."""
    selected_tickers = list(tickers)
    if not selected_tickers:
        raise ValueError("At least one ticker is required.")
    if len(selected_tickers) != len(set(selected_tickers)):
        raise ValueError("Tickers must be unique.")
    return selected_tickers


def _validate_weights(weights):
    """Validate a fully invested, long-only, unleveraged weight vector."""
    if not isinstance(weights, pd.Series):
        raise TypeError("Weights must be a pandas Series indexed by ticker.")
    if weights.empty or weights.index.has_duplicates:
        raise ValueError("Weights must contain unique ticker entries.")
    values = weights.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Weights must be finite.")
    if (values < -1e-12).any():
        raise ValueError("Short positions are not permitted.")
    if (values > 1.0 + 1e-12).any():
        raise ValueError("Individual weights may not exceed 100%.")
    if not np.isclose(values.sum(), 1.0, atol=1e-10):
        raise ValueError("Portfolio weights must sum to one.")
    return True


def create_equal_weight_weights(tickers):
    """Assign exactly 1/N to every supplied ETF."""
    selected_tickers = _validate_tickers(tickers)
    weights = pd.Series(
        1.0 / len(selected_tickers),
        index=selected_tickers,
        name="weight",
        dtype=float,
    )
    _validate_weights(weights)
    return weights


def create_sixty_forty_weights(
    tickers,
    metadata,
    equity_weight=0.60,
    bond_weight=0.40,
):
    """Allocate 60% to equities and 40% to government bonds, equally by sleeve."""
    selected_tickers = _validate_tickers(tickers)
    if not isinstance(metadata, pd.DataFrame):
        raise TypeError("metadata must be a pandas DataFrame.")
    required_columns = {"ticker", "asset_class"}
    if not required_columns.issubset(metadata.columns):
        raise ValueError("metadata must include ticker and asset_class columns.")
    if metadata["ticker"].duplicated().any():
        raise ValueError("Metadata contains duplicate ticker rows.")
    if equity_weight < 0 or bond_weight < 0:
        raise ValueError("Sleeve weights must be non-negative.")
    if not np.isclose(equity_weight + bond_weight, 1.0, atol=1e-10):
        raise ValueError("Equity and bond sleeve weights must sum to one.")

    asset_classes = metadata.set_index("ticker")["asset_class"]
    missing_metadata = [ticker for ticker in selected_tickers if ticker not in asset_classes]
    if missing_metadata:
        raise ValueError(
            "Metadata is missing requested tickers: " + ", ".join(missing_metadata)
        )
    selected_classes = asset_classes.reindex(selected_tickers)
    equity_tickers = selected_classes[selected_classes == "Equity"].index.tolist()
    government_bond_tickers = selected_classes[
        selected_classes == "Government Bonds"
    ].index.tolist()
    if not equity_tickers or not government_bond_tickers:
        raise ValueError("Both Equity and Government Bonds sleeves must be non-empty.")

    weights = pd.Series(0.0, index=selected_tickers, name="weight", dtype=float)
    weights.loc[equity_tickers] = equity_weight / len(equity_tickers)
    weights.loc[government_bond_tickers] = bond_weight / len(
        government_bond_tickers
    )
    _validate_weights(weights)
    return weights


def _align_weights(returns, weights):
    """Require exact ticker agreement and align weights to return columns."""
    validate_returns(returns)
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("Portfolio returns require a DataFrame of asset returns.")
    _validate_weights(weights)
    if set(weights.index) != set(returns.columns):
        missing = sorted(set(returns.columns) - set(weights.index))
        extra = sorted(set(weights.index) - set(returns.columns))
        raise ValueError(f"Weight/return ticker mismatch; missing={missing}, extra={extra}.")
    return weights.reindex(returns.columns)


def compute_portfolio_returns(returns, weights):
    """Compute constant-weight portfolio returns for every observation."""
    aligned_weights = _align_weights(returns, weights)
    portfolio_returns = returns.mul(aligned_weights, axis=1).sum(axis=1)
    portfolio_returns.name = "benchmark_return"
    return portfolio_returns


def _rebalance_periods(index, rebalance_frequency):
    """Map supported rebalance frequencies to pandas period labels."""
    normalized = rebalance_frequency.strip().upper()
    aliases = {
        "M": "M",
        "ME": "M",
        "Q": "Q",
        "QE": "Q",
        "A": "Y",
        "Y": "Y",
        "YE": "Y",
    }
    if normalized not in aliases:
        raise ValueError("rebalance_frequency must be monthly, quarterly, or annual.")
    if not isinstance(index, pd.DatetimeIndex):
        raise TypeError("Rebalanced returns require a DatetimeIndex.")
    return index.to_period(aliases[normalized])


def compute_rebalanced_benchmark_diagnostics(
    returns,
    weights,
    rebalance_frequency="M",
    transaction_cost_bps=0,
):
    """Return benchmark returns, applied weights, and drift-rebalancing turnover."""
    target_weights = _align_weights(returns, weights)
    if transaction_cost_bps < 0:
        raise ValueError("transaction_cost_bps must be non-negative.")
    if (returns.to_numpy() <= -1.0).any():
        raise ValueError("Asset returns at or below -100% cannot update weights.")

    periods = _rebalance_periods(returns.index, rebalance_frequency)
    current_weights = target_weights.copy()
    results = []
    applied_weight_rows = []
    turnover_values = []
    for position, (_, asset_returns) in enumerate(returns.iterrows()):
        turnover = 0.0
        transaction_cost = 0.0
        if position > 0 and periods[position] != periods[position - 1]:
            turnover = 0.5 * np.abs(target_weights - current_weights).sum()
            transaction_cost = turnover * transaction_cost_bps / 10_000.0
            current_weights = target_weights.copy()

        applied_weight_rows.append(current_weights.to_numpy(copy=True))
        turnover_values.append(float(turnover))
        gross_return = float(current_weights @ asset_returns)
        results.append(gross_return - transaction_cost)
        current_weights = current_weights * (1.0 + asset_returns)
        current_weights = current_weights / current_weights.sum()

    benchmark_returns = pd.Series(
        results,
        index=returns.index,
        name="benchmark_return",
    )
    validate_returns(benchmark_returns)
    weight_history = pd.DataFrame(
        applied_weight_rows,
        index=returns.index,
        columns=returns.columns,
    )
    weight_history.index.name = "date"
    if not np.allclose(weight_history.sum(axis=1), 1.0, atol=1e-10):
        raise RuntimeError("Applied benchmark weights do not sum to one.")
    turnover = pd.Series(
        turnover_values,
        index=returns.index,
        name="turnover",
    )
    return benchmark_returns, weight_history, turnover


def compute_rebalanced_benchmark_returns(
    returns,
    weights,
    rebalance_frequency="M",
    transaction_cost_bps=0,
):
    """Compute long-only benchmark returns with scheduled rebalancing and costs."""
    benchmark_returns, _, _ = compute_rebalanced_benchmark_diagnostics(
        returns,
        weights,
        rebalance_frequency=rebalance_frequency,
        transaction_cost_bps=transaction_cost_bps,
    )
    return benchmark_returns


def _drawdown_series(returns):
    """Calculate drawdowns relative to initial wealth and subsequent peaks."""
    wealth = (1.0 + returns).cumprod()
    running_peak = wealth.cummax().clip(lower=1.0)
    return wealth / running_peak - 1.0


def _maximum_drawdown(returns):
    """Calculate the minimum peak-to-trough drawdown from a return series."""
    return float(_drawdown_series(returns).min())


def _benchmark_summary_row(universe_name, benchmark_name, returns):
    """Build one benchmark performance-summary record."""
    annualized_volatility = float(annualize_volatility(returns))
    annualized_arithmetic_return = float(returns.mean() * 12)
    sharpe_ratio = (
        (annualized_arithmetic_return - RISK_FREE_RATE) / annualized_volatility
        if annualized_volatility > 0
        else np.nan
    )
    return {
        "universe_name": universe_name,
        "benchmark_name": benchmark_name,
        "start_date": returns.index.min(),
        "end_date": returns.index.max(),
        "n_months": len(returns),
        "annualized_geometric_return": float(annualize_return(returns)),
        "annualized_volatility": annualized_volatility,
        "sharpe_ratio": sharpe_ratio,
        "max_drawdown": _maximum_drawdown(returns),
        "min_monthly_return": float(returns.min()),
        "max_monthly_return": float(returns.max()),
    }


def _weight_table(weights, metadata):
    """Combine a benchmark weight vector with report-facing asset classes."""
    asset_classes = metadata.set_index("ticker")["asset_class"]
    return pd.DataFrame(
        {
            "ticker": weights.index,
            "weight": weights.to_numpy(),
            "asset_class": asset_classes.reindex(weights.index).to_numpy(),
        }
    )


def _create_benchmark_plots(universe_name, benchmark_returns):
    """Create cumulative-return and drawdown comparison plots."""
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    short_name = "core" if universe_name == "core_23" else "extended"
    display_name = "Core 23" if universe_name == "core_23" else "Extended 27"
    benchmark_labels = {
        "equal_weight": "Equal Weight",
        "sixty_forty": "60/40",
    }
    plt.style.use("ggplot")

    cumulative_returns = pd.DataFrame(
        {
            benchmark_labels[name]: (1.0 + series).cumprod() - 1.0
            for name, series in benchmark_returns.items()
        }
    )
    fig, ax = plt.subplots(figsize=(12, 7), constrained_layout=True)
    for column in cumulative_returns:
        ax.plot(
            cumulative_returns.index,
            cumulative_returns[column] * 100,
            label=column,
            linewidth=2,
        )
    ax.set_title(f"Benchmark Cumulative Returns: {display_name} Universe")
    ax.set_xlabel("Date")
    ax.set_ylabel("Cumulative return (%)")
    ax.legend()
    fig.savefig(
        FIGURES_DIRECTORY / f"benchmark_cumulative_returns_{short_name}.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    drawdowns = pd.DataFrame(
        {
            benchmark_labels[name]: _drawdown_series(series)
            for name, series in benchmark_returns.items()
        }
    )
    fig, ax = plt.subplots(figsize=(12, 7), constrained_layout=True)
    for column in drawdowns:
        ax.plot(
            drawdowns.index,
            drawdowns[column] * 100,
            label=column,
            linewidth=2,
        )
    ax.set_title(f"Benchmark Drawdowns: {display_name} Universe")
    ax.set_xlabel("Date")
    ax.set_ylabel("Drawdown (%)")
    ax.legend()
    fig.savefig(
        FIGURES_DIRECTORY / f"benchmark_drawdowns_{short_name}.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_benchmark_analysis():
    """Generate benchmark returns, weights, summaries, and plots for both universes."""
    metadata = pd.read_csv(METADATA_PATH)
    summary_records = []
    turnover_records = []
    outputs = {}
    for universe_name, return_path in UNIVERSE_RETURN_PATHS.items():
        asset_returns = pd.read_csv(
            return_path,
            index_col="date",
            parse_dates=["date"],
        )
        tickers = asset_returns.columns.tolist()
        benchmark_weights = {
            "equal_weight": create_equal_weight_weights(tickers),
            "sixty_forty": create_sixty_forty_weights(tickers, metadata),
        }
        benchmark_returns = {}
        benchmark_weight_histories = {}
        benchmark_turnover = {}
        for benchmark_name, weights in benchmark_weights.items():
            returns, weight_history, turnover = compute_rebalanced_benchmark_diagnostics(
                asset_returns,
                weights,
                rebalance_frequency="M",
                transaction_cost_bps=0,
            )
            benchmark_returns[benchmark_name] = returns
            benchmark_weight_histories[benchmark_name] = weight_history
            benchmark_turnover[benchmark_name] = turnover
            returns.to_frame().to_csv(
                PROCESSED_DIRECTORY
                / f"benchmark_{benchmark_name}_{universe_name}.csv",
                index_label="date",
                date_format="%Y-%m-%d",
            )
            weights_table = _weight_table(weights, metadata)
            weights_table.to_csv(
                TABLES_DIRECTORY
                / f"benchmark_weights_{benchmark_name}_{universe_name}.csv",
                index=False,
            )
            weight_history.to_csv(
                TABLES_DIRECTORY
                / f"benchmark_weight_history_{benchmark_name}_{universe_name}.csv",
                index_label="date",
                date_format="%Y-%m-%d",
            )
            summary_records.append(
                _benchmark_summary_row(universe_name, benchmark_name, returns)
            )
            modeled_turnover = turnover.iloc[1:]
            turnover_records.append(
                {
                    "universe_name": universe_name,
                    "benchmark_name": benchmark_name,
                    "average_monthly_turnover": float(modeled_turnover.mean()),
                    "annualized_turnover": float(modeled_turnover.mean() * 12),
                    "max_monthly_turnover": float(modeled_turnover.max()),
                }
            )
        _create_benchmark_plots(universe_name, benchmark_returns)
        outputs[universe_name] = {
            "weights": benchmark_weights,
            "returns": benchmark_returns,
            "weight_history": benchmark_weight_histories,
            "turnover": benchmark_turnover,
        }

    summary = pd.DataFrame.from_records(summary_records)
    summary.to_csv(
        TABLES_DIRECTORY / "benchmark_summary.csv",
        index=False,
        date_format="%Y-%m-%d",
    )
    outputs["summary"] = summary
    turnover_summary = pd.DataFrame.from_records(turnover_records)
    turnover_summary.to_csv(
        TABLES_DIRECTORY / "benchmark_turnover_summary.csv",
        index=False,
    )
    outputs["turnover_summary"] = turnover_summary
    return outputs


def main():
    """Run the complete deterministic benchmark artifact pipeline."""
    outputs = run_benchmark_analysis()
    print(f"Saved {len(outputs['summary'])} benchmark summary rows.")


if __name__ == "__main__":
    main()

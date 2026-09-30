"""Hierarchical Risk Parity optimization and out-of-sample reporting."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
import numpy as np
import pandas as pd
from pypfopt import HRPOpt
import scipy.cluster.hierarchy as scipy_hierarchy

from src.config import TRANSACTION_COST_BPS
from src.estimators import get_estimation_window
from src.final_report import _drawdown_series, _performance_metrics, run_final_report
from src.markowitz_diversification import compute_diversification_metrics
from src.markowitz_returns import compute_markowitz_realized_returns
from src.returns import validate_returns


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"
CORE_RETURNS_PATH = PROCESSED_DIRECTORY / "returns_simple_core_23.csv"

SCIPY_LINKAGE_METHODS = {
    "single",
    "complete",
    "average",
    "weighted",
    "centroid",
    "median",
    "ward",
}


def optimize_hrp(returns_window):
    """Compute long-only HRP weights from one historical return window."""
    validate_returns(returns_window)
    if not isinstance(returns_window, pd.DataFrame):
        raise TypeError("returns_window must be a pandas DataFrame.")
    if len(returns_window) < 2 or returns_window.shape[1] < 2:
        raise ValueError("HRP requires at least two dates and two assets.")

    # PyPortfolioOpt 1.6 validates against a private SciPy constant removed in
    # SciPy 1.18. Restoring only the documented linkage names preserves the
    # library's validation while leaving its clustering and HRP logic unchanged.
    if not hasattr(scipy_hierarchy, "_LINKAGE_METHODS"):
        scipy_hierarchy._LINKAGE_METHODS = SCIPY_LINKAGE_METHODS

    optimizer = HRPOpt(returns=returns_window)
    raw_weights = optimizer.optimize(linkage_method="single")
    weights = pd.Series(raw_weights, dtype=float).reindex(returns_window.columns)
    if weights.isna().any() or not np.isfinite(weights.to_numpy()).all():
        raise RuntimeError("HRP returned missing or non-finite weights.")
    if (weights < -1e-12).any():
        raise RuntimeError("HRP returned a negative portfolio weight.")
    weights = weights.clip(lower=0.0)
    weights = weights / weights.sum()
    weights.name = "weight"
    if not np.isclose(weights.sum(), 1.0, atol=1e-10):
        raise RuntimeError("HRP weights do not sum to one.")
    return weights


def _is_rebalance_date(date, first_date, rebalance_frequency):
    """Return whether a monthly date triggers a new HRP estimation."""
    if date == first_date:
        return True
    normalized = rebalance_frequency.strip().upper()
    if normalized in {"M", "ME"}:
        return True
    if normalized in {"Q", "QE"}:
        return bool(date.is_quarter_end)
    if normalized in {"A", "Y", "YE"}:
        return bool(date.is_year_end)
    raise ValueError("rebalance_frequency must be monthly, quarterly, or annual.")


def generate_hrp_weight_history(
    returns,
    window=60,
    rebalance_frequency="M",
):
    """Generate HRP weights at t from exactly `window` observations through t-1."""
    validate_returns(returns)
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("returns must be a pandas DataFrame.")
    if not isinstance(window, int) or isinstance(window, bool) or window < 2:
        raise ValueError("window must be an integer of at least two months.")
    if len(returns) <= window:
        raise ValueError("Returns must contain a post-window rebalance date.")
    eligible_dates = returns.index[window:]
    rows = []
    current_weights = None
    for rebalance_date in eligible_dates:
        if _is_rebalance_date(
            rebalance_date,
            eligible_dates[0],
            rebalance_frequency,
        ):
            estimation_window = get_estimation_window(
                returns,
                rebalance_date,
                window,
            )
            current_weights = optimize_hrp(estimation_window)
        rows.append(current_weights.reindex(returns.columns).to_numpy())
    history = pd.DataFrame(
        rows,
        index=eligible_dates,
        columns=returns.columns,
    )
    history.index.name = "date"
    if not np.allclose(history.sum(axis=1), 1.0, atol=1e-10):
        raise RuntimeError("HRP weight-history rows do not sum to one.")
    if (history.to_numpy() < -1e-12).any() or not np.isfinite(
        history.to_numpy()
    ).all():
        raise RuntimeError("HRP weight history contains invalid weights.")
    return history


def compute_hrp_returns(weights, realized_returns, transaction_cost_bps):
    """Compute drift-aware next-month HRP returns and transaction costs."""
    return compute_markowitz_realized_returns(
        realized_returns,
        weights,
        transaction_cost_bps=transaction_cost_bps,
    )


def compute_hrp_turnover(weight_history):
    """Compute one-way target-weight turnover from consecutive HRP allocations."""
    if not isinstance(weight_history, pd.DataFrame):
        raise TypeError("weight_history must be a pandas DataFrame.")
    if weight_history.empty or weight_history.isna().any().any():
        raise ValueError("weight_history must be complete and non-empty.")
    if not np.allclose(weight_history.sum(axis=1), 1.0, atol=1e-8):
        raise ValueError("Every weight row must sum to one.")
    turnover = 0.5 * weight_history.diff().abs().sum(axis=1)
    turnover.iloc[0] = 0.0
    turnover.name = "turnover"
    if (turnover < -1e-12).any() or turnover.isna().any():
        raise RuntimeError("HRP turnover contains invalid values.")
    return turnover


def _summary_tables(weights, diagnostics):
    """Build HRP weight, diversification, and realized-return summaries."""
    target_turnover = compute_hrp_turnover(weights)
    diversification = compute_diversification_metrics(weights)
    signal_weights = weights.iloc[:-1].copy()
    signal_weights.index = weights.index[1:]
    metrics = _performance_metrics(
        diagnostics["portfolio_return"],
        diagnostics["turnover"],
        signal_weights,
    )
    weight_summary = pd.DataFrame(
        [
            {
                "strategy": "HRP",
                "average_number_of_positions": float(
                    (weights > 1e-10).sum(axis=1).mean()
                ),
                "average_weight": float(weights.mean(axis=1).mean()),
                "maximum_weight": float(weights.max().max()),
                "average_target_turnover": float(target_turnover.iloc[1:].mean()),
            }
        ]
    )
    diversification_summary = pd.DataFrame(
        [
            {
                "strategy": "HRP",
                "average_effective_number_of_assets": float(
                    diversification["effective_number_of_assets"].mean()
                ),
                "minimum_effective_number_of_assets": float(
                    diversification["effective_number_of_assets"].min()
                ),
                "maximum_effective_number_of_assets": float(
                    diversification["effective_number_of_assets"].max()
                ),
                "average_herfindahl_index": float(
                    diversification["herfindahl_index"].mean()
                ),
            }
        ]
    )
    return_summary = pd.DataFrame(
        [
            {
                "strategy": "HRP",
                "covariance_method": "hierarchical",
                "start_date": diagnostics.index.min(),
                "end_date": diagnostics.index.max(),
                "n_months": len(diagnostics),
                **metrics,
            }
        ]
    )
    return weight_summary, diversification_summary, return_summary


def _create_hrp_figures(weights, diagnostics, final_comparison):
    """Create HRP allocation, performance, and strategy-comparison figures."""
    plt.style.use("ggplot")
    fig, ax = plt.subplots(figsize=(15, 8), constrained_layout=True)
    heatmap = ax.imshow(
        weights.T.to_numpy(),
        aspect="auto",
        interpolation="nearest",
        cmap="viridis",
        vmin=0,
        vmax=float(weights.max().max()),
    )
    colorbar = fig.colorbar(heatmap, ax=ax)
    colorbar.set_label("Portfolio weight")
    positions = np.linspace(0, len(weights) - 1, 8, dtype=int)
    ax.set_xticks(positions)
    ax.set_xticklabels(
        [weights.index[position].strftime("%Y-%m") for position in positions],
        rotation=45,
        ha="right",
    )
    ax.set_yticks(np.arange(len(weights.columns)))
    ax.set_yticklabels(weights.columns)
    ax.set_title("Hierarchical Risk Parity Weights")
    ax.set_xlabel("Rebalance date")
    ax.set_ylabel("ETF")
    fig.savefig(
        FIGURES_DIRECTORY / "hrp_weight_heatmap.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    hrp_returns = diagnostics["portfolio_return"]
    wealth = (1.0 + hrp_returns).cumprod()
    fig, ax = plt.subplots(figsize=(12, 7), constrained_layout=True)
    ax.plot(wealth.index, wealth, linewidth=2, color="#1f77b4")
    ax.set_title("HRP Out-of-Sample Equity Curve")
    ax.set_xlabel("Date")
    ax.set_ylabel("Growth of $1")
    fig.savefig(
        FIGURES_DIRECTORY / "hrp_equity_curve.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    drawdown = _drawdown_series(hrp_returns)
    fig, ax = plt.subplots(figsize=(12, 7), constrained_layout=True)
    ax.fill_between(drawdown.index, drawdown, 0, color="#d62728", alpha=0.55)
    ax.plot(drawdown.index, drawdown, color="#d62728", linewidth=1.5)
    ax.set_title("HRP Out-of-Sample Drawdown")
    ax.set_xlabel("Date")
    ax.set_ylabel("Drawdown")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    fig.savefig(
        FIGURES_DIRECTORY / "hrp_drawdown.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    comparison_returns = final_comparison.attrs["returns"]
    selected = [
        "Equal Weight",
        "60/40",
        "Max Sharpe Ledoit-Wolf",
        "Michaud 500",
        "HRP",
    ]
    comparison_wealth = (1.0 + comparison_returns[selected]).cumprod()
    fig, ax = plt.subplots(figsize=(13, 8), constrained_layout=True)
    comparison_wealth.plot(ax=ax, linewidth=1.8)
    ax.set_title("HRP versus Benchmarks, Markowitz, and Michaud")
    ax.set_xlabel("Date")
    ax.set_ylabel("Growth of $1")
    fig.savefig(
        FIGURES_DIRECTORY / "hrp_vs_markowitz_vs_michaud.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_hrp_analysis():
    """Generate HRP artifacts and refresh the saved common-period comparison."""
    returns = pd.read_csv(
        CORE_RETURNS_PATH,
        index_col="date",
        parse_dates=["date"],
    )
    TABLES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIRECTORY.mkdir(parents=True, exist_ok=True)
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    weights = generate_hrp_weight_history(returns, window=60)
    diagnostics = compute_hrp_returns(
        weights,
        returns,
        transaction_cost_bps=TRANSACTION_COST_BPS,
    )
    weight_summary, diversification_summary, return_summary = _summary_tables(
        weights,
        diagnostics,
    )
    weights.to_csv(
        TABLES_DIRECTORY / "weights_hrp.csv",
        index_label="date",
        date_format="%Y-%m-%d",
    )
    weight_summary.to_csv(TABLES_DIRECTORY / "hrp_weight_summary.csv", index=False)
    diversification_summary.to_csv(
        TABLES_DIRECTORY / "hrp_diversification_summary.csv",
        index=False,
    )
    return_summary.to_csv(
        TABLES_DIRECTORY / "hrp_return_summary.csv",
        index=False,
        date_format="%Y-%m-%d",
    )
    diagnostics[["portfolio_return"]].to_csv(
        PROCESSED_DIRECTORY / "hrp_returns.csv",
        index_label="date",
        date_format="%Y-%m-%d",
    )

    final_outputs = run_final_report()
    _create_hrp_figures(weights, diagnostics, final_outputs["comparison"])
    return {
        "weights": weights,
        "diagnostics": diagnostics,
        "weight_summary": weight_summary,
        "diversification_summary": diversification_summary,
        "return_summary": return_summary,
        "final_comparison": final_outputs["comparison"],
    }


def main():
    """Run the complete HRP extension pipeline."""
    outputs = run_hrp_analysis()
    print(f"Saved {len(outputs['weights'])} HRP weight rows.")


if __name__ == "__main__":
    main()

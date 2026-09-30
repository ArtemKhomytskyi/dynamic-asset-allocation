"""Compute concentration and diversification diagnostics from saved weights."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"

CONFIGURATIONS = [
    ("min_variance", "sample", "weights_min_variance_sample_60m.csv"),
    ("min_variance", "ledoit_wolf", "weights_min_variance_ledoit_60m.csv"),
    ("max_sharpe", "sample", "weights_max_sharpe_sample_60m.csv"),
    ("max_sharpe", "ledoit_wolf", "weights_max_sharpe_ledoit_60m.csv"),
    ("target_volatility", "sample", "weights_target_vol_sample_60m.csv"),
    ("target_volatility", "ledoit_wolf", "weights_target_vol_ledoit_60m.csv"),
]


def compute_diversification_metrics(weight_history):
    """Return date-level Herfindahl and effective-number-of-assets metrics."""
    if not isinstance(weight_history, pd.DataFrame):
        raise TypeError("weight_history must be a pandas DataFrame.")
    if weight_history.empty or weight_history.isna().any().any():
        raise ValueError("weight_history must be complete and non-empty.")
    values = weight_history.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("weight_history must contain only finite values.")
    if (values < -1e-8).any():
        raise ValueError("weight_history must be long-only.")
    if not np.allclose(values.sum(axis=1), 1.0, atol=1e-8):
        raise ValueError("Every weight-history row must sum to one.")

    herfindahl_index = weight_history.pow(2).sum(axis=1)
    effective_number_of_assets = 1.0 / herfindahl_index
    metrics = pd.DataFrame(
        {
            "effective_number_of_assets": effective_number_of_assets,
            "herfindahl_index": herfindahl_index,
        },
        index=weight_history.index,
    )
    metrics.index.name = "date"
    return metrics


def _summary_row(strategy, covariance_method, metrics):
    """Summarize diversification across all rolling rebalance dates."""
    effective = metrics["effective_number_of_assets"]
    herfindahl = metrics["herfindahl_index"]
    return {
        "strategy": strategy,
        "covariance_method": covariance_method,
        "average_effective_number_of_assets": float(effective.mean()),
        "minimum_effective_number_of_assets": float(effective.min()),
        "maximum_effective_number_of_assets": float(effective.max()),
        "average_herfindahl_index": float(herfindahl.mean()),
    }


def _create_effective_assets_plot(metric_histories):
    """Plot rolling effective asset counts for every strategy and estimator."""
    strategy_labels = {
        "min_variance": "Min Variance",
        "max_sharpe": "Max Sharpe",
        "target_volatility": "Target Volatility",
    }
    plt.style.use("ggplot")
    fig, ax = plt.subplots(figsize=(13, 8), constrained_layout=True)
    for (strategy, covariance_method), metrics in metric_histories.items():
        method_label = "Sample" if covariance_method == "sample" else "Ledoit-Wolf"
        ax.plot(
            metrics.index,
            metrics["effective_number_of_assets"],
            label=f"{strategy_labels[strategy]} — {method_label}",
            linewidth=1.7,
        )
    ax.set_title("Effective Number of Assets Over Time")
    ax.set_xlabel("Rebalance date")
    ax.set_ylabel("Effective number of assets")
    ax.legend(ncol=2)
    fig.savefig(
        FIGURES_DIRECTORY / "effective_number_of_assets_over_time.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_markowitz_diversification_analysis():
    """Generate the requested summary and figure from existing weight histories."""
    summary_records = []
    metric_histories = {}
    for strategy, covariance_method, weight_file in CONFIGURATIONS:
        weight_history = pd.read_csv(
            TABLES_DIRECTORY / weight_file,
            index_col="date",
            parse_dates=["date"],
        )
        metrics = compute_diversification_metrics(weight_history)
        metric_histories[(strategy, covariance_method)] = metrics
        summary_records.append(
            _summary_row(strategy, covariance_method, metrics)
        )

    summary = pd.DataFrame.from_records(summary_records)
    summary.to_csv(
        TABLES_DIRECTORY / "markowitz_diversification_summary.csv",
        index=False,
    )
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    _create_effective_assets_plot(metric_histories)
    return {"summary": summary, "metrics": metric_histories}


def main():
    """Run the saved-weight diversification diagnostic pipeline."""
    outputs = run_markowitz_diversification_analysis()
    print(f"Saved {len(outputs['summary'])} diversification summary rows.")


if __name__ == "__main__":
    main()


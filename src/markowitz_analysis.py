"""Generate rolling core-universe Markowitz weights and diagnostics."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.optimizers import generate_markowitz_weights


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CORE_RETURNS_PATH = (
    PROJECT_ROOT / "data" / "processed" / "returns_simple_core_23.csv"
)
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"
POSITION_TOLERANCE = 1e-4

CONFIGURATIONS = [
    ("min_variance", "sample", "weights_min_variance_sample_60m.csv"),
    ("min_variance", "ledoit_wolf", "weights_min_variance_ledoit_60m.csv"),
    ("max_sharpe", "sample", "weights_max_sharpe_sample_60m.csv"),
    ("max_sharpe", "ledoit_wolf", "weights_max_sharpe_ledoit_60m.csv"),
    ("target_volatility", "sample", "weights_target_vol_sample_60m.csv"),
    ("target_volatility", "ledoit_wolf", "weights_target_vol_ledoit_60m.csv"),
]


def _summarize_weights(strategy, covariance_method, weight_history):
    """Summarize concentration and one-way changes in target weights."""
    active = weight_history > POSITION_TOLERANCE
    active_weights = weight_history.where(active).stack()
    turnover = 0.5 * weight_history.diff().abs().sum(axis=1).iloc[1:]
    return {
        "strategy": strategy,
        "covariance_method": covariance_method,
        "average_number_of_positions": float(active.sum(axis=1).mean()),
        "average_weight": float(active_weights.mean()),
        "maximum_weight": float(weight_history.max().max()),
        "average_turnover": float(turnover.mean()),
    }


def _heatmap_ticks(index, count=7):
    """Return compact index positions and year labels for weight heatmaps."""
    positions = np.linspace(0, len(index) - 1, min(count, len(index))).astype(int)
    labels = [pd.Timestamp(index[position]).strftime("%Y-%m") for position in positions]
    return positions, labels


def _create_strategy_heatmap(strategy, histories):
    """Plot sample and Ledoit-Wolf rolling weights side by side."""
    display_names = {
        "min_variance": "Minimum Variance",
        "max_sharpe": "Maximum Sharpe",
        "target_volatility": "Target Volatility",
    }
    file_names = {
        "min_variance": "markowitz_weight_heatmap_min_variance.png",
        "max_sharpe": "markowitz_weight_heatmap_max_sharpe.png",
        "target_volatility": "markowitz_weight_heatmap_target_vol.png",
    }
    fig, axes = plt.subplots(1, 2, figsize=(18, 10), constrained_layout=True)
    image = None
    for axis, covariance_method in zip(axes, ["sample", "ledoit_wolf"]):
        history = histories[(strategy, covariance_method)]
        image = axis.imshow(
            history.T.to_numpy(),
            aspect="auto",
            interpolation="nearest",
            cmap="viridis",
            vmin=0,
            vmax=0.25,
        )
        positions, labels = _heatmap_ticks(history.index)
        axis.set_xticks(positions)
        axis.set_xticklabels(labels, rotation=45, ha="right")
        axis.set_yticks(np.arange(len(history.columns)))
        axis.set_yticklabels(history.columns)
        method_title = "Sample Covariance" if covariance_method == "sample" else "Ledoit-Wolf"
        axis.set_title(method_title)
        axis.set_xlabel("Rebalance date")
        axis.set_ylabel("ETF")
    fig.suptitle(f"Rolling {display_names[strategy]} Weights", fontsize=16)
    colorbar = fig.colorbar(image, ax=axes, pad=0.02)
    colorbar.set_label("Portfolio weight")
    fig.savefig(
        FIGURES_DIRECTORY / file_names[strategy],
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def _create_effective_assets_plot(histories):
    """Plot the inverse Herfindahl effective number of assets over time."""
    strategy_labels = {
        "min_variance": "Min Variance",
        "max_sharpe": "Max Sharpe",
        "target_volatility": "Target Volatility",
    }
    fig, ax = plt.subplots(figsize=(13, 8), constrained_layout=True)
    for (strategy, covariance_method), history in histories.items():
        effective_assets = 1.0 / history.pow(2).sum(axis=1)
        method_label = "Sample" if covariance_method == "sample" else "Ledoit-Wolf"
        ax.plot(
            effective_assets.index,
            effective_assets,
            label=f"{strategy_labels[strategy]} — {method_label}",
            linewidth=1.7,
        )
    ax.set_title("Effective Number of Assets in Rolling Markowitz Portfolios")
    ax.set_xlabel("Rebalance date")
    ax.set_ylabel("Effective number of assets")
    ax.legend(ncol=2)
    fig.savefig(
        FIGURES_DIRECTORY / "effective_number_of_assets.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_markowitz_analysis():
    """Generate all requested 60-month rolling core Markowitz artifacts."""
    core_returns = pd.read_csv(
        CORE_RETURNS_PATH,
        index_col="date",
        parse_dates=["date"],
    )
    TABLES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    histories = {}
    summary_records = []
    solver_counts = {}
    failures = []

    for strategy, covariance_method, file_name in CONFIGURATIONS:
        print(f"Optimizing {strategy} with {covariance_method} covariance...")
        weight_history = generate_markowitz_weights(
            core_returns,
            window=60,
            strategy=strategy,
            covariance_method=covariance_method,
            rebalance_frequency="M",
        )
        weight_history.to_csv(
            TABLES_DIRECTORY / file_name,
            index_label="date",
            date_format="%Y-%m-%d",
        )
        histories[(strategy, covariance_method)] = weight_history
        summary_records.append(
            _summarize_weights(strategy, covariance_method, weight_history)
        )
        solver_counts[(strategy, covariance_method)] = weight_history.attrs.get(
            "solvers", {}
        )
        failures.extend(weight_history.attrs.get("optimization_failures", []))

    summary = pd.DataFrame.from_records(summary_records)
    summary.to_csv(TABLES_DIRECTORY / "markowitz_weight_summary.csv", index=False)
    plt.style.use("ggplot")
    for strategy in ["min_variance", "max_sharpe", "target_volatility"]:
        _create_strategy_heatmap(strategy, histories)
    _create_effective_assets_plot(histories)
    return {
        "histories": histories,
        "summary": summary,
        "solver_counts": solver_counts,
        "optimization_failures": failures,
    }


def main():
    """Run the rolling Markowitz artifact pipeline."""
    outputs = run_markowitz_analysis()
    print(
        f"Saved {len(outputs['histories'])} weight histories; "
        f"optimization failures: {len(outputs['optimization_failures'])}."
    )


if __name__ == "__main__":
    main()


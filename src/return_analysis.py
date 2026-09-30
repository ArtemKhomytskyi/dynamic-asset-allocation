"""Generate return datasets, descriptive summaries, matrices, and core plots."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from src.estimators import (
    compute_ledoit_wolf_covariance,
    compute_sample_covariance,
)
from src.returns import (
    annualize_return,
    annualize_volatility,
    compute_log_returns,
    compute_simple_returns,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"

UNIVERSES = {
    "core_23": PROCESSED_DIRECTORY / "prices_monthly_core_23.csv",
    "extended_27": PROCESSED_DIRECTORY / "prices_monthly_extended_27.csv",
}


def load_price_panel(path):
    """Load a complete processed monthly price panel."""
    prices = pd.read_csv(path, index_col="date", parse_dates=["date"])
    prices.index.name = "date"
    return prices


def build_return_summary(simple_returns):
    """Build ticker-level monthly return and annualized risk statistics."""
    summary = pd.DataFrame(
        {
            "ticker": simple_returns.columns,
            "annualized_geometric_return": annualize_return(simple_returns).to_numpy(),
            "annual_volatility": annualize_volatility(simple_returns).to_numpy(),
            "min_monthly_return": simple_returns.min().to_numpy(),
            "max_monthly_return": simple_returns.max().to_numpy(),
            "skewness": simple_returns.skew().to_numpy(),
            "kurtosis": simple_returns.kurt().to_numpy(),
            "n_observations": simple_returns.count().astype(int).to_numpy(),
        }
    )
    return summary


def _save_frame(frame, path, index_label):
    """Save a DataFrame with stable date or ticker indexing."""
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index_label=index_label, date_format="%Y-%m-%d")


def _create_core_plots(summary, correlation):
    """Create annual return, volatility, and correlation diagnostics."""
    FIGURES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    plt.style.use("ggplot")

    annual_returns = summary.sort_values("annualized_geometric_return")
    fig, ax = plt.subplots(figsize=(11, 9), constrained_layout=True)
    ax.barh(
        annual_returns["ticker"],
        annual_returns["annualized_geometric_return"] * 100,
    )
    ax.set_title("Annualized Geometric Return: Core ETF Universe")
    ax.set_xlabel("Annualized return (%)")
    ax.set_ylabel("ETF")
    fig.savefig(
        FIGURES_DIRECTORY / "annual_returns_core.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    annual_volatility = summary.sort_values("annual_volatility")
    fig, ax = plt.subplots(figsize=(11, 9), constrained_layout=True)
    ax.barh(
        annual_volatility["ticker"],
        annual_volatility["annual_volatility"] * 100,
    )
    ax.set_title("Annualized Volatility: Core ETF Universe")
    ax.set_xlabel("Annualized volatility (%)")
    ax.set_ylabel("ETF")
    fig.savefig(
        FIGURES_DIRECTORY / "annual_volatility_core.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(13, 11), constrained_layout=True)
    image = ax.imshow(
        correlation.to_numpy(),
        cmap="coolwarm",
        vmin=-1,
        vmax=1,
        interpolation="nearest",
    )
    positions = np.arange(len(correlation))
    ax.set_xticks(positions)
    ax.set_xticklabels(correlation.columns, rotation=90)
    ax.set_yticks(positions)
    ax.set_yticklabels(correlation.index)
    ax.set_title("Monthly Return Correlations: Core ETF Universe")
    colorbar = fig.colorbar(image, ax=ax, pad=0.02)
    colorbar.set_label("Correlation")
    fig.savefig(
        FIGURES_DIRECTORY / "correlation_heatmap_core.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)


def run_return_analysis():
    """Generate all requested return-engine datasets and diagnostics."""
    outputs = {}
    for universe_name, price_path in UNIVERSES.items():
        prices = load_price_panel(price_path)
        simple_returns = compute_simple_returns(prices)
        log_returns = compute_log_returns(prices)
        summary = build_return_summary(simple_returns)

        simple_path = PROCESSED_DIRECTORY / f"returns_simple_{universe_name}.csv"
        log_path = PROCESSED_DIRECTORY / f"returns_log_{universe_name}.csv"
        summary_path = TABLES_DIRECTORY / f"return_summary_{universe_name}.csv"
        _save_frame(simple_returns, simple_path, "date")
        _save_frame(log_returns, log_path, "date")
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary.to_csv(summary_path, index=False)
        outputs[universe_name] = {
            "prices": prices,
            "simple_returns": simple_returns,
            "log_returns": log_returns,
            "summary": summary,
        }

    core_returns = outputs["core_23"]["simple_returns"]
    sample_covariance = compute_sample_covariance(core_returns, annualize=True)
    ledoit_wolf_covariance = compute_ledoit_wolf_covariance(
        core_returns, annualize=True
    )
    correlation = core_returns.corr()
    correlation.index.name = "ticker"

    _save_frame(
        sample_covariance,
        TABLES_DIRECTORY / "covariance_sample_core.csv",
        "ticker",
    )
    _save_frame(
        ledoit_wolf_covariance,
        TABLES_DIRECTORY / "covariance_ledoitwolf_core.csv",
        "ticker",
    )
    _save_frame(
        correlation,
        TABLES_DIRECTORY / "correlation_matrix_core.csv",
        "ticker",
    )
    _create_core_plots(outputs["core_23"]["summary"], correlation)
    outputs["core_covariance_sample"] = sample_covariance
    outputs["core_covariance_ledoit_wolf"] = ledoit_wolf_covariance
    outputs["core_correlation"] = correlation

    extended_returns = outputs["extended_27"]["simple_returns"]
    extended_sample_covariance = compute_sample_covariance(
        extended_returns, annualize=True
    )
    extended_ledoit_wolf_covariance = compute_ledoit_wolf_covariance(
        extended_returns, annualize=True
    )
    extended_correlation = extended_returns.corr()
    extended_correlation.index.name = "ticker"
    _save_frame(
        extended_sample_covariance,
        TABLES_DIRECTORY / "covariance_sample_extended.csv",
        "ticker",
    )
    _save_frame(
        extended_ledoit_wolf_covariance,
        TABLES_DIRECTORY / "covariance_ledoitwolf_extended.csv",
        "ticker",
    )
    _save_frame(
        extended_correlation,
        TABLES_DIRECTORY / "correlation_matrix_extended.csv",
        "ticker",
    )
    outputs["extended_covariance_sample"] = extended_sample_covariance
    outputs["extended_covariance_ledoit_wolf"] = extended_ledoit_wolf_covariance
    outputs["extended_correlation"] = extended_correlation
    return outputs


def main():
    """Run the return-analysis artifact pipeline."""
    outputs = run_return_analysis()
    print(
        "Saved return matrices: "
        f"core {outputs['core_23']['simple_returns'].shape}, "
        f"extended {outputs['extended_27']['simple_returns'].shape}."
    )


if __name__ == "__main__":
    main()

"""Lightweight project entry point for the completed submission package."""

from pathlib import Path

from src.config import (
    MAIN_SAMPLE_START,
    SAMPLE_END,
)


PROJECT_ROOT = Path(__file__).resolve().parent
COMMON_EVALUATION_START = "2013-03-31"
COMMON_EVALUATION_END = "2026-05-31"
FINAL_STRATEGY_FAMILIES = (
    "Equal Weight",
    "60/40 Equity-Government Bond",
    "Minimum Variance",
    "Maximum Sharpe",
    "Target Volatility",
    "Michaud Resampling",
    "Hierarchical Risk Parity",
)
KEY_ARTIFACTS = {
    "primary report": (
        PROJECT_ROOT / "reports" / "FMA_Dynamic_Asset_Allocation_Report_v2.pdf"
    ),
    "final notebook": PROJECT_ROOT / "notebooks" / "06_final_results.ipynb",
    "HRP extension notebook": PROJECT_ROOT / "notebooks" / "07_hrp_extension.ipynb",
    "executive summary": PROJECT_ROOT / "docs" / "executive_summary.md",
    "final comparison table": (
        PROJECT_ROOT / "outputs" / "tables" / "final_strategy_comparison.csv"
    ),
}


def main():
    """Print a concise project summary without rerunning downloads or optimization."""
    print("Dynamic Asset Allocation: Markowitz, Michaud Resampling, and HRP")
    print(f"Core price sample: {MAIN_SAMPLE_START} to {SAMPLE_END}")
    print(f"Common final evaluation period: {COMMON_EVALUATION_START} to {COMMON_EVALUATION_END}")
    print("Final strategy families:")
    for strategy in FINAL_STRATEGY_FAMILIES:
        print(f"  - {strategy}")
    print("Key final artifacts:")
    for label, path in KEY_ARTIFACTS.items():
        status = "found" if path.exists() else "missing"
        print(f"  - {label}: {path.relative_to(PROJECT_ROOT)} ({status})")


if __name__ == "__main__":
    main()

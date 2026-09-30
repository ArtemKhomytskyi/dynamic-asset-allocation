"""Create complete monthly ETF price panels under the documented sample policy."""

from pathlib import Path

import pandas as pd

from src.config import (
    CORE_TICKERS,
    EXTENDED_SAMPLE_START,
    EXTENDED_TICKERS,
    EXTENDED_UNIVERSE_NAME,
    LATE_INCEPTION_TICKERS,
    MAIN_SAMPLE_START,
    MAIN_UNIVERSE_NAME,
    SAMPLE_END,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_MONTHLY_PRICES_PATH = PROJECT_ROOT / "data" / "raw" / "etf_prices_monthly.csv"
CORE_PANEL_PATH = (
    PROJECT_ROOT / "data" / "processed" / "prices_monthly_core_23.csv"
)
EXTENDED_PANEL_PATH = (
    PROJECT_ROOT / "data" / "processed" / "prices_monthly_extended_27.csv"
)
SUMMARY_PATH = PROJECT_ROOT / "outputs" / "tables" / "sample_policy_summary.csv"


def load_monthly_prices(path=RAW_MONTHLY_PRICES_PATH):
    """Load the unmodified raw monthly ETF price panel."""
    prices = pd.read_csv(path, index_col="date", parse_dates=["date"])
    prices.index.name = "date"
    if prices.index.has_duplicates:
        raise ValueError("Raw monthly prices contain duplicate dates.")
    if not prices.index.is_monotonic_increasing:
        raise ValueError("Raw monthly price dates are not monotonically increasing.")
    return prices


def get_core_tickers():
    """Return the 23 ETFs eligible for the main 2008 sample."""
    return CORE_TICKERS.copy()


def get_extended_tickers():
    """Return all 27 ETFs used in the extended robustness sample."""
    return EXTENDED_TICKERS.copy()


def validate_complete_panel(prices):
    """Validate completeness, chronology, and month-end dating without imputation."""
    if not isinstance(prices, pd.DataFrame):
        raise TypeError("The clean price panel must be a pandas DataFrame.")
    if prices.empty:
        raise ValueError("The clean price panel is empty.")
    if prices.columns.has_duplicates:
        raise ValueError("The clean price panel contains duplicate tickers.")
    if not isinstance(prices.index, pd.DatetimeIndex):
        raise TypeError("The clean price panel must use a DatetimeIndex.")
    if prices.index.has_duplicates:
        raise ValueError("The clean price panel contains duplicate dates.")
    if not prices.index.is_monotonic_increasing:
        raise ValueError("The clean price panel dates are not monotonic.")
    if not prices.index.is_month_end.all():
        raise ValueError("Every clean price-panel date must be a calendar month-end.")
    if prices.isna().any().any():
        missing = int(prices.isna().sum().sum())
        raise ValueError(
            f"The clean price panel contains {missing} missing values; "
            "no filling or silent ETF removal is permitted."
        )
    if prices.index.max() > pd.Timestamp(SAMPLE_END):
        raise ValueError(
            f"The clean panel ends after {SAMPLE_END} and may include June 2026."
        )
    return True


def create_clean_price_panel(
    tickers,
    start_date,
    end_date,
    monthly_prices=None,
):
    """Select an exact complete panel without filling, interpolation, or removal."""
    selected_tickers = list(tickers)
    if not selected_tickers:
        raise ValueError("At least one ticker must be requested.")
    if len(selected_tickers) != len(set(selected_tickers)):
        raise ValueError("Requested tickers must be unique.")

    prices = load_monthly_prices() if monthly_prices is None else monthly_prices.copy()
    missing_tickers = [ticker for ticker in selected_tickers if ticker not in prices]
    if missing_tickers:
        raise KeyError(
            "Requested tickers are absent from the raw monthly data: "
            + ", ".join(missing_tickers)
        )

    start = pd.Timestamp(start_date)
    end = pd.Timestamp(end_date)
    if not start.is_month_end or not end.is_month_end:
        raise ValueError("Sample start and end dates must be calendar month-ends.")
    if start > end:
        raise ValueError("Sample start date must not be after the end date.")
    if end > pd.Timestamp(SAMPLE_END):
        raise ValueError(f"Sample end must not be after {SAMPLE_END}.")

    panel = prices.loc[start:end, selected_tickers].copy()
    if panel.empty or panel.index.min() != start or panel.index.max() != end:
        raise ValueError(
            "The raw monthly data do not contain both requested sample boundaries."
        )
    if list(panel.columns) != selected_tickers:
        raise ValueError("The clean panel does not preserve the requested ticker order.")
    validate_complete_panel(panel)
    return panel


def _build_summary(core_panel, extended_panel):
    """Build the auditable sample-policy summary table."""
    return pd.DataFrame(
        [
            {
                "universe_name": MAIN_UNIVERSE_NAME,
                "n_tickers": len(core_panel.columns),
                "start_date": core_panel.index.min(),
                "end_date": core_panel.index.max(),
                "n_months": len(core_panel),
                "excluded_tickers": ";".join(LATE_INCEPTION_TICKERS),
                "reason": (
                    "Retains the 2008 crisis period while excluding ETFs "
                    "without January 2008 history."
                ),
            },
            {
                "universe_name": EXTENDED_UNIVERSE_NAME,
                "n_tickers": len(extended_panel.columns),
                "start_date": extended_panel.index.min(),
                "end_date": extended_panel.index.max(),
                "n_months": len(extended_panel),
                "excluded_tickers": "None",
                "reason": "Includes all configured ETFs from the first complete common month.",
            },
        ]
    )


def save_clean_panels():
    """Create and save both clean price panels and their policy summary."""
    raw_prices = load_monthly_prices()
    core_panel = create_clean_price_panel(
        get_core_tickers(),
        MAIN_SAMPLE_START,
        SAMPLE_END,
        raw_prices,
    )
    extended_panel = create_clean_price_panel(
        get_extended_tickers(),
        EXTENDED_SAMPLE_START,
        SAMPLE_END,
        raw_prices,
    )

    CORE_PANEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    core_panel.to_csv(CORE_PANEL_PATH, index_label="date", date_format="%Y-%m-%d")
    extended_panel.to_csv(
        EXTENDED_PANEL_PATH,
        index_label="date",
        date_format="%Y-%m-%d",
    )

    summary = _build_summary(core_panel, extended_panel)
    summary.to_csv(SUMMARY_PATH, index=False, date_format="%Y-%m-%d")
    return core_panel, extended_panel, summary


def main():
    """Generate the documented core and extended clean monthly price panels."""
    core_panel, extended_panel, _ = save_clean_panels()
    print(
        f"Saved {MAIN_UNIVERSE_NAME} panel {core_panel.shape} and "
        f"{EXTENDED_UNIVERSE_NAME} panel {extended_panel.shape}."
    )


if __name__ == "__main__":
    main()

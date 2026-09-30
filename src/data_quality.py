"""Reproducible ETF price acquisition and data-quality diagnostics."""

from pathlib import Path
import warnings

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yfinance as yf

from src.config import ALL_TICKERS


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DAILY_PRICES_PATH = PROJECT_ROOT / "data" / "raw" / "etf_prices_daily.csv"
MONTHLY_PRICES_PATH = PROJECT_ROOT / "data" / "raw" / "etf_prices_monthly.csv"
QUALITY_REPORT_PATH = PROJECT_ROOT / "outputs" / "tables" / "data_quality_report.csv"
MISSING_BY_YEAR_PATH = (
    PROJECT_ROOT / "outputs" / "tables" / "missing_values_by_year.csv"
)
AVAILABILITY_MATRIX_PATH = (
    PROJECT_ROOT / "outputs" / "tables" / "data_availability_matrix.csv"
)
FIGURES_DIRECTORY = PROJECT_ROOT / "outputs" / "figures"


def _extract_adjusted_close(downloaded, tickers):
    """Extract auto-adjusted close prices from a yfinance response."""
    if downloaded.empty:
        return pd.DataFrame(columns=tickers, dtype=float)

    if isinstance(downloaded.columns, pd.MultiIndex):
        if "Close" in downloaded.columns.get_level_values(0):
            prices = downloaded["Close"].copy()
        elif "Close" in downloaded.columns.get_level_values(1):
            prices = downloaded.xs("Close", axis=1, level=1).copy()
        else:
            raise ValueError("The yfinance response does not contain a Close field.")
    elif "Close" in downloaded.columns and len(tickers) == 1:
        prices = downloaded[["Close"]].rename(columns={"Close": tickers[0]})
    else:
        raise ValueError("The yfinance response has an unexpected column structure.")

    if isinstance(prices, pd.Series):
        prices = prices.to_frame(name=tickers[0])
    prices.columns = [str(column) for column in prices.columns]
    return prices


def _prepare_price_frame(prices, tickers):
    """Normalize dates and columns without filling or dropping observations."""
    prepared = prices.copy()
    prepared.index = pd.to_datetime(prepared.index).tz_localize(None)
    prepared.index.name = "date"
    prepared = prepared[~prepared.index.duplicated(keep="first")].sort_index()
    prepared = prepared.reindex(columns=tickers)
    return prepared.apply(pd.to_numeric, errors="coerce")


def _read_daily_prices(path=DAILY_PRICES_PATH):
    """Read the locally saved daily price panel."""
    return pd.read_csv(path, index_col="date", parse_dates=["date"])


def download_prices(
    tickers=None,
    start="2000-01-01",
    end=None,
    output_path=DAILY_PRICES_PATH,
    progress=True,
):
    """Download and save daily auto-adjusted close prices from Yahoo Finance."""
    selected_tickers = list(ALL_TICKERS if tickers is None else tickers)
    downloaded = yf.download(
        tickers=selected_tickers,
        start=start,
        end=end,
        auto_adjust=True,
        interval="1d",
        actions=False,
        progress=progress,
        threads=True,
        group_by="column",
    )
    prices = _extract_adjusted_close(downloaded, selected_tickers)
    prices = _prepare_price_frame(prices, selected_tickers)

    unavailable = [ticker for ticker in selected_tickers if prices[ticker].isna().all()]
    if unavailable:
        warnings.warn(
            "No observations were returned for: " + ", ".join(unavailable),
            stacklevel=2,
        )
    if prices.dropna(how="all").empty:
        raise RuntimeError("Yahoo Finance returned no usable ETF price observations.")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    prices.to_csv(output_path, index_label="date", date_format="%Y-%m-%d")
    return prices


def create_monthly_prices(
    daily_prices=None,
    output_path=MONTHLY_PRICES_PATH,
):
    """Resample daily prices to month-end without imputing missing observations."""
    prices = _read_daily_prices() if daily_prices is None else daily_prices.copy()
    prices.index = pd.to_datetime(prices.index)
    monthly_prices = prices.sort_index().resample("ME").last()
    monthly_prices.index.name = "date"

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    monthly_prices.to_csv(output_path, index_label="date", date_format="%Y-%m-%d")
    return monthly_prices


def build_quality_report(daily_prices=None, output_path=QUALITY_REPORT_PATH):
    """Build and save ticker-level data availability statistics."""
    prices = _read_daily_prices() if daily_prices is None else daily_prices.copy()
    total_rows = len(prices)
    records = []

    for ticker in prices.columns:
        series = prices[ticker]
        available = series.dropna()
        first_date = available.index.min() if not available.empty else pd.NaT
        last_date = available.index.max() if not available.empty else pd.NaT
        n_observations = int(series.notna().sum())
        n_missing = int(series.isna().sum())
        pct_missing = (100.0 * n_missing / total_rows) if total_rows else np.nan
        records.append(
            {
                "ticker": ticker,
                "first_date": first_date,
                "last_date": last_date,
                "n_observations": n_observations,
                "n_missing": n_missing,
                "pct_missing": round(pct_missing, 4),
                "inception_after_2008": bool(
                    pd.notna(first_date) and first_date > pd.Timestamp("2008-12-31")
                ),
            }
        )

    report = pd.DataFrame.from_records(records)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report.to_csv(output_path, index=False, date_format="%Y-%m-%d")
    return report


def build_missing_values_by_year(
    daily_prices=None,
    output_path=MISSING_BY_YEAR_PATH,
):
    """Count missing daily observations for each ETF in each calendar year."""
    prices = _read_daily_prices() if daily_prices is None else daily_prices.copy()
    missing_by_year = prices.isna().groupby(prices.index.year).sum().astype(int)
    missing_by_year.index.name = "year"

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    missing_by_year.to_csv(output_path, index_label="year")
    return missing_by_year


def build_availability_matrix(
    daily_prices=None,
    output_path=AVAILABILITY_MATRIX_PATH,
):
    """Build and save a daily binary matrix indicating observed ETF prices."""
    prices = _read_daily_prices() if daily_prices is None else daily_prices.copy()
    availability = prices.notna().astype("int8")
    availability.index.name = "date"

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    availability.to_csv(output_path, index_label="date", date_format="%Y-%m-%d")
    return availability


def create_quality_plots(
    daily_prices=None,
    quality_report=None,
    missing_by_year=None,
    figures_directory=FIGURES_DIRECTORY,
):
    """Create and save missingness, observation-count, and inception plots."""
    prices = _read_daily_prices() if daily_prices is None else daily_prices.copy()
    report = (
        build_quality_report(prices)
        if quality_report is None
        else quality_report.copy()
    )
    yearly_missing = (
        build_missing_values_by_year(prices)
        if missing_by_year is None
        else missing_by_year.copy()
    )
    figures_directory = Path(figures_directory)
    figures_directory.mkdir(parents=True, exist_ok=True)
    plt.style.use("ggplot")

    observations_by_year = prices.groupby(prices.index.year).size()
    yearly_missing_pct = yearly_missing.div(observations_by_year, axis=0) * 100.0
    heatmap_path = figures_directory / "missing_values_heatmap.png"
    fig, ax = plt.subplots(figsize=(15, 9), constrained_layout=True)
    image = ax.imshow(
        yearly_missing_pct.T,
        aspect="auto",
        interpolation="nearest",
        cmap="viridis",
        vmin=0,
        vmax=100,
    )
    ax.set_title("Missing Daily Price Observations by Year")
    ax.set_xlabel("Calendar year")
    ax.set_ylabel("ETF")
    ax.set_xticks(range(len(yearly_missing_pct.index)))
    ax.set_xticklabels(yearly_missing_pct.index, rotation=45, ha="right")
    ax.set_yticks(range(len(yearly_missing_pct.columns)))
    ax.set_yticklabels(yearly_missing_pct.columns)
    colorbar = fig.colorbar(image, ax=ax, pad=0.01)
    colorbar.set_label("Missing observations (%)")
    fig.savefig(heatmap_path, dpi=300, bbox_inches="tight")
    plt.close(fig)

    observations_path = figures_directory / "observations_per_etf.png"
    observation_report = report.sort_values("n_observations")
    fig, ax = plt.subplots(figsize=(11, 9), constrained_layout=True)
    ax.barh(observation_report["ticker"], observation_report["n_observations"])
    ax.set_title("Available Daily Price Observations per ETF")
    ax.set_xlabel("Number of observations")
    ax.set_ylabel("ETF")
    fig.savefig(observations_path, dpi=300, bbox_inches="tight")
    plt.close(fig)

    inception_path = figures_directory / "inception_dates.png"
    inception_report = report.dropna(subset=["first_date"]).copy()
    inception_report["first_date"] = pd.to_datetime(inception_report["first_date"])
    inception_report = inception_report.sort_values("first_date")
    y_positions = np.arange(len(inception_report))
    fig, ax = plt.subplots(figsize=(12, 9), constrained_layout=True)
    ax.scatter(inception_report["first_date"], y_positions, s=35, zorder=3)
    ax.hlines(
        y_positions,
        inception_report["first_date"].min(),
        inception_report["first_date"],
        linewidth=1,
        alpha=0.5,
    )
    ax.set_yticks(y_positions)
    ax.set_yticklabels(inception_report["ticker"])
    ax.set_title("First Available Daily Price by ETF")
    ax.set_xlabel("First available date")
    ax.set_ylabel("ETF")
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.autofmt_xdate()
    fig.savefig(inception_path, dpi=300, bbox_inches="tight")
    plt.close(fig)

    return {
        "missing_values_heatmap": heatmap_path,
        "observations_per_etf": observations_path,
        "inception_dates": inception_path,
    }


def main():
    """Run the complete download and data-quality reporting pipeline."""
    daily_prices = download_prices()
    create_monthly_prices(daily_prices)
    quality_report = build_quality_report(daily_prices)
    missing_by_year = build_missing_values_by_year(daily_prices)
    build_availability_matrix(daily_prices)
    create_quality_plots(daily_prices, quality_report, missing_by_year)
    print(
        f"Saved diagnostics for {len(daily_prices.columns)} ETFs and "
        f"{len(daily_prices):,} daily dates."
    )


if __name__ == "__main__":
    main()


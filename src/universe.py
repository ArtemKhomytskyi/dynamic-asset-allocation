"""Helpers for accessing the configured ETF universe and its local metadata."""

from pathlib import Path

import pandas as pd

from src.config import ALL_TICKERS, ETF_UNIVERSE


METADATA_PATH = Path(__file__).resolve().parents[1] / "data" / "external" / "etf_metadata.csv"


def get_all_tickers():
    """Return a copy of the complete configured ETF ticker list."""
    return ALL_TICKERS.copy()


def get_asset_classes():
    """Return the configured asset-class identifiers in their defined order."""
    return list(ETF_UNIVERSE)


def get_tickers_by_asset_class(asset_class):
    """Return tickers belonging to a configured asset class."""
    normalized_asset_class = asset_class.strip().lower().replace(" ", "_")
    if normalized_asset_class == "equity":
        normalized_asset_class = "equities"
    if normalized_asset_class not in ETF_UNIVERSE:
        available = ", ".join(ETF_UNIVERSE)
        raise ValueError(
            f"Unknown asset class '{asset_class}'. Available asset classes: {available}."
        )
    return ETF_UNIVERSE[normalized_asset_class].copy()


def get_metadata():
    """Load and return the local ETF metadata table."""
    return pd.read_csv(METADATA_PATH)

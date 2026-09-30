"""Consistency tests for the configured ETF investment universe."""

from src.config import ALL_TICKERS, ETF_UNIVERSE
from src.universe import get_metadata


def test_every_ticker_is_unique():
    """Verify that no ETF appears more than once in the universe."""
    assert len(ALL_TICKERS) == len(set(ALL_TICKERS))


def test_metadata_exists_for_every_ticker():
    """Verify complete and unique metadata coverage for configured ETFs."""
    metadata = get_metadata()

    assert not metadata["ticker"].duplicated().any()
    assert set(metadata["ticker"]) == set(ALL_TICKERS)
    assert metadata[["ticker", "asset_class", "region", "description"]].notna().all().all()


def test_all_tickers_contains_every_configured_etf():
    """Verify that the flattened list exactly matches the grouped universe."""
    grouped_tickers = [
        ticker for tickers in ETF_UNIVERSE.values() for ticker in tickers
    ]

    assert ALL_TICKERS == grouped_tickers


def test_every_asset_class_contains_an_etf():
    """Verify that every configured asset class is non-empty."""
    assert ETF_UNIVERSE
    assert all(tickers for tickers in ETF_UNIVERSE.values())


"""Tests for the declared core and extended monthly ETF sample policy."""

import pandas as pd
import pytest

from src.config import (
    EXTENDED_SAMPLE_START,
    LATE_INCEPTION_TICKERS,
    MAIN_SAMPLE_START,
    SAMPLE_END,
)
from src.sample_policy import (
    create_clean_price_panel,
    get_core_tickers,
    get_extended_tickers,
    load_monthly_prices,
    validate_complete_panel,
)


@pytest.fixture(scope="module")
def clean_panels():
    """Create both clean panels from the unchanged raw monthly file."""
    raw_prices = load_monthly_prices()
    core = create_clean_price_panel(
        get_core_tickers(), MAIN_SAMPLE_START, SAMPLE_END, raw_prices
    )
    extended = create_clean_price_panel(
        get_extended_tickers(), EXTENDED_SAMPLE_START, SAMPLE_END, raw_prices
    )
    return core, extended


def test_core_universe_has_23_etfs():
    """Verify the main-analysis universe size."""
    assert len(get_core_tickers()) == 23


def test_extended_universe_has_27_etfs():
    """Verify the extended robustness-universe size."""
    assert len(get_extended_tickers()) == 27


def test_late_inception_etfs_are_excluded_from_core():
    """Verify that all four late-inception ETFs are outside the core universe."""
    assert set(LATE_INCEPTION_TICKERS).isdisjoint(get_core_tickers())


def test_clean_panels_have_no_missing_values(clean_panels):
    """Verify completeness without filling or interpolation."""
    assert all(not panel.isna().any().any() for panel in clean_panels)
    assert all(validate_complete_panel(panel) for panel in clean_panels)


def test_clean_panels_have_monotonic_date_indexes(clean_panels):
    """Verify chronological and month-end indexing."""
    for panel in clean_panels:
        assert isinstance(panel.index, pd.DatetimeIndex)
        assert panel.index.is_monotonic_increasing
        assert panel.index.is_month_end.all()


def test_sample_end_is_not_after_may_2026(clean_panels):
    """Verify that the incomplete June 2026 month is excluded."""
    maximum_allowed_end = pd.Timestamp("2026-05-31")
    assert all(panel.index.max() <= maximum_allowed_end for panel in clean_panels)

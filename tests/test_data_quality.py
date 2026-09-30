"""Unit tests for ETF data-quality transformations using synthetic prices."""

import pandas as pd

from src.data_quality import (
    build_availability_matrix,
    build_quality_report,
    create_monthly_prices,
)


def _sample_prices():
    """Return a small price panel containing deliberate missing observations."""
    return pd.DataFrame(
        {
            "AAA": [100.0, 101.0, 102.0, 103.0],
            "BBB": [None, 50.0, None, 52.0],
        },
        index=pd.to_datetime(
            ["2008-01-30", "2008-01-31", "2008-02-28", "2009-01-02"]
        ),
    ).rename_axis("date")


def test_create_monthly_prices_uses_last_available_observation(tmp_path):
    """Verify month-end aggregation without cross-month filling."""
    monthly = create_monthly_prices(_sample_prices(), tmp_path / "monthly.csv")

    assert monthly.loc["2008-01-31", "AAA"] == 101.0
    assert monthly.loc["2008-02-29", "AAA"] == 102.0
    assert pd.isna(monthly.loc["2008-02-29", "BBB"])


def test_quality_report_counts_missing_values(tmp_path):
    """Verify observation counts and the post-2008 availability flag."""
    report = build_quality_report(_sample_prices(), tmp_path / "quality.csv")
    report = report.set_index("ticker")

    assert report.loc["AAA", "n_observations"] == 4
    assert report.loc["BBB", "n_missing"] == 2
    assert bool(report.loc["BBB", "inception_after_2008"]) is False


def test_availability_matrix_is_binary(tmp_path):
    """Verify that availability is encoded as one for present and zero for missing."""
    availability = build_availability_matrix(
        _sample_prices(), tmp_path / "availability.csv"
    )

    assert set(availability.to_numpy().ravel()) == {0, 1}
    assert availability.loc["2008-01-30", "BBB"] == 0
    assert availability.loc["2008-01-31", "BBB"] == 1


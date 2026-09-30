"""Tests for Herfindahl and effective-number-of-assets calculations."""

import numpy as np
import pandas as pd

from src.markowitz_diversification import compute_diversification_metrics


def test_equal_weights_have_expected_diversification_metrics():
    """Verify that four equal weights imply HHI 0.25 and four effective assets."""
    dates = pd.date_range("2020-01-31", periods=2, freq="ME")
    weights = pd.DataFrame(
        np.full((2, 4), 0.25),
        index=dates,
        columns=list("ABCD"),
    )
    metrics = compute_diversification_metrics(weights)

    np.testing.assert_allclose(metrics["herfindahl_index"], 0.25)
    np.testing.assert_allclose(metrics["effective_number_of_assets"], 4.0)


def test_concentrated_weights_have_one_effective_asset():
    """Verify the limiting one-asset concentration case."""
    weights = pd.DataFrame(
        [[1.0, 0.0, 0.0]],
        index=pd.to_datetime(["2020-01-31"]),
        columns=list("ABC"),
    )
    metrics = compute_diversification_metrics(weights)

    assert np.isclose(metrics["herfindahl_index"].iloc[0], 1.0)
    assert np.isclose(metrics["effective_number_of_assets"].iloc[0], 1.0)


def test_effective_assets_are_inverse_herfindahl():
    """Verify the defining inverse relationship for varying portfolios."""
    weights = pd.DataFrame(
        [[0.5, 0.3, 0.2], [0.7, 0.2, 0.1]],
        index=pd.date_range("2020-01-31", periods=2, freq="ME"),
        columns=list("ABC"),
    )
    metrics = compute_diversification_metrics(weights)

    np.testing.assert_allclose(
        metrics["effective_number_of_assets"],
        1.0 / metrics["herfindahl_index"],
    )


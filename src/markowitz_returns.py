"""Convert rolling Markowitz target weights into net next-period returns."""

from pathlib import Path

import numpy as np
import pandas as pd

from src.config import RISK_FREE_RATE, TRANSACTION_COST_BPS
from src.returns import annualize_return, annualize_volatility, validate_returns


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CORE_RETURNS_PATH = (
    PROJECT_ROOT / "data" / "processed" / "returns_simple_core_23.csv"
)
PROCESSED_DIRECTORY = PROJECT_ROOT / "data" / "processed"
TABLES_DIRECTORY = PROJECT_ROOT / "outputs" / "tables"

CONFIGURATIONS = [
    (
        "min_variance",
        "sample",
        "weights_min_variance_sample_60m.csv",
        "markowitz_returns_min_variance_sample_60m_core.csv",
        "markowitz_turnover_min_variance_sample_60m_core.csv",
    ),
    (
        "min_variance",
        "ledoit_wolf",
        "weights_min_variance_ledoit_60m.csv",
        "markowitz_returns_min_variance_ledoit_60m_core.csv",
        "markowitz_turnover_min_variance_ledoit_60m_core.csv",
    ),
    (
        "max_sharpe",
        "sample",
        "weights_max_sharpe_sample_60m.csv",
        "markowitz_returns_max_sharpe_sample_60m_core.csv",
        "markowitz_turnover_max_sharpe_sample_60m_core.csv",
    ),
    (
        "max_sharpe",
        "ledoit_wolf",
        "weights_max_sharpe_ledoit_60m.csv",
        "markowitz_returns_max_sharpe_ledoit_60m_core.csv",
        "markowitz_turnover_max_sharpe_ledoit_60m_core.csv",
    ),
    (
        "target_volatility",
        "sample",
        "weights_target_vol_sample_60m.csv",
        "markowitz_returns_target_vol_sample_60m_core.csv",
        "markowitz_turnover_target_vol_sample_60m_core.csv",
    ),
    (
        "target_volatility",
        "ledoit_wolf",
        "weights_target_vol_ledoit_60m.csv",
        "markowitz_returns_target_vol_ledoit_60m_core.csv",
        "markowitz_turnover_target_vol_ledoit_60m_core.csv",
    ),
]


def _validate_alignment(asset_returns, weight_history):
    """Validate complete monthly alignment and portfolio-weight constraints."""
    validate_returns(asset_returns)
    if not isinstance(asset_returns, pd.DataFrame):
        raise TypeError("asset_returns must be a pandas DataFrame.")
    if not isinstance(weight_history, pd.DataFrame):
        raise TypeError("weight_history must be a pandas DataFrame.")
    if len(weight_history) < 2:
        raise ValueError("At least two monthly weight rows are required.")
    if weight_history.isna().any().any() or not np.isfinite(
        weight_history.to_numpy(dtype=float)
    ).all():
        raise ValueError("Weight history must contain finite non-missing values.")
    if list(weight_history.columns) != list(asset_returns.columns):
        raise ValueError("Weight-history columns must match asset returns exactly.")
    if weight_history.index.has_duplicates or not weight_history.index.is_monotonic_increasing:
        raise ValueError("Weight dates must be unique and monotonically increasing.")
    if not np.allclose(weight_history.sum(axis=1), 1.0, atol=1e-8):
        raise ValueError("Every weight-history row must sum to one.")
    if (weight_history.to_numpy() < -1e-8).any():
        raise ValueError("Weight history must be long-only.")

    positions = asset_returns.index.get_indexer(weight_history.index)
    if (positions < 0).any():
        raise ValueError("Every weight date must exist in the asset return matrix.")
    if not np.all(np.diff(positions) == 1):
        raise ValueError("Weight dates must be consecutive monthly return dates.")
    return True


def compute_markowitz_realized_returns(
    asset_returns,
    weight_history,
    transaction_cost_bps=TRANSACTION_COST_BPS,
):
    """Compute next-period gross/net returns and drift-aware one-way turnover."""
    _validate_alignment(asset_returns, weight_history)
    if transaction_cost_bps < 0:
        raise ValueError("transaction_cost_bps must be non-negative.")

    signal_weights = weight_history.iloc[:-1]
    signal_dates = signal_weights.index
    realized_dates = weight_history.index[1:]
    realized_asset_returns = asset_returns.loc[realized_dates]
    if (realized_asset_returns.to_numpy() <= -1.0).any():
        raise ValueError("Asset returns at or below -100% cannot update drifted weights.")

    gross_returns = np.sum(
        signal_weights.to_numpy() * realized_asset_returns.to_numpy(), axis=1
    )
    turnover_values = np.zeros(len(signal_weights), dtype=float)
    for position in range(1, len(signal_weights)):
        previous_target = weight_history.iloc[position - 1]
        intervening_returns = asset_returns.loc[weight_history.index[position]]
        previous_gross_return = float(previous_target @ intervening_returns)
        if previous_gross_return <= -1.0:
            raise ValueError("A portfolio loss at or below -100% prevents drift updates.")
        drifted_weights = previous_target * (1.0 + intervening_returns)
        drifted_weights = drifted_weights / (1.0 + previous_gross_return)
        current_target = weight_history.iloc[position]
        turnover_values[position] = float(
            0.5 * np.abs(current_target - drifted_weights).sum()
        )

    transaction_costs = turnover_values * float(transaction_cost_bps) / 10_000.0
    net_returns = gross_returns - transaction_costs
    diagnostics = pd.DataFrame(
        {
            "weight_date": signal_dates,
            "gross_return": gross_returns,
            "turnover": turnover_values,
            "transaction_cost": transaction_costs,
            "portfolio_return": net_returns,
        },
        index=realized_dates,
    )
    diagnostics.index.name = "date"
    if diagnostics.isna().any().any() or not np.isfinite(
        diagnostics.drop(columns="weight_date").to_numpy(dtype=float)
    ).all():
        raise RuntimeError("Realized Markowitz diagnostics contain invalid values.")
    if (diagnostics["turnover"] < -1e-12).any():
        raise RuntimeError("Turnover must be non-negative.")
    if (
        diagnostics["portfolio_return"]
        > diagnostics["gross_return"] + 1e-12
    ).any():
        raise RuntimeError("Transaction costs increased a portfolio return.")
    return diagnostics


def _maximum_drawdown(returns):
    """Calculate maximum drawdown relative to initial wealth and later peaks."""
    wealth = (1.0 + returns).cumprod()
    running_peak = wealth.cummax().clip(lower=1.0)
    return float((wealth / running_peak - 1.0).min())


def _summary_row(strategy, covariance_method, diagnostics):
    """Build one realized Markowitz performance and turnover summary row."""
    net_returns = diagnostics["portfolio_return"]
    volatility = float(annualize_volatility(net_returns))
    annualized_arithmetic_return = float(net_returns.mean() * 12)
    modeled_turnover = diagnostics["turnover"].iloc[1:]
    average_turnover = float(modeled_turnover.mean())
    return {
        "strategy": strategy,
        "covariance_method": covariance_method,
        "start_date": net_returns.index.min(),
        "end_date": net_returns.index.max(),
        "n_months": len(net_returns),
        "annualized_geometric_return": float(annualize_return(net_returns)),
        "annualized_volatility": volatility,
        "sharpe_ratio": (
            (annualized_arithmetic_return - RISK_FREE_RATE) / volatility
            if volatility > 0
            else np.nan
        ),
        "max_drawdown": _maximum_drawdown(net_returns),
        "average_monthly_turnover": average_turnover,
        "annualized_turnover": average_turnover * 12,
    }


def run_markowitz_return_analysis():
    """Generate all realized Markowitz return, turnover, and summary artifacts."""
    asset_returns = pd.read_csv(
        CORE_RETURNS_PATH,
        index_col="date",
        parse_dates=["date"],
    )
    PROCESSED_DIRECTORY.mkdir(parents=True, exist_ok=True)
    TABLES_DIRECTORY.mkdir(parents=True, exist_ok=True)
    summary_records = []
    outputs = {}

    for (
        strategy,
        covariance_method,
        weight_file,
        return_file,
        turnover_file,
    ) in CONFIGURATIONS:
        weight_history = pd.read_csv(
            TABLES_DIRECTORY / weight_file,
            index_col="date",
            parse_dates=["date"],
        )
        diagnostics = compute_markowitz_realized_returns(
            asset_returns,
            weight_history,
            transaction_cost_bps=TRANSACTION_COST_BPS,
        )
        diagnostics[["portfolio_return"]].to_csv(
            PROCESSED_DIRECTORY / return_file,
            index_label="date",
            date_format="%Y-%m-%d",
        )
        diagnostics[["turnover"]].to_csv(
            TABLES_DIRECTORY / turnover_file,
            index_label="date",
            date_format="%Y-%m-%d",
        )
        summary_records.append(
            _summary_row(strategy, covariance_method, diagnostics)
        )
        outputs[(strategy, covariance_method)] = diagnostics

    summary = pd.DataFrame.from_records(summary_records)
    summary.to_csv(
        TABLES_DIRECTORY / "markowitz_return_summary.csv",
        index=False,
        date_format="%Y-%m-%d",
    )
    outputs["summary"] = summary
    return outputs


def main():
    """Run the realized Markowitz return artifact pipeline."""
    outputs = run_markowitz_return_analysis()
    print(f"Saved {len(outputs['summary'])} realized Markowitz strategy rows.")


if __name__ == "__main__":
    main()


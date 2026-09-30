# Dynamic Asset Allocation

**Financial Markets Analytics final project — Variant B — Dynamic Asset Allocation**

This completed university project evaluates whether dynamic, optimization-based multi-asset portfolios improve realized out-of-sample performance relative to transparent allocation benchmarks. The analysis compares classical Markowitz portfolios, Michaud-style resampling, and Hierarchical Risk Parity (HRP) with Equal Weight and 60/40 benchmarks under a common investment universe, evaluation period, rebalancing schedule, and transaction-cost convention.

The primary academic report is [`reports/FMA_Dynamic_Asset_Allocation_Report_v2.pdf`](reports/FMA_Dynamic_Asset_Allocation_Report_v2.pdf). An editable companion is provided at [`reports/FMA_Dynamic_Asset_Allocation_Report_v2.docx`](reports/FMA_Dynamic_Asset_Allocation_Report_v2.docx).

## Research objective

The central research question is whether portfolio construction methods that explicitly model risk and expected return deliver better realized risk-adjusted outcomes than simple, non-optimized rules once estimation uncertainty, turnover, and implementation costs are considered. The project covers the course requirements through:

- classical Markowitz mean-variance optimization;
- a Michaud Resampled Efficient Frontier implementation;
- Equal Weight (1/N) and 60/40 benchmark portfolios;
- monthly walk-forward, out-of-sample rebalancing;
- a multi-asset ETF universe;
- transaction costs and drift-aware turnover;
- performance, drawdown, concentration, and diversification diagnostics;
- reproducible tables, figures, notebooks, and tests.

## Data and investment universe

Adjusted ETF prices were obtained from Yahoo Finance through `yfinance`. The configured universe contains 27 ETFs spanning equities, government bonds, credit, commodities, real estate, and cash. ETFs provide diversified, liquid, and economically interpretable exposures, allowing the study to focus on asset allocation rather than security selection.

Four funds — IGOV, VGSH, VNQI, and BKLN — have structural pre-inception gaps after the beginning of 2008. The main analysis therefore uses a fixed 23-ETF core universe from January 2008, retaining the Global Financial Crisis while avoiding backfilled or synthetic observations. A complete 27-ETF panel beginning in March 2011 is retained as a descriptive data-policy robustness sample; it is not presented as a full optimized-strategy robustness backtest.

No price is interpolated, backfilled, or synthetically created. The price panels end on 31 May 2026 so that the incomplete June 2026 observation is excluded.

## Strategies

The final comparison contains 12 strategies:

1. Equal Weight;
2. 60/40 Equity–Government Bond;
3. Minimum Variance — sample covariance;
4. Minimum Variance — Ledoit-Wolf covariance;
5. Maximum Sharpe — sample covariance;
6. Maximum Sharpe — Ledoit-Wolf covariance;
7. Target Volatility — sample covariance;
8. Target Volatility — Ledoit-Wolf covariance;
9. Michaud 100;
10. Michaud 250;
11. Michaud 500;
12. Hierarchical Risk Parity.

Equal Weight assigns 1/23 to each core ETF. The 60/40 benchmark assigns 60% equally across equity ETFs and 40% equally across government-bond ETFs; all other sleeves receive zero weight. Neither benchmark uses forecasts or optimization.

## Methodology and design choices

All final comparisons use the same 23-ETF core universe, the same monthly rebalance dates, and the common evaluation period from **31 March 2013 to 31 May 2026**. Core monthly returns begin in February 2008. A 60-month trailing estimation window first becomes available at the February 2013 decision date, and the project’s conservative one-month implementation lag applies those weights to the March 2013 realized return. This timing convention explains the common comparison start and prevents contemporaneous information leakage.

The main assumptions are:

- monthly rebalancing;
- a 60-month rolling estimation window ending at `t-1`;
- weights applied to the next realized month;
- long-only, fully invested, unleveraged optimized portfolios;
- 0% minimum and 25% maximum ETF weights;
- 5 basis points of one-way transaction costs applied to drift-aware turnover;
- a constant 2% annual risk-free rate;
- a 10% annual volatility ceiling for Target Volatility;
- sample and Ledoit-Wolf covariance estimators;
- 100, 250, and 500 nested Michaud resamples;
- a fixed random seed for reproducible resampling.

### Why a 60-month window?

Five years of monthly observations provides a defensible balance between statistical stability and responsiveness. A shorter window would react faster but amplify estimation noise, especially with 23 assets; a substantially longer window would provide more observations at the cost of slower adaptation to changing correlations and volatility regimes.

### Why Ledoit-Wolf covariance?

The sample covariance matrix can be poorly conditioned when the cross-section is large relative to the estimation history. Ledoit-Wolf shrinkage forms a weighted combination of the sample covariance matrix and a structured target. Accepting a small amount of bias reduces estimation variance, improves matrix conditioning, and can make optimized allocations less sensitive to sampling error. The project reports both sample and shrinkage-based specifications rather than treating shrinkage as an unquestioned improvement.

### Why a 10% target volatility?

The 10% annual ceiling represents a moderate, institutionally interpretable risk budget between cash-like and equity-like volatility. It was fixed as a design parameter rather than selected ex post to maximize performance, allowing the Target Volatility portfolios to be evaluated on the same basis as the other strategies.

### Why include HRP?

HRP provides a modern robustness extension that uses hierarchical clustering and recursive allocation without directly inverting the covariance matrix. It tests whether organizing assets by their dependence structure can reduce the instability associated with classical mean-variance optimization. In the realized sample, unconstrained HRP concentrated heavily in BIL; this is treated as an empirical finding about a cash-inclusive universe, not as evidence of a coding failure.

## Performance conventions and findings

The final table reports annualized geometric return. Sharpe and Sortino ratios use the annualized arithmetic mean of monthly excess returns, so they cannot be reconstructed directly from the geometric-return column. Initial portfolio establishment is excluded from average turnover; subsequent turnover is measured against drifted pre-rebalance weights.

The principal empirical findings are:

- Maximum Sharpe with Ledoit-Wolf covariance achieved the highest Sharpe ratio;
- Target Volatility with Ledoit-Wolf covariance achieved the highest terminal wealth and the strongest Calmar ratio among meaningful risk-bearing strategies;
- Michaud 500 accepted a small Sharpe reduction relative to Maximum Sharpe Ledoit-Wolf while improving turnover and effective diversification;
- Equal Weight had the highest effective number of assets by construction;
- HRP produced the lowest turnover and drawdown but also the weakest Sharpe ratio and lowest effective diversification because it concentrated overwhelmingly in BIL.

These rankings describe one realized market path. Small differences should not be interpreted as proof of structural dominance.

## Repository structure

```text
fma_dynamic_asset_allocation/
├── data/
│   ├── external/                 # ETF metadata
│   ├── raw/                      # frozen daily and monthly adjusted prices
│   └── processed/                # clean panels, returns, and strategy series
├── docs/
│   ├── benchmarks.md
│   ├── executive_summary.md
│   ├── references.md
│   ├── sample_policy.md
│   └── universe.md
├── notebooks/
│   ├── 02_data_inspection.ipynb
│   ├── 03_returns_analysis.ipynb
│   ├── 04_markowitz_optimization.ipynb
│   ├── 05_michaud_resampling.ipynb
│   ├── 06_final_results.ipynb
│   └── 07_hrp_extension.ipynb
├── outputs/
│   ├── figures/                  # final and diagnostic PNG figures
│   └── tables/                   # final and intermediate CSV tables
├── reports/
│   ├── FMA_Dynamic_Asset_Allocation_Report_v2.docx
│   └── FMA_Dynamic_Asset_Allocation_Report_v2.pdf
├── src/                          # data, estimation, allocation, and reporting modules
├── tests/                        # unit and integration tests
├── .gitignore
├── main.py
├── README.md
└── requirements.txt
```

The headline numerical artifact is [`outputs/tables/final_strategy_comparison.csv`](outputs/tables/final_strategy_comparison.csv). The final-results and HRP notebooks are [`notebooks/06_final_results.ipynb`](notebooks/06_final_results.ipynb) and [`notebooks/07_hrp_extension.ipynb`](notebooks/07_hrp_extension.ipynb). Supporting methodology is documented in [`docs/`](docs/), and full bibliographic entries appear in [`docs/references.md`](docs/references.md).

## Running and reviewing the project

Create an isolated environment and install the pinned dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
```

Inspect the submission and run the automated checks without rebuilding saved results:

```powershell
.\.venv\Scripts\python main.py
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\jupyter lab
```

The repository already includes the frozen raw data, processed panels, saved weights, realized returns, tables, figures, and executed notebook outputs used in the report. A live data refresh is deliberately separate: running `python -m src.data_quality` requests current Yahoo Finance histories and may produce small revisions to adjusted prices. It is therefore unnecessary for normal review of the submitted results.


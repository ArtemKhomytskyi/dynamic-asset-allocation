"""Central configuration for data, portfolio constraints, and experiments."""

START_DATE = "2008-01-01"
END_DATE = None
REBALANCE_FREQUENCY = "M"
REBALANCE_DAY = "month_end"
ESTIMATION_WINDOW_MONTHS = 60
RISK_FREE_RATE = 0.02
TARGET_VOLATILITY = 0.10
MAX_WEIGHT = 0.25
MIN_WEIGHT = 0.0
TRANSACTION_COST_BPS = 5
COVARIANCE_ESTIMATOR = "ledoit_wolf"
N_RESAMPLES = 500
RANDOM_SEED = 42

OPTIMIZATION_METHODS = [
    "min_variance",
    "max_sharpe",
    "michaud_resampled",
    "equal_weight",
    "sixty_forty",
]

ETF_UNIVERSE = {
    "equities": [
        "SPY",
        "QQQ",
        "IWM",
        "MDY",
        "EFA",
        "EEM",
        "VGK",
        "EWJ",
        "VPL",
    ],
    "government_bonds": ["SHY", "VGSH", "IEF", "TLT", "TIP", "BWX", "IGOV"],
    "credit": ["LQD", "HYG", "EMB", "BKLN"],
    "commodities": ["GLD", "DBC", "GSG"],
    "real_estate": ["VNQ", "RWX", "VNQI"],
    "cash": ["BIL"],
}

ALL_TICKERS = [ticker for tickers in ETF_UNIVERSE.values() for ticker in tickers]

LATE_INCEPTION_TICKERS = ["IGOV", "VGSH", "VNQI", "BKLN"]
CORE_TICKERS = [
    ticker for ticker in ALL_TICKERS if ticker not in LATE_INCEPTION_TICKERS
]
EXTENDED_TICKERS = ALL_TICKERS.copy()

MAIN_SAMPLE_START = "2008-01-31"
EXTENDED_SAMPLE_START = "2011-03-31"
SAMPLE_END = "2026-05-31"

MAIN_UNIVERSE_NAME = "core_23"
EXTENDED_UNIVERSE_NAME = "extended_27"

/**
 * Editable source for the detailed Financial Markets Analytics oral defense.
 *
 * The deck reads only frozen CSV and PNG artifacts already stored in the
 * repository. It does not download data, rerun optimization, modify notebooks,
 * or overwrite any numerical project output.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SOURCE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.FMA_PROJECT_ROOT || path.resolve(SOURCE_DIR, "..");
const FIGURES = path.join(PROJECT_ROOT, "outputs", "figures");
const TABLES = path.join(PROJECT_ROOT, "outputs", "tables");
const PROCESSED = path.join(PROJECT_ROOT, "data", "processed");
const OUTPUT_DIR = process.env.PRESENTATION_OUTPUT_DIR || SOURCE_DIR;
const QA_DIR = process.env.PRESENTATION_QA_DIR || path.join(
  os.tmpdir(),
  "fma-dynamic-allocation-detailed-presentation-qa",
);
const PPTX_PATH = path.join(
  OUTPUT_DIR,
  "FMA_Dynamic_Asset_Allocation_Oral_Presentation_Detailed.pptx",
);

const W = 1280;
const H = 720;
const FONT = "Aptos";
const C = {
  navy: "#0B1F33",
  blue: "#2E6E9E",
  teal: "#078C8C",
  gold: "#D6A84B",
  coral: "#D95D39",
  purple: "#7567A8",
  green: "#6E9467",
  ink: "#172635",
  muted: "#5B6B78",
  warm: "#F7F5F0",
  paper: "#FFFFFF",
  line: "#D7DFE5",
  paleBlue: "#E7F0F6",
  paleTeal: "#E1F2F0",
  paleGold: "#F6EDD8",
  paleCoral: "#F8E6E0",
  palePurple: "#EEEAF7",
  paleGray: "#EDF1F3",
};

function note(title, main, question, answer) {
  return { title, main, question, answer };
}

const NOTES = [
  note(
    "Dynamic Asset Allocation",
    "Good morning. I am Artem Khomytskyi, and this is my Financial Markets Analytics project for Variant B: Dynamic Asset Allocation. The project compares classical Markowitz portfolios, Ledoit-Wolf covariance shrinkage, Michaud resampling, and Hierarchical Risk Parity. I will emphasize the decisions behind the experiment, the walk-forward timing, and the practical meaning of the results. The central message is that sophisticated methods can add value, but only when the universe, sample, constraints, costs, and information timing are controlled consistently.",
    "What is the single contribution of the project?",
    "A controlled out-of-sample comparison that separates optimizer choice from estimation, implementation, and sample-design effects.",
  ),
  note(
    "The assignment required dynamic allocation and out-of-sample evidence",
    "Variant B required a dynamic multi-asset allocation study rather than a static in-sample optimization. Classical Markowitz, Michaud-style resampling, periodic out-of-sample rebalancing, benchmarks, graphs, and risk metrics were the required core. I added Ledoit-Wolf shrinkage, Target Volatility, HRP, and detailed turnover and concentration diagnostics. These additions do not replace the assignment requirements; they help explain why the required methods behave differently once estimation and implementation are taken seriously.",
    "Which parts were required and which were original?",
    "Markowitz, Michaud, and the dynamic out-of-sample comparison were required. Ledoit-Wolf, Target Volatility, HRP, and expanded implementation diagnostics were additions.",
  ),
  note(
    "Sophistication must beat transparent rules after costs",
    "The research question is practical: can optimized portfolios improve realized risk-adjusted performance after estimation error, turnover, and transaction costs? I break the question into five tests. Does Markowitz beat Equal Weight and 60/40? Does Ledoit-Wolf stabilize the covariance input? Does Michaud moderate instability? Does HRP provide a structurally different robust alternative? And do any improvements survive the same cost convention? This framing prevents a model from being judged only by an attractive in-sample frontier.",
    "Why not ask only which strategy has the highest return?",
    "Because return alone ignores volatility, drawdown, trading intensity, concentration, and model dependence.",
  ),
  note(
    "One controlled pipeline separates model choice from sample choice",
    "The project follows one fixed chain: data acquisition, explicit sample policy, monthly returns, rolling estimation, allocation, next-month implementation, transaction costs, and common-period evaluation. Required methods and extensions enter at the strategy stage, while every other stage remains identical. This structure is important because unequal dates, assets, or costs could create a ranking that reflects sample selection rather than portfolio design. The pipeline is therefore part of the research contribution, not just software organization.",
    "What is the most important control in the pipeline?",
    "Every final strategy uses the same 23 ETFs, the same 159 realized months, the same next-month timing, and the same 5-bps cost convention.",
  ),
  note(
    "ETFs keep the experiment about allocation, not stock selection",
    "The assignment concerns allocation across economic sources of risk and return. Individual stocks would introduce firm-specific events, stock-selection skill, and harder economic interpretation. ETFs instead provide diversified market exposures, reduce idiosyncratic noise, and let each weight represent an understandable asset-class role. They are also liquid, reproducible instruments. This makes the covariance structure genuinely multi-asset and keeps the comparison aligned with Variant B rather than turning it into an equity-selection exercise.",
    "Why not use the supplied stock datasets?",
    "They are appropriate for equity selection, but they do not provide the cross-asset opportunity set required for flexible multi-asset allocation.",
  ),
  note(
    "The initial 27-ETF universe was broad but still interpretable",
    "The configured universe contains 27 ETFs across six asset classes, which lies within the assignment's recommended range of 15 to 30 instruments. The design deliberately includes several growth exposures, multiple government-bond durations, credit risk, inflation-sensitive assets, listed real estate, and cash. Breadth gives the optimizer meaningful cross-sectional choice, while 27 instruments remain manageable enough to document and interpret. The universe was fixed before strategy comparison rather than selected from ex-post winners.",
    "Why exactly 27 ETFs?",
    "It provided regional and asset-class breadth without making the economic role of each instrument opaque or the optimization unnecessarily large.",
  ),
  note(
    "Each ticker has a distinct economic role",
    "The ticker list was chosen for coverage rather than historical performance ranking. US and international equity ETFs capture size, style, and geography. Government bonds span short, intermediate, long, inflation-linked, and international duration. Credit ETFs distinguish investment-grade, high-yield, emerging-market, and bank-loan risk. Gold, broad commodities, listed real estate, and BIL add inflation, real-asset, and cash-like exposures. Liquidity, data availability, and interpretability were considered together.",
    "Were the ETFs selected because they performed well?",
    "No. Selection was based on economic function, liquidity, history, and interpretability, not an ex-post return ranking.",
  ),
  note(
    "The research universe stayed at 27; the core experiment used 23",
    "Four ETFs - IGOV, VGSH, VNQI, and BKLN - did not have January 2008 history. They were not erased from the research universe. They were excluded only from the main fixed-universe experiment so the core panel could begin in 2008 without synthetic prices. The resulting core panel has 23 ETFs. A separate extended descriptive panel retains all 27 ETFs from March 2011. The final optimized comparison is explicitly the 23-ETF core experiment.",
    "Why not backfill the four late-inception ETFs?",
    "Backfilling would manufacture investable history and contaminate the out-of-sample design with data that did not exist.",
  ),
  note(
    "Preserving 2008 adds a severe stress regime to the evidence",
    "Starting the main panel in 2008 preserves the Global Financial Crisis, one of the most important cross-asset stress episodes in the sample. A 2011 start would increase breadth but remove that regime. The core sample then spans recovery, the low-rate period, the COVID shock, inflation, and rapid monetary tightening. This is a pre-specified sample-design decision, not an automatic deletion rule and not a choice made after seeing strategy performance.",
    "Does excluding four ETFs create bias?",
    "It creates a narrower opportunity set, but it avoids synthetic history and is applied identically to every final strategy. The limitation is disclosed.",
  ),
  note(
    "Adjusted prices support reproducible ETF total-return approximations",
    "The project downloads daily adjusted ETF price histories from Yahoo Finance through yfinance. Adjusted prices incorporate splits and distributions, so percentage changes approximate pre-tax total returns. Daily observations are converted to calendar month-end prices, and the downloaded files are frozen in the repository for reproducibility. Yahoo Finance is accessible and appropriate for an academic project, but it is not equivalent to Bloomberg, FactSet, or an institutional total-return database. A future live download could differ if the provider revises history.",
    "Why use adjusted rather than raw close prices?",
    "Adjusted prices incorporate distributions and corporate actions, which are necessary for meaningful return measurement.",
  ),
  note(
    "Structural pre-inception gaps were never treated as zero returns",
    "The missingness heatmap shows blocks of unavailable history before ETF inception, not random gaps within each fund's observed lifetime. The cleaning policy therefore forbids interpolation, backfilling, synthetic prices, and zero-return substitution. A pre-inception missing price means the ETF did not yet provide an observable investable history. The incomplete June 2026 observation was also removed, leaving May 2026 as the clean sample end. These rules protect the economic meaning of the return panel.",
    "Were any ETFs silently removed during cleaning?",
    "No. The four core exclusions are explicit in the sample policy, and complete panels must pass a zero-missing-value validation.",
  ),
  note(
    "Simple monthly returns drive portfolio wealth",
    "Monthly simple returns are calculated from consecutive month-end adjusted prices as current price divided by prior price minus one. Simple returns are used because a portfolio return is the weighted sum of constituent simple returns. Log returns were retained for diagnostics, but they do not drive final portfolio wealth. Reported annualized return is geometric, which reflects compounding. The Sharpe ratio instead uses the annualized arithmetic mean of monthly excess returns, so it cannot be reconstructed directly from the geometric-return column.",
    "Why report geometric return but use arithmetic return in Sharpe?",
    "Geometric return describes compounded investor wealth; Sharpe is conventionally based on mean excess return divided by volatility.",
  ),
  note(
    "Monthly data balance responsiveness with implementability",
    "Daily optimization would add noise, unstable covariance estimates, and excessive trading without matching the policy-allocation purpose. Annual data would provide too few observations and adapt too slowly. Monthly frequency matches the assignment, supplies a workable estimation history, and represents a practical institutional rebalancing cadence. It also aligns the return measurement, estimation window, decision calendar, and transaction-cost calculation in one coherent time scale.",
    "Why not rebalance quarterly to reduce turnover?",
    "Quarterly rebalancing is a useful robustness test, but it answers a different design question and was not used for the frozen final comparison.",
  ),
  note(
    "A 60-month window balances estimation noise and regime adaptation",
    "Twelve monthly observations are far too few for stable expected returns and a 23-asset covariance matrix. A 120-month window would improve stability but react slowly and postpone the first out-of-sample result. Sixty months provides five years of history, enough observations for a usable risk estimate while retaining some response to changing regimes. It is a transparent project-specific compromise, not a claim that five years is universally optimal.",
    "Was the 60-month window selected because it produced the best result?",
    "No. It was fixed as a methodological compromise before interpreting the final strategy ranking.",
  ),
  note(
    "The realized return never enters its own estimation window",
    "At a decision date t, the model uses monthly returns from t minus 60 through t minus 1. It estimates expected returns and covariance, calculates target weights at t, and applies those weights to the realized return at t plus 1. This is a conservative one-month implementation lag. The key point is causal ordering: the return earned after the decision is absent from the information set that created the decision.",
    "How do you know the backtest avoids look-ahead bias?",
    "The estimation helper explicitly ends before the weight date, and tests verify that future observations do not alter contemporaneous weights.",
  ),
  note(
    "The first common realized month is March 2013",
    "Core prices begin at the end of January 2008, so the first monthly return is February 2008. Sixty complete monthly returns are required before a decision can be formed. The first saved weights are therefore estimated at the end of February 2013, and the one-month implementation lag produces the first realized portfolio return in March 2013. The comparison ends in May 2026, giving 159 identical realized months for every final strategy.",
    "Why not report performance from February 2013?",
    "February is the first decision date after 60 observations; March is the first month in which those weights earn a realized return.",
  ),
  note(
    "Turnover is measured from drifted holdings to the new target",
    "Portfolio weights move during each holding month because assets earn different returns. At the next rebalance, the strategy trades from those drifted holdings to the newly calculated target. Turnover is therefore not simply the difference between two target vectors. The small example shows that only required changes are traded. This drift-aware convention makes the cost estimate and implementation burden more realistic than assuming the portfolio magically remains at its prior target.",
    "Is turnover one-way or two-way?",
    "It is one-way turnover: one half of the absolute weight changes from drifted holdings to the new target.",
  ),
  note(
    "Five basis points are charged only on the traded fraction",
    "The one-way transaction-cost rate is 5 basis points, or 0.05 percent. It is multiplied by the fraction of portfolio wealth traded at the rebalance. If one-way turnover is 10 percent, the cost is 10 percent times 0.05 percent, equal to 0.005 percent of portfolio value. The full portfolio is not charged every month. Initial establishment is excluded from average turnover so the statistic describes ongoing rebalancing rather than the unavoidable first investment.",
    "What costs are omitted?",
    "Taxes, time-varying bid-ask spreads, market impact, liquidity variation, and brokerage minimums are outside the project model.",
  ),
  note(
    "Five basis points provide a modest, consistent implementation penalty",
    "The 5-bps assumption is intentionally simple. It represents modest trading costs for liquid ETFs and prevents high-turnover strategies from receiving a free implementation advantage. Keeping the rate constant makes strategy differences comparable across time and assets. It should not be interpreted as an exact historical execution estimate for every ETF and every market regime. More detailed cost models are an important extension, but they would add assumptions beyond the assignment's scope.",
    "Would a higher cost assumption change the ranking?",
    "Potentially, especially for Maximum Sharpe and Target Volatility. That sensitivity was not part of the frozen final experiment and should be tested separately.",
  ),
  note(
    "Complexity has value only relative to credible simple benchmarks",
    "Equal Weight and 60/40 establish transparent performance floors. Equal Weight requires no forecasts and spreads capital across the complete core opportunity set. The 60/40 portfolio is a familiar balanced allocation combining growth and defensive sleeves. Neither benchmark estimates expected returns or covariance. Their low complexity, interpretability, and relatively low turnover make them hard standards: an optimized model should improve outcomes after costs, not merely produce a mathematically sophisticated allocation.",
    "Why include two benchmarks rather than one?",
    "They test different notions of simplicity: broad 1/N diversification and a traditional equity-government-bond policy mix.",
  ),
  note(
    "Equal Weight assigns 1/23 to every core ETF",
    "The Equal Weight benchmark assigns approximately 4.35 percent to each of the 23 core ETFs and rebalances monthly under the same cost convention and realized dates as optimized strategies. It uses no expected-return or covariance estimates. Its effective number of assets is exactly 23 by construction, but equal capital weights do not imply equal risk contributions because asset volatilities and correlations differ. It is therefore a mechanical diversification benchmark, not a risk-parity portfolio.",
    "Why does Equal Weight have the highest effective asset count?",
    "Because the effective number equals the inverse of weight concentration, and all 23 capital weights are identical.",
  ),
  note(
    "The 60/40 benchmark uses only equity and government-bond sleeves",
    "The 60/40 benchmark allocates 60 percent equally across nine equity ETFs and 40 percent equally across the five government-bond ETFs available in the core universe. Credit, commodities, real estate, and BIL receive zero benchmark weight. It is rebalanced monthly with the same timing and transaction-cost convention. The benchmark is familiar and interpretable, but it does not exploit the complete 23-ETF opportunity set, which is an intentional feature of the comparison.",
    "Why not allocate the 40 percent across all fixed income ETFs?",
    "The benchmark follows the conventional equity-government-bond definition; credit is excluded because it carries materially different economic risk.",
  ),
  note(
    "Markowitz converts forecasts, covariance, and constraints into weights",
    "Classical mean-variance optimization takes expected returns, a covariance matrix, and investment constraints as inputs. It then chooses portfolio weights according to a specific objective. Minimum Variance focuses only on risk. Maximum Sharpe trades expected excess return against risk. Target Volatility maximizes expected return within a risk ceiling. The framework is powerful because it makes diversification explicit, but it is also vulnerable because the inputs are estimates rather than known parameters.",
    "What is the main weakness of Markowitz in practice?",
    "Optimization can amplify small errors in expected returns and covariance into large, unstable portfolio weights.",
  ),
  note(
    "Minimum Variance buys stability, not high expected return",
    "Minimum Variance minimizes portfolio variance using covariance and constraints; expected returns do not enter the objective. In a universe containing BIL and short-duration bonds, it naturally favors defensive exposures. The sample and Ledoit-Wolf versions earned roughly 2.25 to 2.31 percent annually with volatility near 2.8 percent. Drawdowns were small relative to risk-bearing strategies, but Sharpe ratios were weak because realized return remained close to the constant 2 percent reference rate.",
    "Why call the low return a feature rather than a failure?",
    "The strategy solved its stated objective: reduce variance. It was not designed to maximize return or Sharpe.",
  ),
  note(
    "Maximum Sharpe achieved the best realized risk-adjusted result",
    "Maximum Sharpe uses expected returns, covariance, and a 2 percent annual risk-free reference to seek the greatest estimated excess return per unit of volatility. That dependence on expected returns makes it especially sensitive to estimation noise and turnover. In the realized comparison, the Ledoit-Wolf version produced the highest Sharpe ratio, 0.922, with 9.86 percent annualized geometric return and 8.45 percent volatility. The trade-off was concentration and 88.06 percent annualized turnover.",
    "Why can Maximum Sharpe weights change sharply?",
    "Small changes in noisy mean estimates can materially change which assets appear to offer the best excess return per unit of risk.",
  ),
  note(
    "Target Volatility reached the highest wealth by accepting more risk",
    "Target Volatility maximizes expected return subject to an annual volatility ceiling of 10 percent in the estimated optimization problem. Ten percent was chosen as a moderate, balanced-portfolio-like project target that permits risky-asset participation without unconstrained risk escalation. The Ledoit-Wolf version delivered the highest realized annualized return, 11.38 percent, and final wealth, 4.17. Realized volatility was 11.63 percent because an ex-ante constraint cannot guarantee the future realized outcome.",
    "Why did realized volatility exceed the 10 percent target?",
    "The constraint applies to estimated forward risk at each rebalance; realized markets can differ from the estimate.",
  ),
  note(
    "Constraints turn mathematical optima into interpretable portfolios",
    "Every Markowitz and Michaud portfolio is fully invested, long-only, and unleveraged. Individual ETF weights lie between 0 and 25 percent. The lower bound avoids short-sale and financing assumptions. No leverage prevents performance from being increased mechanically by scaling risk. The 25 percent cap limits corner solutions caused by estimation error while retaining meaningful conviction. A much tighter cap would force allocations toward quasi-equal weighting; no cap would allow a single noisy estimate to dominate.",
    "Why was HRP not subject to the same 25 percent cap?",
    "The HRP extension used the standard unconstrained PyPortfolioOpt HRP allocation to reveal its native interaction with the cash-inclusive universe.",
  ),
  note(
    "A 23-asset sample covariance is noisy with only 60 observations",
    "Each rolling window estimates a 23 by 23 covariance matrix from 60 monthly observations. Sampling noise affects variances and correlations, and optimization can amplify small errors into unstable weights. Numerical conditioning matters because the objective depends on the covariance structure. The heatmap also shows why a single average correlation is insufficient: equities cluster strongly, while bonds, commodities, and cash provide different relationships. A more stable covariance estimator may therefore improve portfolio implementation.",
    "Is the sample covariance matrix invalid?",
    "No. It is a consistent historical estimator, but it can have high estimation variance in a short, high-dimensional window.",
  ),
  note(
    "Ledoit-Wolf trades a little bias for much lower estimation variance",
    "Ledoit-Wolf shrinkage combines the noisy sample covariance matrix with a more structured target. The shrinkage intensity is estimated from the data rather than chosen arbitrarily. Moving slightly toward the target introduces bias, but it can reduce estimation variance and improve numerical conditioning by more. This is an input estimator, not a new portfolio objective. Minimum Variance, Maximum Sharpe, and Target Volatility remain the same strategies; only the covariance matrix supplied to them changes.",
    "What exactly is being shrunk?",
    "The sample covariance matrix is moved toward a structured covariance target using a data-driven shrinkage intensity.",
  ),
  note(
    "Shrinkage improved the strongest Markowitz implementation",
    "The empirical benefit of Ledoit-Wolf is clearest for Maximum Sharpe. Relative to sample covariance, Sharpe rose from 0.909 to 0.922, annualized turnover fell from 99.14 to 88.06 percent, and effective assets increased from 4.50 to 4.77. Minimum Variance also became somewhat broader and lower-turnover. Target Volatility turnover fell, but its Sharpe changed little. The correct conclusion is sample-specific: shrinkage improved stability and implementation here, not that it must dominate in every period or universe.",
    "Did Ledoit-Wolf improve every metric?",
    "No. The gains were strongest for Maximum Sharpe and more modest or mixed for the other objectives.",
  ),
  note(
    "Michaud was required because one estimated frontier is fragile",
    "Michaud resampling addresses the Markowitz optimization enigma. Optimized weights can look precise even though expected returns and covariance are estimated imprecisely. A single noisy input estimate produces a single potentially unstable portfolio. Michaud remains an extension of Markowitz: it repeatedly solves the same constrained mean-variance problem, but it acknowledges uncertainty by averaging decisions across plausible capital-market assumptions.",
    "Does Michaud remove estimation error?",
    "No. It reduces dependence on one estimated input set; uncertainty and distributional assumptions remain.",
  ),
  note(
    "Michaud averages optimized decisions across plausible inputs",
    "At each rebalance, the method first estimates annualized means and a Ledoit-Wolf covariance matrix from the prior 60 months. It then simulates one plausible mean vector and covariance matrix, solves the constrained Maximum Sharpe problem, and repeats this process M times. The resulting weights are averaged component by component and held during the next month. The benefit comes from averaging portfolio decisions, not from averaging realized future returns.",
    "Why solve Maximum Sharpe inside each resample?",
    "The project uses Michaud specifically as a robust extension of the expected-return-sensitive Maximum Sharpe portfolio.",
  ),
  note(
    "The code resampled capital-market assumptions, not historical rows",
    "The verified implementation simulates expected-return vectors from their estimated multivariate-normal sampling distribution and generates covariance realizations from centered multivariate-normal draws consistent with the estimated covariance and sample size. It is therefore not a simple bootstrap of historical months. Every simulated scenario uses the same long-only, fully invested, unleveraged, 25-percent-cap constraints. Seed 42 and deterministic seed sequences make the weight histories reproducible. The normality framework is a modeling approximation, not a claim of perfect distributional realism.",
    "Was the historical return matrix resampled row by row?",
    "No. The implementation resampled mean and covariance assumptions under normal sampling theory.",
  ),
  note(
    "Three resample counts show when Monte Carlo results stabilize",
    "The project evaluates 100, 250, and 500 resamples. One hundred is faster but more exposed to Monte Carlo variation. Two hundred fifty is an intermediate convergence check. Five hundred provides greater numerical stability at a higher computational cost. Results changed only slightly as the count increased, while turnover declined. The 500-resample variant is emphasized because the output had stabilized and it achieved the lowest turnover among the tested Michaud counts.",
    "Why stop at 500 rather than simulate thousands?",
    "The marginal changes were already small, so more simulation would add computation without materially changing the project conclusion.",
  ),
  note(
    "Michaud sacrificed little Sharpe and improved implementation",
    "Maximum Sharpe Ledoit-Wolf earned 9.86 percent with 8.45 percent volatility, Sharpe 0.922, 88.06 percent turnover, and 4.77 effective assets. Michaud 500 earned 9.23 percent with 7.98 percent volatility, Sharpe 0.900, 78.00 percent turnover, and 6.25 effective assets. Michaud did not beat Markowitz on every metric. Its contribution is a more diversified and lower-turnover implementation while preserving most of the realized risk-adjusted performance.",
    "Which strategy is preferable in practice?",
    "Maximum Sharpe leads on Sharpe; Michaud 500 offers the stronger robustness, concentration, and turnover compromise.",
  ),
  note(
    "HRP provides a structurally different robustness test",
    "HRP was an optional original extension. Unlike Markowitz, it does not forecast expected returns and avoids direct covariance-matrix inversion. It uses correlation-based hierarchy and recursive allocation, offering a useful comparison with mean-variance optimization. HRP was chosen instead of Black-Litterman because Black-Litterman requires defensible investor views and confidence levels. No objective view set was available, so implementing it would have introduced subjective assumptions that could not be validated.",
    "Why not include both HRP and Black-Litterman?",
    "The project prioritized one interpretable extension; HRP required no invented investor views and exposed a different form of model risk.",
  ),
  note(
    "HRP allocates through a hierarchy rather than an efficient frontier",
    "HRP converts correlations into distances, clusters similar assets, reorders them according to the hierarchy, and recursively splits capital between branches according to cluster variance. The procedure continues until individual ETF weights are obtained. It avoids direct inversion and does not use expected returns. However, hierarchical risk allocation does not guarantee equal capital weights or equal risk contributions, and it remains sensitive to the universe, distance definition, and unconstrained variance structure.",
    "Is HRP the same as equal risk contribution?",
    "No. HRP allocates recursively through clusters; it is not a direct equal-risk-contribution optimization.",
  ),
  note(
    "Unconstrained HRP collapsed toward the cash-like BIL ETF",
    "BIL is a short Treasury-bill ETF with extremely low realized volatility. The unconstrained recursive variance allocation strongly favored that low-variance branch, and HRP did not inherit the Markowitz 25 percent cap. The saved weights averaged 95.60 percent in BIL, and effective assets fell to about 1.09. The heatmap confirms persistent concentration. This is not a coding failure; it is an empirical method-universe interaction created by applying unconstrained HRP to a cash-inclusive opportunity set.",
    "Would HRP behave differently without BIL?",
    "Very likely, but that is an untested robustness extension and cannot be claimed from the frozen results.",
  ),
  note(
    "HRP minimized drawdown but failed as a return-seeking allocation",
    "HRP earned 1.62 percent annually with only 0.58 percent volatility, a negative Sharpe of minus 0.670, maximum drawdown near minus 0.35 percent, turnover of 7.49 percent, and 1.09 effective assets. Its tiny volatility, drawdown, and turnover are positive if the objective is near-cash capital preservation. But return fell below the constant 2 percent reference, and economic diversification was extremely weak. The high Calmar ratio is mechanical because its drawdown denominator is exceptionally small.",
    "Did HRP win because it had the smallest drawdown?",
    "Only under a narrow capital-preservation objective. It performed worst on Sharpe and collapsed into a cash-dominated portfolio.",
  ),
  note(
    "Performance metrics reveal different objectives, not one universal winner",
    "This focused table compares seven representative strategies on the common period. Target Volatility Ledoit-Wolf leads return but also carries the highest volatility among the selected strategies. Maximum Sharpe Ledoit-Wolf leads realized Sharpe. Minimum Variance and HRP are defensive, but their returns are low. Equal Weight and 60/40 remain credible simple references. The table intentionally separates performance from implementation so that turnover and concentration do not disappear behind a single headline ranking.",
    "Why show only seven strategies here?",
    "They represent the main benchmark, Markowitz, Michaud, and HRP conclusions without crowding the classroom slide; the complete table remains in the report and CSV.",
  ),
  note(
    "Implementation metrics change how the performance ranking is judged",
    "Equal Weight has 23 effective assets by construction, while 60/40 has 13.89. Among optimized strategies, Michaud 500 is the broadest at 6.25 effective assets. Maximum Sharpe Ledoit-Wolf has higher turnover and more concentration than Michaud. HRP has the lowest turnover, but that advantage comes from maintaining an economically undesirable near-cash concentration. Effective assets measure capital-weight concentration, not full economic risk diversification, so the statistic must be interpreted with portfolio context.",
    "Is Equal Weight automatically the best diversified portfolio?",
    "It has the broadest capital weights, but correlated ETFs can still create concentrated economic risk.",
  ),
  note(
    "Terminal wealth reflects both skill and the amount of risk accepted",
    "The selected-strategy wealth chart is built only from frozen saved monthly return series over the common 159 months. Target Volatility finishes highest because it accepts more risk. Maximum Sharpe Ledoit-Wolf and Michaud 500 compound strongly with lower volatility than Target Volatility. Equal Weight and 60/40 remain respectable but finish below the leaders. HRP behaves like cash after concentrating in BIL. The chart should therefore be read together with volatility, drawdown, turnover, and concentration rather than as a standalone winner ranking.",
    "Were any returns recalculated for this slide?",
    "No strategy was rerun. The presentation compounds the frozen saved monthly return series only to create a readable selected-strategy view.",
  ),
  note(
    "Drawdowns expose the path risk hidden by terminal wealth",
    "Drawdown measures the percentage loss from the previous wealth peak. The selected-strategy chart shows that high terminal wealth does not arrive without periods of loss. Maximum Sharpe, Target Volatility, Michaud, and the benchmarks all experience material stress. Minimum Variance and HRP have smaller drawdowns because they take much less risk, but they also compound less. The 2022 multi-asset decline is especially informative because both equities and bonds weakened, challenging conventional diversification.",
    "Why is drawdown different from volatility?",
    "Volatility measures overall return dispersion; drawdown measures cumulative loss from a prior peak and is path dependent.",
  ),
  note(
    "Maximum Sharpe offered the best realized return-risk balance",
    "In the risk-return scatter, the preferred direction is generally upward and left: more return with less volatility. Target Volatility lies higher but farther right, reflecting more return and more risk. Maximum Sharpe Ledoit-Wolf combines strong return with lower volatility and therefore leads realized Sharpe. Minimum Variance lies near the low-risk, low-return corner, while HRP sits close to cash. The figure illustrates that every objective occupies a different part of the risk-return plane.",
    "Does the upper-left rule always identify the best portfolio?",
    "It is a useful visual heuristic, but investor preferences, drawdown, turnover, and concentration also matter.",
  ),
  note(
    "Higher Sharpe generally required more trading",
    "The turnover-Sharpe plot shows an implementation frontier. Maximum Sharpe Ledoit-Wolf achieved the highest Sharpe but traded heavily. Michaud 500 retained a near-leading Sharpe with lower turnover, which supports the robustness interpretation. Equal Weight and 60/40 were easier to implement. HRP had the lowest turnover for the wrong economic reason: its BIL-dominated weights changed little. Turnover is not automatically bad, but it creates cost, operational, and estimation-risk exposure.",
    "Are the reported returns already net of transaction costs?",
    "Yes. The frozen strategy returns use the common 5-bps drift-aware cost convention.",
  ),
  note(
    "Michaud broadened optimized portfolios without losing much Sharpe",
    "The diversification-Sharpe plot separates mechanical breadth from optimized robustness. Equal Weight has 23 effective assets by construction. Classical optimized portfolios are far more concentrated. Michaud increases effective assets to about 6.25 while retaining Sharpe near 0.90, making it the broadest optimized specification. HRP is least diversified despite its risk-parity label because the unconstrained allocation concentrated in BIL. The number of nonzero positions is not enough; effective diversification depends on how evenly capital is distributed.",
    "Why use effective assets rather than position count?",
    "A portfolio can hold many tiny positions and still be dominated by one asset; the inverse Herfindahl measure captures that concentration.",
  ),
  note(
    "The winning strategy depends on the investor's objective",
    "Maximum Sharpe Ledoit-Wolf wins on realized Sharpe. Target Volatility Ledoit-Wolf wins on return, terminal wealth, and the strongest meaningful Calmar ratio. Michaud 500 offers the best optimized diversification-turnover compromise. Minimum Variance delivers the lowest meaningful optimized risk. HRP has the lowest turnover and drawdown, but only because it collapsed into BIL. Equal Weight and 60/40 remain the simplest implementations. The project therefore rejects a one-dimensional definition of success.",
    "Which strategy would you recommend?",
    "For risk-adjusted performance, Maximum Sharpe Ledoit-Wolf; for a more robust implementation compromise, Michaud 500.",
  ),
  note(
    "Michaud improved robustness rather than every performance metric",
    "Classical Maximum Sharpe uses one estimated market input and can exploit signals aggressively. In this sample it achieved the best Sharpe, but it remained concentrated and high-turnover. Michaud averages decisions across plausible inputs, broadens allocations, and lowers turnover. It sacrifices only about 0.022 Sharpe relative to Maximum Sharpe Ledoit-Wolf. The lesson is not that resampling dominates optimization; it changes the implementation profile in a favorable way while preserving most of the performance.",
    "Did Michaud solve the optimization enigma?",
    "It moderated concentration and turnover, but it did not remove estimation risk or produce the highest Sharpe.",
  ),
  note(
    "Input estimation mattered almost as much as objective choice",
    "Ledoit-Wolf shows that an optimizer is only as reliable as the risk model supplied to it. Shrinkage improved covariance conditioning, reduced Maximum Sharpe turnover, and modestly broadened weights while increasing realized Sharpe. These changes occurred without changing the portfolio objective. The result demonstrates that robust estimation can be as important as selecting Minimum Variance, Maximum Sharpe, or Target Volatility. It also cautions against interpreting an optimizer's output as a property of the objective alone.",
    "Can shrinkage fix noisy expected returns?",
    "No. Ledoit-Wolf stabilizes covariance; expected-return estimation remains noisy and especially important for Maximum Sharpe and Target Volatility.",
  ),
  note(
    "HRP shows that avoiding inversion does not eliminate model risk",
    "HRP successfully avoids direct covariance inversion, but that addresses only one source of instability. The final portfolio still depends on the universe, correlation distance, hierarchy, recursive allocation, and constraints. Including BIL caused a near-cash allocation with little economic diversification. This negative result is valuable because it demonstrates that a method labeled robust can still need economic guardrails. Robustness must be evaluated empirically, not assumed from the algorithm's name.",
    "Was HRP implemented incorrectly because it concentrated?",
    "No. The saved weights pass validation; the concentration follows from unconstrained recursive variance allocation with a near-zero-volatility asset.",
  ),
  note(
    "Simple benchmarks remain difficult to dismiss",
    "Equal Weight and 60/40 require no expected-return forecasts, no covariance estimator, no nonlinear optimization, and no resampling design. They are transparent, low-turnover, and easy to communicate. In the common sample, optimized leaders beat them on selected metrics, especially Sharpe and terminal wealth, but at the cost of more trading and stronger modeling assumptions. Benchmarks therefore remain economically credible even when they do not top the final table.",
    "Why not declare optimization superior because its Sharpe is higher?",
    "The gain must be weighed against turnover, concentration, estimation uncertainty, and the fact that only one historical path was observed.",
  ),
  note(
    "Data and sample choices limit how broadly the evidence can be generalized",
    "The ETF universe is fixed ex post and may contain selection or survivorship bias. Yahoo Finance is reproducible but not institutional-quality total-return data. The backtest observes one realized historical path. Four late-inception ETFs shorten the full-universe history, and the extended 27-ETF panel was not used for a complete optimized robustness backtest. These limitations mean the final ranking is evidence for this design and period, not proof of universal superiority.",
    "Does the 23-ETF core universe eliminate survivorship bias?",
    "No. It solves the common-history problem, but an ex-post ETF list can still embed selection and survivorship effects.",
  ),
  note(
    "Model assumptions remain simplified and testable",
    "Expected returns remain noisy even with five years of data. The window is fixed at 60 months, the risk-free reference is constant at 2 percent, and transaction costs are constant at 5 basis points. Michaud relies on normal sampling assumptions. Taxes, time-varying spreads, market impact, liquidity constraints, and formal statistical significance tests are absent. These choices keep the experiment transparent and reproducible, but they also define the boundary of the claims.",
    "Which limitation is most important?",
    "Mean estimation and the single historical path are especially important because small performance differences may not be statistically or economically persistent.",
  ),
  note(
    "Future robustness checks should challenge the design, not search for winners",
    "The next tests should vary the assumptions most likely to change conclusions: 36-, 60-, and 120-month windows; quarterly rebalancing; constrained HRP; HRP without BIL; asset-class floors and caps; Black-Litterman with defensible views; regime-dependent covariance; time-varying costs; and full extended-universe optimization. These specifications should be pre-defined. Robustness analysis should reveal sensitivity, not search ex post for whichever combination produces the best Sharpe.",
    "What would you test first?",
    "Constrained HRP or HRP without BIL, because the current extension clearly exposes a method-universe interaction that can be tested directly.",
  ),
  note(
    "Robust portfolio design is more than choosing an optimizer",
    "Five conclusions resolve the research question. All strategies share identical out-of-sample months. Maximum Sharpe Ledoit-Wolf achieved the best realized Sharpe. Target Volatility Ledoit-Wolf produced the highest wealth by accepting more risk. Michaud improved diversification and turnover with only a small Sharpe sacrifice. HRP demonstrated that robust methods still depend on constraints and universe design. The broader lesson is that estimation, timing, costs, and interpretation determine whether sophistication adds practical value.",
    "Did sophistication beat simple allocation rules?",
    "On selected risk-adjusted and wealth metrics, yes; but the gains were not universal and came with greater implementation and modeling demands.",
  ),
  note(
    "Questions",
    "This final slide is a defense map. Questions about data can be answered through the ETF, core-universe, and 2008 sample-policy decisions. Design questions connect to monthly frequency, the 60-month window, next-month implementation, and 5-bps costs. Method questions connect to Markowitz objectives, Ledoit-Wolf, Michaud, and HRP. Result questions should always return to the multi-dimensional comparison: best Sharpe, highest wealth, robustness compromise, and the HRP concentration finding.",
    "Which answer should anchor the defense?",
    "The experiment is credible because every final strategy shares the same assets, dates, information timing, and costs; the remaining differences come from the allocation rules.",
  ),
];

function rect(slide, x, y, w, h, fill, radius = false, lineFill = "none", lineWidth = 0) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
    ...(radius ? { borderRadius: "rounded-xl" } : {}),
  });
}

function text(slide, value, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: options.fill ?? "none",
    line: { style: "solid", fill: options.lineFill ?? "none", width: options.lineWidth ?? 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: FONT,
    fontSize: options.fontSize ?? 20,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? C.ink,
    alignment: options.align ?? "left",
    verticalAlignment: options.valign ?? "top",
    autoFit: options.autoFit ?? "shrinkText",
    wrap: "square",
    lineSpacing: options.lineSpacing ?? 1.05,
    insets: options.insets ?? { top: 2, right: 2, bottom: 2, left: 2 },
  };
  return shape;
}

function line(slide, x, y, w, h = 2, fill = C.line) {
  return rect(slide, x, y, w, h, fill);
}

function arrow(slide, x, y, w, h, fill = C.line, direction = "right") {
  return slide.shapes.add({
    geometry: direction === "down" ? "downArrow" : direction === "left" ? "leftArrow" : "rightArrow",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function circle(slide, x, y, d, fill, lineFill = C.paper, lineWidth = 3) {
  return slide.shapes.add({
    geometry: "ellipse",
    position: { left: x, top: y, width: d, height: d },
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
  });
}

function addFooter(slide, index, dark = false) {
  line(slide, 56, 684, 1168, 1, dark ? "#385067" : C.line);
  text(slide, "Financial Markets Analytics  |  Variant B - Dynamic Asset Allocation", 58, 691, 850, 18, {
    fontSize: 11,
    color: dark ? "#AFC0CF" : C.muted,
  });
  text(slide, String(index).padStart(2, "0"), 1138, 690, 86, 20, {
    fontSize: 12,
    bold: true,
    color: dark ? C.gold : C.blue,
    align: "center",
  });
}

function addTitle(slide, title, index, kicker = "", dark = false) {
  slide.background.fill = dark ? C.navy : C.warm;
  rect(slide, 0, 0, 12, H, dark ? C.gold : C.teal);
  if (kicker) {
    text(slide, kicker.toUpperCase(), 58, 28, 720, 22, {
      fontSize: 13,
      bold: true,
      color: dark ? C.gold : C.teal,
    });
  }
  text(slide, title, 56, 54, 1168, 62, {
    fontSize: title.length > 67 ? 35 : 39,
    bold: true,
    color: dark ? C.paper : C.navy,
    valign: "middle",
  });
  addFooter(slide, index, dark);
}

function label(slide, value, x, y, w, fill = C.paleBlue, color = C.blue) {
  rect(slide, x, y, w, 30, fill, true);
  text(slide, value, x + 8, y + 2, w - 16, 26, {
    fontSize: 14,
    bold: true,
    color,
    align: "center",
    valign: "middle",
  });
}

function bullet(slide, value, x, y, w, options = {}) {
  const accent = options.accent ?? C.teal;
  rect(slide, x, y + 10, 8, 8, accent, true);
  text(slide, value, x + 20, y, w - 20, options.h ?? 40, {
    fontSize: options.fontSize ?? 20,
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    valign: "middle",
    lineSpacing: options.lineSpacing ?? 1.05,
  });
}

function callout(slide, value, x, y, w, h, fill = C.navy, color = C.paper, fontSize = 20) {
  rect(slide, x, y, w, h, fill, true);
  text(slide, value, x + 18, y + 8, w - 36, h - 16, {
    fontSize,
    bold: true,
    color,
    align: "center",
    valign: "middle",
  });
}

function metric(slide, value, title, x, y, w, accent = C.teal, subtitle = "") {
  rect(slide, x, y, w, 128, C.paper, true, C.line, 1);
  line(slide, x, y, w, 5, accent);
  text(slide, value, x + 14, y + 20, w - 28, 48, {
    fontSize: 34,
    bold: true,
    color: accent,
    align: "center",
    valign: "middle",
  });
  text(slide, title, x + 14, y + 72, w - 28, 28, {
    fontSize: 17,
    bold: true,
    color: C.navy,
    align: "center",
    valign: "middle",
  });
  if (subtitle) {
    text(slide, subtitle, x + 14, y + 101, w - 28, 18, {
      fontSize: 11,
      color: C.muted,
      align: "center",
    });
  }
}

function addNotes(slide, index) {
  const n = NOTES[index - 1];
  if (!n) throw new Error(`Missing speaker notes for slide ${index}`);
  const transition = index < NOTES.length
    ? `Next, I turn to: ${NOTES[index].title}.`
    : "I will keep this defense map visible and take questions.";
  const content = `Main explanation:\n${n.main}\n\nTransition:\n${transition}\n\nLikely question:\n${n.question}\n\nAnswer:\n${n.answer}`;
  slide.speakerNotes.textFrame.setText(content);
  slide.speakerNotes.setVisible(true);
}

async function image(slide, fileName, x, y, w, h, fit = "contain", alt = "") {
  const imagePath = path.join(FIGURES, fileName);
  const bytes = await fs.readFile(imagePath);
  const blob = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return slide.images.add({
    blob,
    contentType: "image/png",
    alt: alt || fileName,
    fit,
    position: { left: x, top: y, width: w, height: h },
  });
}

function parseCsv(raw) {
  const rows = raw.trim().split(/\r?\n/);
  const headers = rows.shift().split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
  });
}

function pct(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "-";
}

function num(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

function strategyRow(rows, name) {
  const found = rows.find((row) => row.strategy === name);
  if (!found) throw new Error(`Missing strategy row: ${name}`);
  return found;
}

async function readReturnSeries(fileName, column) {
  const rows = parseCsv(await fs.readFile(path.join(PROCESSED, fileName), "utf8"));
  return rows
    .map((row) => ({ date: row.date, value: Number(row[column]) }))
    .filter((row) => row.date >= "2013-03-31" && Number.isFinite(row.value));
}

function wealthPath(series) {
  let wealth = 1;
  return series.map((point) => {
    wealth *= 1 + point.value;
    return { date: point.date, value: wealth };
  });
}

function drawdownPath(series) {
  let wealth = 1;
  let peak = 1;
  return series.map((point) => {
    wealth *= 1 + point.value;
    peak = Math.max(peak, wealth);
    return { date: point.date, value: wealth / peak - 1 };
  });
}

function addSectionMarker(slide, value, x = 1030, y = 30) {
  label(slide, value, x, y, 166, C.paleGold, "#946C18");
}

function addTwoColumnBullets(slide, left, right, options = {}) {
  const top = options.top ?? 158;
  const colW = 520;
  const gap = 76;
  const leftX = 68;
  const rightX = leftX + colW + gap;
  label(slide, left.title, leftX, top, left.labelWidth ?? 220, left.fill ?? C.paleBlue, left.accent ?? C.blue);
  label(slide, right.title, rightX, top, right.labelWidth ?? 220, right.fill ?? C.paleTeal, right.accent ?? C.teal);
  const maxRows = Math.max(left.items.length, right.items.length);
  const available = (options.bottom ?? 606) - (top + 48);
  const rowH = Math.min(74, available / maxRows);
  left.items.forEach((item, i) => bullet(slide, item, leftX, top + 48 + i * rowH, colW, {
    accent: left.accent ?? C.blue,
    fontSize: options.fontSize ?? 19,
    h: rowH - 4,
  }));
  right.items.forEach((item, i) => bullet(slide, item, rightX, top + 48 + i * rowH, colW, {
    accent: right.accent ?? C.teal,
    fontSize: options.fontSize ?? 19,
    h: rowH - 4,
  }));
}

function addTable(slide, headers, rows, x, y, widths, rowHeight = 52, options = {}) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  rect(slide, x, y, totalW, 42, C.navy, true);
  let cursor = x;
  headers.forEach((header, i) => {
    text(slide, header, cursor + 8, y + 6, widths[i] - 16, 30, {
      fontSize: options.headerFontSize ?? 15,
      bold: true,
      color: C.paper,
      align: i === 0 ? "left" : "center",
      valign: "middle",
    });
    cursor += widths[i];
  });
  rows.forEach((row, r) => {
    const fill = r % 2 === 0 ? C.paper : C.paleGray;
    rect(slide, x, y + 42 + r * rowHeight, totalW, rowHeight, fill, false, C.line, 0.5);
    let cx = x;
    row.forEach((value, c) => {
      text(slide, String(value), cx + 8, y + 42 + r * rowHeight + 5, widths[c] - 16, rowHeight - 10, {
        fontSize: options.fontSize ?? 16,
        bold: c === 0,
        color: c === 0 ? C.navy : C.ink,
        align: c === 0 ? "left" : "center",
        valign: "middle",
      });
      cx += widths[c];
    });
  });
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

const finalRows = parseCsv(
  await fs.readFile(path.join(TABLES, "final_strategy_comparison.csv"), "utf8"),
);
const selectedNames = [
  "Equal Weight",
  "60/40",
  "Min Variance Ledoit-Wolf",
  "Max Sharpe Ledoit-Wolf",
  "Target Volatility Ledoit-Wolf",
  "Michaud 500",
  "HRP",
];
const selectedRows = selectedNames.map((name) => strategyRow(finalRows, name));

const returnSpecs = [
  ["Equal Weight", "benchmark_equal_weight_core_23.csv", "benchmark_return", C.blue],
  ["60/40", "benchmark_sixty_forty_core_23.csv", "benchmark_return", C.gold],
  ["Max Sharpe LW", "markowitz_returns_max_sharpe_ledoit_60m_core.csv", "portfolio_return", C.teal],
  ["Target Volatility LW", "markowitz_returns_target_vol_ledoit_60m_core.csv", "portfolio_return", C.coral],
  ["Michaud 500", "michaud_returns_500.csv", "portfolio_return", C.purple],
  ["HRP", "hrp_returns.csv", "portfolio_return", C.green],
];
const selectedSeries = [];
for (const [name, fileName, column, color] of returnSpecs) {
  selectedSeries.push({ name, color, returns: await readReturnSeries(fileName, column) });
}
const commonDates = selectedSeries[0].returns.map((point) => point.date.slice(0, 7));
if (commonDates.length !== 159 || selectedSeries.some((s) => s.returns.length !== 159)) {
  throw new Error("Selected presentation series must each contain 159 common months.");
}

// 1 - Title
{
  const slide = presentation.slides.add();
  slide.background.fill = C.navy;
  rect(slide, 0, 0, 18, H, C.gold);
  rect(slide, 850, 0, 430, H, "#102B45");
  line(slide, 918, 92, 286, 3, C.teal);
  text(slide, "FINANCIAL MARKETS ANALYTICS", 70, 72, 650, 28, {
    fontSize: 17, bold: true, color: C.gold,
  });
  text(slide, "Dynamic Asset\nAllocation", 66, 142, 740, 150, {
    fontSize: 58, bold: true, color: C.paper, lineSpacing: 0.9,
  });
  text(slide, "Variant B", 70, 310, 300, 38, {
    fontSize: 25, bold: true, color: C.teal,
  });
  text(slide, "Classical Markowitz  |  Michaud Resampling\nLedoit-Wolf  |  Hierarchical Risk Parity", 70, 372, 680, 88, {
    fontSize: 23, color: "#DCE6ED", lineSpacing: 1.15,
  });
  text(slide, "ARTEM KHOMYTSKYI", 908, 164, 290, 34, {
    fontSize: 22, bold: true, color: C.paper,
  });
  text(slide, "University of Milano-Bicocca", 908, 216, 290, 64, {
    fontSize: 19, color: "#C4D3DE",
  });
  text(slide, "Prof. G. Forte", 908, 302, 290, 30, {
    fontSize: 18, color: "#C4D3DE",
  });
  text(slide, "14 July 2026", 908, 346, 290, 30, {
    fontSize: 18, color: C.gold,
  });
  text(slide, "DETAILED ORAL DEFENSE", 908, 578, 290, 26, {
    fontSize: 14, bold: true, color: C.teal,
  });
  addFooter(slide, 1, true);
  addNotes(slide, 1);
}

// 2 - Assignment
{
  const slide = presentation.slides.add();
  addTitle(slide, "The assignment required dynamic allocation and out-of-sample evidence", 2, "Project overview");
  addSectionMarker(slide, "REQUIRED VS ADDED");
  addTwoColumnBullets(slide,
    {
      title: "REQUIRED CORE",
      accent: C.blue,
      fill: C.paleBlue,
      items: [
        "Dynamic multi-asset allocation",
        "Classical Markowitz optimization",
        "Michaud-style resampling",
        "Walk-forward out-of-sample comparison",
        "Benchmarks, graphs, and risk metrics",
      ],
    },
    {
      title: "OUR ADDITIONS",
      accent: C.teal,
      fill: C.paleTeal,
      items: [
        "Ledoit-Wolf covariance shrinkage",
        "Target Volatility portfolio",
        "Hierarchical Risk Parity extension",
        "Drift-aware turnover and costs",
        "Concentration and diversification diagnostics",
      ],
    },
    { top: 148, bottom: 598, fontSize: 19 },
  );
  callout(slide, "Variant B: allocation across asset classes through time - not stock selection.", 132, 602, 1016, 54, C.navy, C.paper, 20);
  addNotes(slide, 2);
}

// 3 - Research question
{
  const slide = presentation.slides.add();
  addTitle(slide, "Sophistication must beat transparent rules after costs", 3, "Research question");
  text(slide, "Can optimized portfolios improve realized risk-adjusted performance?", 106, 142, 1068, 62, {
    fontSize: 30, bold: true, color: C.navy, align: "center", valign: "middle",
  });
  const questions = [
    ["01", "Markowitz", "Does it beat Equal Weight and 60/40?", C.blue],
    ["02", "Ledoit-Wolf", "Does covariance shrinkage improve stability?", C.teal],
    ["03", "Michaud", "Does resampling reduce instability?", C.gold],
    ["04", "HRP", "Does hierarchy offer a robust alternative?", C.coral],
    ["05", "Implementation", "Do gains survive turnover and 5-bps costs?", C.purple],
  ];
  questions.forEach(([n, title, body, color], i) => {
    const x = 64 + i * 238;
    rect(slide, x, 246, 214, 270, C.paper, true, C.line, 1);
    text(slide, n, x + 18, 266, 60, 32, { fontSize: 20, bold: true, color });
    line(slide, x + 18, 310, 178, 4, color);
    text(slide, title, x + 18, 336, 178, 50, { fontSize: 22, bold: true, color: C.navy, valign: "middle" });
    text(slide, body, x + 18, 400, 178, 92, { fontSize: 18, color: C.muted, align: "center", valign: "middle" });
  });
  callout(slide, "No strategy receives a more favorable universe, sample, date, or cost convention.", 146, 562, 988, 66, C.navy, C.paper, 21);
  addNotes(slide, 3);
}

// 4 - Project map
{
  const slide = presentation.slides.add();
  addTitle(slide, "One controlled pipeline separates model choice from sample choice", 4, "Complete project map");
  addSectionMarker(slide, "CONTROLLED DESIGN");
  const nodes = [
    ["01", "Data", "Adjusted ETF prices", C.blue],
    ["02", "Sample policy", "Core and extended panels", C.teal],
    ["03", "Returns", "Monthly simple returns", C.gold],
    ["04", "Estimators", "Means and covariance", C.coral],
    ["05", "Strategies", "Required + extensions", C.purple],
    ["06", "Walk-forward", "Prior data only", C.blue],
    ["07", "Costs", "Drift-aware 5 bps", C.teal],
    ["08", "Evaluation", "Common 159 months", C.gold],
  ];
  [0, 1, 2].forEach((i) => arrow(slide, 332 + i * 294, 244, 66, 34, C.line));
  [322, 616, 910].forEach((x) => arrow(slide, x, 474, 30, 26, C.line, "left"));
  arrow(slide, 1054, 334, 36, 62, C.line, "down");
  nodes.forEach(([n, title, body, color], i) => {
    const row = i < 4 ? 0 : 1;
    const col = i % 4;
    const x = row === 0 ? 64 + col * 294 : 64 + (3 - col) * 294;
    const y = row === 0 ? 184 : 414;
    rect(slide, x, y, 252, 142, C.paper, true, color, 2);
    text(slide, n, x + 14, y + 12, 42, 24, { fontSize: 14, bold: true, color });
    text(slide, title, x + 20, y + 42, 212, 38, { fontSize: 22, bold: true, color: C.navy, align: "center" });
    text(slide, body, x + 20, y + 87, 212, 38, { fontSize: 17, color: C.muted, align: "center", valign: "middle" });
  });
  callout(slide, "Required methods and extensions differ only at the strategy stage.", 290, 598, 700, 52, C.paleGold, C.navy, 18);
  addNotes(slide, 4);
}

// 5 - Why ETFs
{
  const slide = presentation.slides.add();
  addTitle(slide, "ETFs keep the experiment about allocation, not stock selection", 5, "Data and universe");
  addSectionMarker(slide, "WHY ETFs?");
  addTwoColumnBullets(slide,
    {
      title: "INDIVIDUAL STOCKS",
      accent: C.coral,
      fill: C.paleCoral,
      items: [
        "Firm-specific events dominate outcomes",
        "Stock-selection noise obscures allocation skill",
        "Economic interpretation is more difficult",
        "Cross-asset roles are not represented",
      ],
    },
    {
      title: "MULTI-ASSET ETFs",
      accent: C.teal,
      fill: C.paleTeal,
      items: [
        "Broad, diversified market exposures",
        "Reduced firm-specific risk",
        "Liquid and reproducible instruments",
        "Each weight has a clear asset-class role",
      ],
    },
    { top: 158, bottom: 548, fontSize: 20 },
  );
  callout(slide, "One instrument can represent one interpretable source of portfolio risk.", 166, 570, 948, 66, C.navy, C.paper, 22);
  addNotes(slide, 5);
}

// 6 - Initial universe
{
  const slide = presentation.slides.add();
  addTitle(slide, "The initial 27-ETF universe was broad but still interpretable", 6, "Initial investment universe");
  addSectionMarker(slide, "27 CONFIGURED ETFs");
  text(slide, "27", 66, 144, 160, 90, { fontSize: 76, bold: true, color: C.navy });
  text(slide, "instruments across six economic sleeves", 220, 170, 520, 50, { fontSize: 24, color: C.muted, valign: "middle" });
  const sleeves = [
    ["Equities", 9, C.blue], ["Government bonds", 7, C.teal], ["Credit", 4, C.gold],
    ["Commodities", 3, C.coral], ["Real estate", 3, C.purple], ["Cash", 1, C.green],
  ];
  let cursor = 66;
  sleeves.forEach(([name, count, color]) => {
    const width = (count / 27) * 720;
    rect(slide, cursor, 270, width, 64, color);
    if (width > 52) text(slide, String(count), cursor, 281, width, 38, { fontSize: 20, bold: true, color: C.paper, align: "center" });
    cursor += width;
  });
  sleeves.forEach(([name, count, color], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 70 + col * 340;
    const y = 372 + row * 54;
    rect(slide, x, y + 7, 16, 16, color, true);
    text(slide, `${name}: ${count}`, x + 28, y, 280, 30, { fontSize: 18, color: C.ink, valign: "middle" });
  });
  line(slide, 826, 148, 2, 440, C.line);
  label(slide, "WHY THIS BREADTH?", 876, 162, 210, C.paleBlue, C.blue);
  bullet(slide, "Growth and geographic equity exposure", 870, 220, 340, { accent: C.blue, fontSize: 18 });
  bullet(slide, "Duration, credit, and inflation sensitivity", 870, 284, 340, { accent: C.teal, fontSize: 18 });
  bullet(slide, "Real assets and cash-like defense", 870, 348, 340, { accent: C.gold, fontSize: 18 });
  bullet(slide, "Within the recommended 15-30 range", 870, 412, 340, { accent: C.coral, fontSize: 18 });
  bullet(slide, "Fixed before strategy performance was compared", 870, 476, 340, { accent: C.purple, fontSize: 18 });
  callout(slide, "Broad enough for allocation; small enough to explain.", 856, 552, 368, 62, C.navy, C.paper, 19);
  addNotes(slide, 6);
}

// 7 - Ticker roles
{
  const slide = presentation.slides.add();
  addTitle(slide, "Each ticker has a distinct economic role", 7, "Why these specific ETFs?");
  addSectionMarker(slide, "ROLE-BASED SELECTION");
  const rows = [
    ["US equities", "SPY / QQQ / IWM / MDY", "Size and style exposure"],
    ["International equities", "EFA / EEM / VGK / EWJ / VPL", "Developed and emerging growth"],
    ["Government bonds", "SHY / IEF / TLT / TIP / BWX", "Duration, inflation, global defense"],
    ["Credit", "LQD / HYG / EMB / BKLN", "Investment-grade to floating-rate risk"],
    ["Commodities", "GLD / DBC / GSG", "Gold and broad real-asset exposure"],
    ["Real estate", "VNQ / RWX / VNQI", "US and international listed property"],
    ["Cash", "BIL", "Short Treasury-bill exposure"],
  ];
  addTable(slide, ["Asset class", "ETF examples", "Economic purpose"], rows, 66, 144, [250, 470, 428], 58, { fontSize: 15, headerFontSize: 15 });
  callout(slide, "Selection criterion: economic role + liquidity + availability + interpretability - not ex-post performance.", 94, 610, 1092, 46, C.paleGold, C.navy, 17);
  addNotes(slide, 7);
}

// 8 - From 27 to 23
{
  const slide = presentation.slides.add();
  addTitle(slide, "The research universe stayed at 27; the core experiment used 23", 8, "Explicit sample policy");
  addSectionMarker(slide, "NO SILENT DELETION");
  rect(slide, 82, 170, 300, 154, C.paper, true, C.blue, 2);
  text(slide, "27", 106, 188, 90, 72, { fontSize: 58, bold: true, color: C.blue, align: "center" });
  text(slide, "Initial research universe", 204, 204, 154, 56, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "middle" });
  arrow(slide, 406, 224, 100, 42, C.line);
  rect(slide, 528, 154, 668, 184, C.paper, true, C.coral, 2);
  label(slide, "FOUR LATE-INCEPTION ETFs", 558, 174, 260, C.paleCoral, C.coral);
  text(slide, "IGOV   |   VGSH   |   VNQI   |   BKLN", 560, 228, 600, 44, { fontSize: 25, bold: true, color: C.coral, align: "center" });
  text(slide, "No January 2008 history", 560, 282, 600, 30, { fontSize: 18, color: C.muted, align: "center" });
  arrow(slide, 618, 354, 42, 66, C.line, "down");
  arrow(slide, 1010, 354, 42, 66, C.line, "down");
  rect(slide, 380, 434, 430, 150, C.paleTeal, true, C.teal, 2);
  text(slide, "CORE EXPERIMENT", 406, 450, 378, 26, { fontSize: 14, bold: true, color: C.teal, align: "center" });
  text(slide, "23 ETFs", 406, 486, 378, 48, { fontSize: 35, bold: true, color: C.navy, align: "center" });
  text(slide, "from January 2008", 406, 542, 378, 28, { fontSize: 18, color: C.muted, align: "center" });
  rect(slide, 842, 434, 354, 150, C.paleBlue, true, C.blue, 2);
  text(slide, "EXTENDED PANEL", 868, 450, 302, 26, { fontSize: 14, bold: true, color: C.blue, align: "center" });
  text(slide, "27 ETFs", 868, 486, 302, 48, { fontSize: 35, bold: true, color: C.navy, align: "center" });
  text(slide, "from March 2011", 868, 542, 302, 28, { fontSize: 18, color: C.muted, align: "center" });
  callout(slide, "No backfilling. No synthetic history. Final optimization uses the core 23 only.", 170, 608, 940, 46, C.navy, C.paper, 17);
  addNotes(slide, 8);
}

// 9 - Preserve 2008
{
  const slide = presentation.slides.add();
  addTitle(slide, "Preserving 2008 adds a severe stress regime to the evidence", 9, "Why the core sample starts in 2008");
  addSectionMarker(slide, "SAMPLE DESIGN");
  line(slide, 114, 324, 1042, 6, C.line);
  const regimes = [
    ["2008-09", "Global crisis", C.coral],
    ["2009-19", "Recovery + low rates", C.teal],
    ["2020", "COVID shock", C.gold],
    ["2021-22", "Inflation shift", C.purple],
    ["2022-26", "Rapid tightening", C.blue],
  ];
  regimes.forEach(([period, title, color], i) => {
    const x = 116 + i * 254;
    circle(slide, x, 300, 54, color);
    text(slide, period, x - 22, 226, 98, 32, { fontSize: 17, bold: true, color, align: "center" });
    text(slide, title, x - 72, 382, 200, 54, { fontSize: 19, bold: true, color: C.navy, align: "center", valign: "middle" });
  });
  bullet(slide, "A 2011 start would remove the Global Financial Crisis", 116, 492, 520, { accent: C.coral, fontSize: 19 });
  bullet(slide, "The core choice was fixed before strategy results", 116, 548, 520, { accent: C.teal, fontSize: 19 });
  bullet(slide, "Stress coverage was prioritized over four extra ETFs", 672, 492, 500, { accent: C.gold, fontSize: 19 });
  bullet(slide, "This is not automatic missing-data deletion", 672, 548, 500, { accent: C.blue, fontSize: 19 });
  callout(slide, "Availability determined the universe - not ex-post performance.", 306, 614, 668, 42, C.navy, C.paper, 17);
  addNotes(slide, 9);
}

// 10 - Data source
{
  const slide = presentation.slides.add();
  addTitle(slide, "Adjusted prices support reproducible ETF return histories", 10, "Data source and price type");
  addSectionMarker(slide, "YAHOO FINANCE");
  rect(slide, 66, 150, 676, 430, C.paper, true, C.line, 1);
  label(slide, "WHAT THE PIPELINE USES", 94, 176, 230, C.paleBlue, C.blue);
  const items = [
    "Yahoo Finance accessed through yfinance",
    "Daily adjusted ETF price histories",
    "Adjustments reflect distributions and corporate actions",
    "Daily data converted to calendar month-end prices",
    "Frozen downloaded files retained for reproducibility",
  ];
  items.forEach((v, i) => bullet(slide, v, 96, 228 + i * 62, 610, { accent: [C.blue, C.teal, C.gold, C.coral, C.purple][i], fontSize: 19 }));
  rect(slide, 790, 150, 424, 430, C.navy, true);
  label(slide, "IMPORTANT LIMITATION", 834, 180, 210, "#173A57", C.gold);
  text(slide, "Accessible and reproducible", 832, 246, 338, 36, { fontSize: 22, bold: true, color: C.paper, align: "center" });
  text(slide, "but not equivalent to", 832, 296, 338, 30, { fontSize: 18, color: "#C4D3DE", align: "center" });
  text(slide, "Bloomberg, FactSet, or an institutional total-return database", 832, 350, 338, 106, { fontSize: 24, bold: true, color: C.gold, align: "center", valign: "middle" });
  line(slide, 842, 488, 318, 1, "#385067");
  text(slide, "A new live download may differ if the provider revises adjusted history.", 832, 510, 338, 52, { fontSize: 17, color: "#DCE6ED", align: "center", valign: "middle" });
  callout(slide, "Submitted results use the included frozen raw and processed artifacts.", 206, 606, 868, 46, C.paleGold, C.navy, 18);
  addNotes(slide, 10);
}

// 11 - Data quality
{
  const slide = presentation.slides.add();
  addTitle(slide, "Structural pre-inception gaps were never treated as zero returns", 11, "Data quality and cleaning");
  addSectionMarker(slide, "NO SYNTHETIC DATA");
  rect(slide, 54, 132, 800, 496, C.paper, true, C.line, 1);
  await image(slide, "missing_values_heatmap.png", 70, 148, 770, 438, "contain", "Missing daily ETF prices by year");
  text(slide, "Source: frozen data-quality output", 76, 596, 400, 18, { fontSize: 11, color: C.muted });
  line(slide, 882, 142, 2, 474, C.line);
  label(slide, "OBSERVED PATTERN", 920, 148, 190, C.paleBlue, C.blue);
  bullet(slide, "Missing cells are mainly pre-inception history", 916, 202, 304, { accent: C.blue, fontSize: 17, h: 58 });
  bullet(slide, "No within-lifetime missing observations", 916, 270, 304, { accent: C.teal, fontSize: 17, h: 48 });
  label(slide, "CLEANING RULES", 920, 340, 174, C.paleCoral, C.coral);
  text(slide, "No interpolation\nNo backfilling\nNo zero-return substitution\nIncomplete June 2026 removed", 916, 386, 300, 150, {
    fontSize: 19, bold: true, color: C.navy, lineSpacing: 1.18,
  });
  callout(slide, "Unavailable history is not a zero price and not a zero return.", 904, 554, 318, 66, C.navy, C.paper, 16);
  addNotes(slide, 11);
}

// 12 - Monthly returns
{
  const slide = presentation.slides.add();
  addTitle(slide, "Simple monthly returns drive portfolio wealth", 12, "Returns engine");
  addSectionMarker(slide, "RETURN DEFINITIONS");
  rect(slide, 66, 154, 520, 246, C.navy, true);
  label(slide, "SIMPLE MONTHLY RETURN", 102, 184, 230, "#173A57", C.gold);
  text(slide, "r(t) = P(t) / P(t-1) - 1", 100, 250, 452, 62, { fontSize: 32, bold: true, color: C.teal, align: "center", valign: "middle" });
  text(slide, "Month-end adjusted prices", 100, 330, 452, 32, { fontSize: 18, color: "#DCE6ED", align: "center" });
  rect(slide, 630, 154, 584, 246, C.paper, true, C.line, 1);
  label(slide, "WHY SIMPLE RETURNS?", 664, 184, 210, C.paleBlue, C.blue);
  bullet(slide, "Portfolio return is the weighted sum of asset simple returns", 666, 238, 510, { accent: C.blue, fontSize: 19, h: 62 });
  bullet(slide, "They compound directly into investor wealth", 666, 314, 510, { accent: C.teal, fontSize: 19, h: 46 });
  const cards = [
    ["LOG RETURNS", "Retained for diagnostics; not used for final portfolio wealth", C.blue],
    ["GEOMETRIC RETURN", "Reported performance reflects realized compounding", C.teal],
    ["SHARPE INPUT", "Uses annualized arithmetic mean excess return", C.gold],
  ];
  cards.forEach(([title, body, color], i) => {
    const x = 66 + i * 390;
    rect(slide, x, 446, 354, 148, C.paper, true, color, 1.5);
    text(slide, title, x + 18, 466, 318, 30, { fontSize: 16, bold: true, color, align: "center" });
    text(slide, body, x + 22, 510, 310, 66, { fontSize: 18, color: C.ink, align: "center", valign: "middle" });
  });
  callout(slide, "Geometric return and the arithmetic mean used in Sharpe are different quantities.", 166, 616, 948, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 12);
}

// 13 - Why monthly
{
  const slide = presentation.slides.add();
  addTitle(slide, "Monthly data balance responsiveness with implementability", 13, "Why this frequency?");
  addSectionMarker(slide, "MONTHLY REBALANCING");
  const options = [
    ["DAILY", "Too reactive", ["More noise", "Unnecessary turnover", "Unstable covariance"], C.coral],
    ["MONTHLY", "Chosen balance", ["Matches assignment", "Practical cadence", "Enough history", "Costs remain visible"], C.teal],
    ["ANNUAL", "Too slow", ["Few observations", "Poor adaptability", "Delayed response"], C.gold],
  ];
  options.forEach(([freq, verdict, items, color], i) => {
    const x = 66 + i * 394;
    const y = i === 1 ? 144 : 172;
    const h = i === 1 ? 438 : 386;
    rect(slide, x, y, 356, h, i === 1 ? C.navy : C.paper, true, color, i === 1 ? 3 : 1.5);
    text(slide, freq, x + 24, y + 28, 308, 44, { fontSize: 30, bold: true, color: i === 1 ? C.paper : C.navy, align: "center" });
    text(slide, verdict, x + 24, y + 86, 308, 34, { fontSize: 20, bold: true, color, align: "center" });
    line(slide, x + 38, y + 138, 280, 2, i === 1 ? "#385067" : C.line);
    items.forEach((item, j) => bullet(slide, item, x + 42, y + 166 + j * 58, 272, {
      accent: color,
      color: i === 1 ? C.paper : C.ink,
      fontSize: 18,
      h: 42,
    }));
  });
  callout(slide, "Quarterly rebalancing remains a future robustness test, not part of the frozen comparison.", 158, 610, 964, 46, C.paleGold, C.navy, 17);
  addNotes(slide, 13);
}

// 14 - Why 60 months
{
  const slide = presentation.slides.add();
  addTitle(slide, "A 60-month window balances estimation noise and regime adaptation", 14, "Why this estimation window?");
  addSectionMarker(slide, "PROJECT-SPECIFIC CHOICE");
  line(slide, 138, 324, 1004, 6, C.line);
  const marks = [
    [206, "12", "Too reactive", "Only 12 observations\nfor 23 assets", C.coral, 26],
    [642, "60", "Chosen balance", "Five years of data\nwith regime response", C.teal, 40],
    [1078, "120", "Too slow", "More stable, but stale\nand delays the backtest", C.gold, 26],
  ];
  marks.forEach(([x, value, title, body, color, radius]) => {
    circle(slide, x - radius, 327 - radius, radius * 2, color);
    text(slide, value, x - 55, 216, 110, 42, { fontSize: radius > 30 ? 32 : 24, bold: true, color, align: "center" });
    text(slide, "months", x - 55, 258, 110, 24, { fontSize: 14, color: C.muted, align: "center" });
    text(slide, title, x - 128, 388, 256, 38, { fontSize: 23, bold: true, color: C.navy, align: "center" });
    text(slide, body, x - 142, 438, 284, 78, { fontSize: 18, color: C.muted, align: "center", lineSpacing: 1.15 });
  });
  text(slide, "<- ADAPTABILITY INCREASES", 86, 574, 360, 26, { fontSize: 14, bold: true, color: C.coral });
  text(slide, "STABILITY INCREASES ->", 834, 574, 360, 26, { fontSize: 14, bold: true, color: C.gold, align: "right" });
  callout(slide, "A transparent compromise - not claimed to be universally optimal.", 292, 614, 696, 42, C.navy, C.paper, 17);
  addNotes(slide, 14);
}

// 15 - Walk-forward timing
{
  const slide = presentation.slides.add();
  addTitle(slide, "The realized return never enters its own estimation window", 15, "Walk-forward timing");
  addSectionMarker(slide, "NO LOOK-AHEAD");
  const blocks = [
    [70, 210, 280, "t-60 through t-1", "Use 60 completed monthly returns", C.blue],
    [416, 210, 220, "At t", "Estimate mean and covariance", C.teal],
    [702, 210, 220, "At t", "Calculate target weights", C.gold],
    [988, 210, 220, "At t+1", "Earn the next realized return", C.coral],
  ];
  [350, 636, 922].forEach((x) => arrow(slide, x + 12, 260, 54, 32, C.line));
  blocks.forEach(([x, y, w, title, body, color]) => {
    rect(slide, x, y, w, 170, C.paper, true, color, 2);
    text(slide, title, x + 18, y + 24, w - 36, 42, { fontSize: 24, bold: true, color, align: "center" });
    line(slide, x + 24, y + 80, w - 48, 2, C.line);
    text(slide, body, x + 22, y + 98, w - 44, 54, { fontSize: 18, color: C.navy, align: "center", valign: "middle" });
  });
  callout(slide, "Decision information", 84, 426, 538, 44, C.paleBlue, C.navy, 17);
  callout(slide, "Future outcome", 674, 426, 532, 44, C.paleCoral, C.navy, 17);
  line(slide, 646, 194, 2, 298, C.gold);
  text(slide, "INFORMATION BOUNDARY", 552, 510, 190, 24, { fontSize: 13, bold: true, color: C.gold, align: "center" });
  bullet(slide, "The estimator ends strictly before the weight date", 146, 554, 500, { accent: C.blue, fontSize: 19 });
  bullet(slide, "The new portfolio is held during the following month", 678, 554, 500, { accent: C.coral, fontSize: 19 });
  callout(slide, "The return earned after the decision cannot help create that decision.", 220, 616, 840, 40, C.navy, C.paper, 17);
  addNotes(slide, 15);
}

// 16 - Start date
{
  const slide = presentation.slides.add();
  addTitle(slide, "The first common realized month is March 2013", 16, "Why the final period starts here");
  addSectionMarker(slide, "159 REALIZED MONTHS");
  const steps = [
    ["31 Jan 2008", "Core price panel begins", C.blue],
    ["Feb 2008", "First monthly return", C.teal],
    ["Feb 2013", "60th completed return and first weight date", C.gold],
    ["31 Mar 2013", "First out-of-sample realized portfolio return", C.coral],
    ["31 May 2026", "Final complete month", C.purple],
  ];
  line(slide, 104, 332, 1074, 6, C.line);
  steps.forEach(([date, body, color], i) => {
    const x = 92 + i * 254;
    circle(slide, x, 305, 58, color);
    text(slide, date, x - 46, 220, 150, 36, { fontSize: 18, bold: true, color, align: "center" });
    text(slide, body, x - 66, 392, 190, 86, { fontSize: 17, color: C.navy, align: "center", valign: "middle" });
  });
  rect(slide, 270, 522, 740, 78, C.paper, true, C.teal, 2);
  text(slide, "31 March 2013  ->  31 May 2026", 296, 536, 688, 30, { fontSize: 26, bold: true, color: C.navy, align: "center" });
  text(slide, "159 identical realized months for every final strategy", 296, 568, 688, 24, { fontSize: 17, bold: true, color: C.teal, align: "center" });
  callout(slide, "February 2013 is a decision date; March 2013 is the first month that earns return.", 154, 616, 972, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 16);
}

// 17 - Rebalancing mechanics
{
  const slide = presentation.slides.add();
  addTitle(slide, "Turnover is measured from drifted holdings to the new target", 17, "Monthly rebalancing mechanics");
  addSectionMarker(slide, "DRIFT-AWARE TURNOVER");
  const stages = [
    [72, "STARTING TARGET", [["SPY", "20%"], ["TLT", "20%"]], C.blue],
    [454, "AFTER MARKET DRIFT", [["SPY", "23%"], ["TLT", "18%"]], C.gold],
    [836, "NEW TARGET", [["SPY", "25%"], ["TLT", "17%"]], C.teal],
  ];
  arrow(slide, 374, 286, 64, 36, C.line);
  arrow(slide, 756, 286, 64, 36, C.line);
  stages.forEach(([x, title, rows, color]) => {
    rect(slide, x, 178, 310, 284, C.paper, true, color, 2);
    text(slide, title, x + 20, 198, 270, 30, { fontSize: 16, bold: true, color, align: "center" });
    line(slide, x + 28, 242, 254, 2, C.line);
    rows.forEach(([ticker, weight], i) => {
      const y = 278 + i * 82;
      text(slide, ticker, x + 36, y, 100, 42, { fontSize: 25, bold: true, color: C.navy, valign: "middle" });
      text(slide, weight, x + 154, y, 110, 42, { fontSize: 30, bold: true, color, align: "right", valign: "middle" });
    });
  });
  rect(slide, 190, 504, 900, 86, C.navy, true);
  text(slide, "Trade only the differences", 220, 518, 320, 30, { fontSize: 23, bold: true, color: C.paper });
  text(slide, "SPY: +2 percentage points    |    TLT: -1 percentage point", 554, 518, 506, 46, { fontSize: 20, bold: true, color: C.gold, align: "center", valign: "middle" });
  callout(slide, "Target-to-target changes alone would ignore the return-driven drift between rebalances.", 152, 614, 976, 42, C.paleGold, C.navy, 16);
  addNotes(slide, 17);
}

// 18 - Transaction costs
{
  const slide = presentation.slides.add();
  addTitle(slide, "Five basis points are charged only on the traded fraction", 18, "Transaction-cost mechanics");
  addSectionMarker(slide, "ONE-WAY COST");
  rect(slide, 66, 154, 548, 266, C.navy, true);
  label(slide, "FORMULA", 96, 182, 120, "#173A57", C.gold);
  text(slide, "cost = turnover x 0.0005", 94, 246, 492, 64, { fontSize: 33, bold: true, color: C.teal, align: "center", valign: "middle" });
  text(slide, "5 bps = 0.05%", 94, 330, 492, 34, { fontSize: 21, color: "#DCE6ED", align: "center" });
  rect(slide, 658, 154, 556, 266, C.paper, true, C.line, 1);
  label(slide, "NUMERICAL EXAMPLE", 692, 182, 210, C.paleBlue, C.blue);
  text(slide, "10% one-way turnover", 694, 242, 486, 40, { fontSize: 25, bold: true, color: C.navy, align: "center" });
  text(slide, "x 0.05% trading cost", 694, 292, 486, 34, { fontSize: 20, color: C.muted, align: "center" });
  line(slide, 772, 340, 330, 2, C.line);
  text(slide, "= 0.005% of portfolio value", 694, 356, 486, 42, { fontSize: 24, bold: true, color: C.coral, align: "center" });
  addTwoColumnBullets(slide,
    { title: "WHAT IS CHARGED", accent: C.teal, fill: C.paleTeal, items: ["Only the traded wealth fraction", "Every ongoing rebalance", "Same rule for every final strategy"] },
    { title: "WHAT IS NOT MODELED", accent: C.coral, fill: C.paleCoral, items: ["Taxes and market impact", "Time-varying spreads or liquidity", "Brokerage minimum fees"] },
    { top: 458, bottom: 630, fontSize: 16 },
  );
  callout(slide, "Initial establishment is excluded from turnover averages.", 298, 620, 684, 38, C.paleGold, C.navy, 16);
  addNotes(slide, 18);
}

// 19 - Why 5 bps
{
  const slide = presentation.slides.add();
  addTitle(slide, "Five basis points provide a modest, consistent implementation penalty", 19, "Why this cost assumption?");
  addSectionMarker(slide, "COMPARABILITY ASSUMPTION");
  const reasons = [
    ["01", "Liquid ETF proxy", "A modest trading-cost assumption for accessible funds", C.blue],
    ["02", "Implementation penalty", "High-turnover rules do not trade for free", C.teal],
    ["03", "Constant across strategies", "Trading intensity is penalized consistently", C.gold],
    ["04", "Transparent simplification", "Easy to reproduce and audit", C.coral],
  ];
  reasons.forEach(([n, title, body, color], i) => {
    const x = 66 + i * 294;
    rect(slide, x, 184, 252, 300, C.paper, true, color, 2);
    text(slide, n, x + 18, 204, 52, 30, { fontSize: 19, bold: true, color });
    line(slide, x + 18, 248, 216, 4, color);
    text(slide, title, x + 20, 278, 212, 70, { fontSize: 23, bold: true, color: C.navy, align: "center", valign: "middle" });
    text(slide, body, x + 22, 370, 208, 82, { fontSize: 18, color: C.muted, align: "center", valign: "middle" });
  });
  callout(slide, "Not a universal market estimate: costs vary by ETF, trade size, and market regime.", 162, 532, 956, 72, C.navy, C.paper, 21);
  text(slide, "Future check: time-varying, asset-specific transaction costs.", 226, 620, 828, 26, { fontSize: 17, bold: true, color: C.coral, align: "center" });
  addNotes(slide, 19);
}

// 20 - Why benchmarks
{
  const slide = presentation.slides.add();
  addTitle(slide, "Complexity has value only relative to credible simple benchmarks", 20, "Benchmark portfolios");
  addSectionMarker(slide, "TRANSPARENT BASELINES");
  addTwoColumnBullets(slide,
    {
      title: "EQUAL WEIGHT",
      accent: C.blue,
      fill: C.paleBlue,
      items: ["No forecasts", "Maximum capital-weight breadth", "Complete core opportunity set", "Easy to explain and reproduce"],
    },
    {
      title: "60/40",
      accent: C.gold,
      fill: C.paleGold,
      items: ["Traditional balanced allocation", "Growth plus defensive sleeves", "No optimizer or covariance estimate", "Familiar implementation standard"],
    },
    { top: 164, bottom: 544, fontSize: 20 },
  );
  rect(slide, 174, 558, 932, 76, C.navy, true);
  text(slide, "A complex model must improve on rules that have no estimation error.", 204, 574, 872, 44, { fontSize: 23, bold: true, color: C.paper, align: "center", valign: "middle" });
  addNotes(slide, 20);
}

// 21 - Equal Weight construction
{
  const slide = presentation.slides.add();
  addTitle(slide, "Equal Weight assigns 1/23 to every core ETF", 21, "How the benchmark is constructed");
  addSectionMarker(slide, "1/N BENCHMARK");
  rect(slide, 66, 156, 430, 430, C.navy, true);
  label(slide, "TARGET WEIGHT", 112, 190, 176, "#173A57", C.gold);
  text(slide, "1 / 23", 104, 258, 354, 80, { fontSize: 54, bold: true, color: C.teal, align: "center" });
  text(slide, "approximately 4.35%\nper ETF", 104, 354, 354, 84, { fontSize: 26, bold: true, color: C.paper, align: "center", lineSpacing: 1.15 });
  text(slide, "23 effective assets\nby construction", 104, 474, 354, 68, { fontSize: 20, color: C.gold, align: "center" });
  label(slide, "IMPLEMENTATION", 562, 166, 176, C.paleBlue, C.blue);
  const items = [
    "Every core ETF receives identical target capital",
    "Monthly drift-aware rebalancing",
    "Same realized dates and 5-bps cost convention",
    "No expected-return or covariance estimation",
    "Equal capital does not mean equal risk contribution",
  ];
  items.forEach((v, i) => bullet(slide, v, 558, 224 + i * 66, 648, { accent: [C.blue, C.teal, C.gold, C.coral, C.purple][i], fontSize: 19, h: 54 }));
  callout(slide, "A broad capital allocation benchmark - not a risk-parity portfolio.", 528, 578, 686, 56, C.paleGold, C.navy, 18);
  addNotes(slide, 21);
}

// 22 - 60/40 construction
{
  const slide = presentation.slides.add();
  addTitle(slide, "The 60/40 benchmark uses only equity and government-bond sleeves", 22, "How the benchmark is constructed");
  addSectionMarker(slide, "TRADITIONAL BALANCED MIX");
  rect(slide, 74, 166, 696, 104, C.paper, true, C.line, 1);
  rect(slide, 74, 166, 418, 104, C.blue, true);
  text(slide, "60% EQUITIES", 92, 192, 382, 48, { fontSize: 29, bold: true, color: C.paper, align: "center", valign: "middle" });
  rect(slide, 492, 166, 278, 104, C.gold, true);
  text(slide, "40% BONDS", 510, 192, 242, 48, { fontSize: 27, bold: true, color: C.navy, align: "center", valign: "middle" });
  rect(slide, 74, 304, 696, 230, C.paper, true, C.line, 1);
  text(slide, "9 equity ETFs", 104, 330, 270, 34, { fontSize: 22, bold: true, color: C.blue, align: "center" });
  text(slide, "60% / 9 = 6.67% each", 104, 382, 270, 38, { fontSize: 24, bold: true, color: C.navy, align: "center" });
  line(slide, 402, 326, 2, 168, C.line);
  text(slide, "5 government-bond ETFs", 432, 330, 308, 34, { fontSize: 22, bold: true, color: C.gold, align: "center" });
  text(slide, "40% / 5 = 8.00% each", 432, 382, 308, 38, { fontSize: 24, bold: true, color: C.navy, align: "center" });
  text(slide, "Zero benchmark weight", 104, 458, 636, 28, { fontSize: 16, bold: true, color: C.coral, align: "center" });
  text(slide, "Credit  |  Commodities  |  Real estate  |  Cash", 104, 492, 636, 28, { fontSize: 18, color: C.muted, align: "center" });
  line(slide, 814, 156, 2, 428, C.line);
  label(slide, "WHY USE IT?", 862, 170, 144, C.paleGold, "#946C18");
  bullet(slide, "Familiar policy portfolio", 854, 224, 350, { accent: C.gold, fontSize: 19 });
  bullet(slide, "Clear growth-defense split", 854, 286, 350, { accent: C.blue, fontSize: 19 });
  bullet(slide, "No forecast or optimizer", 854, 348, 350, { accent: C.teal, fontSize: 19 });
  bullet(slide, "Same monthly costs and dates", 854, 410, 350, { accent: C.coral, fontSize: 19 });
  callout(slide, "Limitation: it does not use the complete opportunity set.", 844, 500, 370, 66, C.navy, C.paper, 18);
  addNotes(slide, 22);
}

// 23 - Markowitz overview
{
  const slide = presentation.slides.add();
  addTitle(slide, "Markowitz converts forecasts, covariance, and constraints into weights", 23, "Classical mean-variance optimization");
  addSectionMarker(slide, "INPUTS -> DECISION");
  const inputs = [
    [72, "EXPECTED RETURNS", "mu", "Reward estimate", C.blue],
    [344, "COVARIANCE", "Sigma", "Risk and co-movement", C.teal],
    [616, "CONSTRAINTS", "C", "Investability rules", C.gold],
  ];
  inputs.forEach(([x, title, symbol, body, color]) => {
    rect(slide, x, 188, 230, 214, C.paper, true, color, 2);
    text(slide, title, x + 16, 208, 198, 28, { fontSize: 14, bold: true, color, align: "center" });
    text(slide, symbol, x + 16, 260, 198, 58, { fontSize: 38, bold: true, color: C.navy, align: "center" });
    text(slide, body, x + 18, 334, 194, 40, { fontSize: 17, color: C.muted, align: "center" });
  });
  arrow(slide, 862, 274, 70, 42, C.line);
  rect(slide, 954, 178, 258, 234, C.navy, true);
  label(slide, "OUTPUT", 1018, 202, 128, "#173A57", C.gold);
  text(slide, "w*", 984, 256, 198, 64, { fontSize: 46, bold: true, color: C.teal, align: "center" });
  text(slide, "Portfolio weights", 984, 338, 198, 32, { fontSize: 20, bold: true, color: C.paper, align: "center" });
  const objectives = [
    ["Minimum Variance", "Minimize risk", C.blue],
    ["Maximum Sharpe", "Maximize excess return per risk", C.teal],
    ["Target Volatility", "Maximize return under a risk ceiling", C.coral],
  ];
  objectives.forEach(([title, body, color], i) => {
    const x = 74 + i * 388;
    rect(slide, x, 470, 350, 116, C.paper, true, color, 1.5);
    text(slide, title, x + 18, 488, 314, 30, { fontSize: 20, bold: true, color, align: "center" });
    text(slide, body, x + 20, 532, 310, 34, { fontSize: 17, color: C.navy, align: "center", valign: "middle" });
  });
  callout(slide, "The framework is disciplined; the inputs remain estimated and noisy.", 234, 614, 812, 42, C.paleGold, C.navy, 17);
  addNotes(slide, 23);
}

// 24 - Minimum variance
{
  const slide = presentation.slides.add();
  addTitle(slide, "Minimum Variance buys stability, not high expected return", 24, "Markowitz objective 1");
  addSectionMarker(slide, "DEFENSIVE OBJECTIVE");
  rect(slide, 66, 154, 466, 420, C.navy, true);
  label(slide, "OBJECTIVE", 102, 184, 132, "#173A57", C.gold);
  text(slide, "minimize", 102, 246, 394, 36, { fontSize: 22, color: "#DCE6ED", align: "center" });
  text(slide, "w' Sigma w", 102, 294, 394, 62, { fontSize: 36, bold: true, color: C.teal, align: "center" });
  line(slide, 106, 380, 386, 1, "#385067");
  text(slide, "Uses covariance + constraints", 102, 404, 394, 34, { fontSize: 19, bold: true, color: C.paper, align: "center" });
  text(slide, "Does not use expected returns", 102, 452, 394, 34, { fontSize: 19, bold: true, color: C.gold, align: "center" });
  label(slide, "EXPECTED BEHAVIOR", 590, 158, 196, C.paleBlue, C.blue);
  bullet(slide, "Favors low-volatility, low-correlation assets", 584, 214, 604, { accent: C.blue, fontSize: 19 });
  bullet(slide, "Can concentrate in cash and short bonds", 584, 274, 604, { accent: C.teal, fontSize: 19 });
  bullet(slide, "Suitable for capital preservation", 584, 334, 604, { accent: C.gold, fontSize: 19 });
  label(slide, "PROJECT RESULT", 590, 408, 174, C.paleCoral, C.coral);
  metric(slide, "2.25-2.31%", "Annualized return", 584, 456, 190, C.blue);
  metric(slide, "2.77-2.88%", "Volatility", 790, 456, 190, C.teal);
  metric(slide, "0.096-0.114", "Sharpe", 996, 456, 190, C.coral);
  callout(slide, "Low Sharpe: realized return stayed close to the 2% reference rate.", 210, 614, 860, 42, C.paleGold, C.navy, 16);
  addNotes(slide, 24);
}

// 25 - Maximum Sharpe
{
  const slide = presentation.slides.add();
  addTitle(slide, "Maximum Sharpe achieved the best realized risk-adjusted result", 25, "Markowitz objective 2");
  addSectionMarker(slide, "BEST SHARPE: 0.922");
  rect(slide, 60, 142, 472, 470, C.navy, true);
  label(slide, "OBJECTIVE", 92, 170, 132, "#173A57", C.gold);
  text(slide, "maximize expected excess return\nper unit of portfolio risk", 90, 226, 410, 86, { fontSize: 24, bold: true, color: C.paper, align: "center", valign: "middle" });
  text(slide, "Uses mu + Sigma + 2% risk-free rate", 90, 338, 410, 40, { fontSize: 19, color: C.teal, align: "center" });
  line(slide, 102, 396, 386, 1, "#385067");
  bullet(slide, "Noisy expected returns", 100, 420, 380, { accent: C.coral, color: C.paper, fontSize: 18 });
  bullet(slide, "Concentrated weights", 100, 472, 380, { accent: C.gold, color: C.paper, fontSize: 18 });
  bullet(slide, "High rebalancing demand", 100, 524, 380, { accent: C.teal, color: C.paper, fontSize: 18 });
  rect(slide, 574, 142, 640, 312, C.paper, true, C.line, 1);
  await image(slide, "markowitz_weight_heatmap_max_sharpe.png", 588, 156, 612, 280, "contain", "Rolling Maximum Sharpe weight heatmap");
  text(slide, "Saved rolling weights show concentration and time variation.", 600, 426, 590, 20, { fontSize: 12, color: C.muted, align: "center" });
  metric(slide, "9.86%", "Annualized return", 574, 482, 196, C.blue);
  metric(slide, "8.45%", "Volatility", 788, 482, 196, C.teal);
  metric(slide, "88.06%", "Annualized turnover", 1002, 482, 212, C.coral);
  callout(slide, "Ledoit-Wolf delivered the highest realized Sharpe.", 286, 616, 708, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 25);
}

// 26 - Target Volatility
{
  const slide = presentation.slides.add();
  addTitle(slide, "Target Volatility reached the highest wealth by accepting more risk", 26, "Markowitz objective 3");
  addSectionMarker(slide, "10% EX-ANTE TARGET");
  rect(slide, 66, 154, 500, 378, C.navy, true);
  label(slide, "OBJECTIVE", 102, 184, 132, "#173A57", C.gold);
  text(slide, "maximize expected return", 100, 246, 432, 44, { fontSize: 28, bold: true, color: C.paper, align: "center" });
  text(slide, "subject to", 100, 310, 432, 28, { fontSize: 18, color: "#DCE6ED", align: "center" });
  text(slide, "estimated annual volatility <= 10%", 100, 356, 432, 64, { fontSize: 25, bold: true, color: C.teal, align: "center", valign: "middle" });
  line(slide, 112, 452, 408, 1, "#385067");
  text(slide, "Moderate project-specific ceiling", 100, 474, 432, 34, { fontSize: 19, bold: true, color: C.gold, align: "center" });
  label(slide, "WHY 10%?", 630, 160, 130, C.paleBlue, C.blue);
  bullet(slide, "Comparable to balanced portfolios", 624, 214, 570, { accent: C.blue, fontSize: 19 });
  bullet(slide, "Allows meaningful risky-asset participation", 624, 274, 570, { accent: C.teal, fontSize: 19 });
  bullet(slide, "Prevents unconstrained risk escalation", 624, 334, 570, { accent: C.gold, fontSize: 19 });
  label(slide, "REALIZED RESULT - LEDOIT-WOLF", 630, 408, 294, C.paleCoral, C.coral);
  metric(slide, "11.38%", "Annualized return", 624, 456, 180, C.coral);
  metric(slide, "11.63%", "Realized volatility", 822, 456, 180, C.gold);
  metric(slide, "4.17", "Final wealth", 1020, 456, 180, C.teal);
  callout(slide, "An ex-ante 10% constraint cannot guarantee 10% realized future volatility.", 170, 616, 940, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 26);
}

// 27 - Constraints
{
  const slide = presentation.slides.add();
  addTitle(slide, "Constraints turn mathematical optima into interpretable portfolios", 27, "Why these implementation rules?");
  addSectionMarker(slide, "MARKOWITZ + MICHAUD");
  const rules = [
    ["Weights sum to 1", "Fully invested", C.blue],
    ["Minimum weight 0%", "Long only; no short selling", C.teal],
    ["Maximum weight 25%", "Limits estimation-driven corner solutions", C.gold],
    ["No leverage", "Comparable, investable risk", C.coral],
  ];
  rules.forEach(([rule, reason, color], i) => {
    const y = 164 + i * 102;
    rect(slide, 78, y, 420, 76, C.navy, true);
    text(slide, rule, 104, y + 16, 368, 44, { fontSize: 23, bold: true, color: C.paper, align: "center", valign: "middle" });
    arrow(slide, 520, y + 22, 64, 32, C.line);
    rect(slide, 608, y, 584, 76, C.paper, true, color, 1.5);
    text(slide, reason, 632, y + 14, 536, 48, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "middle" });
  });
  rect(slide, 78, 580, 520, 72, C.paleBlue, true, C.blue, 1);
  text(slide, "WHY NOT TIGHTER?", 96, 592, 176, 18, { fontSize: 12, bold: true, color: C.blue });
  text(slide, "A much lower cap forces quasi-equal weighting.", 278, 590, 302, 42, { fontSize: 16, color: C.navy, align: "center", valign: "middle" });
  rect(slide, 672, 580, 520, 72, C.paleCoral, true, C.coral, 1);
  text(slide, "WHY NOT UNCAPPED?", 690, 592, 184, 18, { fontSize: 12, bold: true, color: C.coral });
  text(slide, "No cap allows noisy estimates to dominate.", 880, 590, 294, 42, { fontSize: 16, color: C.navy, align: "center", valign: "middle" });
  addNotes(slide, 27);
}

// 28 - Sample covariance
{
  const slide = presentation.slides.add();
  addTitle(slide, "A 23-asset sample covariance is noisy with only 60 observations", 28, "Covariance estimation problem");
  addSectionMarker(slide, "23 x 23 FROM 60 MONTHS");
  rect(slide, 54, 136, 740, 482, C.paper, true, C.line, 1);
  await image(slide, "correlation_heatmap_core.png", 68, 150, 712, 432, "contain", "Core-universe return correlation heatmap");
  text(slide, "Frozen core-universe correlation output", 76, 590, 420, 18, { fontSize: 11, color: C.muted });
  line(slide, 824, 146, 2, 462, C.line);
  label(slide, "WHY IT MATTERS", 864, 154, 170, C.paleBlue, C.blue);
  bullet(slide, "Variances and correlations contain sampling noise", 858, 208, 356, { accent: C.blue, fontSize: 17, h: 58 });
  bullet(slide, "Optimization amplifies small input errors", 858, 280, 356, { accent: C.teal, fontSize: 17, h: 54 });
  bullet(slide, "Poor conditioning creates unstable weights", 858, 348, 356, { accent: C.gold, fontSize: 17, h: 54 });
  bullet(slide, "Equity clustering limits naive diversification", 858, 416, 356, { accent: C.coral, fontSize: 17, h: 54 });
  callout(slide, "The sample estimator is valid - but high-variance in a short window.", 846, 510, 378, 82, C.navy, C.paper, 17);
  addNotes(slide, 28);
}

// 29 - Ledoit-Wolf mechanics
{
  const slide = presentation.slides.add();
  addTitle(slide, "Ledoit-Wolf trades a little bias for much lower estimation variance", 29, "Covariance shrinkage");
  addSectionMarker(slide, "ESTIMATOR - NOT OBJECTIVE");
  rect(slide, 70, 176, 300, 210, C.paper, true, C.coral, 2);
  text(slide, "SAMPLE\nCOVARIANCE", 96, 212, 248, 72, { fontSize: 27, bold: true, color: C.navy, align: "center", valign: "middle" });
  text(slide, "Detailed but noisy", 96, 316, 248, 30, { fontSize: 18, color: C.coral, align: "center" });
  text(slide, "+", 398, 238, 60, 60, { fontSize: 42, bold: true, color: C.gold, align: "center" });
  rect(slide, 486, 176, 300, 210, C.paper, true, C.blue, 2);
  text(slide, "STRUCTURED\nTARGET", 512, 212, 248, 72, { fontSize: 27, bold: true, color: C.navy, align: "center", valign: "middle" });
  text(slide, "Stable but simplified", 512, 316, 248, 30, { fontSize: 18, color: C.blue, align: "center" });
  arrow(slide, 818, 250, 82, 42, C.line);
  rect(slide, 930, 156, 282, 250, C.navy, true);
  label(slide, "LEDOIT-WOLF", 992, 184, 158, "#173A57", C.gold);
  text(slide, "Weighted\ncombination", 960, 246, 222, 74, { fontSize: 29, bold: true, color: C.teal, align: "center", valign: "middle" });
  text(slide, "Data-driven shrinkage intensity", 960, 338, 222, 42, { fontSize: 17, color: C.paper, align: "center" });
  const chain = [
    ["Small bias", C.coral], ["Lower estimation variance", C.teal], ["Better conditioning", C.blue], ["More stable risk input", C.gold],
  ];
  chain.forEach(([value, color], i) => {
    const x = 94 + i * 286;
    rect(slide, x, 470, 240, 74, C.paper, true, color, 1.5);
    text(slide, value, x + 14, 486, 212, 42, { fontSize: 19, bold: true, color: C.navy, align: "center", valign: "middle" });
    if (i < chain.length - 1) arrow(slide, x + 246, 491, 34, 28, C.line);
  });
  callout(slide, "The Markowitz objective stays unchanged; only the covariance input is stabilized.", 150, 600, 980, 54, C.paleGold, C.navy, 18);
  addNotes(slide, 29);
}

// 30 - Ledoit-Wolf results
{
  const slide = presentation.slides.add();
  addTitle(slide, "Shrinkage improved the strongest Markowitz implementation", 30, "What changed in the results?");
  addSectionMarker(slide, "SAMPLE VS LEDOIT-WOLF");
  const rows = [
    ["Min Variance", "0.096 -> 0.114", "26.06% -> 23.46%", "4.71 -> 5.35"],
    ["Max Sharpe", "0.909 -> 0.922", "99.14% -> 88.06%", "4.50 -> 4.77"],
    ["Target Volatility", "0.822 -> 0.818", "103.94% -> 98.66%", "4.50 -> 4.52"],
  ];
  addTable(slide, ["Strategy", "Sharpe", "Annualized turnover", "Effective assets"], rows, 96, 170, [300, 240, 300, 250], 86, { fontSize: 18, headerFontSize: 16 });
  const insights = [
    ["MAXIMUM SHARPE", "Higher Sharpe, lower turnover, slightly broader weights", C.teal],
    ["MINIMUM VARIANCE", "Small Sharpe improvement and meaningful turnover reduction", C.blue],
    ["TARGET VOLATILITY", "Lower turnover, but no Sharpe improvement", C.gold],
  ];
  insights.forEach(([title, body, color], i) => {
    const x = 84 + i * 382;
    rect(slide, x, 500, 348, 104, C.paper, true, color, 1.5);
    text(slide, title, x + 16, 516, 316, 24, { fontSize: 14, bold: true, color, align: "center" });
    text(slide, body, x + 18, 548, 312, 42, { fontSize: 17, color: C.navy, align: "center", valign: "middle" });
  });
  callout(slide, "Useful here - not proof of universal dominance.", 342, 616, 596, 40, C.navy, C.paper, 16);
  addNotes(slide, 30);
}

// 31 - Why Michaud
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud was required because one estimated frontier is fragile", 31, "Resampled efficient frontier");
  addSectionMarker(slide, "MARKOWITZ ENIGMA");
  const chain = [
    ["INPUTS LOOK PRECISE", "Estimated means and covariance", C.blue],
    ["BUT ARE UNCERTAIN", "Sampling error remains", C.coral],
    ["OPTIMIZER AMPLIFIES", "Favors extreme estimates", C.gold],
    ["WEIGHTS BECOME FRAGILE", "Concentration and turnover", C.teal],
  ];
  chain.forEach(([title, body, color], i) => {
    const x = 64 + i * 294;
    rect(slide, x, 202, 252, 224, C.paper, true, color, 2);
    text(slide, String(i + 1).padStart(2, "0"), x + 18, 220, 50, 26, { fontSize: 16, bold: true, color });
    text(slide, title, x + 20, 266, 212, 62, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "middle" });
    text(slide, body, x + 22, 350, 208, 48, { fontSize: 17, color: C.muted, align: "center", valign: "middle" });
    if (i < 3) arrow(slide, x + 258, 294, 30, 26, C.line);
  });
  rect(slide, 128, 486, 1024, 106, C.navy, true);
  text(slide, "Michaud response", 162, 506, 240, 30, { fontSize: 18, bold: true, color: C.gold });
  text(slide, "Average optimized portfolios across plausible capital-market assumptions.", 408, 506, 708, 52, { fontSize: 24, bold: true, color: C.paper, align: "center", valign: "middle" });
  text(slide, "An extension of Markowitz - not an unrelated strategy.", 408, 562, 708, 20, { fontSize: 15, color: C.teal, align: "center" });
  callout(slide, "Resampling moderates dependence on one noisy efficient frontier.", 280, 616, 720, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 31);
}

// 32 - Michaud steps
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud averages decisions across plausible inputs", 32, "How the method works");
  addSectionMarker(slide, "SIX-STEP CYCLE");
  const steps = [
    ["01", "Estimate", "mu and Sigma from prior 60 months", C.blue],
    ["02", "Simulate", "one plausible market assumption set", C.teal],
    ["03", "Optimize", "constrained Maximum Sharpe", C.gold],
    ["04", "Repeat", "M independent scenarios", C.coral],
    ["05", "Average", "component weights across solutions", C.purple],
    ["06", "Hold", "averaged portfolio next month", C.green],
  ];
  [0, 1, 2, 3, 4].forEach((i) => arrow(slide, 246 + i * 202, 292, 34, 26, C.line));
  steps.forEach(([n, title, body, color], i) => {
    const x = 54 + i * 202;
    rect(slide, x, 208, 184, 218, C.paper, true, color, 2);
    text(slide, n, x + 14, 224, 40, 24, { fontSize: 14, bold: true, color });
    text(slide, title, x + 16, 268, 152, 36, { fontSize: 22, bold: true, color: C.navy, align: "center" });
    text(slide, body, x + 18, 328, 148, 70, { fontSize: 16, color: C.muted, align: "center", valign: "middle" });
  });
  rect(slide, 92, 476, 1096, 116, C.navy, true);
  text(slide, "Final weight for asset i", 122, 496, 330, 26, { fontSize: 17, bold: true, color: C.gold });
  text(slide, "w(i) = average of w(i,1) ... w(i,M)", 468, 492, 680, 48, { fontSize: 30, bold: true, color: C.teal, align: "center" });
  text(slide, "The future return is never part of the simulation or estimation window.", 264, 552, 752, 26, { fontSize: 17, color: C.paper, align: "center" });
  callout(slide, "Average portfolio decisions - not future outcomes.", 368, 616, 544, 40, C.paleGold, C.navy, 16);
  addNotes(slide, 32);
}

// 33 - What was resampled
{
  const slide = presentation.slides.add();
  addTitle(slide, "The code resampled capital-market assumptions, not historical rows", 33, "Verified Michaud implementation");
  addSectionMarker(slide, "NORMAL SAMPLING THEORY");
  addTwoColumnBullets(slide,
    {
      title: "WHAT WAS SIMULATED",
      accent: C.teal,
      fill: C.paleTeal,
      items: [
        "Expected-return vectors from their sampling distribution",
        "Covariance realizations consistent with Sigma and sample size",
        "One constrained Maximum Sharpe solution per scenario",
        "Same long-only, no-leverage, 25% cap rules",
      ],
    },
    {
      title: "WHAT IT WAS NOT",
      accent: C.coral,
      fill: C.paleCoral,
      items: [
        "Not a simple bootstrap of historical rows",
        "Not a simulation of future realized returns",
        "Not an unconstrained efficient frontier",
        "Not a claim that returns are perfectly normal",
      ],
    },
    { top: 158, bottom: 548, fontSize: 18 },
  );
  rect(slide, 128, 556, 1024, 78, C.navy, true);
  text(slide, "Reproducibility", 160, 572, 220, 32, { fontSize: 20, bold: true, color: C.gold });
  text(slide, "Random seed 42 + deterministic seed sequences at each rebalance", 398, 570, 716, 34, { fontSize: 21, bold: true, color: C.paper, align: "center", valign: "middle" });
  addNotes(slide, 33);
}

// 34 - Resample counts
{
  const slide = presentation.slides.add();
  addTitle(slide, "Three resample counts reveal Monte Carlo convergence", 34, "Why 100, 250, and 500?");
  addSectionMarker(slide, "CONVERGENCE CHECK");
  const counts = [
    ["100", "Fastest", "More Monte Carlo variation", "91.53% turnover", C.coral],
    ["250", "Intermediate", "Convergence checkpoint", "81.45% turnover", C.gold],
    ["500", "Primary", "Results largely stabilized", "78.00% turnover", C.teal],
  ];
  counts.forEach(([n, title, body, turnover, color], i) => {
    const x = 84 + i * 382;
    const y = i === 2 ? 154 : 180;
    const h = i === 2 ? 392 : 340;
    rect(slide, x, y, 344, h, i === 2 ? C.navy : C.paper, true, color, i === 2 ? 3 : 1.5);
    text(slide, n, x + 32, y + 28, 280, 72, { fontSize: 54, bold: true, color, align: "center" });
    text(slide, "resamples", x + 32, y + 100, 280, 28, { fontSize: 16, color: i === 2 ? C.paper : C.muted, align: "center" });
    line(slide, x + 42, y + 150, 260, 2, i === 2 ? "#385067" : C.line);
    text(slide, title, x + 32, y + 176, 280, 38, { fontSize: 24, bold: true, color: i === 2 ? C.paper : C.navy, align: "center" });
    text(slide, body, x + 34, y + 230, 276, 48, { fontSize: 18, color: i === 2 ? "#DCE6ED" : C.muted, align: "center", valign: "middle" });
    text(slide, turnover, x + 34, y + h - 58, 276, 28, { fontSize: 19, bold: true, color, align: "center" });
  });
  callout(slide, "The marginal changes became small; more simulation would add cost, not a new conclusion.", 156, 600, 968, 56, C.paleGold, C.navy, 18);
  addNotes(slide, 34);
}

// 35 - Michaud vs Maximum Sharpe
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud sacrificed little Sharpe and improved implementation", 35, "Maximum Sharpe vs Michaud 500");
  addSectionMarker(slide, "FOCUSED COMPARISON");
  const headers = ["Metric", "Max Sharpe Ledoit-Wolf", "Michaud 500", "Interpretation"];
  const rows = [
    ["Return", "9.86%", "9.23%", "Small return sacrifice"],
    ["Volatility", "8.45%", "7.98%", "Slightly lower realized risk"],
    ["Sharpe", "0.922", "0.900", "Near-leading risk-adjusted result"],
    ["Turnover", "88.06%", "78.00%", "Lower implementation burden"],
    ["Effective assets", "4.77", "6.25", "Broader optimized allocation"],
  ];
  addTable(slide, headers, rows, 72, 158, [230, 270, 210, 410], 72, { fontSize: 17, headerFontSize: 15 });
  callout(slide, "Michaud did not beat Markowitz on every metric; it improved robustness and diversification.", 132, 592, 1016, 62, C.navy, C.paper, 20);
  addNotes(slide, 35);
}

// 36 - Why HRP
{
  const slide = presentation.slides.add();
  addTitle(slide, "HRP provides a structurally different robustness test", 36, "Original modern extension");
  addSectionMarker(slide, "OPTIONAL EXTENSION");
  addTwoColumnBullets(slide,
    {
      title: "WHY HRP?",
      accent: C.teal,
      fill: C.paleTeal,
      items: [
        "Avoids direct covariance inversion",
        "Uses no expected-return forecast",
        "Clusters related assets hierarchically",
        "Provides a non-Markowitz comparison",
        "Tests method-universe interaction",
      ],
    },
    {
      title: "WHY NOT BLACK-LITTERMAN?",
      accent: C.gold,
      fill: C.paleGold,
      items: [
        "Requires explicit investor views",
        "Requires confidence levels for those views",
        "No defensible objective view set was available",
        "Invented views would add untestable subjectivity",
        "Reserved for future work",
      ],
    },
    { top: 156, bottom: 570, fontSize: 18 },
  );
  callout(slide, "HRP was added to challenge the design - not to guarantee a better result.", 174, 594, 932, 58, C.navy, C.paper, 19);
  addNotes(slide, 36);
}

// 37 - HRP steps
{
  const slide = presentation.slides.add();
  addTitle(slide, "HRP allocates through a hierarchy rather than an efficient frontier", 37, "How HRP works");
  addSectionMarker(slide, "SIX-STEP HIERARCHY");
  const steps = [
    ["01", "Distance", "Convert correlations to distances", C.blue],
    ["02", "Cluster", "Group similar assets", C.teal],
    ["03", "Reorder", "Place related assets together", C.gold],
    ["04", "Split", "Divide hierarchy recursively", C.coral],
    ["05", "Allocate", "Weight clusters by variance", C.purple],
    ["06", "Continue", "Reach individual ETF weights", C.green],
  ];
  [0, 1, 2, 3, 4].forEach((i) => arrow(slide, 246 + i * 202, 302, 34, 26, C.line));
  steps.forEach(([n, title, body, color], i) => {
    const x = 54 + i * 202;
    rect(slide, x, 210, 184, 236, C.paper, true, color, 2);
    text(slide, n, x + 14, 226, 40, 24, { fontSize: 14, bold: true, color });
    text(slide, title, x + 16, 272, 152, 36, { fontSize: 22, bold: true, color: C.navy, align: "center" });
    text(slide, body, x + 18, 340, 148, 66, { fontSize: 16, color: C.muted, align: "center", valign: "middle" });
  });
  addTwoColumnBullets(slide,
    { title: "IT AVOIDS", accent: C.teal, fill: C.paleTeal, items: ["Expected returns and direct covariance inversion"] },
    { title: "IT DOES NOT GUARANTEE", accent: C.coral, fill: C.paleCoral, items: ["Balanced capital weights or equal risk contributions"] },
    { top: 500, bottom: 614, fontSize: 17 },
  );
  callout(slide, "Hierarchy changes the allocation logic - it does not remove dependence on the universe.", 166, 616, 948, 40, C.navy, C.paper, 16);
  addNotes(slide, 37);
}

// 38 - HRP concentration
{
  const slide = presentation.slides.add();
  addTitle(slide, "Unconstrained HRP collapsed toward the cash-like BIL ETF", 38, "Why the extension concentrated");
  addSectionMarker(slide, "METHOD-UNIVERSE INTERACTION");
  rect(slide, 54, 136, 770, 478, C.paper, true, C.line, 1);
  await image(slide, "hrp_weight_heatmap.png", 68, 150, 742, 430, "contain", "HRP rolling weight heatmap");
  text(slide, "Saved HRP weights", 76, 588, 320, 18, { fontSize: 11, color: C.muted });
  line(slide, 850, 146, 2, 460, C.line);
  label(slide, "CAUSAL CHAIN", 890, 154, 150, C.paleBlue, C.blue);
  const items = [
    ["BIL has extremely low realized volatility", C.blue],
    ["Recursive variance allocation strongly favors it", C.teal],
    ["HRP has no Markowitz-style 25% cap", C.gold],
    ["Average BIL weight reaches 95.60%", C.coral],
    ["Effective assets fall to about 1.09", C.purple],
  ];
  items.forEach(([v, color], i) => bullet(slide, v, 884, 210 + i * 62, 330, { accent: color, fontSize: 17, h: 52 }));
  callout(slide, "Empirical finding - not a coding failure.", 880, 540, 338, 64, C.navy, C.paper, 19);
  addNotes(slide, 38);
}

// 39 - HRP results
{
  const slide = presentation.slides.add();
  addTitle(slide, "HRP minimized drawdown but failed as a return-seeking allocation", 39, "How to interpret the extension");
  addSectionMarker(slide, "DEFENSIVE COLLAPSE");
  const metrics = [
    ["1.62%", "Annualized return", C.blue],
    ["0.58%", "Volatility", C.teal],
    ["-0.670", "Sharpe", C.coral],
    ["-0.35%", "Max drawdown", C.gold],
    ["7.49%", "Annualized turnover", C.purple],
    ["1.09", "Effective assets", C.green],
  ];
  metrics.forEach(([value, title, color], i) => {
    const row = i < 3 ? 0 : 1;
    const col = i % 3;
    metric(slide, value, title, 70 + col * 264, 158 + row * 154, 234, color);
  });
  rect(slide, 872, 158, 340, 436, C.navy, true);
  label(slide, "POSITIVE", 916, 186, 120, "#173A57", C.teal);
  bullet(slide, "Very low volatility", 910, 238, 268, { accent: C.teal, color: C.paper, fontSize: 17 });
  bullet(slide, "Tiny drawdown", 910, 286, 268, { accent: C.gold, color: C.paper, fontSize: 17 });
  bullet(slide, "Low turnover", 910, 334, 268, { accent: C.blue, color: C.paper, fontSize: 17 });
  label(slide, "NEGATIVE", 916, 398, 120, "#173A57", C.coral);
  bullet(slide, "Return below 2% reference", 910, 448, 268, { accent: C.coral, color: C.paper, fontSize: 17 });
  bullet(slide, "Extreme concentration", 910, 496, 268, { accent: C.purple, color: C.paper, fontSize: 17 });
  bullet(slide, "Little economic diversification", 910, 544, 268, { accent: C.gold, color: C.paper, fontSize: 16 });
  callout(slide, "High Calmar is mechanical: the drawdown denominator is extremely small.", 202, 614, 876, 42, C.paleGold, C.navy, 16);
  addNotes(slide, 39);
}

// 40 - Performance comparison
{
  const slide = presentation.slides.add();
  addTitle(slide, "Performance metrics reveal different objectives, not one universal winner", 40, "Final comparison - performance");
  addSectionMarker(slide, "COMMON 159 MONTHS");
  const rows = selectedRows.map((r) => [
    r.strategy,
    pct(r.annualized_geometric_return),
    pct(r.annualized_volatility),
    num(r.sharpe_ratio, 3),
    pct(r.max_drawdown),
  ]);
  addTable(slide, ["Strategy", "Return", "Volatility", "Sharpe", "Max drawdown"], rows, 70, 144, [390, 180, 180, 150, 220], 57, { fontSize: 15.5, headerFontSize: 15 });
  callout(slide, "Target Volatility leads return; Maximum Sharpe leads risk-adjusted performance.", 164, 600, 952, 54, C.navy, C.paper, 19);
  addNotes(slide, 40);
}

// 41 - Implementation comparison
{
  const slide = presentation.slides.add();
  addTitle(slide, "Implementation metrics change how the performance ranking is judged", 41, "Final comparison - turnover and concentration");
  addSectionMarker(slide, "CAPITAL-WEIGHT DIAGNOSTICS");
  const interpretations = {
    "Equal Weight": "Broadest by construction",
    "60/40": "Simple sleeve allocation",
    "Min Variance Ledoit-Wolf": "Low-risk defensive mix",
    "Max Sharpe Ledoit-Wolf": "Higher turnover and concentration",
    "Target Volatility Ledoit-Wolf": "Highest selected turnover",
    "Michaud 500": "Broadest optimized allocation",
    "HRP": "Low turnover because cash dominated",
  };
  const rows = selectedRows.map((r) => [
    r.strategy,
    pct(r.annualized_turnover),
    num(r.average_effective_number_of_assets, 2),
    pct(r.average_herfindahl_index),
    interpretations[r.strategy],
  ]);
  addTable(slide, ["Strategy", "Turnover", "Effective assets", "HHI", "Interpretation"], rows, 58, 144, [310, 150, 170, 130, 400], 57, { fontSize: 14.5, headerFontSize: 14.5 });
  callout(slide, "Michaud 500 improves optimized breadth; HRP's low turnover is economically misleading.", 142, 600, 996, 54, C.navy, C.paper, 18);
  addNotes(slide, 41);
}

// 42 - Selected equity curves
{
  const slide = presentation.slides.add();
  addTitle(slide, "Terminal wealth reflects both skill and the amount of risk accepted", 42, "Selected strategy equity curves");
  addSectionMarker(slide, "FROZEN RETURN SERIES");
  rect(slide, 54, 136, 882, 492, C.paper, true, C.line, 1);
  const chartCategories = commonDates;
  slide.charts.add("line", {
    position: { left: 72, top: 154, width: 846, height: 414 },
    categories: chartCategories,
    series: selectedSeries.map((s) => ({
      name: s.name,
      values: wealthPath(s.returns).map((point) => point.value),
      line: { style: "solid", fill: s.color, width: s.name === "Target Volatility LW" ? 3 : 2 },
      marker: { symbol: "none" },
    })),
    hasLegend: true,
    legend: { position: "bottom", overlay: false, textStyle: { fill: C.muted, fontSize: 11 } },
    xAxis: { tickLabelPosition: "none", line: { style: "solid", fill: C.line, width: 1 }, majorGridlines: null },
    yAxis: { title: "Growth of 1", numberFormatCode: "0.0x", textStyle: { fill: C.muted, fontSize: 11 }, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
    chartFill: "#FFFFFF",
    plotAreaFill: "#FFFFFF",
  });
  text(slide, "2013", 90, 568, 80, 18, { fontSize: 11, color: C.muted, align: "left" });
  text(slide, "2026", 838, 568, 70, 18, { fontSize: 11, color: C.muted, align: "right" });
  line(slide, 960, 146, 2, 462, C.line);
  label(slide, "READ THE PATH", 996, 154, 158, C.paleBlue, C.blue);
  bullet(slide, "Target Volatility finishes highest by taking more risk", 990, 212, 230, { accent: C.coral, fontSize: 16, h: 72 });
  bullet(slide, "Max Sharpe and Michaud deliver strong middle paths", 990, 300, 230, { accent: C.teal, fontSize: 16, h: 68 });
  bullet(slide, "Benchmarks remain credible but finish below leaders", 990, 384, 230, { accent: C.gold, fontSize: 16, h: 68 });
  bullet(slide, "HRP behaves like cash after concentrating in BIL", 990, 468, 230, { accent: C.green, fontSize: 16, h: 68 });
  callout(slide, "Selected-strategy view; complete 12-strategy chart remains in the report.", 976, 554, 246, 60, C.navy, C.paper, 14);
  addNotes(slide, 42);
}

// 43 - Selected drawdowns
{
  const slide = presentation.slides.add();
  addTitle(slide, "Drawdowns expose the path risk hidden by terminal wealth", 43, "Selected strategy drawdowns");
  addSectionMarker(slide, "LOSS FROM PRIOR PEAK");
  rect(slide, 54, 136, 900, 492, C.paper, true, C.line, 1);
  const chartCategories = commonDates;
  slide.charts.add("line", {
    position: { left: 72, top: 154, width: 864, height: 414 },
    categories: chartCategories,
    series: selectedSeries.map((s) => ({
      name: s.name,
      values: drawdownPath(s.returns).map((point) => point.value),
      line: { style: "solid", fill: s.color, width: s.name === "Target Volatility LW" ? 3 : 2 },
      marker: { symbol: "none" },
    })),
    hasLegend: true,
    legend: { position: "bottom", overlay: false, textStyle: { fill: C.muted, fontSize: 11 } },
    xAxis: { tickLabelPosition: "none", line: { style: "solid", fill: C.line, width: 1 }, majorGridlines: null },
    yAxis: { title: "Drawdown", numberFormatCode: "0%", min: -0.30, max: 0, textStyle: { fill: C.muted, fontSize: 11 }, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
    chartFill: "#FFFFFF",
    plotAreaFill: "#FFFFFF",
  });
  text(slide, "2013", 90, 568, 80, 18, { fontSize: 11, color: C.muted, align: "left" });
  text(slide, "2026", 856, 568, 70, 18, { fontSize: 11, color: C.muted, align: "right" });
  line(slide, 978, 146, 2, 462, C.line);
  label(slide, "INTERPRETATION", 1008, 154, 168, C.paleCoral, C.coral);
  bullet(slide, "High wealth still includes material stress", 1000, 216, 220, { accent: C.coral, fontSize: 16, h: 62 });
  bullet(slide, "Minimum Variance and HRP take less risk", 1000, 294, 220, { accent: C.teal, fontSize: 16, h: 62 });
  bullet(slide, "2022 challenged equity-bond diversification", 1000, 372, 220, { accent: C.gold, fontSize: 16, h: 62 });
  bullet(slide, "Small drawdown alone does not imply high return", 1000, 450, 220, { accent: C.blue, fontSize: 16, h: 70 });
  callout(slide, "Drawdown is path dependent; volatility is not.", 994, 548, 228, 66, C.navy, C.paper, 14);
  addNotes(slide, 43);
}

// 44 - Risk-return scatter
{
  const slide = presentation.slides.add();
  addTitle(slide, "Maximum Sharpe offered the best realized return-risk balance", 44, "Risk-return trade-off");
  addSectionMarker(slide, "RETURN VS VOLATILITY");
  rect(slide, 54, 136, 888, 492, C.paper, true, C.line, 1);
  await image(slide, "risk_return_scatter.png", 72, 154, 852, 440, "contain", "Risk-return scatter for final strategies");
  text(slide, "Frozen final risk-return output", 76, 594, 360, 18, { fontSize: 11, color: C.muted });
  line(slide, 968, 146, 2, 462, C.line);
  label(slide, "HOW TO READ", 1002, 154, 156, C.paleBlue, C.blue);
  bullet(slide, "Upper-left is generally preferred", 996, 212, 224, { accent: C.blue, fontSize: 16, h: 54 });
  bullet(slide, "Target Volatility: more return and more risk", 996, 280, 224, { accent: C.coral, fontSize: 16, h: 72 });
  bullet(slide, "Maximum Sharpe LW: best realized Sharpe", 996, 366, 224, { accent: C.teal, fontSize: 16, h: 64 });
  bullet(slide, "Min Variance and HRP sit near the low-risk corner", 996, 444, 224, { accent: C.gold, fontSize: 16, h: 74 });
  callout(slide, "Risk preference still determines the relevant choice.", 992, 548, 232, 66, C.navy, C.paper, 14);
  addNotes(slide, 44);
}

// 45 - Turnover vs Sharpe
{
  const slide = presentation.slides.add();
  addTitle(slide, "Higher Sharpe generally required more trading", 45, "Turnover-Sharpe trade-off");
  addSectionMarker(slide, "IMPLEMENTATION FRONTIER");
  rect(slide, 54, 136, 888, 492, C.paper, true, C.line, 1);
  await image(slide, "turnover_vs_sharpe.png", 72, 154, 852, 440, "contain", "Turnover versus Sharpe scatter");
  text(slide, "Frozen final turnover-Sharpe output", 76, 594, 360, 18, { fontSize: 11, color: C.muted });
  line(slide, 968, 146, 2, 462, C.line);
  label(slide, "TRADE-OFF", 1008, 154, 132, C.paleGold, "#946C18");
  bullet(slide, "Maximum Sharpe led Sharpe but traded heavily", 996, 212, 224, { accent: C.teal, fontSize: 16, h: 70 });
  bullet(slide, "Michaud kept near-leading Sharpe with less turnover", 996, 296, 224, { accent: C.purple, fontSize: 16, h: 76 });
  bullet(slide, "Benchmarks were easier to implement", 996, 386, 224, { accent: C.blue, fontSize: 16, h: 60 });
  bullet(slide, "HRP was stable only because cash dominated", 996, 462, 224, { accent: C.coral, fontSize: 16, h: 68 });
  callout(slide, "Returns are already net of the common 5-bps cost rule.", 992, 548, 232, 66, C.navy, C.paper, 14);
  addNotes(slide, 45);
}

// 46 - Diversification vs Sharpe
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud broadened optimized portfolios without losing much Sharpe", 46, "Diversification-Sharpe trade-off");
  addSectionMarker(slide, "EFFECTIVE ASSETS");
  rect(slide, 54, 136, 888, 492, C.paper, true, C.line, 1);
  await image(slide, "diversification_vs_sharpe.png", 72, 154, 852, 440, "contain", "Effective assets versus Sharpe scatter");
  text(slide, "Frozen final diversification-Sharpe output", 76, 594, 380, 18, { fontSize: 11, color: C.muted });
  line(slide, 968, 146, 2, 462, C.line);
  label(slide, "KEY POINTS", 1004, 154, 150, C.paleTeal, C.teal);
  bullet(slide, "Equal Weight: 23 by construction", 996, 212, 224, { accent: C.blue, fontSize: 16, h: 54 });
  bullet(slide, "Michaud 500: broadest optimized mix", 996, 280, 224, { accent: C.purple, fontSize: 16, h: 62 });
  bullet(slide, "Classical optimized portfolios stay concentrated", 996, 356, 224, { accent: C.gold, fontSize: 16, h: 72 });
  bullet(slide, "HRP is least diversified despite its label", 996, 442, 224, { accent: C.coral, fontSize: 16, h: 72 });
  callout(slide, "Position count is not effective diversification.", 992, 548, 232, 66, C.navy, C.paper, 14);
  addNotes(slide, 46);
}

// 47 - Which strategy won
{
  const slide = presentation.slides.add();
  addTitle(slide, "The winning strategy depends on the investor's objective", 47, "Which strategy won?");
  addSectionMarker(slide, "MULTI-DIMENSIONAL ANSWER");
  const winners = [
    ["BEST SHARPE", "Max Sharpe Ledoit-Wolf", "0.922", C.teal],
    ["HIGHEST WEALTH", "Target Volatility Ledoit-Wolf", "4.17", C.coral],
    ["BEST ROBUSTNESS COMPROMISE", "Michaud 500", "6.25 effective assets", C.purple],
    ["LOWEST OPTIMIZED RISK", "Min Variance Ledoit-Wolf", "2.88% volatility", C.blue],
    ["LOWEST TURNOVER", "HRP", "7.49% - cash dominated", C.gold],
    ["SIMPLEST IMPLEMENTATION", "Equal Weight / 60/40", "No estimated inputs", C.green],
  ];
  winners.forEach(([labelText, strategy, value, color], i) => {
    const row = i < 3 ? 0 : 1;
    const col = i % 3;
    const x = 66 + col * 392;
    const y = 160 + row * 218;
    rect(slide, x, y, 354, 184, C.paper, true, color, 2);
    text(slide, labelText, x + 18, y + 18, 318, 28, { fontSize: 13, bold: true, color, align: "center" });
    text(slide, strategy, x + 24, y + 62, 306, 62, { fontSize: 22, bold: true, color: C.navy, align: "center", valign: "middle" });
    text(slide, value, x + 22, y + 136, 310, 28, { fontSize: 17, bold: true, color, align: "center" });
  });
  callout(slide, "No single strategy dominates return, risk, turnover, concentration, and simplicity.", 160, 608, 960, 48, C.navy, C.paper, 18);
  addNotes(slide, 47);
}

// 48 - Markowitz vs Michaud lesson
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud improved robustness rather than every performance metric", 48, "Main lesson - Markowitz vs Michaud");
  addSectionMarker(slide, "AGGRESSION VS MODERATION");
  addTwoColumnBullets(slide,
    {
      title: "MAXIMUM SHARPE LEDOIT-WOLF",
      labelWidth: 310,
      accent: C.teal,
      fill: C.paleTeal,
      items: [
        "Uses one estimated market input",
        "Exploits return signals aggressively",
        "Achieved the best Sharpe: 0.922",
        "More concentrated and high-turnover",
      ],
    },
    {
      title: "MICHAUD 500",
      labelWidth: 190,
      accent: C.purple,
      fill: C.palePurple,
      items: [
        "Averages decisions across plausible inputs",
        "Improves allocation breadth",
        "Reduces annualized turnover to 78.00%",
        "Sacrifices only 0.022 Sharpe",
      ],
    },
    { top: 158, bottom: 558, fontSize: 19 },
  );
  callout(slide, "Resampling moderated the implementation profile; it did not create a universal winner.", 148, 584, 984, 70, C.navy, C.paper, 20);
  addNotes(slide, 48);
}

// 49 - Ledoit-Wolf lesson
{
  const slide = presentation.slides.add();
  addTitle(slide, "Input estimation mattered almost as much as objective choice", 49, "What Ledoit-Wolf taught us");
  addSectionMarker(slide, "RISK MODEL MATTERS");
  const chain = [
    ["NOISY COVARIANCE", "Unstable correlations and variances", C.coral],
    ["SHRINKAGE", "Lower estimation variance", C.gold],
    ["BETTER CONDITIONING", "More stable risk model", C.teal],
    ["REALIZED EFFECT", "Lower turnover + broader weights", C.blue],
  ];
  chain.forEach(([title, body, color], i) => {
    const x = 70 + i * 294;
    rect(slide, x, 212, 250, 236, C.paper, true, color, 2);
    text(slide, title, x + 18, 238, 214, 54, { fontSize: 20, bold: true, color, align: "center", valign: "middle" });
    line(slide, x + 24, 314, 202, 2, C.line);
    text(slide, body, x + 20, 344, 210, 72, { fontSize: 18, color: C.navy, align: "center", valign: "middle" });
    if (i < 3) arrow(slide, x + 256, 302, 30, 26, C.line);
  });
  metric(slide, "0.909 -> 0.922", "Maximum Sharpe", 190, 500, 270, C.teal, "Realized Sharpe");
  metric(slide, "99.14% -> 88.06%", "Maximum Sharpe", 505, 500, 270, C.coral, "Annualized turnover");
  metric(slide, "4.50 -> 4.77", "Maximum Sharpe", 820, 500, 270, C.blue, "Effective assets");
  callout(slide, "Ledoit-Wolf stabilizes covariance - not noisy expected returns.", 290, 620, 700, 38, C.paleGold, C.navy, 16);
  addNotes(slide, 49);
}

// 50 - HRP lesson
{
  const slide = presentation.slides.add();
  addTitle(slide, "HRP shows that avoiding inversion does not eliminate model risk", 50, "HRP lesson");
  addSectionMarker(slide, "NEGATIVE FINDING = EVIDENCE");
  const lessons = [
    ["01", "Robustness is specific", "Avoiding covariance inversion solves only one problem", C.blue],
    ["02", "Universe design matters", "A cash-like ETF can dominate variance allocation", C.teal],
    ["03", "Constraints still matter", "No 25% cap allowed extreme concentration", C.gold],
    ["04", "Labels can mislead", "Risk parity did not imply diversified capital", C.coral],
  ];
  lessons.forEach(([n, title, body, color], i) => {
    const x = 66 + i * 294;
    rect(slide, x, 184, 252, 318, C.paper, true, color, 2);
    text(slide, n, x + 18, 204, 48, 28, { fontSize: 18, bold: true, color });
    text(slide, title, x + 20, 258, 212, 66, { fontSize: 22, bold: true, color: C.navy, align: "center", valign: "middle" });
    line(slide, x + 26, 342, 200, 2, C.line);
    text(slide, body, x + 22, 370, 208, 92, { fontSize: 18, color: C.muted, align: "center", valign: "middle" });
  });
  callout(slide, "The BIL concentration is an empirical method-universe interaction - not a coding error.", 150, 548, 980, 70, C.navy, C.paper, 20);
  text(slide, "Future test: constrained HRP, HRP without cash, and asset-class floors.", 196, 630, 888, 24, { fontSize: 16, bold: true, color: C.coral, align: "center" });
  addNotes(slide, 50);
}

// 51 - Benchmarks lesson
{
  const slide = presentation.slides.add();
  addTitle(slide, "Simple benchmarks remain difficult to dismiss", 51, "Why naive portfolios still matter");
  addSectionMarker(slide, "LOW MODEL DEPENDENCE");
  const features = [
    ["Transparent", "Rules are immediately understandable", C.blue],
    ["Low complexity", "No means, covariance, or solver", C.teal],
    ["Lower turnover", "Smaller implementation burden", C.gold],
    ["No estimation error", "No noisy input forecasts", C.coral],
    ["Reproducible", "Easy to rebuild and audit", C.purple],
  ];
  features.forEach(([title, body, color], i) => {
    const x = 66 + i * 238;
    rect(slide, x, 196, 214, 238, C.paper, true, color, 2);
    text(slide, title, x + 18, 230, 178, 48, { fontSize: 23, bold: true, color, align: "center", valign: "middle" });
    text(slide, body, x + 20, 316, 174, 74, { fontSize: 17, color: C.muted, align: "center", valign: "middle" });
  });
  rect(slide, 106, 486, 1068, 116, C.navy, true);
  text(slide, "Optimized leaders improved selected metrics", 140, 508, 466, 32, { fontSize: 22, bold: true, color: C.teal, align: "center" });
  text(slide, "but required more trading and stronger modeling assumptions", 630, 508, 510, 50, { fontSize: 22, bold: true, color: C.paper, align: "center", valign: "middle" });
  text(slide, "Benchmarks are economic alternatives - not ceremonial rows in a table.", 226, 566, 828, 24, { fontSize: 16, color: C.gold, align: "center" });
  callout(slide, "Added complexity must earn its place after costs.", 290, 616, 700, 40, C.paleGold, C.navy, 17);
  addNotes(slide, 51);
}

// 52 - Data limitations
{
  const slide = presentation.slides.add();
  addTitle(slide, "Data and sample choices limit how broadly the evidence can be generalized", 52, "Limitations - data and sample");
  addSectionMarker(slide, "SCOPE OF CLAIMS");
  const limits = [
    ["Fixed ETF universe", "Possible selection and survivorship bias", C.coral],
    ["Yahoo Finance", "Not an institutional total-return source", C.blue],
    ["One realized path", "No repeated independent market histories", C.teal],
    ["Late inception", "Four ETFs shorten full-universe history", C.gold],
    ["Extended 27 panel", "Not a complete optimized robustness backtest", C.purple],
  ];
  limits.forEach(([title, body, color], i) => {
    const row = i < 3 ? 0 : 1;
    const count = row === 0 ? 3 : 2;
    const w = row === 0 ? 350 : 500;
    const gap = row === 0 ? 36 : 56;
    const startX = row === 0 ? 78 : 112;
    const col = row === 0 ? i : i - 3;
    const x = startX + col * (w + gap);
    const y = row === 0 ? 166 : 402;
    rect(slide, x, y, w, 184, C.paper, true, color, 2);
    text(slide, title, x + 20, y + 28, w - 40, 42, { fontSize: 22, bold: true, color, align: "center" });
    text(slide, body, x + 26, y + 94, w - 52, 62, { fontSize: 18, color: C.navy, align: "center", valign: "middle" });
  });
  callout(slide, "The ranking is comparative evidence for this design and period - not universal proof.", 152, 612, 976, 44, C.navy, C.paper, 18);
  addNotes(slide, 52);
}

// 53 - Model limitations
{
  const slide = presentation.slides.add();
  addTitle(slide, "Model assumptions remain simplified and testable", 53, "Limitations - estimation and implementation");
  addSectionMarker(slide, "TRANSPARENT ASSUMPTIONS");
  const left = [
    "Expected returns remain noisy",
    "Fixed 60-month estimation window",
    "Constant 2% risk-free reference",
    "Michaud normal-sampling assumptions",
  ];
  const right = [
    "Constant 5-bps transaction costs",
    "No taxes or market impact",
    "No time-varying liquidity model",
    "No formal significance testing",
  ];
  addTwoColumnBullets(slide,
    { title: "ESTIMATION", accent: C.blue, fill: C.paleBlue, items: left },
    { title: "IMPLEMENTATION", accent: C.coral, fill: C.paleCoral, items: right },
    { top: 164, bottom: 544, fontSize: 19 },
  );
  callout(slide, "Transparency makes the experiment reproducible; sensitivity analysis tests how dependent the results are.", 132, 574, 1016, 70, C.navy, C.paper, 19);
  addNotes(slide, 53);
}

// 54 - Future work
{
  const slide = presentation.slides.add();
  addTitle(slide, "Future robustness checks should challenge the design, not search for winners", 54, "What we would test next");
  addSectionMarker(slide, "PRE-SPECIFY SENSITIVITY");
  const tests = [
    ["WINDOWS", "36 / 60 / 120 months", C.blue],
    ["REBALANCING", "Monthly vs quarterly", C.teal],
    ["HRP", "Cap weights or remove BIL", C.gold],
    ["ASSET CLASSES", "Floors and maximum sleeves", C.coral],
    ["BLACK-LITTERMAN", "Only with defensible views", C.purple],
    ["REGIMES", "Time-varying covariance", C.green],
    ["COSTS", "Asset- and regime-specific", C.blue],
    ["EXTENDED UNIVERSE", "Full 27-ETF optimization", C.teal],
  ];
  tests.forEach(([title, body, color], i) => {
    const row = i < 4 ? 0 : 1;
    const col = i % 4;
    const x = 60 + col * 300;
    const y = 160 + row * 206;
    rect(slide, x, y, 266, 168, C.paper, true, color, 2);
    text(slide, title, x + 18, y + 22, 230, 28, { fontSize: 14, bold: true, color, align: "center" });
    text(slide, body, x + 24, y + 72, 218, 66, { fontSize: 20, bold: true, color: C.navy, align: "center", valign: "middle" });
  });
  callout(slide, "Principle: define robustness tests before seeing which specification performs best.", 156, 596, 968, 58, C.navy, C.paper, 19);
  addNotes(slide, 54);
}

// 55 - Conclusion
{
  const slide = presentation.slides.add();
  addTitle(slide, "Robust portfolio design is more than choosing an optimizer", 55, "Final conclusion", true);
  addSectionMarker(slide, "FIVE CONCLUSIONS");
  const conclusions = [
    ["01", "Identical out-of-sample months", "Same assets, dates, costs, and next-month timing", C.blue],
    ["02", "Best realized Sharpe", "Maximum Sharpe Ledoit-Wolf: 0.922", C.teal],
    ["03", "Highest terminal wealth", "Target Volatility Ledoit-Wolf: more risk", C.gold],
    ["04", "Best robustness compromise", "Michaud 500: broader weights and lower turnover", C.coral],
    ["05", "Most important negative result", "HRP still depended on constraints and universe design", C.purple],
  ];
  conclusions.forEach(([n, title, body, color], i) => {
    const y = 148 + i * 88;
    text(slide, n, 72, y + 10, 54, 34, { fontSize: 19, bold: true, color });
    text(slide, title, 146, y, 350, 42, { fontSize: 22, bold: true, color: C.paper, valign: "middle" });
    line(slide, 520, y + 22, 60, 2, "#385067");
    text(slide, body, 604, y, 570, 44, { fontSize: 18, color: "#C4D3DE", valign: "middle" });
  });
  rect(slide, 110, 606, 1060, 52, "#102B45", true, C.teal, 1);
  text(slide, "Sophistication added value only when paired with estimation discipline and implementation controls.", 142, 616, 996, 32, { fontSize: 20, bold: true, color: C.gold, align: "center", valign: "middle" });
  addNotes(slide, 55);
}

// 56 - Questions
{
  const slide = presentation.slides.add();
  addTitle(slide, "Questions", 56, "Oral-defense map", true);
  addSectionMarker(slide, "DEFENSE GUIDE");
  const groups = [
    ["DATA", "Why ETFs?\nWhy 23?\nWhy preserve 2008?", C.blue],
    ["DESIGN", "Why monthly?\nWhy 60 months?\nWhy 5 bps?", C.teal],
    ["METHODS", "Why Markowitz?\nWhy Michaud?\nWhy Ledoit-Wolf?\nWhy HRP?", C.gold],
    ["RESULTS", "Why did Max Sharpe win?\nWhy did HRP fail?\nWhich strategy is practical?", C.coral],
  ];
  groups.forEach(([title, body, color], i) => {
    const x = 64 + i * 294;
    rect(slide, x, 168, 252, 342, "#102B45", true, color, 2);
    text(slide, title, x + 18, 198, 216, 44, { fontSize: 25, bold: true, color, align: "center" });
    line(slide, x + 28, 260, 196, 2, "#385067");
    text(slide, body, x + 28, 292, 196, 178, { fontSize: 19, color: C.paper, align: "center", valign: "middle", lineSpacing: 1.25 });
  });
  callout(slide, "Anchor answer: same universe + same months + same timing + same costs.", 170, 558, 940, 62, C.teal, C.paper, 23);
  text(slide, "Thank you.", 510, 634, 260, 24, { fontSize: 17, bold: true, color: C.gold, align: "center" });
  addNotes(slide, 56);
}

if (NOTES.length !== 56 || presentation.slides.items.length !== 56) {
  throw new Error(`Expected 56 slides and notes; got ${presentation.slides.items.length} slides and ${NOTES.length} notes.`);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(QA_DIR, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(QA_DIR, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(QA_DIR, `${stem}.layout.json`), await layout.text());
}

const montage = await presentation.export({ format: "webp", montage: true, scale: 0.35 });
await fs.writeFile(path.join(QA_DIR, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
const notesForExport = NOTES.map((entry, index) => ({
  ...entry,
  transition: index < NOTES.length - 1
    ? `Next, I turn to: ${NOTES[index + 1].title}.`
    : "I will keep this defense map visible and take questions.",
}));
await fs.writeFile(path.join(QA_DIR, "speaker-notes.json"), JSON.stringify(notesForExport, null, 2), "utf8");

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(PPTX_PATH);
await fs.rm(`${PPTX_PATH}.inspect.ndjson`, { force: true });

const notesInspection = await presentation.inspect({ kind: "notes", include: "text" });
await fs.writeFile(path.join(QA_DIR, "notes-inspection.ndjson"), notesInspection.ndjson, "utf8");

console.log(`Saved ${presentation.slides.items.length}-slide deck to ${PPTX_PATH}`);

/**
 * Editable source for the final Financial Markets Analytics oral presentation.
 *
 * Build with the Codex presentation runtime after initializing an artifact-tool
 * workspace. The script reads only frozen repository CSV and PNG artifacts; it
 * does not rerun data acquisition, optimization, or performance calculations.
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
const OUTPUT_DIR = process.env.PRESENTATION_OUTPUT_DIR || SOURCE_DIR;
const QA_DIR = process.env.PRESENTATION_QA_DIR || path.join(
  os.tmpdir(),
  "fma-dynamic-allocation-presentation-qa",
);
const PPTX_PATH = path.join(
  OUTPUT_DIR,
  "FMA_Dynamic_Asset_Allocation_Oral_Presentation.pptx",
);

const W = 1280;
const H = 720;
const C = {
  navy: "#0B1F33",
  blue: "#2E6E9E",
  teal: "#078C8C",
  gold: "#D6A84B",
  coral: "#D95D39",
  ink: "#172635",
  muted: "#5B6B78",
  warm: "#F7F5F0",
  paper: "#FFFFFF",
  line: "#D7DFE5",
  paleBlue: "#E7F0F6",
  paleTeal: "#E1F2F0",
  paleGold: "#F6EDD8",
  paleCoral: "#F8E6E0",
  paleGray: "#EDF1F3",
};
const FONT = "Aptos";

const NOTES = [
  `Good morning. I am Artem Khomytskyi, and this is my Financial Markets Analytics project for Variant B: Dynamic Asset Allocation. The presentation compares classical Markowitz optimization, Ledoit-Wolf covariance shrinkage, Michaud resampling, and Hierarchical Risk Parity. The purpose today is not to repeat the written report. I will focus on the design choices behind the experiment, how the walk-forward backtest avoids look-ahead bias, and what the realized results mean economically. The core message is that sophisticated methods can add value, but only when the estimation problem, constraints, transaction costs, and evaluation period are handled consistently.`,

  `The research question is deliberately practical: can an optimized multi-asset allocation outperform simple rules out of sample after implementation frictions? Dynamic allocation is relevant because expected returns, volatilities, and correlations change through time. But optimization can also magnify estimation error, so complexity is not automatically an advantage. I evaluate three dimensions. First, realized performance: return, volatility, Sharpe, and drawdown. Second, robustness: sensitivity to covariance estimation and resampling. Third, implementability: concentration, turnover, constraints, and transaction costs. Equal Weight and 60/40 provide transparent reference portfolios that require no forecasts, making it possible to judge whether added complexity is justified.`,

  `The core universe contains 23 ETFs across six economic sleeves. ETFs are preferable to individual securities because they provide diversified, liquid, and interpretable market exposures without turning the project into a stock-selection exercise. Nine equity ETFs cover size and geography. Five government-bond ETFs provide duration and inflation sensitivity. Credit, commodities, real estate, and cash add distinct risk drivers. The configured universe originally contained 27 ETFs, but four late-inception funds—IGOV, VGSH, VNQI, and BKLN—were excluded from the core panel. That choice preserves the 2008 crisis while maintaining a complete cross-section. No pre-inception prices were manufactured, and every strategy uses the same 23 assets.`,

  `Prices come from Yahoo Finance through yfinance and use adjusted ETF histories, so distributions and corporate actions are reflected in the price series. The raw daily observations were resampled to calendar month-end. Before calculating returns, I inspected inception dates, observation counts, annual missingness, and the availability matrix shown here. The missing values form clear pre-inception blocks rather than intermittent gaps. This matters because backfilling those blocks would create synthetic history and look artificially precise. The clean core panel begins in January 2008 and ends in May 2026; the incomplete June 2026 month is excluded. Yahoo Finance is appropriate for a reproducible academic study, although it is not an institutional total-return database.`,

  `This diagram summarizes the complete walk-forward cycle. Frozen adjusted prices are converted to monthly simple returns. At each decision date, the model takes only the preceding 60 monthly returns. It estimates expected returns and a covariance matrix, applies the chosen allocation rule, measures turnover against drifted holdings, charges five basis points per unit of one-way turnover, and then holds the portfolio for the next realized month. The process repeats monthly. The critical feature is the order: the return earned after the decision never enters the estimation window that produced the weight. Benchmarks and optimized strategies follow the same calendar and cost convention, so differences are attributable to allocation rules rather than timing.`,

  `The 60-month window is a bias-variance trade-off. With only 12 monthly observations, mean estimates and correlations are extremely noisy relative to a 23-asset universe; the optimizer would react strongly to transitory movements. A 120-month window offers more statistical stability, but it adapts slowly and blends very different market regimes. Five years supplies enough observations to estimate a reasonably conditioned covariance structure while still allowing the model to respond to changes in volatility and correlation. It is not claimed to be uniquely optimal. It is a transparent, defensible design choice that was fixed before comparing final results, and alternative windows belong in robustness analysis rather than ex-post selection.`,

  `Classical Markowitz optimization combines an objective with explicit implementation constraints. Minimum Variance minimizes portfolio variance. Maximum Sharpe seeks the best estimated excess return per unit of risk. Target Volatility maximizes expected return subject to a ten percent annual volatility ceiling. Every optimized portfolio is fully invested, long-only, and unleveraged, with each ETF capped at 25 percent. The cap prevents a single noisy estimate from producing an economically implausible one-asset solution, while still allowing meaningful active tilts. Monthly rebalancing matches the frequency of the data and avoids false daily precision. Five basis points is a simple one-way trading-cost proxy: modest for liquid ETFs, but sufficient to penalize unstable high-turnover rules.`,

  `The sample covariance matrix is the direct historical estimate, but with 23 assets and only 60 observations it can be noisy and poorly conditioned. Optimization is especially sensitive because small covariance errors can cause large weight changes. Ledoit-Wolf shrinkage addresses this by combining the sample covariance matrix with a structured target. The shrinkage intensity trades a small amount of bias for a larger reduction in estimation variance. Economically, this produces a more stable risk model before any optimization objective is applied. I report both sample and Ledoit-Wolf variants because shrinkage should be tested, not assumed to dominate. In the realized results it improved the strongest Maximum Sharpe specification, although gains were not uniform across every objective.`,

  `Michaud resampling targets the instability of a single estimated efficient frontier. At each rebalance, I estimate expected returns and a Ledoit-Wolf covariance matrix from the trailing window. I then simulate many plausible capital-market assumptions, solve the same constrained Maximum Sharpe problem for each simulated universe, and average the resulting portfolio weights. The 100, 250, and 500-resample variants use nested common random draws, so differences primarily reflect convergence rather than unrelated Monte Carlo noise. Averaging portfolios does not eliminate estimation error, and it relies on a multivariate-normal simulation assumption. Its practical benefit is moderation: the final allocation is less dependent on one noisy set of inputs and can reduce concentration or turnover.`,

  `HRP was included as a modern robustness extension. It converts correlations to distances, clusters similar assets, quasi-diagonalizes the hierarchy, and allocates recursively across branches. It therefore avoids direct covariance-matrix inversion and does not require expected-return forecasts. That is attractive when covariance estimates are unstable. However, avoiding inversion does not guarantee diversified capital weights. In this sample, BIL has exceptionally low variance, so unconstrained HRP allocated nearly all capital to the cash-like ETF. The heatmap makes that concentration visible. HRP consequently had very low turnover and drawdown, but weak excess return and the lowest effective diversification. This is an empirical outcome of the cash-inclusive specification, not a coding failure.`,

  `The backtest is strictly walk-forward. For a decision associated with date t, estimates end at t minus one. The new weights are then applied to the following realized month, and transaction costs are deducted using drift-aware turnover. Core monthly returns begin in February 2008. Sixty prior observations first become available for the February 2013 decision, and the conservative implementation lag means the first comparable realized return is March 2013. That is why every final strategy is evaluated from March 2013 through May 2026—159 identical months. Using a common universe, common dates, common cost convention, and common risk-free rate prevents one strategy from gaining an advantage through a more favorable sample.`,

  `The full comparison shows that no strategy wins every objective. Maximum Sharpe with Ledoit-Wolf covariance has the best Sharpe ratio at 0.922. Target Volatility with Ledoit-Wolf has the highest annualized geometric return at 11.38 percent and the highest terminal wealth. HRP has the lowest turnover and smallest drawdown, but its 4.66 Calmar ratio is mechanical because the drawdown denominator is extremely small; its Sharpe ratio is negative. Equal Weight has the highest effective number of assets by construction. Among optimized strategies, Michaud 500 is the most diversified. The table therefore supports a multi-dimensional interpretation rather than a single league table.`,

  `The cumulative-wealth chart shows the main economic trade-off. Target Volatility portfolios finish with the highest wealth because they accept more realized volatility. Maximum Sharpe and Michaud follow a similar middle path and deliver strong risk-adjusted outcomes. Equal Weight and 60/40 are credible benchmarks but do not dominate the optimized leaders. Minimum Variance protects capital by taking little risk, which also limits compounding. HRP behaves almost like cash because of its BIL concentration. The chart is not evidence that the highest terminal line is universally best: an investor must decide how much volatility, turnover, and model dependence are acceptable. This is why the final assessment combines wealth with risk and implementation diagnostics.`,

  `These four panels explain why ranking by one metric is incomplete. Drawdowns show the path of losses and the defensive character of Minimum Variance and HRP. The risk-return scatter reveals that Target Volatility earns more return by accepting more volatility, while Maximum Sharpe Ledoit-Wolf offers the strongest realized return-to-risk balance. Turnover versus Sharpe shows the implementation cost of more reactive portfolios. Diversification versus Sharpe highlights that Equal Weight spreads capital most broadly, while Michaud 500 improves diversification among optimized methods. HRP sits at the extreme low-diversification end despite its clustering logic. Together, the panels separate portfolio risk, trading intensity, and concentration—three different concepts that a single Sharpe ratio cannot capture.`,

  `Four interpretations matter. First, Maximum Sharpe Ledoit-Wolf won because the return signal was strong enough to add value and shrinkage stabilized the covariance input. Second, Ledoit-Wolf improved conditioning, but it did not mechanically improve every strategy; Target Volatility sample and shrinkage Sharpe ratios are close. Third, Michaud is interesting not because it beats the best Sharpe, but because the 500-resample portfolio gives up only a small amount of Sharpe while improving turnover and effective diversification relative to Maximum Sharpe Ledoit-Wolf. Fourth, HRP failed as a return-seeking allocation because unconstrained recursive risk allocation collapsed toward BIL. Its defensive outcome demonstrates that method design and universe composition remain inseparable.`,

  `The conclusions must be read with six limitations. The ETF universe is fixed ex post, so selection and survivorship bias are possible. Yahoo Finance is reproducible but not an institutional total-return source. The sample is one realized market path, which limits statistical claims about small performance differences. Trading costs are constant and omit bid-ask variation, market impact, and taxes. The two percent risk-free rate is also constant. Finally, Michaud simulations assume multivariate normality, while real markets exhibit fat tails, changing regimes, and nonlinear dependence. These limitations do not invalidate the experiment; they define the scope of what can be claimed. The results are comparative evidence, not proof of universal dominance.`,

  `Future work should test the assumptions most likely to change the conclusions. Black-Litterman could combine equilibrium returns with structured views instead of relying entirely on historical means. Regime-switching or time-varying covariance models could respond more explicitly to changing market states. Alternative estimation windows and quarterly rebalancing would test the stability-versus-responsiveness trade-off. HRP should be rerun without cash, with maximum weights, or with minimum asset-class allocations. Transaction costs should vary by asset and market regime. Finally, the extended 27-ETF universe can be evaluated over its later common sample. These are robustness checks, not opportunities to select whichever specification produces the best ex-post result.`,

  `I conclude with four points. A disciplined walk-forward design matters more than apparent in-sample optimality. Ledoit-Wolf Maximum Sharpe delivered the best realized Sharpe ratio, showing that optimization and shrinkage can work together. Target Volatility Ledoit-Wolf produced the highest terminal wealth, but by accepting greater risk. Michaud 500 offered the most attractive robustness trade-off among optimized methods by improving diversification and turnover with only a modest Sharpe sacrifice. HRP demonstrated that a modern method can still produce an undesirable allocation when cash is included without constraints. Overall, complexity added value only when paired with consistent samples, realistic constraints, transaction costs, and careful interpretation.`,
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
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
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

function addFooter(slide, index, dark = false) {
  rect(slide, 56, 684, 1168, 1, dark ? "#385067" : C.line);
  text(
    slide,
    "Financial Markets Analytics  |  Variant B — Dynamic Asset Allocation",
    58,
    691,
    850,
    18,
    { fontSize: 11, color: dark ? "#AFC0CF" : C.muted },
  );
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
    text(slide, kicker.toUpperCase(), 58, 30, 500, 22, {
      fontSize: 13,
      bold: true,
      color: dark ? C.gold : C.teal,
    });
  }
  text(slide, title, 56, 56, 1168, 58, {
    fontSize: title.length > 62 ? 36 : 40,
    bold: true,
    color: dark ? C.paper : C.navy,
    valign: "middle",
  });
  addFooter(slide, index, dark);
}

function addNotes(slide, index) {
  slide.speakerNotes.textFrame.setText(NOTES[index - 1]);
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

function arrow(slide, x, y, w, h, fill = C.blue) {
  return slide.shapes.add({
    geometry: "rightArrow",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function leftArrow(slide, x, y, w, h, fill = C.blue) {
  return slide.shapes.add({
    geometry: "leftArrow",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function bullet(slide, value, x, y, w, color = C.ink, accent = C.teal, size = 20) {
  rect(slide, x, y + 9, 8, 8, accent, true);
  text(slide, value, x + 20, y, w - 20, 34, { fontSize: size, color, valign: "middle" });
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

function line(slide, x, y, w, h, fill = C.line) {
  return rect(slide, x, y, w, h, fill);
}

function parseCsv(raw) {
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
  });
}

function pct(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(digits)}%` : "—";
}

function num(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

// 1 — Title
{
  const slide = presentation.slides.add();
  slide.background.fill = C.navy;
  rect(slide, 0, 0, 18, H, C.gold);
  rect(slide, 850, 0, 430, H, "#102B45");
  rect(slide, 918, 92, 286, 3, C.teal);
  text(slide, "FINANCIAL MARKETS ANALYTICS", 70, 74, 650, 28, {
    fontSize: 17,
    bold: true,
    color: C.gold,
  });
  text(slide, "Dynamic Asset\nAllocation", 66, 145, 740, 150, {
    fontSize: 58,
    bold: true,
    color: C.paper,
    lineSpacing: 0.9,
  });
  text(slide, "Variant B", 70, 314, 300, 38, {
    fontSize: 25,
    bold: true,
    color: C.teal,
  });
  text(
    slide,
    "Classical Markowitz  ·  Michaud Resampling\nLedoit-Wolf  ·  Hierarchical Risk Parity",
    70,
    377,
    680,
    85,
    { fontSize: 24, color: "#DCE6ED", lineSpacing: 1.15 },
  );
  text(slide, "ARTEM KHOMYTSKYI", 908, 166, 290, 34, {
    fontSize: 22,
    bold: true,
    color: C.paper,
  });
  text(slide, "University of Milano-Bicocca", 908, 218, 290, 64, {
    fontSize: 19,
    color: "#C4D3DE",
  });
  text(slide, "Prof. G. Forte", 908, 304, 290, 30, {
    fontSize: 18,
    color: "#C4D3DE",
  });
  text(slide, "14 July 2026", 908, 348, 290, 30, {
    fontSize: 18,
    color: C.gold,
  });
  text(slide, "ORAL PRESENTATION", 908, 580, 290, 26, {
    fontSize: 14,
    bold: true,
    color: C.teal,
  });
  addFooter(slide, 1, true);
  addNotes(slide, 1);
}

// 2 — Research question
{
  const slide = presentation.slides.add();
  addTitle(slide, "Can sophistication beat simple allocation rules?", 2, "Research question");
  text(
    slide,
    "Do optimized portfolios improve realized risk-adjusted performance after estimation error, turnover, and costs?",
    98,
    155,
    1084,
    90,
    { fontSize: 31, bold: true, color: C.navy, align: "center", valign: "middle" },
  );
  line(slide, 178, 277, 924, 2, C.line);
  const columns = [
    { x: 92, n: "01", title: "Performance", body: "Return · volatility\nSharpe · drawdown", color: C.blue },
    { x: 454, n: "02", title: "Robustness", body: "Sampling error\nCovariance stability", color: C.teal },
    { x: 816, n: "03", title: "Implementability", body: "Concentration · turnover\nTransaction costs", color: C.gold },
  ];
  for (const item of columns) {
    text(slide, item.n, item.x, 321, 70, 40, { fontSize: 25, bold: true, color: item.color });
    line(slide, item.x, 370, 270, 5, item.color);
    text(slide, item.title, item.x, 394, 280, 42, { fontSize: 27, bold: true, color: C.ink });
    text(slide, item.body, item.x, 452, 290, 78, { fontSize: 20, color: C.muted, lineSpacing: 1.15 });
  }
  rect(slide, 92, 572, 1096, 70, C.navy, true);
  text(slide, "Benchmarks matter: added complexity must earn its place out of sample.", 126, 585, 1028, 44, {
    fontSize: 24,
    bold: true,
    color: C.paper,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 2);
}

// 3 — Investment universe
{
  const slide = presentation.slides.add();
  addTitle(slide, "23 ETFs preserve crisis history without backfilling", 3, "Investment universe");
  text(slide, "CORE UNIVERSE", 66, 142, 180, 24, { fontSize: 14, bold: true, color: C.teal });
  text(slide, "23", 64, 168, 140, 88, { fontSize: 72, bold: true, color: C.navy });
  text(slide, "liquid, diversified market exposures", 200, 188, 360, 55, {
    fontSize: 23,
    color: C.muted,
    valign: "middle",
  });
  const sleeves = [
    ["Equities", 9, C.blue],
    ["Government bonds", 5, C.teal],
    ["Credit", 3, C.gold],
    ["Commodities", 3, C.coral],
    ["Real estate", 2, "#7B6FA8"],
    ["Cash", 1, "#769A6D"],
  ];
  const barX = 64;
  const barY = 286;
  const barW = 690;
  let cursor = barX;
  for (const [name, count, color] of sleeves) {
    const width = (count / 23) * barW;
    rect(slide, cursor, barY, width, 58, color);
    if (width > 55) text(slide, String(count), cursor, barY + 8, width, 40, { fontSize: 20, bold: true, color: C.paper, align: "center", valign: "middle" });
    cursor += width;
  }
  let legendY = 378;
  for (let i = 0; i < sleeves.length; i += 1) {
    const [name, count, color] = sleeves[i];
    const x = i < 3 ? 66 : 350;
    const y = legendY + (i % 3) * 44;
    rect(slide, x, y + 7, 16, 16, color, true);
    text(slide, `${name}  ${count}`, x + 28, y, 250, 30, { fontSize: 18, color: C.ink, valign: "middle" });
  }
  line(slide, 800, 142, 2, 466, C.line);
  label(slide, "WHY ETFs?", 846, 154, 172, C.paleBlue, C.blue);
  bullet(slide, "Broad exposure without stock-selection noise", 848, 206, 350, C.ink, C.blue, 19);
  bullet(slide, "Transparent economic roles across asset classes", 848, 270, 350, C.ink, C.teal, 19);
  bullet(slide, "Tradable instruments with interpretable weights", 848, 334, 350, C.ink, C.gold, 19);
  label(slide, "WHY 23?", 846, 420, 172, C.paleCoral, C.coral);
  text(slide, "Retain the 2008 crisis while excluding four late-inception ETFs:", 848, 470, 350, 60, { fontSize: 19, color: C.ink });
  text(slide, "IGOV · VGSH · VNQI · BKLN", 848, 540, 350, 34, { fontSize: 20, bold: true, color: C.coral });
  text(slide, "Same assets for every final strategy", 848, 585, 350, 30, { fontSize: 18, bold: true, color: C.teal });
  addNotes(slide, 3);
}

// 4 — Data and cleaning
{
  const slide = presentation.slides.add();
  addTitle(slide, "Structural missingness defines the analytical sample", 4, "Data and cleaning");
  rect(slide, 54, 132, 800, 500, C.paper, true, C.line, 1);
  await image(slide, "missing_values_heatmap.png", 70, 148, 770, 445, "contain", "Missing daily price observations by year");
  text(slide, "Source: outputs/figures/missing_values_heatmap.png", 76, 598, 500, 20, { fontSize: 11, color: C.muted });
  line(slide, 882, 140, 2, 478, C.line);
  label(slide, "DATA", 924, 146, 112, C.paleBlue, C.blue);
  bullet(slide, "Yahoo Finance adjusted ETF prices", 920, 194, 310, C.ink, C.blue, 18);
  bullet(slide, "Daily observations → month-end prices", 920, 244, 310, C.ink, C.teal, 18);
  bullet(slide, "January 2008 → May 2026 core panel", 920, 294, 310, C.ink, C.gold, 18);
  label(slide, "CLEANING RULE", 924, 368, 170, C.paleCoral, C.coral);
  text(slide, "No interpolation\nNo backfilling\nNo synthetic prices", 922, 414, 290, 112, {
    fontSize: 23,
    bold: true,
    color: C.navy,
    lineSpacing: 1.2,
  });
  rect(slide, 912, 548, 300, 74, C.navy, true);
  text(slide, "Missing blocks are pre-inception history—not zero returns.", 930, 558, 264, 54, {
    fontSize: 17,
    bold: true,
    color: C.paper,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 4);
}

// 5 — Methodology pipeline
{
  const slide = presentation.slides.add();
  addTitle(slide, "The portfolio is rebuilt using only available information", 5, "Methodology overview");
  // Connectors first so arrows remain behind the nodes.
  arrow(slide, 252, 221, 72, 36, C.line);
  arrow(slide, 544, 221, 72, 36, C.line);
  arrow(slide, 836, 221, 72, 36, C.line);
  arrow(slide, 1058, 300, 50, 95, C.line);
  leftArrow(slide, 836, 468, 72, 36, C.line);
  leftArrow(slide, 544, 468, 72, 36, C.line);
  const nodes = [
    [64, 176, "01", "Raw adjusted\nprices", C.blue],
    [356, 176, "02", "Monthly simple\nreturns", C.teal],
    [648, 176, "03", "60-month rolling\nwindow", C.gold],
    [940, 176, "04", "Estimate +\nallocate", C.coral],
    [940, 423, "05", "Drift-aware\nturnover", C.blue],
    [648, 423, "06", "5 bps\ntransaction cost", C.teal],
    [356, 423, "07", "Next-month\nholding period", C.gold],
  ];
  for (const [x, y, n, value, color] of nodes) {
    rect(slide, x, y, 200, 126, C.paper, true, color, 2);
    text(slide, n, x + 14, y + 12, 46, 24, { fontSize: 14, bold: true, color });
    text(slide, value, x + 18, y + 42, 164, 66, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "middle" });
  }
  rect(slide, 64, 590, 1076, 52, C.navy, true);
  text(slide, "Repeat monthly  ·  identical calendar for benchmarks and optimized portfolios", 88, 600, 1028, 32, {
    fontSize: 21,
    bold: true,
    color: C.paper,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 5);
}

// 6 — Rolling window
{
  const slide = presentation.slides.add();
  addTitle(slide, "60 months balances stability with adaptability", 6, "Why this rolling window?");
  line(slide, 138, 328, 1004, 6, C.line);
  const marks = [
    { x: 206, value: "12", title: "Too reactive", body: "Noisy means and\ncorrelations", color: C.coral, r: 26 },
    { x: 642, value: "60", title: "Chosen balance", body: "Five years of data\nwith regime adaptation", color: C.teal, r: 40 },
    { x: 1078, value: "120", title: "Too slow", body: "Stable estimates,\nbut stale regimes", color: C.gold, r: 26 },
  ];
  for (const mark of marks) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: mark.x - mark.r, top: 331 - mark.r, width: mark.r * 2, height: mark.r * 2 },
      fill: mark.color,
      line: { style: "solid", fill: C.paper, width: 4 },
    });
    text(slide, mark.value, mark.x - 55, 242, 110, 42, { fontSize: mark.r > 30 ? 32 : 24, bold: true, color: mark.color, align: "center" });
    text(slide, "months", mark.x - 55, 280, 110, 24, { fontSize: 14, color: C.muted, align: "center" });
    text(slide, mark.title, mark.x - 128, 390, 256, 38, { fontSize: 24, bold: true, color: C.navy, align: "center" });
    text(slide, mark.body, mark.x - 140, 440, 280, 72, { fontSize: 19, color: C.muted, align: "center", lineSpacing: 1.15 });
  }
  text(slide, "←  ADAPTABILITY INCREASES", 86, 586, 360, 26, { fontSize: 14, bold: true, color: C.coral });
  text(slide, "STABILITY INCREASES  →", 834, 586, 360, 26, { fontSize: 14, bold: true, color: C.gold, align: "right" });
  addNotes(slide, 6);
}

// 7 — Markowitz
{
  const slide = presentation.slides.add();
  addTitle(slide, "Constraints make Markowitz implementable", 7, "Classical optimization");
  rect(slide, 62, 142, 486, 408, C.navy, true);
  label(slide, "THREE OBJECTIVES", 92, 172, 210, "#173A57", C.gold);
  text(slide, "Minimum Variance", 92, 232, 390, 34, { fontSize: 24, bold: true, color: C.paper });
  text(slide, "min  wᵀ Σ w", 92, 275, 390, 48, { fontSize: 31, bold: true, color: C.teal, align: "center" });
  line(slide, 92, 339, 390, 1, "#385067");
  text(slide, "Maximum Sharpe", 92, 360, 390, 34, { fontSize: 24, bold: true, color: C.paper });
  text(slide, "max  (wᵀμ − rᶠ) / √(wᵀΣw)", 92, 403, 390, 48, { fontSize: 25, bold: true, color: C.gold, align: "center" });
  line(slide, 92, 467, 390, 1, "#385067");
  text(slide, "Target Volatility", 92, 476, 390, 30, { fontSize: 23, bold: true, color: C.paper });
  text(slide, "max  wᵀμ   subject to  σ ≤ 10%", 92, 510, 390, 32, { fontSize: 20, bold: true, color: C.coral, align: "center" });

  label(slide, "IMPLEMENTATION CONSTRAINTS", 610, 150, 282, C.paleBlue, C.blue);
  const constraints = [
    ["Σ weights = 1", "Fully invested", C.blue],
    ["0% ≤ wᵢ ≤ 25%", "Long-only + concentration cap", C.teal],
    ["No leverage", "Comparable and investable", C.gold],
    ["Monthly", "Matches data frequency", C.coral],
    ["5 bps", "Penalizes unstable turnover", "#7B6FA8"],
  ];
  let cy = 210;
  for (const [value, why, color] of constraints) {
    text(slide, value, 612, cy, 225, 32, { fontSize: 22, bold: true, color });
    text(slide, why, 844, cy, 330, 32, { fontSize: 18, color: C.muted, valign: "middle" });
    line(slide, 610, cy + 42, 566, 1, C.line);
    cy += 68;
  }
  rect(slide, 610, 565, 566, 64, C.paleGold, true);
  text(slide, "Why 25%?  Limit estimation-driven concentration without forcing equal weights.", 634, 576, 518, 42, {
    fontSize: 18,
    bold: true,
    color: C.ink,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 7);
}

// 8 — Ledoit-Wolf
{
  const slide = presentation.slides.add();
  addTitle(slide, "Shrinkage stabilizes the risk model before optimization", 8, "Ledoit-Wolf covariance");
  rect(slide, 54, 134, 662, 494, C.paper, true, C.line, 1);
  await image(slide, "correlation_heatmap_core.png", 66, 146, 638, 444, "contain", "Core ETF correlation matrix");
  text(slide, "23 assets × 60 observations", 76, 598, 300, 20, { fontSize: 12, color: C.muted });
  line(slide, 748, 144, 2, 470, C.line);
  text(slide, "Sample covariance", 790, 157, 370, 36, { fontSize: 24, bold: true, color: C.coral });
  text(slide, "Direct historical estimate", 790, 201, 370, 28, { fontSize: 18, color: C.muted });
  bullet(slide, "Noisy off-diagonal terms", 790, 245, 390, C.ink, C.coral, 18);
  bullet(slide, "Poor conditioning can amplify weight changes", 790, 289, 390, C.ink, C.coral, 18);
  arrow(slide, 922, 348, 108, 42, C.line);
  rect(slide, 782, 413, 400, 104, C.navy, true);
  text(slide, "Σᴸᵂ = δF + (1 − δ)S", 810, 432, 344, 50, { fontSize: 31, bold: true, color: C.gold, align: "center", valign: "middle" });
  text(slide, "structured target   +   sample matrix", 810, 483, 344, 24, { fontSize: 13, color: "#C4D3DE", align: "center" });
  rect(slide, 782, 548, 400, 70, C.paleTeal, true);
  text(slide, "Small bias  →  lower estimation variance  →  better conditioning", 802, 558, 360, 50, {
    fontSize: 18,
    bold: true,
    color: C.teal,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 8);
}

// 9 — Michaud
{
  const slide = presentation.slides.add();
  addTitle(slide, "Michaud averages portfolios across plausible inputs", 9, "Resampled Efficient Frontier");
  // Arrows behind nodes.
  arrow(slide, 304, 203, 70, 34, C.line);
  arrow(slide, 602, 203, 70, 34, C.line);
  arrow(slide, 900, 203, 70, 34, C.line);
  const process = [
    [72, "01", "Estimate μ and Σ", C.blue],
    [370, "02", "Simulate M universes", C.teal],
    [668, "03", "Optimize each", C.gold],
    [966, "04", "Average weights", C.coral],
  ];
  for (const [x, n, value, color] of process) {
    rect(slide, x, 160, 230, 126, C.paper, true, color, 2);
    text(slide, n, x + 16, 174, 42, 24, { fontSize: 14, bold: true, color });
    text(slide, value, x + 20, 205, 190, 56, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "middle" });
  }
  rect(slide, 70, 334, 360, 244, C.navy, true);
  label(slide, "AVERAGE THE DECISIONS", 101, 358, 230, "#173A57", C.gold);
  text(slide, "w̄ = (1/M) Σₘ wₘ", 99, 420, 300, 56, { fontSize: 34, bold: true, color: C.paper, align: "center" });
  text(slide, "100 · 250 · 500 nested resamples", 99, 490, 300, 32, { fontSize: 18, color: C.teal, align: "center" });
  text(slide, "Why? Reduce dependence on one noisy efficient-frontier estimate.", 103, 530, 294, 38, { fontSize: 16, color: "#DCE6ED", align: "center" });
  rect(slide, 468, 324, 730, 282, C.paper, true, C.line, 1);
  await image(slide, "michaud_weight_heatmap.png", 482, 338, 702, 244, "contain", "Michaud 500 rolling weights");
  text(slide, "Frozen output: Michaud 500 rolling allocation", 488, 581, 400, 18, { fontSize: 11, color: C.muted });
  addNotes(slide, 9);
}

// 10 — HRP
{
  const slide = presentation.slides.add();
  addTitle(slide, "HRP removes inversion—but not concentration risk", 10, "Hierarchical Risk Parity");
  // Tree connectors first.
  line(slide, 171, 218, 4, 220, C.line);
  line(slide, 171, 218, 78, 4, C.line);
  line(slide, 171, 326, 78, 4, C.line);
  line(slide, 171, 434, 78, 4, C.line);
  line(slide, 378, 260, 4, 132, C.line);
  line(slide, 326, 260, 54, 4, C.line);
  line(slide, 326, 388, 54, 4, C.line);
  rect(slide, 70, 178, 122, 68, C.navy, true);
  text(slide, "All ETFs", 84, 194, 94, 36, { fontSize: 21, bold: true, color: C.paper, align: "center", valign: "middle" });
  const clusters = [
    [248, 188, "Growth", C.blue],
    [248, 296, "Defensive", C.teal],
    [248, 404, "Real assets", C.gold],
  ];
  for (const [x, y, value, color] of clusters) {
    rect(slide, x, y, 136, 64, C.paper, true, color, 2);
    text(slide, value, x + 10, y + 13, 116, 36, { fontSize: 18, bold: true, color, align: "center", valign: "middle" });
  }
  text(slide, "Correlation distance\n→ clustering\n→ recursive bisection", 72, 486, 310, 104, {
    fontSize: 20,
    bold: true,
    color: C.navy,
    align: "center",
    lineSpacing: 1.2,
  });
  label(slide, "NO COVARIANCE INVERSION", 76, 606, 270, C.paleTeal, C.teal);

  rect(slide, 450, 150, 748, 384, C.paper, true, C.line, 1);
  await image(slide, "hrp_weight_heatmap.png", 464, 164, 720, 342, "contain", "HRP rolling weight heatmap");
  text(slide, "Frozen HRP weights", 470, 507, 220, 18, { fontSize: 11, color: C.muted });
  rect(slide, 450, 558, 748, 72, C.paleCoral, true);
  text(slide, "Empirical result: near-zero-volatility BIL dominated the unconstrained recursive allocation.", 478, 569, 692, 50, {
    fontSize: 19,
    bold: true,
    color: C.coral,
    align: "center",
    valign: "middle",
  });
  addNotes(slide, 10);
}

// 11 — Backtest timing
{
  const slide = presentation.slides.add();
  addTitle(slide, "Every reported return is genuinely out of sample", 11, "Walk-forward backtest");
  text(slide, "60 monthly observations", 92, 173, 280, 30, { fontSize: 18, bold: true, color: C.blue });
  rect(slide, 88, 224, 622, 92, C.paleBlue, true);
  text(slide, "t−60", 108, 251, 80, 34, { fontSize: 20, bold: true, color: C.blue, align: "center" });
  line(slide, 190, 268, 430, 4, C.blue);
  text(slide, "historical returns only", 276, 232, 250, 26, { fontSize: 17, color: C.muted, align: "center" });
  text(slide, "t−1", 620, 251, 70, 34, { fontSize: 20, bold: true, color: C.blue, align: "center" });
  arrow(slide, 724, 248, 86, 42, C.line);
  rect(slide, 824, 210, 166, 118, C.navy, true);
  text(slide, "t", 842, 226, 130, 38, { fontSize: 25, bold: true, color: C.gold, align: "center" });
  text(slide, "estimate +\nset weights", 842, 266, 130, 50, { fontSize: 18, color: C.paper, align: "center", valign: "middle" });
  arrow(slide, 1002, 248, 76, 42, C.line);
  rect(slide, 1090, 210, 130, 118, C.paleTeal, true, C.teal, 2);
  text(slide, "t+1", 1104, 226, 102, 38, { fontSize: 25, bold: true, color: C.teal, align: "center" });
  text(slide, "realized\nreturn", 1104, 266, 102, 50, { fontSize: 18, bold: true, color: C.navy, align: "center", valign: "middle" });
  rect(slide, 90, 373, 1130, 80, C.navy, true);
  text(slide, "No look-ahead bias", 120, 391, 310, 42, { fontSize: 27, bold: true, color: C.paper, valign: "middle" });
  text(slide, "The return earned after the decision never enters its own estimation window.", 448, 392, 738, 40, { fontSize: 20, color: "#DCE6ED", valign: "middle" });
  text(slide, "COMMON FINAL PERIOD", 92, 504, 250, 24, { fontSize: 14, bold: true, color: C.teal });
  text(slide, "31 Mar 2013", 92, 540, 250, 48, { fontSize: 31, bold: true, color: C.navy });
  arrow(slide, 360, 548, 430, 28, C.paleGold);
  text(slide, "159 identical months", 450, 586, 250, 24, { fontSize: 17, bold: true, color: C.gold, align: "center" });
  text(slide, "31 May 2026", 842, 540, 300, 48, { fontSize: 31, bold: true, color: C.navy, align: "center" });
  label(slide, "SAME UNIVERSE · SAME DATES · SAME COSTS", 840, 600, 304, C.paleTeal, C.teal);
  addNotes(slide, 11);
}

// 12 — Final comparison table
{
  const slide = presentation.slides.add();
  addTitle(slide, "No single strategy wins every objective", 12, "Final results");
  const raw = await fs.readFile(path.join(TABLES, "final_strategy_comparison.csv"), "utf8");
  const rows = parseCsv(raw);
  const headers = ["Strategy", "Return", "Volatility", "Sharpe", "Max DD", "Turnover", "Eff. assets"];
  const widths = [330, 135, 130, 115, 140, 145, 130];
  const x0 = 50;
  const y0 = 128;
  const rowH = 34;
  let x = x0;
  for (let c = 0; c < headers.length; c += 1) {
    rect(slide, x, y0, widths[c], rowH, C.navy);
    text(slide, headers[c], x + 6, y0 + 4, widths[c] - 12, rowH - 8, { fontSize: 15, bold: true, color: C.paper, align: c === 0 ? "left" : "center", valign: "middle" });
    x += widths[c];
  }
  const highlights = {
    "Equal Weight": C.paleGray,
    "Max Sharpe Ledoit-Wolf": C.paleTeal,
    "Target Volatility Ledoit-Wolf": C.paleGold,
    "Michaud 500": C.paleBlue,
    HRP: C.paleCoral,
  };
  for (let r = 0; r < rows.length; r += 1) {
    const item = rows[r];
    const values = [
      item.strategy,
      pct(item.annualized_geometric_return),
      pct(item.annualized_volatility),
      num(item.sharpe_ratio, 3),
      pct(item.max_drawdown),
      pct(item.annualized_turnover),
      num(item.average_effective_number_of_assets, 2),
    ];
    const fill = highlights[item.strategy] || (r % 2 === 0 ? C.paper : "#F2F4F5");
    x = x0;
    for (let c = 0; c < values.length; c += 1) {
      rect(slide, x, y0 + (r + 1) * rowH, widths[c], rowH, fill, false, C.line, 0.6);
      text(slide, values[c], x + 6, y0 + (r + 1) * rowH + 3, widths[c] - 12, rowH - 6, {
        fontSize: c === 0 ? 15 : 14,
        bold: Boolean(highlights[item.strategy]) || c === 0,
        color: item.strategy === "HRP" ? C.coral : C.ink,
        align: c === 0 ? "left" : "center",
        valign: "middle",
      });
      x += widths[c];
    }
  }
  const keyY = 606;
  text(slide, "BEST SHARPE", 58, keyY, 155, 18, { fontSize: 12, bold: true, color: C.teal });
  text(slide, "Max Sharpe LW  0.922", 58, keyY + 20, 240, 24, { fontSize: 17, bold: true, color: C.navy });
  text(slide, "HIGHEST RETURN", 330, keyY, 165, 18, { fontSize: 12, bold: true, color: C.gold });
  text(slide, "Target Vol LW  11.38%", 330, keyY + 20, 260, 24, { fontSize: 17, bold: true, color: C.navy });
  text(slide, "LOWEST TURNOVER", 640, keyY, 170, 18, { fontSize: 12, bold: true, color: C.coral });
  text(slide, "HRP  7.49%", 640, keyY + 20, 180, 24, { fontSize: 17, bold: true, color: C.navy });
  text(slide, "MOST DIVERSIFIED", 895, keyY, 180, 18, { fontSize: 12, bold: true, color: C.blue });
  text(slide, "Equal Weight  23.00", 895, keyY + 20, 250, 24, { fontSize: 17, bold: true, color: C.navy });
  addNotes(slide, 12);
}

// 13 — Cumulative performance
{
  const slide = presentation.slides.add();
  addTitle(slide, "Terminal wealth reflects different amounts of risk", 13, "Cumulative performance");
  rect(slide, 50, 132, 925, 500, C.paper, true, C.line, 1);
  await image(slide, "final_equity_curves.png", 62, 144, 902, 455, "contain", "Final strategy cumulative wealth curves");
  text(slide, "Source: outputs/figures/final_equity_curves.png", 68, 600, 420, 18, { fontSize: 11, color: C.muted });
  line(slide, 1000, 142, 2, 480, C.line);
  label(slide, "READ THE PATH", 1032, 151, 160, C.paleBlue, C.blue);
  text(slide, "1", 1032, 214, 40, 36, { fontSize: 25, bold: true, color: C.gold });
  text(slide, "Target Volatility finishes highest by accepting more risk.", 1074, 208, 154, 76, { fontSize: 17, bold: true, color: C.ink });
  line(slide, 1032, 306, 180, 1, C.line);
  text(slide, "2", 1032, 329, 40, 36, { fontSize: 25, bold: true, color: C.teal });
  text(slide, "Maximum Sharpe and Michaud deliver the strongest risk-adjusted middle path.", 1074, 323, 154, 94, { fontSize: 17, bold: true, color: C.ink });
  line(slide, 1032, 438, 180, 1, C.line);
  text(slide, "3", 1032, 462, 40, 36, { fontSize: 25, bold: true, color: C.coral });
  text(slide, "HRP behaves like cash after concentrating in BIL.", 1074, 456, 154, 76, { fontSize: 17, bold: true, color: C.ink });
  rect(slide, 1024, 562, 196, 66, C.navy, true);
  text(slide, "Highest wealth ≠ universal best", 1038, 573, 168, 44, { fontSize: 17, bold: true, color: C.paper, align: "center", valign: "middle" });
  addNotes(slide, 13);
}

// 14 — Risk diagnostics
{
  const slide = presentation.slides.add();
  addTitle(slide, "Risk, turnover, and diversification tell different stories", 14, "Risk comparison");
  const panels = [
    [54, 132, "DRAWDOWNS", "final_drawdowns.png"],
    [646, 132, "RISK–RETURN", "risk_return_scatter.png"],
    [54, 410, "TURNOVER–SHARPE", "turnover_vs_sharpe.png"],
    [646, 410, "DIVERSIFICATION–SHARPE", "diversification_vs_sharpe.png"],
  ];
  for (const [x, y, title, file] of panels) {
    rect(slide, x, y, 580, 252, C.paper, true, C.line, 1);
    text(slide, title, x + 18, y + 10, 250, 20, { fontSize: 12, bold: true, color: C.teal });
    await image(slide, file, x + 14, y + 32, 552, 206, "contain", title);
  }
  addNotes(slide, 14);
}

// 15 — Interpretation
{
  const slide = presentation.slides.add();
  addTitle(slide, "Robustness mattered as much as optimization", 15, "Interpretation");
  const insights = [
    ["Maximum Sharpe + Ledoit-Wolf", "Best realized Sharpe", "The return signal added value after the covariance input was stabilized.", C.teal],
    ["Target Volatility", "Highest terminal wealth", "The gain came with more volatility—not a free improvement.", C.gold],
    ["Michaud 500", "Best optimized diversification", "A small Sharpe sacrifice bought lower turnover and broader weights.", C.blue],
    ["HRP", "Defensive collapse into BIL", "No inversion did not prevent extreme concentration in a cash-like asset.", C.coral],
  ];
  let y = 150;
  for (const [method, result, meaning, color] of insights) {
    line(slide, 72, y + 60, 1120, 1, C.line);
    rect(slide, 72, y + 3, 12, 46, color, true);
    text(slide, method, 104, y, 330, 50, { fontSize: 22, bold: true, color: C.navy, valign: "middle" });
    arrow(slide, 446, y + 11, 74, 30, C.paleGray);
    text(slide, result, 538, y, 280, 50, { fontSize: 21, bold: true, color, valign: "middle" });
    text(slide, meaning, 832, y, 352, 52, { fontSize: 17, color: C.muted, valign: "middle" });
    y += 112;
  }
  rect(slide, 72, 598, 1112, 48, C.navy, true);
  text(slide, "Method × estimator × universe design determines the realized portfolio.", 98, 606, 1060, 32, { fontSize: 22, bold: true, color: C.paper, align: "center", valign: "middle" });
  addNotes(slide, 15);
}

// 16 — Limitations
{
  const slide = presentation.slides.add();
  addTitle(slide, "The evidence is informative—not definitive", 16, "Limitations");
  text(slide, "01", 78, 160, 58, 34, { fontSize: 22, bold: true, color: C.coral });
  text(slide, "Fixed ETF universe", 142, 156, 380, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "Selection and survivorship bias remain possible.", 142, 197, 430, 42, { fontSize: 18, color: C.muted });

  text(slide, "02", 78, 272, 58, 34, { fontSize: 22, bold: true, color: C.gold });
  text(slide, "Yahoo Finance", 142, 268, 380, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "Reproducible, but not an institutional total-return source.", 142, 309, 430, 52, { fontSize: 18, color: C.muted });

  text(slide, "03", 78, 394, 58, 34, { fontSize: 22, bold: true, color: C.teal });
  text(slide, "One realized history", 142, 390, 380, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "Small ranking differences lack formal structural proof.", 142, 431, 430, 44, { fontSize: 18, color: C.muted });

  line(slide, 624, 150, 2, 420, C.line);
  text(slide, "04", 682, 160, 58, 34, { fontSize: 22, bold: true, color: C.blue });
  text(slide, "Constant transaction costs", 746, 156, 430, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "No time-varying spreads, impact, or liquidity effects.", 746, 197, 430, 42, { fontSize: 18, color: C.muted });

  text(slide, "05", 682, 272, 58, 34, { fontSize: 22, bold: true, color: "#7B6FA8" });
  text(slide, "Taxes and investor frictions", 746, 268, 430, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "Taxes, implementation constraints, and mandates are omitted.", 746, 309, 430, 52, { fontSize: 18, color: C.muted });

  text(slide, "06", 682, 394, 58, 34, { fontSize: 22, bold: true, color: C.coral });
  text(slide, "Distribution assumptions", 746, 390, 430, 36, { fontSize: 24, bold: true, color: C.navy });
  text(slide, "Michaud normality may understate tails and regime shifts.", 746, 431, 430, 44, { fontSize: 18, color: C.muted });

  rect(slide, 78, 548, 1098, 82, C.paleGold, true);
  text(slide, "Interpret the results as comparative evidence—not universal dominance.", 110, 565, 1034, 48, { fontSize: 24, bold: true, color: C.navy, align: "center", valign: "middle" });
  addNotes(slide, 16);
}

// 17 — Future work
{
  const slide = presentation.slides.add();
  addTitle(slide, "Robustness checks should challenge the design choices", 17, "Future work");
  // Route line first.
  line(slide, 128, 330, 1006, 6, C.line);
  const roadmap = [
    [142, "01", "Black-Litterman", "Structured priors\nand investor views", C.blue],
    [348, "02", "Regime models", "Time-varying\nrisk structure", C.teal],
    [554, "03", "Alternative windows", "36 / 60 / 120\nand quarterly", C.gold],
    [760, "04", "Constrained HRP", "No cash · caps ·\nasset-class floors", C.coral],
    [966, "05", "Implementation", "Dynamic costs +\nextended universe", "#7B6FA8"],
  ];
  for (const [x, n, title, body, color] of roadmap) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x - 25, top: 307, width: 56, height: 56 },
      fill: color,
      line: { style: "solid", fill: C.paper, width: 4 },
    });
    text(slide, n, x - 16, 321, 38, 26, { fontSize: 14, bold: true, color: C.paper, align: "center", valign: "middle" });
    text(slide, title, x - 74, 187, 155, 58, { fontSize: 21, bold: true, color: C.navy, align: "center", valign: "bottom" });
    text(slide, body, x - 82, 382, 172, 78, { fontSize: 17, color: C.muted, align: "center", lineSpacing: 1.15 });
  }
  rect(slide, 110, 518, 1058, 92, C.navy, true);
  text(slide, "Principle", 140, 538, 150, 38, { fontSize: 22, bold: true, color: C.gold, valign: "middle" });
  text(slide, "Pre-specify robustness tests—do not search ex post for the best-looking result.", 294, 532, 838, 52, { fontSize: 23, bold: true, color: C.paper, align: "center", valign: "middle" });
  addNotes(slide, 17);
}

// 18 — Conclusion
{
  const slide = presentation.slides.add();
  addTitle(slide, "Complexity helped only when paired with discipline", 18, "Conclusion", true);
  const conclusions = [
    ["01", "Walk-forward design", "Same universe, dates, costs, and next-month timing", C.blue],
    ["02", "Best Sharpe", "Maximum Sharpe Ledoit-Wolf  ·  0.922", C.teal],
    ["03", "Highest wealth", "Target Volatility Ledoit-Wolf  ·  more risk", C.gold],
    ["04", "Best robustness trade-off", "Michaud 500  ·  broader weights and lower turnover", C.coral],
  ];
  let y = 150;
  for (const [n, title, body, color] of conclusions) {
    text(slide, n, 76, y, 60, 40, { fontSize: 23, bold: true, color });
    text(slide, title, 154, y - 2, 340, 44, { fontSize: 25, bold: true, color: C.paper, valign: "middle" });
    text(slide, body, 520, y - 2, 658, 44, { fontSize: 20, color: "#C9D7E0", valign: "middle" });
    line(slide, 76, y + 58, 1102, 1, "#385067");
    y += 104;
  }
  rect(slide, 76, 574, 1102, 72, "#102B45", true, C.teal, 2);
  text(slide, "Robust portfolio design is more than choosing an optimizer.", 104, 588, 1046, 44, { fontSize: 28, bold: true, color: C.gold, align: "center", valign: "middle" });
  addNotes(slide, 18);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(QA_DIR, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  const png = await presentation.export({ slide, format: "png", scale: 1.5 });
  await fs.writeFile(path.join(QA_DIR, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(QA_DIR, `${stem}.layout.json`), await layout.text(), "utf8");
}

const montage = await presentation.export({ format: "webp", montage: true, scale: 0.5 });
await fs.writeFile(path.join(QA_DIR, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(PPTX_PATH);

const notesInspection = await presentation.inspect({
  kind: "slide,notes",
  maxChars: 24000,
});
await fs.writeFile(path.join(QA_DIR, "notes-inspection.ndjson"), notesInspection.ndjson, "utf8");

console.log(JSON.stringify({ pptx: PPTX_PATH, qa: QA_DIR, slides: presentation.slides.items.length }, null, 2));

import jsPDF from "jspdf";
import type { OverviewData, ZipSummary, TimeseriesPoint } from "./types";

// ─── Public Types ─────────────────────────────────────────────

export type ReportScope =
  | { type: "zip"; zip: string }
  | { type: "community"; communitySlug: string; name: string; zip: string };

// ─── Internal Types ───────────────────────────────────────────

interface ChartData {
  id: string;
  label: string;
  description: string;
  unit: string;
  source: string;
  data: TimeseriesPoint[] | null;
}

// ─── Brand / Palette ──────────────────────────────────────────

type RGB = [number, number, number];

const ORANGE: RGB  = [239, 73,  35];   // #EF4923
const DARK: RGB    = [30,  30,  30];
const GRAY: RGB    = [100, 100, 100];
const LGRAY: RGB   = [220, 220, 220];
const WHITE: RGB   = [255, 255, 255];
const BG: RGB      = [248, 248, 248];
const GREEN: RGB   = [16,  185, 129];
const AMBER: RGB   = [245, 158, 11];
const RED: RGB     = [239, 68,  68];

// ─── Page Geometry (US Letter, mm) ────────────────────────────

const PW = 215.9;
const PH = 279.4;
const M  = 12;          // margin
const CW = PW - M * 2;  // content width ≈ 191.9 mm

// ─── Chart Layer Catalog (11 "Popular Data" layers in order) ──

const CHART_LAYERS: Array<{ id: string; label: string; description: string; unit: string; source: string }> = [
  { id: "home-value",             label: "Home Value",                 description: "Zillow Home Value Index — typical home value, seasonally adjusted.",        unit: "currency", source: "Zillow"     },
  { id: "home-value-growth-yoy",  label: "Home Value Growth (YoY)",    description: "Year-over-year % change in home values.",                                   unit: "percent",  source: "Zillow"     },
  { id: "for-sale-inventory",     label: "For Sale Inventory",         description: "Total homes currently listed for sale.",                                     unit: "number",   source: "Zillow"     },
  { id: "home-price-forecast",    label: "Home Price Forecast",        description: "Projected price change over the next 12 months.",                           unit: "percent",  source: "Zillow"     },
  { id: "home-value-growth-5yr",  label: "Home Value Growth (5-Year)", description: "Cumulative % change in home values over the past 5 years.",                 unit: "percent",  source: "Zillow"     },
  { id: "home-value-growth-mom",  label: "Home Value Growth (MoM)",    description: "Month-over-month % change in home values.",                                 unit: "percent",  source: "Zillow"     },
  { id: "overvalued-pct",         label: "Overvalued %",               description: "How much prices exceed their historically normal level.",                   unit: "percent",  source: "Calculated" },
  { id: "days-on-market",         label: "Days on Market",             description: "Average days homes stay listed before going under contract.",                unit: "days",     source: "Redfin"     },
  { id: "home-sales",             label: "Home Sales",                 description: "Number of homes sold in the most recent month.",                            unit: "number",   source: "Redfin"     },
  { id: "cap-rate",               label: "Cap Rate",                   description: "Annual net operating income ÷ property value.",                             unit: "percent",  source: "Calculated" },
  { id: "long-term-growth-score", label: "Long-Term Growth Score",     description: "Composite score (0–100) predicting long-term price appreciation.",          unit: "score",    source: "Spyglass"   },
];

// ─── Utilities ────────────────────────────────────────────────

function toBackendId(id: string): string {
  return id.replace(/-/g, "_");
}

function scopeLabel(scope: ReportScope): string {
  return scope.type === "community" ? scope.name : `ZIP ${scope.zip}`;
}

function fileSlug(scope: ReportScope): string {
  if (scope.type === "community")
    return scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return scope.zip;
}

function todayLong(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function scoreColor(v: number): RGB {
  if (v >= 70) return GREEN;
  if (v >= 40) return AMBER;
  return RED;
}

function fmtVal(v: number | null | undefined, unit: string): string {
  if (v == null) return "—";
  switch (unit) {
    case "currency":
      if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
      if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
      return `$${Math.round(v).toLocaleString()}`;
    case "percent":
      return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
    case "days":
      return `${Math.round(v)}d`;
    case "score":
      return `${Math.round(v)}/100`;
    case "number":
      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
      return Math.round(v).toString();
    default:
      return v.toFixed(1);
  }
}

// ─── Image Loading ────────────────────────────────────────────

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function imgAspectRatio(dataUrl: string): Promise<number> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img.naturalWidth / Math.max(img.naturalHeight, 1));
    img.onerror = () => resolve(4);
    img.src = dataUrl;
  });
}

// ─── Data Fetching ────────────────────────────────────────────

async function fetchSummary(scope: ReportScope): Promise<ZipSummary | null> {
  try {
    const slug = scope.type === "community" ? scope.communitySlug : null;
    const url  = slug
      ? `/api/pulse/v2/zip/${scope.zip}/summary?communitySlug=${encodeURIComponent(slug)}`
      : `/api/pulse/v2/zip/${scope.zip}/summary`;
    const res = await fetch(url, { credentials: "include" });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function fetchAllCharts(scope: ReportScope): Promise<ChartData[]> {
  const slug = scope.type === "community" ? scope.communitySlug : null;
  const results = await Promise.allSettled(
    CHART_LAYERS.map(layer =>
      fetch(
        slug
          ? `/api/pulse/v2/layer/${toBackendId(layer.id)}/timeseries?communitySlug=${encodeURIComponent(slug)}&period=yearly`
          : `/api/pulse/v2/layer/${toBackendId(layer.id)}/timeseries?zip=${scope.zip}&period=yearly`,
        { credentials: "include" }
      ).then(r => r.ok ? r.json() : null).catch(() => null)
    )
  );
  return CHART_LAYERS.map((layer, i) => {
    const res = results[i];
    const raw = res.status === "fulfilled" ? res.value : null;
    const pts: TimeseriesPoint[] | null =
      raw?.data && Array.isArray(raw.data) && raw.data.length >= 2
        ? raw.data as TimeseriesPoint[]
        : null;
    return { id: layer.id, label: layer.label, description: layer.description, unit: layer.unit, source: layer.source, data: pts };
  });
}

// ─── PDF Primitives ───────────────────────────────────────────

function addWatermark(doc: jsPDF, imageData: string): void {
  try {
    const W = 130;
    doc.saveGraphicsState();
    doc.setGState((doc as any).GState({ opacity: 0.05, "stroke-opacity": 0.05 }));
    (doc as any).addImage({ imageData, format: "PNG", x: (PW - W) / 2, y: (PH - W) / 2, w: W, h: W, rotation: 30 });
    doc.restoreGraphicsState();
  } catch {
    // watermark silently skipped on GState failure
  }
}

function addFooter(doc: jsPDF, page: number, total: number, scope: ReportScope): void {
  doc.setFillColor(...ORANGE);
  doc.rect(0, PH - 5, PW, 5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    `Spyglass Realty Pulse Report · ${scopeLabel(scope)} · ${todayLong()}`,
    PW / 2, PH - 7, { align: "center" }
  );
  doc.setTextColor(...DARK);
  doc.text(`${page} / ${total}`, PW - M, PH - 7, { align: "right" });
}

function drawScoreBar(doc: jsPDF, x: number, y: number, label: string, value: number, width: number): void {
  const lw = 52, bh = 5, bs = 9, bw = width - lw - bs - 8;
  const col = scoreColor(value);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(label, x, y + 3.5);
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x + lw, y, bw, bh, 2, 2, "F");
  doc.setFillColor(...col);
  doc.roundedRect(x + lw, y, Math.max((value / 100) * bw, 4), bh, 2, 2, "F");
  const bx = x + lw + bw + 3, by = y - 2;
  doc.setFillColor(...col);
  doc.circle(bx + bs / 2, by + bs / 2, bs / 2, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(String(value), bx + bs / 2, by + bs / 2 + 1, { align: "center" });
}

function drawStatCard(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(...BG);
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(label, x + 4, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(value, x + 4, y + 16);
}

function drawMiniChart(
  doc: jsPDF,
  data: TimeseriesPoint[] | null,
  unit: string,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const AW = 18, AH = 6;
  const cx = x + AW, cy = y, cw = w - AW, ch = h - AH;

  // Plot area background + border
  doc.setFillColor(...BG);
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.2);
  doc.rect(cx, cy, cw, ch, "FD");

  if (!data || data.length < 2) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    doc.text("Insufficient data", cx + cw / 2, cy + ch / 2 + 1, { align: "center" });
    return;
  }

  const vals = data.map(d => d.value);
  const lo   = Math.min(...vals);
  const hi   = Math.max(...vals);
  const rng  = hi - lo || 1;

  // Y-axis labels + horizontal grid lines (4 levels)
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  for (let i = 0; i <= 3; i++) {
    const frac = i / 3;
    const v    = lo + rng * frac;
    const gy   = cy + ch * (1 - frac);
    if (i > 0 && i < 3) {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(cx, gy, cx + cw, gy);
    }
    doc.setTextColor(...GRAY);
    doc.text(fmtVal(v, unit), cx - 1, gy + 1, { align: "right" });
  }

  // Map each point to pixel coordinates
  const pts = data.map((d, i) => ({
    px: cx + (i / (data.length - 1)) * cw,
    py: cy + ch * (1 - (d.value - lo) / rng),
  }));

  // Area fill under the line (light orange, low opacity via GState)
  try {
    const areaSegs: number[][] = [
      [pts[0].px - cx, pts[0].py - (cy + ch)],
      ...pts.slice(1).map((p, i) => [p.px - pts[i].px, p.py - pts[i].py]),
      [cx + cw - pts[pts.length - 1].px, cy + ch - pts[pts.length - 1].py],
    ];
    doc.saveGraphicsState();
    doc.setGState((doc as any).GState({ opacity: 0.12 }));
    doc.setFillColor(...ORANGE);
    doc.lines(areaSegs, cx, cy + ch, [1, 1], "F", true);
    doc.restoreGraphicsState();
  } catch {
    // area fill silently skipped
  }

  // Orange data line on top
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.5);
  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1].px, pts[i - 1].py, pts[i].px, pts[i].py);
  }

  // X-axis date labels (~5 evenly spaced + always show last year)
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  const step = Math.max(1, Math.floor(data.length / 5));
  const shownLast = new Set<number>();
  for (let i = 0; i < data.length; i += step) {
    const px = cx + (i / (data.length - 1)) * cw;
    doc.text(data[i].date.slice(0, 4), px, cy + ch + 4.5, { align: "center" });
    shownLast.add(i);
  }
  const lastIdx = data.length - 1;
  if (!shownLast.has(lastIdx)) {
    doc.text(data[lastIdx].date.slice(0, 4), cx + cw, cy + ch + 4.5, { align: "right" });
  }
}

// ─── Main Export ──────────────────────────────────────────────

export async function generatePulseReport(scope: ReportScope, overview: OverviewData | null): Promise<void> {
  // Parallel: images + summary + all 11 chart timeseries
  const [wordmark, squareLogo, summary, charts] = await Promise.all([
    loadImage("/logos/SpyglassRealty_Logo_Black.png"),
    loadImage("/logos/spyglass-logo-square.png"),
    fetchSummary(scope),
    fetchAllCharts(scope),
  ]);

  const logoW      = 62;
  const logoAspect = wordmark ? await imgAspectRatio(wordmark) : 4;
  const logoH      = logoW / logoAspect;

  const CHARTS_PER_PAGE = 4;
  const totalPages = 1 + Math.ceil(charts.length / CHARTS_PER_PAGE);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  // ── PAGE 1: Summary ──────────────────────────────────────────
  if (squareLogo) addWatermark(doc, squareLogo);

  // Orange header bar
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, PW, 40, "F");

  // Wordmark logo (or text fallback)
  if (wordmark) {
    (doc as any).addImage({ imageData: wordmark, format: "PNG", x: M, y: Math.max(4, (40 - logoH) / 2), w: logoW, h: logoH });
  } else {
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("SPYGLASS REALTY", M, 18);
  }

  // Header right — report title, scope, date
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Pulse Market Report", PW - M, 15, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(scopeLabel(scope), PW - M, 24, { align: "right" });
  doc.setFontSize(8);
  doc.text(todayLong(), PW - M, 32, { align: "right" });

  let y = 47;

  // Location info line
  const locParts: string[] = [];
  if (scope.type === "community") locParts.push(scope.name);
  if (summary?.county) locParts.push(summary.county);
  if (summary?.metro)  locParts.push(summary.metro);
  locParts.push(`ZIP ${scope.zip}`);
  if (summary?.state) locParts.push(summary.state);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(locParts.join(" · "), M, y);
  y += 5;

  if (summary?.dataDate) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Data as of ${summary.dataDate}  ·  Source: ${summary.source}`, M, y);
  }
  y += 9;

  // Hero Stats Grid (3 × 2)
  if (overview) {
    const cardW = (CW - 8) / 3;
    const cardH = 24;
    const gap   = 4;
    const stats = [
      { label: "Active Listings",    value: overview.totalActive    != null ? String(overview.totalActive)            : "—" },
      { label: "Median List Price",  value: fmtVal(overview.medianListPrice,  "currency") },
      { label: "Avg Days on Market", value: overview.avgDom         != null ? `${Math.round(overview.avgDom)}d`        : "—" },
      { label: "New This Week",      value: overview.newLast7       != null ? String(overview.newLast7)               : "—" },
      { label: "Months of Supply",   value: overview.monthsOfSupply != null ? overview.monthsOfSupply.toFixed(1)       : "—" },
      { label: "Price / Sq Ft",      value: fmtVal(overview.avgPricePerSqft, "currency") },
    ];
    for (let i = 0; i < stats.length; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      drawStatCard(doc, stats[i].label, stats[i].value,
        M + col * (cardW + gap), y + row * (cardH + gap), cardW, cardH);
    }
    y += 2 * (cardH + gap) + 6;
  }

  // Section divider
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 9;

  // Forecast + Scores
  if (summary) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("12-Month Home Price Forecast", M, y);
    y += 9;

    const fv    = summary.forecast?.value ?? 0;
    const fcol  = fv >= 0 ? GREEN : RED;
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...fcol);
    doc.text(`${fv >= 0 ? "+" : ""}${fv.toFixed(1)}%`, M, y + 10);

    const dirLabel = summary.forecast?.direction === "up"   ? "▲ Prices Rising"
                   : summary.forecast?.direction === "down" ? "▼ Prices Falling"
                                                            : "► Prices Flat";
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(dirLabel, M + 52, y + 10);

    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.text(`Investor Score: ${summary.investorScore}/100`, PW - M, y + 6,  { align: "right" });
    doc.text(`Growth Score: ${summary.growthScore}/100`,     PW - M, y + 15, { align: "right" });
    y += 22;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Market Scores", M, y);
    y += 8;

    const sbw = CW * 0.82;
    drawScoreBar(doc, M, y,      "Recent Appreciation", summary.scores.recentAppreciation, sbw);
    drawScoreBar(doc, M, y + 12, "Days on Market",       summary.scores.daysOnMarket,       sbw);
    drawScoreBar(doc, M, y + 24, "Mortgage Rates",       summary.scores.mortgageRates,      sbw);
    drawScoreBar(doc, M, y + 36, "Inventory",            summary.scores.inventory,          sbw);
    y += 50;

    // Best months
    const halfW = (CW - 6) / 2;
    const boxH  = 20;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, halfW, boxH, 3, 3, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN);
    doc.text("BEST MONTH TO BUY", M + 5, y + 8);
    doc.setFontSize(13);
    doc.text(summary.bestMonthToBuy || "—", M + 5, y + 16);

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(M + halfW + 6, y, halfW, boxH, 3, 3, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.text("BEST MONTH TO SELL", M + halfW + 11, y + 8);
    doc.setFontSize(13);
    doc.text(summary.bestMonthToSell || "—", M + halfW + 11, y + 16);
    y += boxH + 6;
  }

  // Page 1 disclaimer block (only if space allows)
  const discY = PH - 28;
  if (y < discY - 10) {
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(M, discY, PW - M, discY);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    const disc = [
      "Data sourced from Zillow, Redfin, U.S. Census Bureau, and Spyglass Realty calculations. All data is believed reliable but not guaranteed.",
      "This report is for informational purposes only and does not constitute investment or real estate advice.",
    ];
    disc.forEach((line, i) => doc.text(line, PW / 2, discY + 5 + i * 4.5, { align: "center" }));
  }

  addFooter(doc, 1, totalPages, scope);

  // ── PAGES 2–N: Chart Grid (4 per page, 2 × 2) ───────────────
  const CELL_W   = (CW - 8) / 2;   // ≈ 92 mm per chart cell
  const CELL_H   = 62;              // mm per chart cell
  const CHART_H  = 33;              // plot area height inside cell
  const COL_GAP  = 8;
  const ROW_GAP  = 10;

  for (let pi = 0; pi < Math.ceil(charts.length / CHARTS_PER_PAGE); pi++) {
    doc.addPage();
    const pageNum = pi + 2;
    if (squareLogo) addWatermark(doc, squareLogo);

    // Thin orange page header
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, PW, 10, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text("Spyglass Realty — Pulse Market Report · Market Data Charts", M, 7);

    const start = pi * CHARTS_PER_PAGE;
    const end   = Math.min(start + CHARTS_PER_PAGE, charts.length);

    for (let ci = start; ci < end; ci++) {
      const slot  = ci - start;
      const col   = slot % 2;
      const row   = Math.floor(slot / 2);
      const cellX = M + col * (CELL_W + COL_GAP);
      const cellY = 15 + row * (CELL_H + ROW_GAP);
      const chart = charts[ci];

      // Chart title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text(chart.label, cellX, cellY + 6);

      // Description (1 line max)
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GRAY);
      const descLine = doc.splitTextToSize(chart.description, CELL_W)[0] as string;
      doc.text(descLine, cellX, cellY + 12);

      // Scope badge
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...ORANGE);
      const badge = scope.type === "community"
        ? `${scope.name} · ZIP ${scope.zip}`
        : `ZIP ${scope.zip}`;
      doc.text(badge, cellX, cellY + 18);

      // Mini line chart
      drawMiniChart(doc, chart.data, chart.unit, cellX, cellY + 21, CELL_W, CHART_H);

      // Source attribution below chart
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`Source: ${chart.source}  ·  Yearly`, cellX, cellY + 21 + CHART_H + 5);
    }

    addFooter(doc, pageNum, totalPages, scope);
  }

  // ── Trigger Download ─────────────────────────────────────────
  doc.save(`Spyglass-Pulse-Report-${fileSlug(scope)}-${todayIso()}.pdf`);
}

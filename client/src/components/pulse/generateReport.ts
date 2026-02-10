import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ZipSummary } from "./types";

// ─── Spyglass Realty Brand Colors ────────────────────────────
type RGB = [number, number, number];

const ORANGE: RGB = [239, 73, 35]; // #EF4923
const DARK: RGB = [30, 30, 30];
const GRAY: RGB = [100, 100, 100];
const LIGHT_GRAY: RGB = [200, 200, 200];
const WHITE: RGB = [255, 255, 255];
const BG_LIGHT: RGB = [248, 248, 248];

// Score bar colors
const GREEN: RGB = [16, 185, 129];  // emerald-500
const AMBER: RGB = [245, 158, 11];  // amber-500
const RED: RGB = [239, 68, 68];     // red-500

function getScoreColor(value: number): RGB {
  if (value >= 70) return GREEN;
  if (value >= 40) return AMBER;
  return RED;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Draw a rounded rectangle (fill or stroke)
 */
function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F"
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/**
 * Draw a score bar with label, progress bar, and score badge
 */
function drawScoreBar(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: number,
  width: number
) {
  const labelWidth = 55;
  const barHeight = 6;
  const badgeSize = 10;
  const barWidth = width - labelWidth - badgeSize - 10;
  const color = getScoreColor(value);

  // Label
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(label, x, y + 4);

  // Background bar
  const barX = x + labelWidth;
  const barY = y;
  doc.setFillColor(230, 230, 230);
  roundedRect(doc, barX, barY, barWidth, barHeight, 3, "F");

  // Filled bar
  const filledWidth = (value / 100) * barWidth;
  doc.setFillColor(...color);
  roundedRect(doc, barX, barY, Math.max(filledWidth, 6), barHeight, 3, "F");

  // Score badge
  const badgeX = barX + barWidth + 4;
  const badgeY = y - 2;
  doc.setFillColor(...color);
  doc.circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(
    String(value),
    badgeX + badgeSize / 2,
    badgeY + badgeSize / 2 + 1,
    { align: "center" }
  );
}

/**
 * Generate and download a Pulse PDF report for a zip code
 */
export function generatePulseReport(summary: ZipSummary): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ─── Header / Branding Bar ───────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SPYGLASS REALTY", margin, 14);

  // Report title
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Pulse Market Report", margin, 22);

  // Date right-aligned
  doc.setFontSize(9);
  doc.text(formatDate(), pageWidth - margin, 22, { align: "right" });

  // Zip code badge on the right
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(summary.zipCode, pageWidth - margin, 14, { align: "right" });

  y = 40;

  // ─── Location Info ────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`Zip Code ${summary.zipCode}`, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    `${summary.county} · ${summary.metro} · ${summary.state}`,
    margin,
    y
  );
  y += 4;
  doc.setFontSize(8);
  doc.text(`Source: ${summary.source}  |  Data: ${summary.dataDate}`, margin, y);
  y += 10;

  // ─── Forecast Section ─────────────────────────────────────
  // Section header
  doc.setFillColor(...BG_LIGHT);
  roundedRect(doc, margin, y, contentWidth, 30, 3, "F");
  doc.setDrawColor(...LIGHT_GRAY);
  roundedRect(doc, margin, y, contentWidth, 30, 3, "S");

  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("12-Month Home Price Forecast", margin + 6, y + 8);

  // Big forecast number
  const forecastText = `${summary.forecast.value >= 0 ? "+" : ""}${summary.forecast.value.toFixed(1)}%`;
  const forecastColor = summary.forecast.value >= 0 ? GREEN : RED;
  doc.setTextColor(...forecastColor);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(forecastText, margin + 6, y + 24);

  // Direction label
  const dirLabel =
    summary.forecast.direction === "up"
      ? "▲ Prices Rising"
      : summary.forecast.direction === "down"
      ? "▼ Prices Falling"
      : "► Prices Flat";
  doc.setFontSize(10);
  doc.text(dirLabel, margin + 55, y + 24);

  // Investor + Growth scores on the right
  doc.setTextColor(...DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const rightX = margin + contentWidth - 6;
  doc.text(`Investor Score: ${summary.investorScore}/100`, rightX, y + 12, {
    align: "right",
  });
  doc.text(`Growth Score: ${summary.growthScore}/100`, rightX, y + 20, {
    align: "right",
  });

  y += 38;

  // ─── Best Months ──────────────────────────────────────────
  const halfWidth = (contentWidth - 4) / 2;

  // Buy box
  doc.setFillColor(236, 253, 245); // emerald-50 equivalent
  roundedRect(doc, margin, y, halfWidth, 18, 3, "F");
  doc.setDrawColor(167, 243, 208); // emerald-200
  roundedRect(doc, margin, y, halfWidth, 18, 3, "S");
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("BEST MONTH TO BUY", margin + 6, y + 7);
  doc.setFontSize(13);
  doc.text(summary.bestMonthToBuy, margin + 6, y + 15);

  // Sell box
  doc.setFillColor(254, 242, 242); // red-50 equivalent
  roundedRect(doc, margin + halfWidth + 4, y, halfWidth, 18, 3, "F");
  doc.setDrawColor(254, 202, 202); // red-200
  roundedRect(doc, margin + halfWidth + 4, y, halfWidth, 18, 3, "S");
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.text("BEST MONTH TO SELL", margin + halfWidth + 10, y + 7);
  doc.setFontSize(13);
  doc.text(summary.bestMonthToSell, margin + halfWidth + 10, y + 15);

  y += 26;

  // ─── Market Scores ────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Market Scores", margin, y);
  y += 8;

  drawScoreBar(doc, margin, y, "Appreciation", summary.scores.recentAppreciation, contentWidth);
  y += 12;
  drawScoreBar(doc, margin, y, "Days on Market", summary.scores.daysOnMarket, contentWidth);
  y += 12;
  drawScoreBar(doc, margin, y, "Mortgage Rates", summary.scores.mortgageRates, contentWidth);
  y += 12;
  drawScoreBar(doc, margin, y, "Inventory", summary.scores.inventory, contentWidth);
  y += 18;

  // ─── Key Statistics Table ─────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Key Statistics", margin, y);
  y += 3;

  const yoyText = `${summary.homeValueGrowthYoY >= 0 ? "+" : ""}${summary.homeValueGrowthYoY.toFixed(1)}%`;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: [
      ["Median Home Value", formatCurrency(summary.homeValue)],
      ["Year-over-Year Growth", yoyText],
      ["Median Household Income", formatCurrency(summary.medianIncome)],
      ["Population", summary.population.toLocaleString()],
      ["Investor Score", `${summary.investorScore} / 100`],
      ["Growth Score", `${summary.growthScore} / 100`],
      ["Best Month to Buy", summary.bestMonthToBuy],
      ["Best Month to Sell", summary.bestMonthToSell],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [...ORANGE],
      textColor: [...WHITE],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [...DARK],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    styles: {
      cellPadding: 4,
      lineColor: [...LIGHT_GRAY],
      lineWidth: 0.2,
    },
  });

  // Get y position after table
  y = (doc as any).lastAutoTable?.finalY ?? y + 60;
  y += 12;

  // ─── Disclaimer / Footer ──────────────────────────────────
  // Check if we need a new page
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "italic");
  const disclaimer = [
    "This report is generated by Spyglass Realty's Pulse platform using data from Zillow, Census, and Redfin.",
    "All data is believed to be reliable but is not guaranteed. Market conditions change frequently.",
    "This report is for informational purposes only and does not constitute investment advice.",
    `Generated on ${formatDate()} · © ${new Date().getFullYear()} Spyglass Realty`,
  ];
  disclaimer.forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 4;
  });

  // ─── Orange footer stripe ─────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, pageHeight - 5, pageWidth, 5, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("spyglassrealty.com", pageWidth / 2, pageHeight - 1.5, {
    align: "center",
  });

  // ─── Save ─────────────────────────────────────────────────
  const filename = `Pulse-Report-${summary.zipCode}-${formatDate()}.pdf`;
  doc.save(filename);
}

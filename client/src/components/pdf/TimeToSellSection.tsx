import { Page, View, Text, Svg, Circle, Line, Rect, G } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY, MEDIUM_GRAY } from './styles';
import type { CMAReportData, CMAComparable } from '@shared/cma-sections';

// Chart layout constants
const LEFT_PAD = 55;   // Y label area
const RIGHT_PAD = 8;
const TOP_PAD = 10;
const BOT_PAD = 40;    // X labels + axis title
const CHART_W = 420;
const CHART_H = 145;
const SVG_W = LEFT_PAD + CHART_W + RIGHT_PAD;   // 483
const SVG_H = TOP_PAD + CHART_H + BOT_PAD;       // 195

interface TimeToSellSectionProps {
  data: CMAReportData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

function formatPriceShort(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`;
  return `$${price}`;
}

function isSold(c: CMAComparable): boolean {
  const s = c.status.toLowerCase();
  return s.includes('sold') || s.includes('closed');
}

function isPending(c: CMAComparable): boolean {
  const s = c.status.toLowerCase();
  return s.includes('pending') || s.includes('under contract');
}

function isActive(c: CMAComparable): boolean {
  const s = c.status.toLowerCase();
  return s.includes('active') && !s.includes('under contract');
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('sold') || s.includes('closed')) return '#16a34a';
  if (s.includes('pending') || s.includes('under contract')) return '#ca8a04';
  return SPYGLASS_ORANGE;
}

function getDotColor(c: CMAComparable): string {
  if (isSold(c)) return '#dc2626';
  if (isPending(c)) return '#f97316';
  return '#16a34a';
}

function pctOfListPrice(c: CMAComparable): number | null {
  const sold = c.soldPrice || 0;
  const list = c.listPrice || 0;
  if (!sold || !list) return null;
  return (sold / list) * 100;
}

function avgOfNums(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v) && isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function TimeToSellSection({ data }: TimeToSellSectionProps) {
  const { comparables, agent } = data;

  // Hero stats — DOM averaged over sold/closed comps only
  const soldComps = comparables.filter(isSold);
  const withSoldDOM = soldComps.filter(c => (c.daysOnMarket || 0) > 0);
  const avgDOM = withSoldDOM.length > 0
    ? Math.round(withSoldDOM.reduce((s, c) => s + (c.daysOnMarket || 0), 0) / withSoldDOM.length)
    : null;
  const validPctComps = soldComps.filter(c => (c.soldPrice || 0) > 0 && (c.listPrice || 0) > 0);
  const avgPctOfList = validPctComps.length > 0
    ? validPctComps.reduce((s, c) => s + ((c.soldPrice || 0) / (c.listPrice || 1) * 100), 0) / validPctComps.length
    : null;

  // Chart points
  const chartPoints = comparables.map(c => ({
    price: isSold(c) ? (c.soldPrice || c.listPrice || 0) : (c.listPrice || 0),
    dom: c.daysOnMarket || 0,
    color: getDotColor(c),
  })).filter(p => p.price > 0);

  // Price domain with 10% padding
  const priceValues = chartPoints.map(p => p.price);
  const priceMin = priceValues.length ? Math.min(...priceValues) : 0;
  const priceMax = priceValues.length ? Math.max(...priceValues) : 1_000_000;
  const priceRange = priceMax - priceMin || Math.max(priceMin * 0.2, 100_000);
  const paddedMin = Math.max(0, priceMin - priceRange * 0.1);
  const paddedMax = priceMax + priceRange * 0.1;
  const paddedRange = paddedMax - paddedMin || 1;

  // DOM domain
  const maxDom = chartPoints.length ? Math.max(...chartPoints.map(p => p.dom)) : 30;
  const paddedMaxDom = Math.max(maxDom * 1.1, maxDom + 5, 5);

  // X axis ticks — min 5 DOM spacing, round to nearest 5
  const rawInterval = paddedMaxDom / 4;
  const interval = Math.max(5, Math.ceil(rawInterval / 5) * 5);
  const xTicks: { value: number; x: number }[] = [];
  for (let tick = 0; tick * interval <= paddedMaxDom * 1.05; tick++) {
    const domVal = tick * interval;
    const x = LEFT_PAD + (domVal / paddedMaxDom) * CHART_W;
    if (x <= LEFT_PAD + CHART_W + 2) {
      xTicks.push({ value: domVal, x });
    }
  }

  // Y axis labels (5, top to bottom = max to min)
  const yTicks = [0, 1, 2, 3, 4].map(i => ({
    price: paddedMax - (i / 4) * paddedRange,
    y: TOP_PAD + (i / 4) * CHART_H,
  }));

  // Table averages
  const avgListPrice = avgOfNums(comparables.map(c => c.listPrice || 0).filter(v => v > 0));
  const avgSoldPrice = avgOfNums(soldComps.map(c => c.soldPrice || null));
  const avgDomAll = avgOfNums(withSoldDOM.map(c => c.daysOnMarket || 0));

  return (
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: SPYGLASS_NAVY }}>Time to Sell</Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
          {agent.company || 'SPYGLASS REALTY'}
        </Text>
      </View>

      {/* Hero stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: 700, color: SPYGLASS_NAVY }}>
            {avgDOM != null ? String(avgDOM) : '-'}
          </Text>
          <Text style={{ fontSize: 10, color: MEDIUM_GRAY }}>Days on Market</Text>
        </View>
        <View style={{ width: 1, height: 44, backgroundColor: '#e5e7eb' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: 700, color: SPYGLASS_ORANGE }}>
            {avgPctOfList != null ? `${avgPctOfList.toFixed(2)}%` : '-'}
          </Text>
          <Text style={{ fontSize: 10, color: MEDIUM_GRAY }}>of list price</Text>
        </View>
      </View>

      {/* Blurb */}
      <View style={[styles.card, { marginBottom: 10, padding: 10 }]}>
        <Text style={{ fontSize: 10, color: MEDIUM_GRAY, lineHeight: 1.5 }}>
          {`Sold homes were on the market for an average of ${avgDOM != null ? avgDOM : '-'} days before they accepted an offer. These homes sold for an average of ${avgPctOfList != null ? `${avgPctOfList.toFixed(2)}%` : '-'} of list price.`}
        </Text>
      </View>

      {/* Scatter chart */}
      {chartPoints.length > 0 && (
        <View style={{ width: SVG_W, height: SVG_H, position: 'relative', marginBottom: 6 }}>
          <Svg width={SVG_W} height={SVG_H}>
            {/* Chart area background */}
            <Rect
              x={LEFT_PAD}
              y={TOP_PAD}
              width={CHART_W}
              height={CHART_H}
              fill="#fafafa"
            />
            {/* 4 horizontal grid lines at 25%, 50%, 75%, 100% */}
            {[0.25, 0.5, 0.75, 1].map((f, i) => (
              <Line
                key={`hgrid-${i}`}
                x1={LEFT_PAD}
                y1={TOP_PAD + f * CHART_H}
                x2={LEFT_PAD + CHART_W}
                y2={TOP_PAD + f * CHART_H}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
            ))}
            {/* Left axis */}
            <Line
              x1={LEFT_PAD}
              y1={TOP_PAD}
              x2={LEFT_PAD}
              y2={TOP_PAD + CHART_H}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            {/* Bottom axis */}
            <Line
              x1={LEFT_PAD}
              y1={TOP_PAD + CHART_H}
              x2={LEFT_PAD + CHART_W}
              y2={TOP_PAD + CHART_H}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            {/* Dots grouped */}
            <G>
              {chartPoints.map((point, i) => {
                const rawX = LEFT_PAD + (point.dom / paddedMaxDom) * CHART_W;
                const rawY = TOP_PAD + (1 - (point.price - paddedMin) / paddedRange) * CHART_H;
                const cx = Math.max(LEFT_PAD + 6, Math.min(LEFT_PAD + CHART_W - 6, rawX));
                const cy = Math.max(TOP_PAD + 6, Math.min(TOP_PAD + CHART_H - 6, rawY));
                return <Circle key={i} cx={cx} cy={cy} r={5} fill={point.color} />;
              })}
            </G>
          </Svg>

          {/* Y axis price labels (absolute overlay) */}
          {yTicks.map((tick, i) => (
            <Text
              key={`ylabel-${i}`}
              style={{
                position: 'absolute',
                top: tick.y - 5,
                left: 0,
                width: LEFT_PAD - 4,
                textAlign: 'right',
                fontSize: 7,
                color: MEDIUM_GRAY,
              }}
            >
              {formatPriceShort(Math.round(tick.price))}
            </Text>
          ))}

          {/* X axis DOM labels */}
          {xTicks.map((tick, i) => (
            <Text
              key={`xlabel-${i}`}
              style={{
                position: 'absolute',
                top: TOP_PAD + CHART_H + 6,
                left: tick.x - 15,
                width: 30,
                textAlign: 'center',
                fontSize: 7,
                color: MEDIUM_GRAY,
              }}
            >
              {String(tick.value)}
            </Text>
          ))}

          {/* X axis title */}
          <Text
            style={{
              position: 'absolute',
              top: TOP_PAD + CHART_H + 22,
              left: LEFT_PAD,
              width: CHART_W,
              textAlign: 'center',
              fontSize: 8,
              color: MEDIUM_GRAY,
            }}
          >
            Days on Market
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={{ flexDirection: 'row', marginBottom: 10, paddingLeft: LEFT_PAD }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
          <Svg width={10} height={10}>
            <Circle cx={5} cy={5} r={4} fill="#dc2626" />
          </Svg>
          <Text style={{ fontSize: 8, color: MEDIUM_GRAY, marginLeft: 4 }}>Closed</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
          <Svg width={10} height={10}>
            <Circle cx={5} cy={5} r={4} fill="#f97316" />
          </Svg>
          <Text style={{ fontSize: 8, color: MEDIUM_GRAY, marginLeft: 4 }}>Under Contract / Pending</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Svg width={10} height={10}>
            <Circle cx={5} cy={5} r={4} fill="#16a34a" />
          </Svg>
          <Text style={{ fontSize: 8, color: MEDIUM_GRAY, marginLeft: 4 }}>Active</Text>
        </View>
      </View>

      {/* Comp table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCellHeader, { width: '4%', textAlign: 'center' }]}>#</Text>
          <Text style={[styles.tableCellHeader, { width: '29%' }]}>Address</Text>
          <Text style={[styles.tableCellHeader, { width: '11%', textAlign: 'center' }]}>Status</Text>
          <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>List Price</Text>
          <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>Sold Price</Text>
          <Text style={[styles.tableCellHeader, { width: '7%', textAlign: 'center' }]}>DOM</Text>
          <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'center' }]}>% of List</Text>
        </View>

        {comparables.map((comp, i) => {
          const pct = pctOfListPrice(comp);
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '4%', textAlign: 'center', color: MEDIUM_GRAY }]}>
                {i + 1}
              </Text>
              <Text style={[styles.tableCell, { width: '29%' }]}>{comp.address}</Text>
              <Text style={[styles.tableCell, { width: '11%', textAlign: 'center', color: getStatusColor(comp.status), fontWeight: 600 }]}>
                {comp.status}
              </Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
                {comp.listPrice ? `$${formatPrice(comp.listPrice)}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 600, color: comp.soldPrice ? '#16a34a' : MEDIUM_GRAY }]}>
                {comp.soldPrice ? `$${formatPrice(comp.soldPrice)}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>
                {(comp.daysOnMarket || 0) > 0 ? comp.daysOnMarket : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                {pct != null ? `${pct.toFixed(1)}%` : '-'}
              </Text>
            </View>
          );
        })}

        {/* Averages row */}
        <View style={styles.tableRowHighlight}>
          <Text style={[styles.tableCell, { width: '4%', textAlign: 'center' }]} />
          <Text style={[styles.tableCell, { width: '29%', fontWeight: 700 }]}>Averages</Text>
          <Text style={[styles.tableCell, { width: '11%' }]} />
          <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 700 }]}>
            {avgListPrice != null ? `$${formatPrice(Math.round(avgListPrice))}` : '-'}
          </Text>
          <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 700, color: '#16a34a' }]}>
            {avgSoldPrice != null ? `$${formatPrice(Math.round(avgSoldPrice))}` : '-'}
          </Text>
          <Text style={[styles.tableCell, { width: '7%', textAlign: 'center', fontWeight: 700 }]}>
            {avgDomAll != null ? Math.round(avgDomAll) : '-'}
          </Text>
          <Text style={[styles.tableCell, { width: '10%', textAlign: 'center', fontWeight: 700 }]}>
            {avgPctOfList != null ? `${avgPctOfList.toFixed(1)}%` : '-'}
          </Text>
        </View>
      </View>
    </Page>
  );
}

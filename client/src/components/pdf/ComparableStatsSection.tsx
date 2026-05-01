import { Page, View, Text } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY, MEDIUM_GRAY } from './styles';
import type { CMAReportData, CMAComparable } from '@shared/cma-sections';

const SOLD_GREEN = '#16a34a';
const PENDING_AMBER = '#ca8a04';
const BAR_WIDTH = 200;

interface ComparableStatsSectionProps {
  data: CMAReportData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
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

interface SectionStats {
  low: number;
  avg: number;
  high: number;
  avgPricePerSqft: number;
  avgDom: number;
}

function calcStats(comps: CMAComparable[], priceField: (c: CMAComparable) => number | undefined): SectionStats {
  const prices = comps.map(priceField).filter((v): v is number => v != null && v > 0);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const ppsqft = comps.map(c => c.pricePerSqft).filter((v): v is number => v != null && v > 0);
  const avgPricePerSqft = ppsqft.length ? ppsqft.reduce((a, b) => a + b, 0) / ppsqft.length : 0;

  const doms = comps.map(c => c.daysOnMarket).filter((v): v is number => v != null && v >= 0);
  const avgDom = doms.length ? doms.reduce((a, b) => a + b, 0) / doms.length : 0;

  return { low, avg, high, avgPricePerSqft, avgDom };
}

interface StatusSectionProps {
  label: string;
  count: number;
  letter: string;
  color: string;
  tint: string;
  stats: SectionStats;
}

function StatusSection({ label, count, letter, color, tint, stats }: StatusSectionProps) {
  const { low, avg, high, avgPricePerSqft, avgDom } = stats;
  const range = high - low;
  const dotFraction = range > 0 ? Math.min(1, Math.max(0, (avg - low) / range)) : 0.5;
  const dotLeft = dotFraction * (BAR_WIDTH - 10);

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Section header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: tint,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 8,
        }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color }}>{letter}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: 700, color }}>
          {count} {label}
        </Text>
      </View>

      {/* Card */}
      <View style={{
        borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6,
        padding: 12, flexDirection: 'row',
      }}>
        {/* Left — price range bar (60%) */}
        <View style={{ width: '60%', paddingRight: 16, borderRightWidth: 1, borderRightColor: '#e5e7eb' }}>
          {/* Column labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 7, color: MEDIUM_GRAY }}>LOWEST</Text>
            <Text style={{ fontSize: 7, color: MEDIUM_GRAY }}>AVERAGE</Text>
            <Text style={{ fontSize: 7, color: MEDIUM_GRAY }}>HIGH</Text>
          </View>

          {/* Bar + dot */}
          <View style={{ position: 'relative', width: BAR_WIDTH, height: 10, marginBottom: 6 }}>
            <View style={{
              position: 'absolute', top: 4, left: 0,
              width: BAR_WIDTH, height: 2, backgroundColor: '#d1d5db',
            }} />
            <View style={{
              position: 'absolute', top: 0, left: dotLeft,
              width: 10, height: 10, borderRadius: 5, backgroundColor: color,
            }} />
          </View>

          {/* Price values */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontWeight: 600, color: SPYGLASS_NAVY }}>${formatPrice(low)}</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color }}>${formatPrice(Math.round(avg))}</Text>
            <Text style={{ fontSize: 9, fontWeight: 600, color: SPYGLASS_NAVY }}>${formatPrice(high)}</Text>
          </View>
        </View>

        {/* Right — two stat blocks (40%) */}
        <View style={{ width: '40%', paddingLeft: 12, flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 8 }}>
            <Text style={{ fontSize: 7, color: MEDIUM_GRAY, marginBottom: 4, textAlign: 'center' }}>
              AVG PRICE / SQFT
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color, textAlign: 'center' }}>
              {avgPricePerSqft > 0 ? `$${Math.round(avgPricePerSqft)}` : '-'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 7, color: MEDIUM_GRAY, marginBottom: 4, textAlign: 'center' }}>
              AVG DOM
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700, color: SPYGLASS_NAVY, textAlign: 'center' }}>
              {avgDom > 0 ? Math.round(avgDom) : '-'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ComparableStatsSection({ data }: ComparableStatsSectionProps) {
  const { comparables, agent } = data;

  const soldComps = comparables.filter(isSold);
  const pendingComps = comparables.filter(isPending);
  const activeComps = comparables.filter(isActive);

  const soldStats = calcStats(soldComps, c => c.soldPrice || c.listPrice);
  const pendingStats = calcStats(pendingComps, c => c.listPrice);
  const activeStats = calcStats(activeComps, c => c.listPrice);

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: SPYGLASS_NAVY }}>
          Comparable Property Statistics
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
          {agent.company || 'SPYGLASS REALTY'}
        </Text>
      </View>

      {soldComps.length > 0 && (
        <StatusSection
          label="Sold / Closed"
          count={soldComps.length}
          letter="S"
          color={SOLD_GREEN}
          tint="#dcfce7"
          stats={soldStats}
        />
      )}

      {pendingComps.length > 0 && (
        <StatusSection
          label="Pending / Under Contract"
          count={pendingComps.length}
          letter="P"
          color={PENDING_AMBER}
          tint="#fef9c3"
          stats={pendingStats}
        />
      )}

      {activeComps.length > 0 && (
        <StatusSection
          label="Active Listings"
          count={activeComps.length}
          letter="A"
          color={SPYGLASS_ORANGE}
          tint="#fff7ed"
          stats={activeStats}
        />
      )}
    </Page>
  );
}

import { Page, View, Text } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY, MEDIUM_GRAY } from './styles';
import type { CMAReportData, CMAComparable } from '@shared/cma-sections';

interface TimeToSellSectionProps {
  data: CMAReportData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

function pctOfListPrice(c: CMAComparable): number | null {
  const sold = c.soldPrice || 0;
  const list = c.listPrice || 0;
  if (!sold || !list) return null;
  return (sold / list) * 100;
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('sold') || s.includes('closed')) return '#16a34a';
  if (s.includes('pending')) return '#ca8a04';
  return SPYGLASS_ORANGE;
}

export function TimeToSellSection({ data }: TimeToSellSectionProps) {
  const { comparables, agent } = data;

  const withDOM = comparables.filter(c => c.daysOnMarket > 0);
  const avgDOM = withDOM.length > 0
    ? Math.round(withDOM.reduce((sum, c) => sum + c.daysOnMarket, 0) / withDOM.length)
    : null;
  const soldUnder30 = comparables.filter(c => {
    const s = c.status.toLowerCase();
    return (s.includes('sold') || s.includes('closed')) && c.daysOnMarket > 0 && c.daysOnMarket <= 30;
  }).length;

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: SPYGLASS_NAVY }}>
          Time to Sell
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
          {agent.company || 'SPYGLASS REALTY'}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{comparables.length}</Text>
          <Text style={styles.statLabel}>Total Comparables</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>
            {avgDOM != null ? `${avgDOM}` : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg. Days on Market</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{soldUnder30}</Text>
          <Text style={styles.statLabel}>Sold in ≤ 30 Days</Text>
        </View>
      </View>

      {/* Insight text */}
      <View style={[styles.card, { marginTop: 16, padding: 12 }]}>
        <Text style={{ fontSize: 10, color: MEDIUM_GRAY, lineHeight: 1.6 }}>
          {`Of the ${comparables.length} comparable propert${comparables.length === 1 ? 'y' : 'ies'} reviewed, ` +
            (avgDOM != null
              ? `the average time on market is ${avgDOM} days.`
              : 'days on market data is limited.') +
            (soldUnder30 > 0 ? ` ${soldUnder30} sold within 30 days, indicating strong buyer demand in this market.` : '')}
        </Text>
      </View>

      {/* Table */}
      <View style={[styles.table, { marginTop: 20 }]}>
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
                {comp.daysOnMarket > 0 ? comp.daysOnMarket : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                {pct != null ? `${pct.toFixed(1)}%` : '-'}
              </Text>
            </View>
          );
        })}
      </View>
    </Page>
  );
}

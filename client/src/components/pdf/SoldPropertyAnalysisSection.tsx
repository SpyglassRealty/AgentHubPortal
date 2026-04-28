import { Page, View, Text } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY, MEDIUM_GRAY } from './styles';
import type { CMAReportData, CMAComparable } from '@shared/cma-sections';

interface SoldPropertyAnalysisSectionProps {
  data: CMAReportData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

function pctOfOrigList(c: CMAComparable): number | null {
  const sold = c.soldPrice || 0;
  const orig = c.originalListPrice || c.listPrice || 0;
  if (!sold || !orig) return null;
  return (sold / orig) * 100;
}

export function SoldPropertyAnalysisSection({ data }: SoldPropertyAnalysisSectionProps) {
  const { comparables, agent } = data;
  const soldComps = comparables.filter(c => {
    const s = c.status.toLowerCase();
    return s.includes('sold') || s.includes('closed');
  });

  if (soldComps.length === 0) return null;

  const avgSoldPrice = Math.round(
    soldComps.reduce((sum, c) => sum + (c.soldPrice || c.listPrice || 0), 0) / soldComps.length
  );

  const pcts = soldComps.map(pctOfOrigList).filter((p): p is number => p !== null);
  const avgPct = pcts.length > 0
    ? (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)
    : null;

  const doms = soldComps.filter(c => c.daysOnMarket > 0);
  const avgDOM = doms.length > 0
    ? Math.round(doms.reduce((sum, c) => sum + c.daysOnMarket, 0) / doms.length)
    : null;

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: SPYGLASS_NAVY }}>
          Sold Property Analysis
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
          {agent.company || 'SPYGLASS REALTY'}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>${formatPrice(avgSoldPrice)}</Text>
          <Text style={styles.statLabel}>Avg. Sold Price</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>
            {avgPct ? `${avgPct}%` : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg. % of Orig. List</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>
            {avgDOM != null ? `${avgDOM}` : '-'}
          </Text>
          <Text style={styles.statLabel}>Avg. Days on Market</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>{soldComps.length}</Text>
          <Text style={styles.statLabel}>Sold Comparables</Text>
        </View>
      </View>

      {/* Insight text */}
      <View style={[styles.card, { marginTop: 16, padding: 12 }]}>
        <Text style={{ fontSize: 10, color: MEDIUM_GRAY, lineHeight: 1.6 }}>
          {`Based on ${soldComps.length} sold comparable propert${soldComps.length === 1 ? 'y' : 'ies'} in the area, ` +
            (avgPct
              ? `homes are selling at an average of ${avgPct}% of original list price`
              : 'price data is limited') +
            (avgDOM != null
              ? ` and spending an average of ${avgDOM} days on market before closing.`
              : '.')}
        </Text>
      </View>

      {/* Table */}
      <View style={[styles.table, { marginTop: 20 }]}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCellHeader, { width: '30%' }]}>Address</Text>
          <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>Orig List</Text>
          <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>Sold Price</Text>
          <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'center' }]}>% of List</Text>
          <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>Sold Date</Text>
          <Text style={[styles.tableCellHeader, { width: '7%', textAlign: 'center' }]}>DOM</Text>
          <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'right' }]}>$/Sqft</Text>
        </View>

        {soldComps.map((comp, i) => {
          const pct = pctOfOrigList(comp);
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '30%' }]}>{comp.address}</Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
                {comp.originalListPrice ? `$${formatPrice(comp.originalListPrice)}` : (comp.listPrice ? `$${formatPrice(comp.listPrice)}` : '-')}
              </Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 600, color: '#16a34a' }]}>
                {comp.soldPrice ? `$${formatPrice(comp.soldPrice)}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                {pct != null ? `${pct.toFixed(1)}%` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>{comp.soldDate || '-'}</Text>
              <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>{comp.daysOnMarket || '-'}</Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
                {comp.pricePerSqft ? `$${comp.pricePerSqft}` : '-'}
              </Text>
            </View>
          );
        })}
      </View>
    </Page>
  );
}

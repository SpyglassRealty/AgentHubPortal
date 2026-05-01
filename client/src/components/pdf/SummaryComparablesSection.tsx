import { Page, View, Text } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY } from './styles';
import type { CMAReportData, CMAComparable } from '@shared/cma-sections';

interface SummaryComparablesSectionProps {
  data: CMAReportData;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
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

function pctOfList(c: CMAComparable): string {
  const sold = c.soldPrice || 0;
  const orig = c.originalListPrice || c.listPrice || 0;
  if (!sold || !orig) return '-';
  return `${((sold / orig) * 100).toFixed(1)}%`;
}

function avgOf(comps: CMAComparable[], fn: (c: CMAComparable) => number | undefined | null): number {
  const vals = comps.map(fn).filter((v): v is number => v != null && !isNaN(v as number));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, paddingVertical: 4, paddingHorizontal: 10, marginTop: 14, marginBottom: 4, borderRadius: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: 700, color: '#ffffff' }}>{label}</Text>
    </View>
  );
}

interface ListAvgs {
  listPrice: number;
  beds: number;
  baths: number;
  sqft: number;
  pricePerSqft: number;
  dom: number;
}

function ListAvgsRow({ avgs }: { avgs: ListAvgs }) {
  return (
    <View style={[styles.tableRowHighlight, { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6 }]}>
      <Text style={[styles.tableCell, { width: '30%', fontWeight: 700, fontSize: 8 }]}>AVERAGES</Text>
      <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
        {avgs.listPrice ? `$${formatPrice(Math.round(avgs.listPrice))}` : '-'}
      </Text>
      <Text style={[styles.tableCell, { width: '8%', textAlign: 'center', fontWeight: 700, fontSize: 8 }]}>
        {avgs.beds ? avgs.beds.toFixed(1) : '-'}
      </Text>
      <Text style={[styles.tableCell, { width: '8%', textAlign: 'center', fontWeight: 700, fontSize: 8 }]}>
        {avgs.baths ? avgs.baths.toFixed(1) : '-'}
      </Text>
      <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
        {avgs.sqft ? formatNumber(Math.round(avgs.sqft)) : '-'}
      </Text>
      <Text style={[styles.tableCell, { width: '12%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
        {avgs.pricePerSqft ? `$${Math.round(avgs.pricePerSqft)}` : '-'}
      </Text>
      <Text style={[styles.tableCell, { width: '8%', textAlign: 'center', fontWeight: 700, fontSize: 8 }]}>
        {avgs.dom ? Math.round(avgs.dom) : '-'}
      </Text>
    </View>
  );
}

export function SummaryComparablesSection({ data }: SummaryComparablesSectionProps) {
  const { subjectProperty, comparables, analysis, agent } = data;
  const soldComps = comparables.filter(isSold);
  const pendingComps = comparables.filter(isPending);
  const activeComps = comparables.filter(isActive);

  // SOLD averages
  const soldAvgOrigList = avgOf(soldComps, c => c.originalListPrice || c.listPrice);
  const soldAvgSoldPrice = avgOf(soldComps, c => c.soldPrice);
  const soldAvgPctList = avgOf(soldComps, c => {
    const sold = c.soldPrice || 0;
    const orig = c.originalListPrice || c.listPrice || 0;
    if (!sold || !orig) return undefined;
    return (sold / orig) * 100;
  });
  const soldAvgDOM = avgOf(soldComps, c => c.daysOnMarket);
  const soldAvgPricePerSqft = avgOf(soldComps, c => c.pricePerSqft);

  // Pending averages
  const pendingAvgs: ListAvgs = {
    listPrice: avgOf(pendingComps, c => c.listPrice),
    beds: avgOf(pendingComps, c => c.bedrooms),
    baths: avgOf(pendingComps, c => c.bathrooms),
    sqft: avgOf(pendingComps, c => c.sqft),
    pricePerSqft: avgOf(pendingComps, c => c.pricePerSqft),
    dom: avgOf(pendingComps, c => c.daysOnMarket),
  };

  // Active averages
  const activeAvgs: ListAvgs = {
    listPrice: avgOf(activeComps, c => c.listPrice),
    beds: avgOf(activeComps, c => c.bedrooms),
    baths: avgOf(activeComps, c => c.bathrooms),
    sqft: avgOf(activeComps, c => c.sqft),
    pricePerSqft: avgOf(activeComps, c => c.pricePerSqft),
    dom: avgOf(activeComps, c => c.daysOnMarket),
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: SPYGLASS_NAVY }}>
          Summary of Comparable Properties
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
          {agent.company || 'SPYGLASS REALTY'}
        </Text>
      </View>

      {/* Subject property row */}
      <View style={[styles.tableRowHighlight, { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6 }]}>
        <Text style={[styles.tableCell, { width: '32%', fontWeight: 600 }]}>
          {subjectProperty.address} (Subject)
        </Text>
        <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 600, color: SPYGLASS_ORANGE }]}>
          ${formatPrice(subjectProperty.listPrice)}
        </Text>
        <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>{subjectProperty.bedrooms || '-'}</Text>
        <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>{subjectProperty.bathrooms || '-'}</Text>
        <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>
          {subjectProperty.sqft ? formatNumber(subjectProperty.sqft) : '-'}
        </Text>
        <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
          ${subjectProperty.sqft && subjectProperty.listPrice
            ? Math.round(subjectProperty.listPrice / subjectProperty.sqft)
            : '-'}
        </Text>
        <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>-</Text>
        <Text style={[styles.tableCell, { width: '7%', textAlign: 'right' }]}>-</Text>
      </View>

      {/* SOLD / CLOSED section */}
      {soldComps.length > 0 && (
        <View>
          <SectionLabel label="SOLD / CLOSED" color="#16a34a" />
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { width: '30%' }]}>Address</Text>
            <Text style={[styles.tableCellHeader, { width: '13%', textAlign: 'right' }]}>Orig List</Text>
            <Text style={[styles.tableCellHeader, { width: '13%', textAlign: 'right' }]}>Sold Price</Text>
            <Text style={[styles.tableCellHeader, { width: '9%', textAlign: 'center' }]}>% List</Text>
            <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>Sold Date</Text>
            <Text style={[styles.tableCellHeader, { width: '7%', textAlign: 'center' }]}>DOM</Text>
            <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'right' }]}>$/Sqft</Text>
          </View>
          {soldComps.map((comp, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '30%' }]}>{comp.address}</Text>
              <Text style={[styles.tableCell, { width: '13%', textAlign: 'right' }]}>
                {comp.originalListPrice ? `$${formatPrice(comp.originalListPrice)}` : (comp.listPrice ? `$${formatPrice(comp.listPrice)}` : '-')}
              </Text>
              <Text style={[styles.tableCell, { width: '13%', textAlign: 'right', fontWeight: 600, color: '#16a34a' }]}>
                {comp.soldPrice ? `$${formatPrice(comp.soldPrice)}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '9%', textAlign: 'center' }]}>{pctOfList(comp)}</Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>{comp.soldDate || '-'}</Text>
              <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>{comp.daysOnMarket || '-'}</Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
                {comp.pricePerSqft ? `$${comp.pricePerSqft}` : '-'}
              </Text>
            </View>
          ))}
          {/* SOLD averages row */}
          <View style={[styles.tableRowHighlight, { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6 }]}>
            <Text style={[styles.tableCell, { width: '30%', fontWeight: 700, fontSize: 8 }]}>AVERAGES</Text>
            <Text style={[styles.tableCell, { width: '13%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
              {soldAvgOrigList ? `$${formatPrice(Math.round(soldAvgOrigList))}` : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: '13%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
              {soldAvgSoldPrice ? `$${formatPrice(Math.round(soldAvgSoldPrice))}` : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: '9%', textAlign: 'center', fontWeight: 700, fontSize: 8 }]}>
              {soldAvgPctList ? `${soldAvgPctList.toFixed(1)}%` : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: '12%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>-</Text>
            <Text style={[styles.tableCell, { width: '7%', textAlign: 'center', fontWeight: 700, fontSize: 8 }]}>
              {soldAvgDOM ? Math.round(soldAvgDOM) : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', fontWeight: 700, fontSize: 8 }]}>
              {soldAvgPricePerSqft ? `$${Math.round(soldAvgPricePerSqft)}` : '-'}
            </Text>
          </View>
        </View>
      )}

      {/* PENDING / UNDER CONTRACT section */}
      {pendingComps.length > 0 && (
        <View>
          <SectionLabel label="PENDING / UNDER CONTRACT" color="#ca8a04" />
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { width: '30%' }]}>Address</Text>
            <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>List Price</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>Beds</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>Baths</Text>
            <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>Sq Ft</Text>
            <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>$/Sqft</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>DOM</Text>
          </View>
          {pendingComps.map((comp, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '30%' }]}>{comp.address}</Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 600, color: '#ca8a04' }]}>
                ${formatPrice(comp.listPrice)}
              </Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.bedrooms || '-'}</Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.bathrooms || '-'}</Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
                {comp.sqft ? formatNumber(comp.sqft) : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>
                {comp.pricePerSqft ? `$${comp.pricePerSqft}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.daysOnMarket || '-'}</Text>
            </View>
          ))}
          <ListAvgsRow avgs={pendingAvgs} />
        </View>
      )}

      {/* ACTIVE section */}
      {activeComps.length > 0 && (
        <View>
          <SectionLabel label="ACTIVE" color={SPYGLASS_ORANGE} />
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { width: '30%' }]}>Address</Text>
            <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>List Price</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>Beds</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>Baths</Text>
            <Text style={[styles.tableCellHeader, { width: '14%', textAlign: 'right' }]}>Sq Ft</Text>
            <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>$/Sqft</Text>
            <Text style={[styles.tableCellHeader, { width: '8%', textAlign: 'center' }]}>DOM</Text>
          </View>
          {activeComps.map((comp, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '30%' }]}>{comp.address}</Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right', fontWeight: 600, color: SPYGLASS_ORANGE }]}>
                ${formatPrice(comp.listPrice)}
              </Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.bedrooms || '-'}</Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.bathrooms || '-'}</Text>
              <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
                {comp.sqft ? formatNumber(comp.sqft) : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>
                {comp.pricePerSqft ? `$${comp.pricePerSqft}` : '-'}
              </Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{comp.daysOnMarket || '-'}</Text>
            </View>
          ))}
          <ListAvgsRow avgs={activeAvgs} />
        </View>
      )}

      {/* Stats bar — all comps */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>${formatPrice(analysis.averagePrice)}</Text>
          <Text style={styles.statLabel}>Avg. Price</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>${analysis.averagePricePerSqft}</Text>
          <Text style={styles.statLabel}>Avg. $/Sq Ft</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>{analysis.averageDaysOnMarket}</Text>
          <Text style={styles.statLabel}>Avg. Days on Market</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: SPYGLASS_NAVY }]}>{comparables.length}</Text>
          <Text style={styles.statLabel}>Comparables</Text>
        </View>
      </View>
    </Page>
  );
}

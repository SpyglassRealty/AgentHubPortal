import { Page, View, Text, Image } from '@react-pdf/renderer';
import { styles, SPYGLASS_ORANGE, SPYGLASS_NAVY, MEDIUM_GRAY } from './styles';
import type { CMAComparable } from '@shared/cma-sections';

interface PropertyDetailsSectionProps {
  property: CMAComparable & { base64Photos?: string[] };
  index: number;
  company?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('sold') || lower.includes('closed')) return '#16a34a';
  if (lower.includes('pending')) return '#ca8a04';
  if (lower.includes('active')) return SPYGLASS_ORANGE;
  return MEDIUM_GRAY;
}

function DetailCell({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  return (
    <View style={{ width: '30%', marginBottom: 8 }}>
      <Text style={{ fontSize: 8, color: MEDIUM_GRAY }}>{label}</Text>
      <Text style={{ fontSize: 9, fontWeight: 600, color: SPYGLASS_NAVY }}>{String(value)}</Text>
    </View>
  );
}

function FeatureCell({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={{ width: '47%', marginBottom: 8 }}>
      <Text style={{ fontSize: 8, color: MEDIUM_GRAY }}>{label}</Text>
      <Text style={{ fontSize: 9, color: SPYGLASS_NAVY, lineHeight: 1.4 }}>{value}</Text>
    </View>
  );
}

function PageHeader({ index, company }: { index: number; company?: string }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: SPYGLASS_ORANGE, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{index}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: 600, color: SPYGLASS_NAVY }}>
          Comparable #{index}
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: 600, color: SPYGLASS_ORANGE }}>
        {company || 'SPYGLASS REALTY'}
      </Text>
    </View>
  );
}

export function PropertyDetailsSection({ property, index, company }: PropertyDetailsSectionProps) {
  const base64Photos = (property as any).base64Photos || [];
  const urlPhotos = property.photos || [];
  const mainPhoto = base64Photos[0] || urlPhotos[0];
  const base64Additional = base64Photos.slice(1, 5);
  const urlAdditional = urlPhotos.slice(1, 5);
  const additionalPhotos = base64Additional.length > 0
    ? [...base64Additional, ...urlAdditional.slice(base64Additional.length)].slice(0, 4)
    : urlAdditional;
  const displayPrice = property.soldPrice || property.listPrice;

  // Check if page 2 has any content worth showing
  const hasDetailData = !!(
    property.county || property.subdivision || property.lotSize || property.garageSpaces ||
    property.listDate || property.soldDate || property.offMarketDate || property.originalListPrice ||
    property.taxes || property.schoolDistrict || property.schoolHigh || property.schoolMiddle ||
    property.schoolElementary || property.coveredSpaces || property.parkingSpaces ||
    property.directionFaces || property.levels || property.propertyCondition ||
    property.ownership || property.sewer || property.waterSource
  );

  const hasFeatureData = !!(
    property.appliances || property.cooling || property.heating || property.fireplace ||
    property.flooring || property.foundation || property.roof || property.pool ||
    property.interiorFeatures || property.exteriorFeatures || property.lotFeatures ||
    property.fencing || property.patioFeatures || property.laundry || property.utilities ||
    property.windowFeatures || property.securityFeatures || property.constructionMaterials ||
    property.otherStructures || property.disclosures || property.communityFeatures ||
    property.accessibilityFeatures || property.greenEnergy || property.parkingFeatures
  );

  const hasPage2 = hasDetailData || hasFeatureData || !!property.description;

  return (
    <>
      {/* PAGE 1 — Photo, price, quick specs */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader index={index} company={company} />

        {mainPhoto && (
          <Image src={mainPhoto} style={styles.propertyPhoto} />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 600, color: SPYGLASS_NAVY, marginBottom: 4 }}>
              {property.address}
            </Text>
            <Text style={{ fontSize: 11, color: MEDIUM_GRAY }}>
              MLS# {property.mlsNumber}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{
              paddingVertical: 4, paddingHorizontal: 12,
              borderRadius: 4, backgroundColor: getStatusColor(property.status),
            }}>
              <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: 600 }}>
                {property.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.price}>${formatPrice(displayPrice)}</Text>
            {property.soldPrice && property.listPrice !== property.soldPrice && (
              <Text style={{ fontSize: 11, color: MEDIUM_GRAY, marginBottom: 16 }}>
                List Price: ${formatPrice(property.listPrice)}
              </Text>
            )}

            <View style={styles.specsRow}>
              <View style={styles.specItem}>
                <Text style={styles.specValue}>{property.bedrooms || '-'}</Text>
                <Text style={styles.specLabel}>Beds</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specValue}>{property.bathrooms || '-'}</Text>
                <Text style={styles.specLabel}>Baths</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specValue}>{property.sqft ? formatNumber(property.sqft) : '-'}</Text>
                <Text style={styles.specLabel}>Sq Ft</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specValue}>{property.yearBuilt || '-'}</Text>
                <Text style={styles.specLabel}>Year Built</Text>
              </View>
            </View>

            <View style={[styles.card, { marginTop: 16, padding: 12 }]}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Price/Sq Ft</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_ORANGE }}>
                    {property.pricePerSqft ? `$${property.pricePerSqft}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Days on Market</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.daysOnMarket != null ? `${property.daysOnMarket}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>List Price</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.listPrice ? `$${formatPrice(property.listPrice)}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Orig. List Price</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.originalListPrice ? `$${formatPrice(property.originalListPrice)}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Sold Date</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.soldDate || '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Lot Size</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.lotSize ? `${formatNumber(property.lotSize)} sf` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Acres</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.lotSize ? (property.lotSize / 43560).toFixed(3) : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Garage</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.garageSpaces != null ? `${property.garageSpaces}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Subdivision</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.subdivision || '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>County</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.county || '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Stories</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.stories != null ? `${property.stories}` : '-'}
                  </Text>
                </View>
                <View style={{ width: '30%' }}>
                  <Text style={{ fontSize: 9, color: MEDIUM_GRAY }}>Year Built</Text>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: SPYGLASS_NAVY }}>
                    {property.yearBuilt || '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {additionalPhotos.length > 0 && (
            <View style={{ flex: 1, gap: 6 }}>
              {additionalPhotos.map((photo, idx) => (
                <Image
                  key={idx}
                  src={photo}
                  style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 4 }}
                />
              ))}
            </View>
          )}
        </View>
      </Page>

      {/* PAGE 2 — Full Details, Features, Remarks */}
      {hasPage2 && (
        <Page size="LETTER" style={styles.page}>
          <PageHeader index={index} company={company} />

          <Text style={{ fontSize: 10, color: MEDIUM_GRAY, marginBottom: 12 }}>
            {property.address}  ·  MLS# {property.mlsNumber}
          </Text>

          {/* DETAILS section */}
          {hasDetailData && (
            <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: SPYGLASS_NAVY, marginBottom: 10 }}>
                Property Details
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <DetailCell label="Property Type" value={property.area} />
                <DetailCell label="County" value={property.county} />
                <DetailCell label="Subdivision" value={property.subdivision} />
                <DetailCell label="Acres" value={property.lotSize ? (property.lotSize / 43560).toFixed(3) : null} />
                <DetailCell label="Lot Size (sf)" value={property.lotSize ? formatNumber(property.lotSize) : null} />
                <DetailCell label="Garage Spaces" value={property.garageSpaces} />
                <DetailCell label="Covered Spaces" value={property.coveredSpaces} />
                <DetailCell label="Parking Total" value={property.parkingSpaces} />
                <DetailCell label="Stories / Levels" value={property.stories || property.levels} />
                <DetailCell label="Direction Faces" value={property.directionFaces} />
                <DetailCell label="List Date" value={property.listDate} />
                <DetailCell label="Sold Date" value={property.soldDate} />
                <DetailCell label="Off-Market Date" value={property.offMarketDate} />
                <DetailCell label="List Price" value={property.listPrice ? `$${formatPrice(property.listPrice)}` : null} />
                <DetailCell label="Orig. List Price" value={property.originalListPrice ? `$${formatPrice(property.originalListPrice)}` : null} />
                <DetailCell label="Annual Taxes" value={property.taxes ? `$${formatPrice(property.taxes)}` : null} />
                <DetailCell label="Property Condition" value={property.propertyCondition} />
                <DetailCell label="Ownership" value={property.ownership} />
                <DetailCell label="Sewer" value={property.sewer} />
                <DetailCell label="Water Source" value={property.waterSource} />
                <DetailCell label="School District" value={property.schoolDistrict} />
                <DetailCell label="High School" value={property.schoolHigh} />
                <DetailCell label="Middle School" value={property.schoolMiddle} />
                <DetailCell label="Elementary" value={property.schoolElementary} />
              </View>
            </View>
          )}

          {/* FEATURES section */}
          {hasFeatureData && (
            <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: SPYGLASS_NAVY, marginBottom: 10 }}>
                Features
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <FeatureCell label="Appliances" value={property.appliances} />
                <FeatureCell label="Cooling" value={property.cooling} />
                <FeatureCell label="Heating" value={property.heating} />
                <FeatureCell label="Fireplace" value={property.fireplace} />
                <FeatureCell label="Flooring" value={property.flooring} />
                <FeatureCell label="Foundation" value={property.foundation} />
                <FeatureCell label="Roof" value={property.roof} />
                <FeatureCell label="Pool" value={property.pool} />
                <FeatureCell label="Interior Features" value={property.interiorFeatures} />
                <FeatureCell label="Exterior Features" value={property.exteriorFeatures} />
                <FeatureCell label="Lot Features" value={property.lotFeatures} />
                <FeatureCell label="Fencing" value={property.fencing} />
                <FeatureCell label="Patio & Porch" value={property.patioFeatures} />
                <FeatureCell label="Laundry" value={property.laundry} />
                <FeatureCell label="Utilities" value={property.utilities} />
                <FeatureCell label="Window Features" value={property.windowFeatures} />
                <FeatureCell label="Security" value={property.securityFeatures} />
                <FeatureCell label="Construction" value={property.constructionMaterials} />
                <FeatureCell label="Parking Features" value={property.parkingFeatures} />
                <FeatureCell label="Other Structures" value={property.otherStructures} />
                <FeatureCell label="Community Features" value={property.communityFeatures} />
                <FeatureCell label="Green Energy" value={property.greenEnergy} />
                <FeatureCell label="Accessibility" value={property.accessibilityFeatures} />
                <FeatureCell label="Disclosures" value={property.disclosures} />
              </View>
            </View>
          )}

          {/* REMARKS */}
          {property.description && (
            <View style={[styles.card, { padding: 12 }]}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: SPYGLASS_NAVY, marginBottom: 8 }}>
                Remarks
              </Text>
              <Text style={{ fontSize: 9, color: MEDIUM_GRAY, lineHeight: 1.5 }}>
                {property.description}
              </Text>
            </View>
          )}
        </Page>
      )}
    </>
  );
}

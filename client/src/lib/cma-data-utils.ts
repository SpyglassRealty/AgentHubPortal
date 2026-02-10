// CMA Data Utilities - Contract Conduit compatibility layer
// These utilities match the functions expected by Contract Conduit widgets

import type { CmaProperty } from "@/components/cma-presentation/types";

export function extractPrice(property: CmaProperty): number {
  return property.soldPrice || property.listPrice || property.price || 0;
}

export function extractSqft(property: CmaProperty): number {
  return property.sqft || 0;
}

export function extractDOM(property: CmaProperty): number {
  return property.daysOnMarket || 0;
}

export function calculatePricePerSqft(property: CmaProperty): number {
  const price = extractPrice(property);
  const sqft = extractSqft(property);
  return sqft > 0 ? price / sqft : 0;
}

export function getCityState(property: CmaProperty): string {
  const city = property.city || '';
  const state = property.state || '';
  return city && state ? `${city}, ${state}` : city || state;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateAveragePrice(properties: CmaProperty[]): number {
  if (properties.length === 0) return 0;
  const total = properties.reduce((sum, prop) => sum + extractPrice(prop), 0);
  return total / properties.length;
}

export function calculateMedianPrice(properties: CmaProperty[]): number {
  if (properties.length === 0) return 0;
  const prices = properties.map(extractPrice).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid];
}

export function calculateAverageDaysOnMarket(properties: CmaProperty[]): number {
  if (properties.length === 0) return 0;
  const total = properties.reduce((sum, prop) => sum + extractDOM(prop), 0);
  return total / properties.length;
}

export function calculateAveragePricePerSqft(properties: CmaProperty[]): number {
  if (properties.length === 0) return 0;
  const total = properties.reduce((sum, prop) => sum + calculatePricePerSqft(prop), 0);
  return total / properties.length;
}

export function calculatePriceRange(properties: CmaProperty[]): { min: number; max: number } {
  if (properties.length === 0) return { min: 0, max: 0 };
  const prices = properties.map(extractPrice);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function filterPropertiesByStatus(
  properties: CmaProperty[],
  status: CmaProperty['status'] | 'all'
): CmaProperty[] {
  if (status === 'all') return properties;
  return properties.filter(prop => prop.status === status);
}

export function sortPropertiesByPrice(
  properties: CmaProperty[],
  direction: 'asc' | 'desc' = 'desc'
): CmaProperty[] {
  return [...properties].sort((a, b) => {
    const priceA = extractPrice(a);
    const priceB = extractPrice(b);
    return direction === 'desc' ? priceB - priceA : priceA - priceB;
  });
}

export function sortPropertiesByDaysOnMarket(
  properties: CmaProperty[],
  direction: 'asc' | 'desc' = 'asc'
): CmaProperty[] {
  return [...properties].sort((a, b) => {
    const domA = extractDOM(a);
    const domB = extractDOM(b);
    return direction === 'desc' ? domB - domA : domA - domB;
  });
}

export function sortPropertiesByPricePerSqft(
  properties: CmaProperty[],
  direction: 'asc' | 'desc' = 'desc'
): CmaProperty[] {
  return [...properties].sort((a, b) => {
    const psqftA = calculatePricePerSqft(a);
    const psqftB = calculatePricePerSqft(b);
    return direction === 'desc' ? psqftB - psqftA : psqftA - psqftB;
  });
}

// Distance calculation utilities (for mapping functionality)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Property comparison utilities
export function compareProperties(prop1: CmaProperty, prop2: CmaProperty): {
  priceDifference: number;
  pricePercentDiff: number;
  sqftDifference: number;
  domDifference: number;
} {
  const price1 = extractPrice(prop1);
  const price2 = extractPrice(prop2);
  const sqft1 = extractSqft(prop1);
  const sqft2 = extractSqft(prop2);
  const dom1 = extractDOM(prop1);
  const dom2 = extractDOM(prop2);

  return {
    priceDifference: price1 - price2,
    pricePercentDiff: price2 > 0 ? ((price1 - price2) / price2) * 100 : 0,
    sqftDifference: sqft1 - sqft2,
    domDifference: dom1 - dom2,
  };
}

// Status display utilities
export function getStatusColor(status: CmaProperty['status']): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Pending':
    case 'Active Under Contract':
      return 'bg-yellow-100 text-yellow-800';
    case 'Closed':
      return 'bg-blue-100 text-blue-800';
    case 'Expired':
    case 'Canceled':
    case 'Withdrawn':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusDisplayName(status: CmaProperty['status']): string {
  switch (status) {
    case 'Active Under Contract':
      return 'Under Contract';
    default:
      return status;
  }
}

// Additional functions needed by Contract Conduit PDF generation
export function extractLotAcres(property: CmaProperty): number {
  return property.lotSizeAcres || property.lot?.acres || 0;
}

export function extractBeds(property: CmaProperty): number {
  return property.beds || 0;
}

export function extractBaths(property: CmaProperty): number {
  return property.baths || 0;
}

export function extractFullAddress(property: CmaProperty): string {
  return property.address;
}

export function calculatePricePerAcre(property: CmaProperty): number {
  const price = extractPrice(property);
  const acres = extractLotAcres(property);
  return acres > 0 ? price / acres : 0;
}

export function calculateCMAStats(properties: CmaProperty[]) {
  if (properties.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      averagePricePerSqft: 0,
      averageDaysOnMarket: 0,
      priceRange: { min: 0, max: 0 }
    };
  }

  const prices = properties.map(extractPrice);
  const sqfts = properties.map(extractSqft);
  const doms = properties.map(extractDOM);
  
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices.length % 2 === 0
    ? (sortedPrices[Math.floor(sortedPrices.length / 2) - 1] + sortedPrices[Math.floor(sortedPrices.length / 2)]) / 2
    : sortedPrices[Math.floor(sortedPrices.length / 2)];
  
  const averagePricePerSqft = properties.reduce((sum, p) => sum + calculatePricePerSqft(p), 0) / properties.length;
  const averageDaysOnMarket = doms.reduce((sum, d) => sum + d, 0) / doms.length;

  return {
    averagePrice,
    medianPrice,
    averagePricePerSqft,
    averageDaysOnMarket,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  };
}

export function formatPrice(price: number): string {
  return formatCurrency(price);
}

export function formatPriceShort(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}K`;
  }
  return formatCurrency(price);
}

export function normalizeStatus(status: CmaProperty['status']): string {
  return getStatusDisplayName(status);
}

// Agent and photo utilities (using placeholder data for now)
export function getAgentName(agent?: any): string {
  return agent?.name || 'Spyglass Realty Agent';
}

export function getAgentPhoto(agent?: any): string | null {
  return agent?.photo || null;
}

export function getAgentInitials(agent?: any): string {
  const name = getAgentName(agent);
  const names = name.split(' ');
  return names.map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
}

export function getPrimaryPhoto(property: CmaProperty): string | null {
  return property.photos && property.photos.length > 0 ? property.photos[0] : null;
}

export function getPhotos(property: CmaProperty): string[] {
  return property.photos || [];
}
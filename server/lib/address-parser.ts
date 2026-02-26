/**
 * Address Parser for Repliers API
 * Parses full addresses into individual Repliers fields
 */

export interface ParsedAddress {
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Parse a full address string into Repliers API fields
 * Example: "2402 Rockingham Cir, Austin, TX 78704" 
 * -> { streetNumber: "2402", streetName: "Rockingham", streetSuffix: "Cir", city: "Austin", state: "TX", zip: "78704" }
 */
export function parseAddress(fullAddress: string): ParsedAddress {
  if (!fullAddress?.trim()) return {};
  
  const address = fullAddress.trim();
  
  // Split by comma to separate street from city/state/zip
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length < 2) {
    // No commas, try to parse as just street address
    return parseStreetAddress(address);
  }
  
  // Extract city, state, zip from last part
  const cityStateZip = parts[parts.length - 1];
  const stateZipMatch = cityStateZip.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  
  let city = '';
  let state = '';
  let zip = '';
  
  if (stateZipMatch) {
    state = stateZipMatch[1];
    zip = stateZipMatch[2];
    // City is everything before state/zip
    city = cityStateZip.replace(/\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?$/, '').trim();
  } else {
    // Fallback: assume last part is city
    city = cityStateZip;
  }
  
  // Parse street address (first part)
  const streetPart = parts[0];
  const streetFields = parseStreetAddress(streetPart);
  
  return {
    ...streetFields,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
  };
}

/**
 * Parse just the street address portion
 */
function parseStreetAddress(streetAddress: string): Pick<ParsedAddress, 'streetNumber' | 'streetName' | 'streetSuffix'> {
  if (!streetAddress?.trim()) return {};
  
  const street = streetAddress.trim();
  
  // Common street suffixes
  const suffixes = [
    'St', 'Street', 'Ave', 'Avenue', 'Blvd', 'Boulevard', 'Dr', 'Drive', 'Rd', 'Road',
    'Ln', 'Lane', 'Ct', 'Court', 'Pl', 'Place', 'Cir', 'Circle', 'Way', 'Pkwy', 'Parkway',
    'Trl', 'Trail', 'Path', 'Pass', 'Loop', 'Bend', 'Ridge', 'Hill', 'Creek', 'Run',
    'Ter', 'Terrace', 'Sq', 'Square', 'Plaza', 'Alley', 'Walk', 'Commons', 'Green',
  ];
  
  // Create regex pattern for suffixes (case insensitive)
  const suffixPattern = new RegExp(`\\b(${suffixes.join('|')})\\b`, 'i');
  
  // Extract street number (first number sequence)
  const numberMatch = street.match(/^(\d+[A-Za-z]?)/);
  const streetNumber = numberMatch ? numberMatch[1] : '';
  
  // Remove number and clean up
  let remaining = street.replace(/^\d+[A-Za-z]?\s*/, '');
  
  // Extract suffix
  const suffixMatch = remaining.match(suffixPattern);
  let streetSuffix = '';
  let streetName = remaining;
  
  if (suffixMatch) {
    streetSuffix = suffixMatch[1];
    // Remove suffix from street name
    streetName = remaining.replace(suffixPattern, '').trim();
  }
  
  return {
    streetNumber: streetNumber || undefined,
    streetName: streetName || undefined,
    streetSuffix: streetSuffix || undefined,
  };
}

/**
 * Create search fallback chain for address searches
 * Returns array of search params from most specific to least specific
 */
export function createAddressSearchFallbacks(fullAddress: string): Array<{ search?: string; [key: string]: any }> {
  const parsed = parseAddress(fullAddress);
  const fallbacks: Array<{ search?: string; [key: string]: any }> = [];
  
  // Fallback 1: Exact parsed address fields
  if (parsed.streetNumber && parsed.streetName && parsed.zip) {
    fallbacks.push({
      streetNumber: parsed.streetNumber,
      streetName: parsed.streetName,
      streetSuffix: parsed.streetSuffix,
      zip: parsed.zip,
    });
  }
  
  // Fallback 2: Street name + city without suffix
  if (parsed.streetName && (parsed.city || parsed.zip)) {
    fallbacks.push({
      streetName: parsed.streetName,
      city: parsed.city,
      zip: parsed.zip,
    });
  }
  
  // Fallback 3: Full address as search term
  fallbacks.push({
    search: fullAddress.trim(),
  });
  
  // Fallback 4: Just zip code (broad search)
  if (parsed.zip) {
    fallbacks.push({
      zip: parsed.zip,
    });
  }
  
  return fallbacks;
}
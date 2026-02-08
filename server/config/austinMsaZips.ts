/**
 * Austin-Round Rock-Georgetown MSA zip codes
 * Counties: Travis, Williamson, Hays, Bastrop, Caldwell
 * 
 * This is the canonical list of zip codes for Pulse V2 data pipelines.
 * Sources: USPS, Census ZCTA crosswalk
 */

// Travis County
const TRAVIS_ZIPS = [
  '73301', '73344',
  '78610', '78613', '78617', '78621', '78641', '78645', '78652', '78653',
  '78660', '78664', '78681',
  '78701', '78702', '78703', '78704', '78705',
  '78712', '78717', '78719', '78721', '78722', '78723', '78724', '78725',
  '78726', '78727', '78728', '78729', '78730', '78731', '78732', '78733',
  '78734', '78735', '78736', '78737', '78738', '78739', '78741', '78742',
  '78744', '78745', '78746', '78747', '78748', '78749', '78750', '78751',
  '78752', '78753', '78754', '78756', '78757', '78758', '78759',
];

// Williamson County
const WILLIAMSON_ZIPS = [
  '76527', '76537', '76574', '76578',
  '78613', '78615', '78626', '78628', '78630', '78633', '78634', '78641',
  '78642', '78646', '78660', '78664', '78665', '78681', '78717',
  '78728', '78729', '78750',
];

// Hays County
const HAYS_ZIPS = [
  '78610', '78619', '78620', '78623', '78640', '78652', '78656', '78666',
  '78676', '78737',
];

// Bastrop County
const BASTROP_ZIPS = [
  '78602', '78612', '78617', '78621', '78650', '78653', '78659', '78662',
];

// Caldwell County
const CALDWELL_ZIPS = [
  '78616', '78632', '78638', '78644', '78648', '78655', '78656', '78661',
];

// Deduplicated set of all Austin MSA zips
const _allZips = new Set([
  ...TRAVIS_ZIPS,
  ...WILLIAMSON_ZIPS,
  ...HAYS_ZIPS,
  ...BASTROP_ZIPS,
  ...CALDWELL_ZIPS,
]);
export const AUSTIN_MSA_ZIPS: string[] = Array.from(_allZips).sort();

export const AUSTIN_MSA_ZIP_SET = new Set(AUSTIN_MSA_ZIPS);

/**
 * Check if a zip code is in the Austin MSA
 */
export function isAustinMsaZip(zip: string): boolean {
  return AUSTIN_MSA_ZIP_SET.has(zip.padStart(5, '0'));
}

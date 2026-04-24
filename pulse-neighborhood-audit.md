# Pulse Neighborhood-Polygon Migration Audit

**Date:** 2026-04-23
**Branch:** feature/pulse-neighborhood-polygons
**Scope:** Read-only investigation of the Market Pulse feature in AgentHubPortal.
**Purpose:** Pre-implementation analysis before migrating from ZIP-code fallback to true neighborhood-polygon drilldown using Repliers neighborhood polygon data.

---

## Key Finding Up Front

Pulse V2 (the 50+ data-layer "Reventure clone") uses **ZIP as its only geographic key everywhere** — in the DB schema, every lookup table, every API endpoint, every UI component, and both Zillow/Redfin ingest pipelines. The Repliers API is used only by Pulse V1 (live MLS overview/heatmap/trends). No polygon-based logic exists anywhere in Pulse. "Neighborhood" in the current codebase is a cosmetic label attached to one ZIP per row in a hardcoded in-memory dictionary (`ZIP_META`), not a spatial concept. There is no fallback logic; the single ZIP *is* the data.

---

## 1. Code Location and Entry Points

### Route registration

- `client/src/App.tsx:103` — `<Route path="/pulse" component={PulsePage} />`
- `server/routes.ts:5497` — `registerPulseV2Routes(app)` mounts all V2 handlers from `pulseV2Routes.ts`
- `server/routes.ts:4644–5098` — inline V1 handlers (`/api/pulse/overview`, `/api/pulse/heatmap`, `/api/pulse/trends`, `/api/pulse/zip/:zip`, `/api/pulse/compare`)
- `server/routes.ts:1140–1252` — dashboard V1 handlers (`/api/market-pulse`, `/api/market-pulse/property-types`, `/api/market-pulse/test`)

### Full component tree

```
PulsePage  (client/src/pages/pulse.tsx)
├── HeroStatsBar                  (client/src/components/pulse/HeroStatsBar.tsx)
├── PulseSearchBar                (client/src/components/pulse/PulseSearchBar.tsx)
│    └── fetch: GET /api/pulse/v2/search?q=...
├── DataLayerSidebar              (client/src/components/pulse/DataLayerSidebar.tsx)
│    └── reads frontend catalog:  client/src/components/pulse/data-layers.ts
├── PulseMap                      (client/src/components/pulse/PulseMap.tsx)
│    └── fetch: GET /api/mapbox-token
├── ZipSummaryPanel               (client/src/components/pulse/ZipSummaryPanel.tsx)
│    ├── fetch: GET /api/pulse/v2/zip/:zip/summary
│    ├── ForecastGauge             (client/src/components/pulse/ForecastGauge.tsx)
│    ├── DemographicsSection       (client/src/components/pulse/DemographicsSection.tsx)
│    │    └── fetch: GET /api/pulse/demographics/:zipCode
│    └── SchoolsSection            (client/src/components/pulse/SchoolsSection.tsx)
│         └── fetch: GET /api/pulse/schools?lat=..&lng=..&radius=5&limit=15
├── HistoricalChart               (client/src/components/pulse/HistoricalChart.tsx)
│    └── fetch: GET /api/pulse/v2/layer/:id/timeseries?zip=..&period=..
│    (or) AffordabilityChart      (client/src/components/pulse/AffordabilityChart.tsx)
│         └── fetch: GET /api/pulse/v2/zip/:zip/affordability-history?period=..
├── MarketTrends                  (client/src/components/pulse/MarketTrends.tsx)
│    └── consumes V1 /api/pulse/trends response
└── NeighborhoodExplorer          (client/src/components/pulse/NeighborhoodExplorer.tsx)
     └── client-side filter of ZipHeatmapItem[] by zip
```

**Top-level fetches in `pulse.tsx`:**

| Call | Endpoint | staleTime |
|---|---|---|
| overview | `GET /api/pulse/overview` | 10 min |
| heatmap | `GET /api/pulse/heatmap` | 10 min |
| V2 layer data | `GET /api/pulse/v2/layer/{backendLayerId}` | 5 min |
| trends | `GET /api/pulse/trends` | 10 min |

All fetches use plain `fetch()` with `credentials: "include"` wrapped in `@tanstack/react-query useQuery`. No axios, no custom API wrapper.

### Complete file inventory

#### Frontend (`client/src/`)

| File | Tag |
|---|---|
| `client/src/pages/pulse.tsx` | frontend |
| `client/src/App.tsx` (lines 27, 103) | frontend |
| `client/src/components/pulse/index.ts` | frontend |
| `client/src/components/pulse/types.ts` | frontend |
| `client/src/components/pulse/data-layers.ts` | frontend |
| `client/src/components/pulse/DataLayerSidebar.tsx` | frontend |
| `client/src/components/pulse/PulseMap.tsx` | frontend |
| `client/src/components/pulse/PulseSearchBar.tsx` | frontend |
| `client/src/components/pulse/HeroStatsBar.tsx` | frontend |
| `client/src/components/pulse/MarketTrends.tsx` | frontend |
| `client/src/components/pulse/NeighborhoodExplorer.tsx` | frontend |
| `client/src/components/pulse/HistoricalChart.tsx` | frontend |
| `client/src/components/pulse/AffordabilityChart.tsx` | frontend |
| `client/src/components/pulse/ForecastGauge.tsx` | frontend |
| `client/src/components/pulse/ZipSummaryPanel.tsx` | frontend |
| `client/src/components/pulse/DemographicsSection.tsx` | frontend |
| `client/src/components/pulse/SchoolsSection.tsx` | frontend |
| `client/src/components/pulse/generateReport.ts` | frontend |
| `client/src/components/market-pulse.tsx` | frontend (V1 widget — separate feature) |
| `client/src/components/dashboard/MarketPulseWithSpyglassListings.tsx` | frontend (dashboard widget) |
| `client/src/pages/properties.tsx` | frontend (references `/api/market-pulse`) |
| `client/src/pages/dashboard.tsx` | frontend (uses V1 dashboard widget) |

#### Backend (`server/`)

| File | Tag |
|---|---|
| `server/pulseV2Routes.ts` (1396 lines) | backend |
| `server/routes.ts` (lines 4644–5098; 1140–1252) | backend |
| `server/marketPulseService.ts` (237 lines) | backend |
| `server/services/zillowService.ts` (254 lines) | backend |
| `server/services/censusService.ts` (307 lines) | backend |
| `server/services/redfinService.ts` (269 lines) | backend |
| `server/services/pulseMetricsService.ts` (344 lines) | backend |
| `server/services/greatschools.ts` | backend |
| `server/config/austinMsaZips.ts` | backend |
| `server/config/offices.ts` | backend |
| `server/scheduler.ts` | backend |
| `server/storage.ts` | backend |
| `server/lib/repliers-api.ts` | backend (generic client, NOT used by Pulse) |

#### Shared / migrations / scripts

| File | Tag |
|---|---|
| `shared/schema.ts` (lines 186–198, 722–813, 851–864) | shared |
| `migrations/0001_pulse_v2_tables.sql` | shared |
| `migrations/0002_market_pulse_snapshots.sql` | shared |
| `migrations/0003_add_pulse_schools_cache_table.sql` | shared |
| `scripts/pulse-data-refresh.ts` | backend |
| `scripts/pulse-data-refresh.mjs` | backend |
| `scripts/pulse-data-ingest.mjs` | backend |
| `PULSE-REVENTURE-SPEC.md` | reference |

---

## 2. Current Search Flow — End-to-End

All four search paths share the same entry point: `PulseSearchBar.tsx` debounces 200 ms then calls `GET /api/pulse/v2/search?q=<input>`.

### Handler signature

`server/pulseV2Routes.ts:1309`

```ts
app.get("/api/pulse/v2/search", ..., (req, res) => {
  const q = ((req.query.q as string) || "").trim().toLowerCase();
  // builds matchingZips, matchingCities, matchingCounties, matchingNeighborhoods
  // returns { zips, cities, counties, neighborhoods }
});
```

### (a) Neighborhood search — "Barton Creek"

```
User types "Barton Creek"
  → GET /api/pulse/v2/search?q=barton+creek
  → pulseV2Routes.ts:1354–1365
    for (const [zip, meta] of Object.entries(ZIP_META)) {
      if (meta.neighborhood?.toLowerCase().includes(q)) {
        matchingNeighborhoods.push({ neighborhood: meta.neighborhood, zip, city, county });
      }
    }
  → ZIP_META has coarse labels: "Circle C / SW Austin", "Westlake Hills / Eanes", etc.
    "Barton Creek" → zero matches (not present as a label in ZIP_META)
  → PulseSearchBar.tsx:64
    action: () => { onZipSelect(n.zip); closeDropdown(); }
  → pulse.tsx sets selectedZip = n.zip
  → Downstream fetches: /api/pulse/v2/zip/{zip}/summary, /api/pulse/demographics/{zip},
    /api/pulse/v2/layer/{id}/timeseries?zip={zip}
```

**Outcome:** A search for any named neighborhood not in `ZIP_META` returns zero neighborhood results, silently falling through to zip-prefix and city/county partial matches.

### (b) ZIP search — "78735"

```
User types "78735"
  → GET /api/pulse/v2/search?q=78735
  → pulseV2Routes.ts:1317–1325
    const matchingZips = AUSTIN_ZIPS.filter(zip => zip.startsWith(q)).map(zip => {
      const meta = ZIP_META[zip];
      return { zip, city, county, neighborhood };
    });
  → returns single zip row
  → PulseSearchBar.tsx: onZipSelect("78735")
  → pulse.tsx sets selectedZip = "78735"
  → Same downstream fetches as above
```

### (c) City search — "Cedar Park"

```
  → GET /api/pulse/v2/search?q=cedar+park
  → pulseV2Routes.ts:1328–1339 loops CITIES_TO_ZIPS dict
  → returns { city, county, zips: [...all zips whose ZIP_META.city matches] }
  → PulseSearchBar.tsx: onFilterZips(c.zips, c.city)
  → pulse.tsx sets filteredZips = [...zips]
  → pulse.tsx:137–140  useMemo:
      baseZips.filter(item => filterSet.has(item.zip))
  → client-side filter of already-fetched allZipData — no new server call for filtered data
```

### (d) County search — "Williamson"

```
  → GET /api/pulse/v2/search?q=williamson
  → pulseV2Routes.ts:1342–1352 loops COUNTIES_TO_ZIPS dict
  → returns { county, zips: [...all zips in that county] }
  → PulseSearchBar.tsx: onFilterZips(c.zips, "Williamson County")
  → Same client-side filteredZips path as city search
```

### Where neighborhood → ZIP fallback occurs

**There is no explicit fallback.** The fallback is architectural:

`pulseV2Routes.ts:1354–1365` — when a neighborhood match is found, the backend returns `n.zip` directly from the `ZIP_META` lookup. `PulseSearchBar.tsx:64` calls `onZipSelect(n.zip)` with no awareness that a polygon approach exists. The system never attempts polygon lookup, spatial intersection, or a more granular geography. **The ZIP code embedded in `ZIP_META` is the data; there is nothing to fall back from.**

---

## 3. Repliers API Integration

### Pulse V1 — routes.ts:4644–5098

All V1 Pulse handlers build URLs manually, call `fetch()` directly, and **do not use** the generic `server/lib/repliers-api.ts` client.

**Auth header:** `'REPLIERS-API-KEY': process.env.IDX_GRID_API_KEY` (routes.ts:4649)

**`boardId`:** NOT passed by any Pulse V1 handler. Area scoping is done via `area=<county>` repeated params. If the API key is associated with multiple boards, results would aggregate across all.

**Area filter constant (routes.ts:4642):**
```ts
const PULSE_MSA_AREAS = ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Caldwell'];
const areaParams = PULSE_MSA_AREAS.map(a => `area=${encodeURIComponent(a)}`).join('&');
```

**boardId = 53 confirmation:** Defined in `server/lib/repliers-api.ts:14` (`REPLIERS_BOARD_ID = process.env.REPLIERS_BOARD_ID || '53'`) and `server/savedSearchRoutes.ts:20` (`const BOARD_ID = 53`). Neither is used by Pulse routes. V1 Pulse relies on `area=` scoping, not board-scoped filtering.

### Every Repliers endpoint called by Pulse

| Endpoint | Called from | Params |
|---|---|---|
| `GET /listings` | `routes.ts:4660` (overview, active count) | `?listings=false&type=Sale&standardStatus=Active&area=...×5` |
| `GET /listings` | `routes.ts:4671` (pending count) | `?listings=false&type=Sale&standardStatus=Pending&area=...` |
| `GET /listings` | `routes.ts:4679` (AUC count) | `?listings=false&type=Sale&standardStatus=Active%20Under%20Contract&area=...` |
| `GET /listings` | `routes.ts:4687` (closed 30d) | `?listings=false&type=Sale&status=U&lastStatus=Sld&minSoldDate=<30d>&area=...` |
| `GET /listings` | `routes.ts:4695` (closed 90d) | same, minSoldDate=<90d> |
| `GET /listings` | `routes.ts:4703` (new 7d) | `?listings=false&type=Sale&standardStatus=Active&minListDate=<7d>&area=...` |
| `GET /listings` | `routes.ts:4711` (active sample) | `?listings=true&type=Sale&standardStatus=Active&resultsPerPage=100&sortBy=createdOnDesc&area=...&fields=listPrice,daysOnMarket,details` |
| `GET /listings` | `routes.ts:4720` (sold sample) | `?listings=true&type=Sale&status=U&lastStatus=Sld&minSoldDate=<30d>&resultsPerPage=100&sortBy=lastStatusDesc&area=...&fields=soldPrice,listPrice,daysOnMarket,details` |
| `GET /listings` | `routes.ts:4781` (heatmap aggregates) | `?aggregates=address.zip&listings=false&type=Sale&standardStatus=Active&area=...` |
| `GET /listings` | `routes.ts:4802` (heatmap samples, pages 1–130) | `?listings=true&type=Sale&standardStatus=Active&resultsPerPage=100&pageNum={n}&area=...&fields=listPrice,address,daysOnMarket,details` |
| `GET /listings` | `routes.ts:4890` (active by zip) | `?listings=true&type=Sale&standardStatus=Active&zip={zipCode}&resultsPerPage=50&sortBy=listPriceDesc&fields=listPrice,daysOnMarket,livingArea,address,details,subdivision` |
| `GET /listings` | `routes.ts:4895` (sold by zip, 30d) | `?listings=true&type=Sale&status=U&lastStatus=Sld&minSoldDate=<30d>&zip={zipCode}&resultsPerPage=50&sortBy=lastStatusDesc` |
| `GET /listings` | `routes.ts:4996` (trends stats, 6mo) | `?status=U&lastStatus=Sld&type=Sale&minSoldDate=<6mo>&area=...&statistics=med-soldPrice,avg-daysOnMarket,cnt-closed,grp-mth&listings=false` |
| `GET /listings` | `routes.ts:4999` (trends active count) | `?listings=false&type=Sale&standardStatus=Active&area=...` |
| `GET /listings` | `routes.ts:5042` (compare, per zip) | `?...zip={zip}` (per-zip calls) |
| `GET /listings` | `marketPulseService.ts:52` (V1 cached snapshot) | `?officeId=ACT1518371&...` (scoped to Spyglass office, NOT area/boardId) |

### Hardcoded "geography == ZIP" flags in Repliers calls

- `routes.ts:4890` — `&zip={zipCode}` — literal ZIP param in URL
- `routes.ts:4872` — drops any zip not in `zipCoords` dict: `.filter(z => z.lat !== null)`
- `routes.ts:4793` — reads `data.aggregates?.address?.zip || data.aggregates?.zip` — hard-wired to ZIP aggregate key from Repliers
- No call anywhere passes `polygon=`, `lat=`, `lng=`, `neighborhood=`, or any non-ZIP spatial parameter

**Note:** `test-polygon-search.mjs` at the repo root proves a Repliers polygon search was prototyped. Repliers does support `polygon=<pipe-delimited lat/lng pairs>`. That capability is not wired into any route.

---

## 4. Data Layers Inventory

Source of truth: `server/pulseV2Routes.ts:35–144` (server catalog) and `client/src/components/pulse/data-layers.ts:6–81` (client copy).

### Popular Data

| # | Layer ID | Label | Source | Source native granularity |
|---|---|---|---|---|
| 1 | `home-value` | Home Value | Zillow ZHVI | ZIP, City, County, Metro, Neighborhood (only ZIP ingested) |
| 2 | `home-value-growth-yoy` | Home Value Growth YoY | Zillow ZHVI | ZIP |
| 3 | `for-sale-inventory` | For Sale Inventory | Redfin | ZIP, Neighborhood (only ZIP ingested) |
| 4 | `home-price-forecast` | Home Price Forecast | Calculated from ZHVI | ZIP |
| 5 | `home-value-growth-5yr` | Home Value Growth 5Y | Zillow ZHVI | ZIP |
| 6 | `home-value-growth-mom` | Home Value Growth MoM | Zillow ZHVI | ZIP |
| 7 | `overvalued-pct` | Overvalued % | Calculated (value/income vs historical avg) | ZIP |
| 8 | `days-on-market` | Days on Market | Redfin | ZIP, Neighborhood (only ZIP ingested) |
| 9 | `home-sales` | Home Sales | Redfin | ZIP |
| 10 | `cap-rate` | Cap Rate | Calculated (Zillow + ZORI) | ZIP |
| 11 | `long-term-growth-score` | LT Growth Score | Calculated composite | ZIP |

### Home Price & Affordability

| # | Layer ID | Label | Source | Source native granularity |
|---|---|---|---|---|
| 12 | `home-value-detail` | Home Value | Zillow ZHVI | ZIP |
| 13 | `sf-value` | Single Family Value | Zillow ZHVI (SF) | ZIP |
| 14 | `sf-value-growth-yoy` | SF Value Growth YoY | Zillow ZHVI | ZIP |
| 15 | `condo-value` | Condo Value | Zillow ZHVI (condo) | ZIP |
| 16 | `condo-value-growth-yoy` | Condo Value Growth YoY | Zillow ZHVI | ZIP |
| 17 | `value-income-ratio` | Value / Income Ratio | Calculated (Zillow ÷ Census) | ZIP |
| 18 | `mortgage-payment` | Mortgage Payment | Calculated from ZHVI | ZIP |
| 19 | `mtg-pct-income` | Mtg Payment as % Income | Calculated | ZIP |
| 20 | `salary-to-afford` | Salary to Afford | Calculated | ZIP |
| 21 | `property-tax-annual` | Property Tax Annual | Calculated (1.8% hardcoded tax rate) | ZIP |
| 22 | `property-tax-rate` | Property Tax Rate | Calculated | ZIP |
| 23 | `insurance-annual` | Insurance Premium Annual | Calculated | ZIP |
| 24 | `insurance-pct` | Insurance Premium % | Calculated | ZIP |
| 25 | `buy-vs-rent` | Buy vs Rent Differential | Calculated (needs ZORI) | ZIP |
| 26 | `pct-from-2022-peak` | % Change from 2022 Peak | Zillow ZHVI | ZIP |
| 27 | `pct-crash-2007` | % Crash 2007–12 | Zillow ZHVI | ZIP |

### Market Trends

| # | Layer ID | Label | Source | Source native granularity |
|---|---|---|---|---|
| 28 | `for-sale-inventory-detail` | For Sale Inventory | Redfin | ZIP |
| 29 | `home-price-forecast-detail` | Home Price Forecast | Calculated | ZIP |
| 30 | `days-on-market-detail` | Days on Market | Redfin | ZIP |
| 31 | `home-sales-detail` | Home Sales | Redfin | ZIP |
| 32 | `cap-rate-detail` | Cap Rate | Calculated | ZIP |
| 33 | `long-term-growth-detail` | LT Growth Score | Calculated composite | ZIP |

### Demographics (Census ACS 5-Year)

All 18 demographic layers are natively available at **Census Tract** (finer than ZIP) — `censusService.ts:81` currently queries ZCTA only.

| # | Layer ID | Label | Census table | Source native granularity |
|---|---|---|---|---|
| 34 | `population` | Population | B01003 | ZCTA, Tract, Block Group, County |
| 35 | `median-income` | Median Household Income | B19013 | ZCTA, Tract, County |
| 36 | `population-growth` | Population Growth | B01003 (multi-year) | ZCTA, Tract |
| 37 | `income-growth` | Income Growth | B19013 (multi-year) | ZCTA, Tract |
| 38 | `population-density` | Population Density | B01003 / TIGER area | ZCTA, Tract |
| 39 | `avg-temperature` | Avg Temperature | Hardcoded 68°F for Austin | N/A (not real Census) |
| 40 | `remote-work-pct` | Remote Work % | B08006 | ZCTA, Tract |
| 41 | `college-degree-rate` | College Degree Rate | B15003 | ZCTA, Tract |
| 42 | `homeownership-rate` | Homeownership Rate | B25003 | ZCTA, Tract |
| 43 | `homeowners-25-44` | Homeowners 25–44 % | B25007 | ZCTA, Tract |
| 44 | `homeowners-75plus` | Homeowners 75+ % | B25007 | ZCTA, Tract |
| 45 | `mortgaged-home-pct` | Mortgaged Home % | B25081 | ZCTA, Tract |
| 46 | `median-age` | Median Age | B01002 | ZCTA, Tract |
| 47 | `poverty-rate` | Poverty Rate | B17001 | ZCTA, Tract |
| 48 | `family-households-pct` | Family Households % | B11001 | ZCTA, Tract |
| 49 | `single-households-pct` | Single Households % | B11001 | ZCTA, Tract |
| 50 | `housing-units` | Housing Units | B25001 | ZCTA, Tract |
| 51 | `housing-unit-growth` | Housing Unit Growth | B25001 (multi-year) | ZCTA, Tract |

### Investor

| # | Layer ID | Label | Source | Source native granularity |
|---|---|---|---|---|
| 52 | `cap-rate-investor` | Cap Rate | Calculated | ZIP |
| 53 | `gross-rent-yield` | Gross Rent Yield | Calculated (Zillow ZORI) | ZIP |
| 54 | `home-sales-investor` | Home Sales Volume | Redfin | ZIP |
| 55 | `rent-growth` | Rent Growth | Zillow ZORI | ZIP |
| 56 | `vacancy-rate` | Vacancy Rate | Census ACS B25002 | ZCTA, Tract |

### Spyglass Scores (all calculated composites)

| # | Layer ID | Label | Source | Source native granularity |
|---|---|---|---|---|
| 57 | `market-health-score` | Market Health Score | Calculated | ZIP |
| 58 | `investment-score` | Investment Score | Calculated | ZIP |
| 59 | `growth-potential-score` | Growth Potential Score | Calculated | ZIP |

### Summary by source

| Source | Layers affected | Finest achievable granularity |
|---|---|---|
| Zillow ZHVI/ZORI (only ZIP files ingested) | ~14 layers (#1–2,5–6,10,12–16,26–27,55) | ZIP. Zillow publishes `Neighborhood_zhvi_*.csv` but it's not ingested and covers Zillow-defined neighborhoods, not custom polygons. |
| Redfin Market Tracker (only ZIP rows ingested) | ~7 layers (#3,8–9,28,30–31,54) | ZIP. Redfin TSV includes `region_type='neighborhood'` rows (not ingested). Arbitrary polygons have no Redfin data. |
| Census ACS (only ZCTA ingested) | ~18 layers (#34–51, #56) | Census Tract possible with new ingest + schema. Tract-level aggregation over a polygon is feasible. |
| Calculated composites | ~15 layers (#4,7,11,17–25,29,32–33,57–59) | Inherits ZIP constraint from inputs. |
| Repliers live MLS (V1 only) | V1 endpoints only (not in V2 catalog) | Polygon-capable via `polygon=` param — already prototyped in `test-polygon-search.mjs`. |

---

## 5. Polygon Data Availability

### Polygon files already in this repo

| File | Description |
|---|---|
| `austin-neighborhoods-polygons.json` (6 KB) | 15 coarse hand-drawn Austin regions with `zip_codes` arrays. Not production-grade; not referenced by any route. |
| `austin-polygon-integration.js` | Integration demo script. |
| `austin-polygons-preview.html` | HTML preview. |
| `test-polygon-search.mjs` | Prototype test of Repliers `polygon=` search. Proves the Repliers endpoint works. |
| `austin_neighborhoods.geojson` (329 KB) | Larger GeoJSON neighborhood dataset. Not referenced by any route or component. |
| `austin-neighborhoods/data/neighborhoods-data.json` | Raw neighborhood data. |
| `austin-neighborhoods/data/neighborhoods-raw.json` | Raw. |
| `austin-neighborhoods/data/sample-east-austin-polygon.json` | Sample polygon. |
| `austin-neighborhood-map/data/sample-east-austin-polygon.json` | Duplicate sample. |
| `client/src/pages/admin/PolygonManager.tsx` | Admin UI for drawing polygons, wired to the `communities` table — **completely separate from Pulse**. |

### Communities table (`shared/schema.ts:867–920`)

The `communities` table already has `polygon` (jsonb), `displayPolygon`, `centroid`, `locationType` ('polygon'|'zip'|'city'), `filterValue`, `parentSlug`. These are populated via the CMS admin and served via `communityPublicRoutes.ts`. **No Pulse route or component imports or queries this table.**

### spyglass-idx polygon library

`/Users/ryanrodenbeck/clawd/spyglass-idx/src/data/communities-polygons.ts` (4,222 lines) — exports `COMMUNITIES: CommunityPolygon[]` with `{ name, slug, polygon: [lng,lat][], displayPolygon, county, featured, locationType? }` for ~1,593 Austin-area neighborhoods sourced from Repliers.

**Not imported anywhere in AgentHubPortal.** It is the authoritative source and could be:
1. Imported at runtime from a shared package (requires monorepo restructuring)
2. Duplicated into AgentHubPortal as a static file
3. Loaded from the `communities` DB table if the CMS polygons are complete

---

## 6. Caching, Performance, Payload Shape

### Frontend caching

All Pulse queries use `@tanstack/react-query` with `staleTime` values:
- Overview / heatmap / trends: `staleTime: 1000 * 60 * 10` (10 min)
- V2 layer data: `staleTime: 1000 * 60 * 5` (5 min)
- No `localStorage` or `IndexedDB` persistence. No explicit `queryClient.invalidateQueries`.

### Backend caching

| Endpoint group | Cache mechanism | TTL |
|---|---|---|
| `/api/market-pulse` (V1 dashboard) | Postgres `market_pulse_snapshots` table | Refreshed hourly + daily 6 AM by `scheduler.ts`. Served from DB on request. |
| `/api/pulse/overview`, `/heatmap`, `/trends` (V1) | None — live Repliers call on every request | Effectively the React Query stale window (10 min client-side) |
| `/api/pulse/v2/*` (V2) | None — reads Postgres `pulse_*` tables directly | Tables refresh when `scripts/pulse-data-refresh.ts` is run manually (no cron registered in `scheduler.ts`) |
| `/api/pulse/schools` | Postgres `pulse_schools_cache` (keyed by rounded lat/lon/radius) | TTL set in `server/services/greatschools.ts` |

**No Redis. No in-memory LRU.**

### Performance impact of polygon queries

Current V1 heatmap makes 11 parallel Repliers calls (1 aggregate + 10 sample pages). Replacing `area=<county>` with `polygon=<coords>` in those calls would:

1. **Payload size:** A detailed neighborhood polygon from `communities-polygons.ts` has ~30–200 coordinate pairs. As a pipe-delimited Repliers `polygon=` param that's ~600–4,000 characters in the query string — well within URL limits but worth noting for logging/monitoring.
2. **Response volume:** Neighborhood-scoped results will be dramatically smaller than MSA-wide results (maybe 10–200 active listings vs. thousands). This is a performance improvement for most calls.
3. **Heatmap rendering:** The current heatmap renders bubble markers at zip centroids (`PulseMap.tsx`). Switching to polygon drilldown would require Mapbox `fill` layers (choropleth) or GeoJSON polygon overlays — a substantial UI refactor. The current `zipCoords` centroid lookup has no neighborhood-centroid equivalent.
4. **V2 data layers:** V2 does not hit Repliers at all. The performance impact is in the data ingest pipeline, not at query time. Census Tract ingest would increase the `pulse_census_data` table size substantially (hundreds of tracts vs. 64 zips), but query times at read time are negligible.

---

## 7. Type Definitions and Schemas

### Pulse search params

`server/pulseV2Routes.ts:1309–1315` — single string `q`:
```ts
// Request:  GET /api/pulse/v2/search?q=<string>
// Response:
interface SearchResponse {
  zips: { zip: string; city: string; county: string; neighborhood: string | null }[];
  cities: { city: string; county: string; zips: string[] }[];
  counties: { county: string; zips: string[] }[];
  neighborhoods: { neighborhood: string; zip: string; city: string; county: string }[];
}
```

Frontend in `PulseSearchBar.tsx:5–10`:
```ts
interface SearchResult {
  zips: { zip: string; city: string; county: string; neighborhood: string | null }[];
  cities: { city: string; county: string; zips: string[] }[];
  counties: { county: string; zips: string[] }[];
  neighborhoods: { neighborhood: string; zip: string; city: string; county: string }[];
}
```

### Layer and data model types

`server/pulseV2Routes.ts:18–33`:
```ts
interface LayerDef {
  id: string;
  label: string;
  source: string;
  description: string;
  unit: "currency" | "percent" | "number" | "days" | "score" | "ratio" | "temperature";
  table: string;
  column: string;
  dateColumn?: string;
}
interface Category { id: string; label: string; layers: LayerDef[]; }
```

`client/src/components/pulse/types.ts`:
```ts
export interface DataLayer {
  id: string; label: string; description: string; category: string;
  unit: "currency" | "percent" | "number" | "days" | "score" | "ratio" | "temperature";
  format?: string;
}

export interface ZipSummary {
  zipCode: string; county: string; metro: string; state: string;
  source: string; dataDate: string;
  forecast: { value: number; label: string; direction: "up" | "down" | "flat" };
  investorScore: number; growthScore: number;
  bestMonthToBuy: string; bestMonthToSell: string;
  scores: { recentAppreciation: number; daysOnMarket: number; mortgageRates: number; inventory: number };
  homeValue: number; homeValueGrowthYoY: number; medianIncome: number; population: number;
}

export interface TimeseriesPoint { date: string; value: number; label?: string; }
export interface TimeseriesData {
  layerId: string; zip: string; period: "yearly" | "monthly";
  data: TimeseriesPoint[]; average: number; unit: string;
}

export interface MapLayerData {
  layerId: string;
  zips: { zip: string; value: number; lat: number; lng: number }[];
  min: number; max: number; unit: string;
}

export interface OverviewData {
  totalActive: number; activeUnderContract: number; pending: number;
  closedLast30: number; newLast7: number; medianListPrice: number;
  medianSoldPrice: number; avgDom: number; avgPricePerSqft: number;
  monthsOfSupply: number; lastUpdated: string;
}

export interface ZipHeatmapItem {
  zip: string; count: number; medianPrice: number; avgDom: number;
  lat: number; lng: number; layerValue?: number | null; layerLabel?: string | null;
}

export interface TrendMonth {
  month: string; closedCount: number; medianPrice: number;
  avgDom: number; activeInventory: number | null;
}
```

### Repliers response shape (as consumed by Pulse V1)

From `server/routes.ts:4793–4875`:
```ts
// Count response:
{ count: number }

// Listings response:
{ listings: Array<{
  listPrice: number;
  daysOnMarket: number;
  address: {
    zip?: string; postalCode?: string;
    streetNumber: string; streetName: string; streetSuffix: string;
    city: string; state: string;
  };
  details: {
    sqft?: string; numBedrooms?: number; numBathrooms?: number; propertyType?: string;
  };
  subdivision?: string; area?: string; mlsNumber?: string;
  soldPrice?: number; soldDate?: string; closeDate?: string;
}> }

// Aggregates response (heatmap):
{ count: number; aggregates: { address: { zip: Record<string, number> } } }

// Statistics response (trends):
{
  statistics: {
    soldPrice: { mth: Record<"YYYY-MM", { count: number; med: number; avg: number }> };
    daysOnMarket: { mth: Record<"YYYY-MM", { count: number; med: number; avg: number }> };
  }
}
```

### DB schema (Drizzle — `shared/schema.ts:722–813`)

```ts
// All tables are keyed by zip VARCHAR(5)

pulseZillowData {
  id: serial PK; zip: varchar(5); date: date;
  homeValue: numeric; singleFamilyValue: numeric; condoValue: numeric;
  rentValue: numeric; createdAt: timestamp; updatedAt: timestamp;
}
// Indexes: idx_pulse_zillow_zip (zip), idx_pulse_zillow_zip_date (zip, date)

pulseCensusData {
  id: serial PK; zip: varchar(5); year: integer;
  population: integer; medianIncome: integer; medianAge: numeric;
  homeownershipRate: numeric; povertyRate: numeric; collegeDegreeRate: numeric;
  remoteWorkPct: numeric; housingUnits: integer; familyHouseholdsPct: numeric;
  homeowners25to44Pct: numeric; homeowners75plusPct: numeric;
  createdAt: timestamp; updatedAt: timestamp;
}
// Index: idx_pulse_census_zip

pulseRedfinData {
  id: serial PK; zip: varchar(5); periodStart: date;
  medianSalePrice: numeric; homesSold: integer; medianDom: numeric;
  inventory: integer; priceDropsPct: numeric; saleToListRatio: numeric;
  newListings: integer; avgSaleToList: numeric;
  createdAt: timestamp; updatedAt: timestamp;
}
// Index: idx_pulse_redfin_zip

pulseMetrics {
  id: serial PK; zip: varchar(5); date: date;
  overvaluedPct: numeric; valueIncomeRatio: numeric; mortgagePayment: numeric;
  mtgPctIncome: numeric; salaryToAfford: numeric; buyVsRent: numeric;
  capRate: numeric; priceForecast: numeric;
  investorScore: numeric; growthScore: numeric; marketHealthScore: numeric;
  createdAt: timestamp; updatedAt: timestamp;
}
// Index: idx_pulse_metrics_zip

pulseSchoolsCache {
  id: serial PK; cacheKey: varchar; lat: numeric; lon: numeric;
  radius: numeric; data: jsonb; fetchedAt: timestamp;
}

marketPulseSnapshots {
  id: serial PK; totalProperties: integer; active: integer;
  activeUnderContract: integer; pending: integer; closed: integer;
  lastUpdatedAt: timestamp; createdAt: timestamp;
}
```

---

## 8. Risks and Open Questions

### Hard blockers — layers with NO sub-ZIP data source available today

These layers **cannot** be neighborhood-scoped without sourcing new data from Zillow or a third party, as their underlying data is only published at ZIP granularity by the source:

| Category | Layers | Why blocked |
|---|---|---|
| Zillow ZHVI (home value, growth) | #1–2, 5–6, 10, 12–16, 26–27 | Zillow publishes neighborhood-level ZHVI CSVs, but those use Zillow-defined "neighborhoods" — not Spyglass/Repliers polygon boundaries. Custom arbitrary polygons have no Zillow row. |
| Zillow ZORI (rent) | #10, 25, 53, 55 | Same constraint as ZHVI. |
| Calculated composites depending on Zillow | #4, 7, 17–24, 29, 32–33, 57–59 | Inherit ZIP constraint. |
| Redfin (DOM, inventory, sales) | #3, 8–9, 28, 30–31, 54 | Redfin publishes `region_type='neighborhood'` in the same TSV (not ingested). These neighborhoods are Redfin-defined IDs with no spatial polygon; they can't be queried by arbitrary polygon. |

### Layers that CAN feasibly move to neighborhood precision

| Category | Layers | Path |
|---|---|---|
| Census demographics (18 layers) | #34–51, 56 | Census ACS is available at Census Tract. `censusService.ts:81` currently queries `for=zip%20code%20tabulation%20area:*`. Switching to `for=tract:*&in=state:48` gets tract-level data. Point-in-polygon aggregation of tracts inside a neighborhood polygon is feasible. Requires new ingest script + new DB table (`pulse_census_tract_data`) keyed by `(tract_geoid, year)`. |
| Repliers live MLS (V1: overview, heatmap, zip, trends) | V1 endpoints | Repliers supports `polygon=<pipe-delimited lat/lng>`. `test-polygon-search.mjs` already demonstrates this. Replace `area=Travis,Williamson,...` + `zip={zip}` with `polygon=<coords>` in V1 routes. |

### Specific breakage points if polygon replaces ZIP today

1. **All V2 DB queries (`pulseV2Routes.ts:760–1030`)** — SQL uses `WHERE zip = $1`. No polygon column exists in any V2 table. A polygon query has no row to match.

2. **`ZIP_META` lookup (`pulseV2Routes.ts:650–723`)** — only 64 zips. Any neighborhood not mapped to a ZIP in this dict silently returns default values. Neighborhoods that span multiple zips get collapsed to one.

3. **`zipCoords` lookup (`routes.ts:4834–4858`)** — heatmap drops any location not in this 65-zip dict (`.filter(z => z.lat !== null)` at line 4872). New neighborhoods have no entry, so they would not appear on the map.

4. **`REALISTIC_HOME_VALUES` / `REALISTIC_INCOMES` / `REALISTIC_POPULATIONS` (`pulseV2Routes.ts:214–323`)** — hardcoded mock fallback values per zip. Used when DB returns no data. New geographies return the default value (e.g., $450,000 / $85,000 / 12,000) silently.

5. **`AUSTIN_ZIPS` array (`pulseV2Routes.ts:156–165`)** — master list of 64 valid zips. Used in `mockValueForLayer()`. Any geography not in this list is not recognized.

6. **`PulseMap.tsx`** renders bubble markers at zip centroids. Polygon choropleth requires a Mapbox `fill` layer with a GeoJSON source. Substantial UI refactor.

7. **`HistoricalChart.tsx:225–232`** — multi-zip average via client-side `generateAveragedTimeseries`. For polygon queries, server-side aggregation is needed (no client-side polygon intersection).

8. **`ZipSummaryPanel.tsx:71`** — calls `/api/pulse/v2/zip/{zip}/summary`. A polygon summary endpoint would need to be built.

9. **`AffordabilityChart.tsx:158–161`** — calls `/api/pulse/v2/zip/{zip}/affordability-history`, which internally uses `getRealisticHomeValue(zip)` — keyed by zip.

10. **`NeighborhoodExplorer.tsx:30–45`** — sorts `ZipHeatmapItem[]` by zip. Would need a `neighborhood`/`polygon_id` key.

11. **CSV export (`pulseV2Routes.ts:993–1030`)** — outputs `Zip Code` as a column header. Column name and keys must change.

12. **Frontend `CLIENT_HOME_VALUES` (`HistoricalChart.tsx:58–74`)** — client-side copy of hardcoded zip home values. Must be kept in sync with backend.

13. **`boardId` not passed in V1 calls** — if polygon search is added to V1 routes, confirm whether `boardId=53` is required to scope Repliers results to Unlock MLS, or whether the API key alone provides that scope.

### Layers that will need a UX decision (no neighborhood source)

For the ~34 Zillow/Redfin/calculated layers that cannot be neighborhood-scoped:

| Option | Tradeoff |
|---|---|
| **Hide layer when polygon view is active** | Clean but removes utility; users expect all 59 layers to work |
| **Show ZIP-snapped data with a label** ("Data shown for ZIP 78735, which contains this neighborhood") | Honest, but confusing when a neighborhood spans multiple ZIPs |
| **Aggregate up** (show City or County data for context) | Misleading at neighborhood drill-down precision |
| **Show nothing / gray out with tooltip** | Best for layers where even ZIP data is unreliable at neighborhood resolution |

### Open questions before writing the implementation prompt

1. **Polygon source of truth:** Which polygon dataset should Pulse use — the `communities` DB table (CMS-managed), the static `communities-polygons.ts` from `spyglass-idx`, the raw `austin_neighborhoods.geojson`, or a new Repliers-sourced set? These are different datasets with different coverage and naming. Which is authoritative?

2. **Search result matching:** The current `ZIP_META` neighborhood labels are coarse ("Circle C / SW Austin"). Should Pulse search resolve to Repliers-standard neighborhood names (matching the polygon slugs in `communities-polygons.ts`) or stay with the existing labels?

3. **Census Tract ingest:** Should Census data be re-ingested at tract level, or should the approach be to keep ZCTA data and use a ZIP-to-polygon approximation (nearest ZIP centroid)?

4. **Heatmap vs. drilldown:** Is the map-level view (heatmap bubbles) expected to support polygon drawing/selection, or is "polygon drilldown" only a change to the search result flow (user selects a neighborhood → data scoped to that neighborhood)? The implementation diverges significantly between these.

5. **Mixed-fidelity display:** When a neighborhood-scoped view is active, some layers will show neighborhood-precise data (Repliers MLS, Census Tract) while others will show ZIP-level data. Is a "data source badge" per layer acceptable UX, or must all layers show the same geographic precision?

6. **`boardId` in V1 Pulse routes:** Currently absent. If polygon scoping is added to V1 routes, does `boardId=53` need to be added to ensure results are scoped to Unlock MLS rather than aggregating across boards?

7. **Redfin neighborhood ingest:** Redfin TSV contains `region_type='neighborhood'` rows that map to Redfin-specific neighborhood IDs. Is there a mapping between Redfin neighborhood IDs and Spyglass polygon slugs, or would this require a new spatial join step?

8. **Multi-polygon search:** If a user types "78735" and the ZIP spans three Spyglass neighborhoods, should the UI offer to select individual neighborhoods within that ZIP, or default to ZIP-level view?

9. **V2 data refresh cron:** V2 tables have no cron scheduled in `scheduler.ts`. Any new neighborhood tables will have the same problem. Should a cron be added, or is manual refresh acceptable?

10. **Affordability history accuracy:** `AffordabilityChart` uses hardcoded growth multipliers and zip-specific home values (`REALISTIC_HOME_VALUES`). This is mock data. Is replacing this with real time-series data from Zillow ZHVI (now ingested into `pulse_zillow_data`) in scope for this migration, or out of scope?

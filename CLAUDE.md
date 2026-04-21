# CLAUDE.md

Guidance for Claude Code when working in this repository. See also [AGENTS.md](AGENTS.md) for general agent instructions.

## Project Overview

Static SPA visualizing Ookla Speedtest Intelligence data for Philippine mobile and fixed broadband. Single `MNOPerformanceApp` class in [app.js](app.js), no build process, deployed on Vercel.

## Running Locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

## Architecture

Single monolithic class `MNOPerformanceApp` in app.js. No separate modules — all methods (data loading, filtering, charting, mapping, table rendering) live in this one class.

**Data flow:** `init()` → `loadAllData()` (fetches 3 CSVs per mode) → `updateActiveData()` → `updateCharts()` + `updateMap()` + `renderTable()`

**Filter flow:** Any filter change → `applyFilters()` → `updateSummaryCards()` + `updateCharts()` + `updateMap()` + `renderTable()`

### Dual Mode (Mobile / Fixed)

Toggled via `#provider-mode-toggle`. Each mode has its own CSV files and allowed providers:

- **Mobile:** Smart, Globe, DITO → `data/mobile_{cities,monthly,daily}.csv`
- **Fixed:** Converge, PLDT, PLDT Home Fiber, Globe → `data/fixed_{cities,monthly,daily}.csv`

Data cached in `this.dataCache.mobile` / `this.dataCache.fixed`.

### CSV Column Headers

Cities: `Location Name, Latitude, Longitude, Provider, Download Speed, Upload Speed, Download Speed Mbps, Upload Speed Mbps, Minimum Latency, Test Count, Sample Count, Device Count`

Monthly/Daily: `Provider, Location, Device, Aggregate Date, Test Count, Sample Count, Platform, Technology Type, Metric Type, ..., Minimum Latency, Multi-Server Latency, Multi-Server Jitter, Download Speed, Upload Speed, Download Speed Mbps, Upload Speed Mbps`

### Key Hardcoded Values

- Map center: `[12.8797, 121.7740]`, zoom 6, grid size 0.05°
- City chart threshold: ≥20 tests
- Pagination: 10 rows/page
- 200+ city coordinates in `getCityCoordinates()`
- Provider colors in `getProviderColor()`
- Cache busting: `app.js?v=74` — increment on changes

## Common Tasks

### Adding a chart
1. Add `<canvas id="...">` in [index.html](index.html)
2. Add update method in `MNOPerformanceApp`
3. Store instance in `this.charts`
4. Call from `updateCharts()`

### Adding a provider
1. Add to `normalizeProvider()` map
2. Add to relevant `allowedProviders` array
3. Add color in `getProviderColor()`

### Refreshing data
Run `python data/get-extracts.py` (requires `OOKLA_API_KEY` / `OOKLA_API_SECRET` in `.env.local`)

## Debugging

```javascript
console.log(app.filteredData)   // current filtered dataset
console.log(app.charts)         // chart instances
console.log(app.dataCache)      // all cached data by mode
```

## File Layout

```
├── index.html          # Full SPA markup, CDN imports
├── app.js              # All application logic (~60+ methods)
├── styles.css          # Tailwind overrides, CSS variables
├── vercel.json         # Vercel deployment config
├── data/
│   ├── mobile_cities.csv / mobile_monthly.csv / mobile_daily.csv
│   ├── fixed_cities.csv / fixed_monthly.csv / fixed_daily.csv
│   ├── get-extracts.py          # Ookla API data fetcher
│   └── other_data*.csv, speed_test_data.csv  # Legacy, not loaded by app
```

## Pitfalls

- Legacy files (`speed_test_data.csv`, `new_speed_test_data.csv`, `other_data*.csv`) are NOT used by the current app
- Speed data has both raw and Mbps columns — always use the `*Mbps` variants
- Chart.js instances must be destroyed before recreation (already handled in code)
- No D3.js, no separate DataProcessor/FilterManager/ChartManager classes — those were from an older architecture

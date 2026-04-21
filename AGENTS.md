# AGENTS.md

## Project Overview

Philippines MNO Performance Dashboard — a static SPA visualizing Ookla Speedtest Intelligence data for mobile and fixed broadband across the Philippines. Deployed on Vercel, no build step.

## Quick Start

```bash
# Serve locally (required for CSV fetch)
python -m http.server 8000
# or
npx http-server -p 8000
```

Open `http://localhost:8000`. No install or build needed — all dependencies loaded via CDN.

## Architecture

Single monolithic class `MNOPerformanceApp` in [app.js](app.js) (~60+ methods). No framework, no modules, no build tool.

**Key flow:** `init()` → `loadAllData()` → `updateActiveData()` → renders 8 Chart.js charts + Leaflet map + data table.

### Dual Mode System

The app has two independent modes toggled via `#provider-mode-toggle`:

| Mode | Providers | Data Files |
|------|-----------|------------|
| **Mobile** (default) | Smart, Globe, DITO | `data/mobile_cities.csv`, `mobile_monthly.csv`, `mobile_daily.csv` |
| **Fixed** | Converge, PLDT, PLDT Home Fiber, Globe | `data/fixed_cities.csv`, `fixed_monthly.csv`, `fixed_daily.csv` |

Each mode loads 3 CSV files in parallel. Data is cached in `dataCache.mobile` / `dataCache.fixed`.

### CSV Column Formats

**Cities files:** `Location Name, Latitude, Longitude, Provider, Download Speed, Upload Speed, Download Speed Mbps, Upload Speed Mbps, Minimum Latency, Test Count, Sample Count, Device Count`

**Monthly/Daily files:** `Provider, Location, Device, Aggregate Date, Test Count, Sample Count, Platform, Technology Type, Metric Type, Device Count/User Count, Minimum Latency, Multi-Server Latency, Multi-Server Jitter, Download Speed, Upload Speed, Download Speed Mbps, Upload Speed Mbps`

### Visualizations (8 charts + map + table)

- Provider Comparison bar chart (`#provider-comparison-chart`)
- Test Distribution doughnut (`#speed-distribution-chart`)
- Top 10 Cities horizontal bar (`#provider-radar-chart`)
- Bottom 10 Cities horizontal bar (`#market-share-chart`)
- Daily Time Series line (`#time-series-chart`)
- Monthly Trend: Download / Upload / Latency (`#trend-download-chart`, `#trend-upload-chart`, `#trend-latency-chart`)
- Leaflet grid-based heatmap (0.05° cells, yellow gradient)
- Sortable/searchable data table (10 rows/page)

## CDN Dependencies

- Tailwind CSS (latest v3) — `cdn.tailwindcss.com`
- Chart.js 4.4.0
- Leaflet 1.9.4 + MarkerCluster 1.5.3 + leaflet.heat 0.2.0
- Papa Parse 5.4.1
- Google Fonts: Inter

Cache busting on app.js via query param: `app.js?v=74` — increment on changes.

## Conventions

- **No build process.** Edit files directly — HTML, JS, CSS are production assets.
- **Provider names** must match normalization map in `normalizeProvider()`. Use exact casing: `Smart`, `Globe`, `DITO`, `Converge`, `PLDT`, `PLDT Home Fiber`.
- **City filtering threshold:** Charts only include cities with ≥20 tests (hardcoded).
- **Chart updates:** Always destroy and recreate Chart.js instances.
- **Responsive:** Mobile-first Tailwind. All interactive elements must have ≥44px touch targets.
- **CSS variables:** `--filipino-blue`, `--filipino-red`, `--filipino-yellow` (Philippine flag colors).

## Data Pipeline

[data/get-extracts.py](data/get-extracts.py) fetches CSVs from Ookla Speedtest Intelligence API. Requires `OOKLA_API_KEY` and `OOKLA_API_SECRET` in `.env.local`. Not automated in deployment yet.

## Common Tasks

### Adding a new chart
1. Add `<canvas>` element in [index.html](index.html) with unique ID
2. Add initialization + update method in `MNOPerformanceApp` class in [app.js](app.js)
3. Store chart instance in `this.charts`
4. Call update from `updateCharts()`

### Adding a new provider
1. Add to `normalizeProvider()` map
2. Add to the relevant `allowedProviders` array (mobile or fixed)
3. Add color entry in `getProviderColor()`

### Changing filters
All filter changes flow through `applyFilters()` → triggers `updateSummaryCards()` + `updateCharts()` + `updateMap()` + `renderTable()`.

## Pitfalls

- **CLAUDE.md is outdated** — describes an older architecture with separate classes and different CSV format. Trust this file and the actual code instead.
- **README.md is partially outdated** — data format section references old column headers.
- Speed values exist in both raw (`Download Speed`) and Mbps (`Download Speed Mbps`) columns. Use the Mbps variants.
- `other_data.csv` / `other_data_cities.csv` / `other_data_daily.csv` and `new_speed_test_data.csv` / `speed_test_data.csv` exist in `data/` but are **not loaded by the current app**.

## Deployment

Hosted on Vercel. Config in [vercel.json](vercel.json) — static files with 1h general cache, 24h for data files. No server-side logic.

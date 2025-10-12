# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-page web application for visualizing Mobile Network Operator (MNO) performance data from speed tests conducted across the Philippines. The app processes CSV data containing speed test results (download/upload speeds, latency) from various providers (Smart, Globe, DITO, etc.) and presents interactive visualizations showing network performance by provider, location, and time.

## Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+) with modular class-based architecture
- **Data Visualization**: 
  - Chart.js for statistical charts (bar, line, radar, pie)
  - Leaflet.js for interactive maps of the Philippines
  - D3.js optional for advanced custom visualizations
- **Data Processing**: Papa Parse for CSV parsing and transformation
- **Styling**: Tailwind CSS via CDN with custom CSS overrides
- **Deployment**: Static site (no backend) - can run locally or deploy to GitHub Pages/Netlify/Vercel

### Core Application Structure

The application follows a modular MVC-like pattern:

```
MNOPerformanceApp (app.js)
├── DataProcessor - Handles CSV loading, parsing, cleaning, normalization
├── FilterManager - Manages multi-dimensional filtering (provider, location, date, speed range)
├── ChartManager - Creates and updates all Chart.js visualizations
├── MapManager - Handles Leaflet map, markers, clusters, heatmaps
├── ReportGenerator - Exports data and charts to PDF/Excel
└── UIController - Coordinates user interactions and view updates
```

### Key Data Transformations

1. **Speed Normalization**: All speeds stored in Mbps. Input data may contain Kbps values that must be divided by 1000
2. **Location Hierarchy**: Data organized as Province > City > Barangay for geographic filtering
3. **Speed Range Categories**: 
   - 0-1 Mbps (Poor)
   - 1-5 Mbps (Fair)
   - 5-10 Mbps (Average)
   - 10-30 Mbps (Good)
   - 30-70 Mbps (Very Good)
   - 70-100 Mbps (Excellent)
   - 100+ Mbps (Outstanding)

### State Management

Global application state stored in `MNOPerformanceApp` instance:
- `rawData`: Original parsed CSV data
- `filteredData`: Current filtered dataset used by all visualizations
- `filters`: Active filter state (provider[], location[], dateRange, speedRange)
- `charts`: References to all Chart.js instances for updates
- `map`: Leaflet map instance

When filters change, all visualizations update reactively through `updateVisualizations()` method.

## Development Commands

### Running Locally
```bash
# Serve with local HTTP server (required for CSV loading)
python -m http.server 8000
# or
npx http-server -p 8000
# or
php -S localhost:8000

# Then open: http://localhost:8000
```

### Testing
```bash
# No build process needed - pure client-side
# Manual testing checklist in tests/manual-tests.md
# Browser console tests in app.js debug mode
```

### Data Updates
```bash
# Place new CSV file in data/ directory
# Must match column structure:
# Timestamp, Name, Email, Date, Person Assigned, Service Provider,
# Download (Mbps/Kbps), Upload (Mbps/Kbps), Latency (ms),
# Download Range, Upload Range, Barangay, City, Province
```

## Critical Implementation Details

### CSV Data Requirements
- **Header Row**: Must match expected column names (case-sensitive)
- **Speed Units**: Handle both "Mbps" and "Kbps" in same column
- **Missing Values**: Treat empty cells as null, not zero
- **Date Formats**: Support MM/DD/YYYY and ISO 8601 formats
- **Provider Names**: Normalize variations (e.g., "SMART" vs "Smart")

### Performance Optimization
- **Large Datasets**: Use pagination for table views (50 rows per page)
- **Chart Updates**: Destroy and recreate charts rather than updating data
- **Map Markers**: Cluster markers when > 100 points
- **Filter Debouncing**: Debounce filter changes by 300ms
- **LocalStorage Caching**: Cache processed data to speed up page reloads

### Geocoding Locations
- Philippine locations geocoded using:
  1. Pre-loaded coordinates for major cities/provinces (data/ph-coordinates.json)
  2. Fallback to approximate centroid calculations
  3. Manual coordinate overrides in config for problem areas

### Network Quality Score Formula
```javascript
qualityScore = (downloadSpeed * 0.4) + (uploadSpeed * 0.3) + ((100 - latency) * 0.3)
// Normalized to 0-100 scale
// Used for heatmap coloring and provider rankings
```

## Common Development Patterns

### Adding a New Chart
1. Create chart container in index.html with unique ID
2. Add chart initialization in `ChartManager.initializeCharts()`
3. Create update method in `ChartManager` (e.g., `updateProviderComparison()`)
4. Call update method from `MNOPerformanceApp.updateVisualizations()`

### Adding a New Filter
1. Add filter UI element in sidebar (index.html)
2. Attach event listener in `FilterManager.attachEventListeners()`
3. Update `FilterManager.getFilteredData()` logic
4. Add filter state to `FilterManager.filters` object

### Adding Statistical Metrics
1. Implement calculation in `DataProcessor.calculateStatistics()`
2. Add display element in dashboard summary cards
3. Update metric in `UIController.updateSummaryCards()`

## File Organization

```
/
├── index.html              # Main SPA entry point with all UI structure
├── app.js                  # Core application logic (MNOPerformanceApp class)
├── styles.css              # Custom styles and Tailwind overrides
├── data/
│   ├── speed_test_data.csv           # Source data file
│   └── ph-coordinates.json           # Philippine location coordinates
├── lib/                    # Third-party libraries (if not using CDN)
│   ├── chart.min.js
│   ├── leaflet.js
│   └── papaparse.min.js
├── README.md              # User-facing documentation
└── CLAUDE.md             # This file
```

## Browser Compatibility
- Target: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Polyfills needed for IE11 if required: Array.from, Object.entries, Promise, fetch

## Security Notes
- No authentication/authorization (public dashboard)
- Sanitize user inputs if adding data submission form
- CSV parsing: Use Papa Parse trusted library to prevent CSV injection
- No eval() or innerHTML with unsanitized data

## Known Limitations
- CSV file size limit: ~5MB (50,000 rows) for smooth performance
- Offline mode: Works after initial load if service worker implemented
- Mobile: Charts may need horizontal scroll on small screens
- Export: PDF generation requires jsPDF library (not included by default)

## Future Enhancement Areas
- Backend API for dynamic data loading
- User authentication for data submission
- Real-time WebSocket updates for live speed tests
- Progressive Web App (PWA) with offline support
- Admin panel for data management
- A/B testing different visualization layouts
- Integration with OpenSignal API for benchmarking

## Debugging Tips
- Enable debug mode: Set `MNOPerformanceApp.DEBUG = true` in console
- View filtered data: `console.log(app.filteredData)` 
- Inspect chart configs: `console.log(app.charts)`
- Test data processing: Use sample CSV in data/test/ directory
- Performance profiling: Chrome DevTools Performance tab for sluggish filters

## Dependencies (CDN)
```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>

<!-- Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Leaflet MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

<!-- Papa Parse -->
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

## Contact & Support
- Data issues: Check CSV format matches expected schema
- Visualization bugs: Include browser console errors and screenshot
- Performance issues: Note dataset size and browser used

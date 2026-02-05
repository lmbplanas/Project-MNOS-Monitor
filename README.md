# Philippines MNO Performance Dashboard

A comprehensive web application for visualizing mobile network operator (MNO) and fixed broadband performance data from speed tests collected across the Philippines. This dashboard provides interactive visualizations showing network performance by provider, location, and time period, sourced directly from Ookla Speedtest Intelligence data.

## Features

### 📊 Interactive Visualizations
- **Performance Map**: Grid-based heatmap overlay on a Leaflet map showing speed concentration.
- **Provider Comparison**: Analytics comparing top providers (Globe, Smart, DITO, Converge, PLDT).
- **Speed Distribution**: Horizontal bar charts showing top and bottom performing cities.
- **Performance Insights**: Automated analysis providing public-friendly "verdicts" on network quality (Ultra Fast, Basic, etc.) and experience (Gaming, Streaming).
- **Time Series**: Line graphs showing performance trends over months.

### 🔄 Dual Mode Support
- **Mobile Mode**: Analyze mobile data performance (Globe, Smart, DITO).
- **Fixed Mode**: Analyze fixed broadband performance (Converge, PLDT, Globe).

### 🔍 Advanced Filtering
- Filter by service provider.
- Filter by specific Province and City.
- Date range filtering.
- Smart caching for optimized data loading.

### 🛠 Tech Stack

**Frontend**
- **HTML5 & CSS3**: Core structure and design.
- **Tailwind CSS**: Utility-first styling for a responsive, modern UI.
- **JavaScript (Vanilla ES6+)**: Core application logic, state management, and DOM manipulation.

**Visualization & Maps**
- **Leaflet.js**: Interactive maps with marker clustering and heatmaps.
- **Chart.js**: Responsive charts (Bar, Line, Doughnut).

**Data Processing**
- **Papa Parse**: High-performance CSV parsing in the browser.
- **Python**: Automation scripts (`get-extracts.py`) to fetch latest data from Ookla Speedtest Intelligence API.

**Deployment & CI/CD**
- **GitHub Actions**: Automated workflows for data updates.
- **Vercel**: Hosting and analytics.

## Getting Started

### Prerequisites
- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- A local web server (for loading CSV files)

### Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/lmbplanas/Project-MNOS-Monitor.git
   cd Project-MNOS-Monitor
   ```

2. **Prepare your data**
   - The application expects CSV files in the `data/` directory.
   - You can pull the latest data using the Python script (requires API keys):
     ```bash
     python data/get-extracts.py
     ```
   - *Note: You need to set `OOKLA_API_KEY` and `OOKLA_API_SECRET` in a `.env.local` file.*

3. **Start a local server**
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Using Node.js:
   ```bash
   npx http-server -p 8000
   ```
   
   Using PHP:
   ```bash
   php -S localhost:8000
   ```

4. **Open in browser**
   - Navigate to `http://localhost:8000`
   - The app will automatically load `data/speed_test_data.csv` if present
   - Or upload a CSV file using the file upload button

## Data Format

Your CSV file should contain the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | Date and time of test | 2024-01-15 14:30:00 |
| Name | Tester name | Juan dela Cruz |
| Email | Tester email | juan@example.com |
| Date | Test date | 01/15/2024 |
| Person Assigned | Assigned person | Team A |
| Service Provider | Network provider | Smart |
| Download (Mbps) | Download speed in Mbps | 45.2 |
| Download (Kbps) | Download speed in Kbps | 45200 |
| Upload (Mbps) | Upload speed in Mbps | 12.5 |
| Upload (Kbps) | Upload speed in Kbps | 12500 |
| Latency (ms) | Latency in milliseconds | 28 |
| Download Range | Speed category | 30-70 |
| Upload Range | Upload category | 10-30 |
| Barangay | Barangay name | Bagong Silang |
| City | City/Municipality | Quezon City |
| Province | Province name | Metro Manila |

### Supported Providers
- Smart / Smart Communications
- Globe / Globe Telecom
- DITO / DITO Telecommunity
- TNT / Talk N Text
- TM / Touch Mobile
- Sun / Sun Cellular
- GOMO
- Converge
- Other providers (will be normalized automatically)

### Speed Range Categories
- **0-1 Mbps**: Poor
- **1-5 Mbps**: Fair
- **5-10 Mbps**: Average
- **10-30 Mbps**: Good
- **30-70 Mbps**: Very Good
- **70-100 Mbps**: Excellent
- **100+ Mbps**: Outstanding

## Usage Guide

### Uploading Data
1. Click the "Choose File" button in the sidebar
2. Select your CSV file
3. Wait for the data to load and process
4. All visualizations will update automatically

### Filtering Data
1. Use the checkboxes to select/deselect providers
2. Choose a province from the dropdown (city filter updates automatically)
3. Set date range using the date pickers
4. Select a speed range category
5. Click "Reset Filters" to clear all filters

### Viewing Results
- **Summary Cards**: View key metrics at the top of the dashboard
- **Charts**: Explore different visualization types
- **Map**: Click markers to see detailed information
- **Table**: Sort columns by clicking headers, use pagination to navigate

### Exporting Data
1. Apply desired filters
2. Click "Export Data" button
3. A CSV file with filtered data will be downloaded
4. File name includes current date: `mno_performance_YYYY-MM-DD.csv`

### Searching
- Use the search box above the data table
- Search by provider name, city, province, or barangay
- Results update in real-time

## Troubleshooting

### CSV Not Loading
- Ensure you're running a local web server (not opening file:// directly)
- Check browser console for error messages
- Verify CSV format matches expected columns
- Check for special characters or encoding issues

### Charts Not Displaying
- Refresh the page
- Check browser console for JavaScript errors
- Ensure all CDN libraries are loading (check network tab)
- Try a different browser

### Map Not Showing Markers
- Ensure location data (City/Province) is present in CSV
- Only major Philippine cities have pre-configured coordinates
- Check browser console for coordinate lookup errors

### Performance Issues
- Large CSV files (>5MB or 50,000 rows) may be slow
- Try filtering data to reduce dataset size
- Close other browser tabs to free up memory
- Use pagination to view data in chunks

## Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| IE 11 | - | ❌ Not Supported |

## Technologies Used

- **Frontend**: Vanilla JavaScript (ES6+)
- **Charts**: Chart.js 4.4.0
- **Maps**: Leaflet 1.9.4 with MarkerCluster plugin
- **CSV Parsing**: Papa Parse 5.4.1
- **Styling**: Tailwind CSS 3.x
- **Icons**: SVG icons

## Project Structure

```
project-opensignal/
├── index.html          # Main HTML file
├── app.js             # Application logic
├── styles.css         # Custom styles
├── data/              # Data directory
│   └── speed_test_data.csv
├── README.md          # This file
└── CLAUDE.md         # Developer documentation
```

## Performance Optimization

The application implements several optimizations:
- **Lazy Loading**: Charts render on demand
- **Data Pagination**: Tables show 50 rows per page
- **Marker Clustering**: Map markers cluster when zoomed out
- **Filter Debouncing**: Reduces unnecessary updates
- **Theme Caching**: Saves theme preference to localStorage

## Privacy & Security

- All data processing happens client-side (in your browser)
- No data is sent to external servers
- CSV files are not stored or transmitted
- No cookies or tracking scripts
- No authentication required

## Known Limitations

1. **CSV Size**: Performance degrades with files >5MB (~50,000 rows)
2. **Coordinates**: Only major Philippine cities have accurate coordinates
3. **Offline Mode**: Requires initial load with internet connection
4. **Browser Storage**: Large datasets may exceed localStorage limits
5. **Mobile View**: Some charts may require horizontal scrolling on small screens

## Future Enhancements

Potential improvements for future versions:
- Backend API for dynamic data loading
- User authentication for data submission
- Real-time WebSocket updates
- Progressive Web App (PWA) capabilities
- PDF report generation
- Advanced statistical analysis
- Comparison with global benchmarks
- Multi-language support

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions:
- Check the Troubleshooting section
- Review browser console for errors
- Ensure data format matches requirements
- Try with a smaller sample dataset first

## License

[Specify your license here]

## Acknowledgments

- OpenStreetMap for map tiles
- Chart.js for visualization library
- Leaflet for mapping capabilities
- Papa Parse for CSV processing
- Tailwind CSS for styling framework

## Version History

- **v1.0.0** (2024): Initial release
  - Core visualizations
  - Filtering and search
  - Data export functionality
  - Dark/Light mode
  - Responsive design

---

**Note**: This is a client-side application. All data processing occurs in your browser. Your data remains private and is not transmitted to any external servers.

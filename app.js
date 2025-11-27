class MNOPerformanceApp {
    constructor() {
        console.log('MNOPerformanceApp v5 loaded');
        this.rawData = [];
        this.filteredData = [];
        this.filters = {
            providers: [],
            province: '',
            city: '',
            dateFrom: '',
            dateTo: '',
            speedRange: ''
        };
        this.charts = {};
        this.map = null;
        this.markerCluster = null;
        this.currentPage = 1;
        this.rowsPerPage = 50;
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.sortColumn = 'date';
        this.sortDirection = 'desc';
        this.DEBUG = false;

        this.rawTrendData = []; // Store raw trend data
        this.rawDailyTrendData = []; // Store raw daily trend data
        this.rawCitiesData = []; // Store raw cities data for map

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeMap();
        this.initializeCharts();
        this.setupThemeToggle();

        // Load cities data for map (and filters)
        try {
            await this.loadCitiesData('data/other_data_cities.csv?v=' + Date.now());
        } catch (error) {
            console.log('No cities data found.');
        }

        const defaultCSV = 'data/speed_test_data.csv?v=' + Date.now();
        try {
            await this.loadCSV(defaultCSV);
        } catch (error) {
            console.log('No default CSV found. Please upload a file.');
            this.showEmptyState();
        }

        // Load trend data
        try {
            await this.loadTrendData('data/other_data.csv?v=' + Date.now());
        } catch (error) {
            console.log('No trend data found.');
        }

        // Load daily trend data
        try {
            await this.loadDailyTrendData('data/other_data_daily.csv?v=' + Date.now());
        } catch (error) {
            console.log('No daily trend data found.');
        }
    }

    setupEventListeners() {
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('province-filter').addEventListener('change', (e) => {
            this.filters.province = e.target.value;
            this.updateCityFilter();
            this.applyFilters();
        });

        document.getElementById('city-filter').addEventListener('change', (e) => {
            this.filters.city = e.target.value;
            this.applyFilters();
        });



        document.getElementById('table-search').addEventListener('input', (e) => {
            this.searchTable(e.target.value);
        });

        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });

        document.querySelectorAll('#data-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.sortTable(th.dataset.sort);
            });
        });

        this.setupMobileMenu();
        this.setupSidebarCollapse();
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const sidebar = document.getElementById('sidebar');

        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            mobileOverlay.classList.toggle('hidden');
        };

        const closeMenu = () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.add('hidden');
        };

        mobileMenuBtn.addEventListener('click', toggleMenu);
        mobileOverlay.addEventListener('click', closeMenu);

        sidebar.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' ||
                e.target.tagName === 'SELECT' ||
                e.target.tagName === 'BUTTON' ||
                e.target.closest('label')) {
                return;
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                closeMenu();
            }
        });
    }

    setupSidebarCollapse() {
        const sidebarCollapseBtn = document.getElementById('sidebar-collapse');
        const sidebar = document.getElementById('sidebar');
        const app = document.getElementById('app');

        // Sidebar is visible by default
        sidebar.classList.remove('sidebar-collapsed');

        sidebarCollapseBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);

            sidebarCollapseBtn.innerHTML = isCollapsed
                ? '<svg class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>'
                : '<svg class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>';

            sidebarCollapseBtn.title = isCollapsed ? 'Show sidebar' : 'Hide sidebar';
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const html = document.documentElement;

        const savedTheme = localStorage.getItem('theme') || 'light';
        html.classList.toggle('dark', savedTheme === 'dark');

        themeToggle.addEventListener('click', () => {
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            this.updateChartsTheme();
        });
    }

    showLoading(show = true) {
        document.getElementById('loading-screen').classList.toggle('hidden', !show);
    }

    showEmptyState() {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">No Data Available</div>
                        <div class="empty-state-description">Please upload a CSV file to get started</div>
                    </div>
                </td>
            </tr>
        `;
    }

    async loadCSV(url) {
        this.showLoading(true);

        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                complete: (results) => {
                    try {
                        this.processData(results.data);
                    } catch (error) {
                        console.error('Error processing data:', error);
                    } finally {
                        this.showLoading(false);
                        resolve();
                    }
                },
                error: (error) => {
                    console.error('Error loading CSV:', error);
                    this.showLoading(false);
                    reject(error);
                }
            });
        });
    }

    loadCSVFile(file) {
        this.showLoading(true);

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                this.processData(results.data);
                this.showLoading(false);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                alert('Error parsing CSV file. Please check the format.');
                this.showLoading(false);
            }
        });
    }

    processData(data) {
        this.rawData = data.filter(row => {
            if (!row['Service Provider'] || !(row['Download (Mbps)'] || row['Download'])) {
                return false;
            }

            const provider = this.normalizeProvider(row['Service Provider']);
            const validMNOs = ['Smart', 'Globe', 'DITO', 'TNT', 'TM', 'Sun', 'GOMO'];
            return validMNOs.includes(provider);
        }).map(row => {
            const download = this.normalizeSpeed(row['Download (Mbps)'], row['Download']);
            const upload = this.normalizeSpeed(row['Upload (Mbps)'], row['Upload']);
            const latency = parseFloat(row['Latency ( ms )']) || parseFloat(row['Latency']) || null;

            const locationParts = this.parseLocation(row['Location (Brgy, City)'] || '');

            return {
                timestamp: row['Timestamp'] || '',
                date: this.parseDate(row['Date']),
                name: row['Name'] || '',
                email: row['Email'] || '',
                personAssigned: row['Person Assigned'] || '',
                provider: this.normalizeProvider(row['Service Provider']),
                download: download,
                upload: upload,
                latency: latency,
                downloadRange: row['Range'] || this.getSpeedRange(download),
                uploadRange: row['Range (Upload)'] || this.getSpeedRange(upload),
                barangay: locationParts.barangay,
                city: locationParts.city,
                province: row['Capital'] || locationParts.province
            };
        });

        if (this.DEBUG) {
            console.log('Processed data:', this.rawData);
        }

        this.populateFilters();
        this.applyFilters();
        this.renderTable();
    }

    parseLocation(location) {
        if (!location || location === '-') {
            return { barangay: '', city: '', province: '' };
        }

        const parts = location.split(',').map(s => s.trim());
        return {
            barangay: parts[0] || '',
            city: parts[1] || '',
            province: parts[2] || ''
        };
    }

    normalizeSpeed(mbps, rawValue) {
        if (mbps && parseFloat(mbps) > 0) {
            return parseFloat(mbps);
        }

        if (!rawValue) return 0;

        const str = String(rawValue).toLowerCase().trim();

        if (str.includes('mbps')) {
            return parseFloat(str) || 0;
        } else if (str.includes('kbps')) {
            return (parseFloat(str) || 0) / 1000;
        }

        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    normalizeProvider(provider) {
        if (!provider) return null;

        const normalized = provider.trim().toUpperCase();

        const mnoMap = {
            'SMART': 'Smart',
            'SMART COMMUNICATIONS': 'Smart',
            'GLOBE': 'Globe',
            'GLOBE TELECOM': 'Globe',
            'DITO': 'DITO',
            'DITO TELECOMMUNITY': 'DITO',
            'DITO TELECOM': 'DITO',
            'TNT': 'TNT',
            'TALK N TEXT': 'TNT',
            'TALK\'N TEXT': 'TNT',
            'TM': 'TM',
            'TOUCH MOBILE': 'TM',
            'SUN': 'Sun',
            'SUN CELLULAR': 'Sun',
            'GOMO': 'GOMO'
        };

        for (const [key, value] of Object.entries(mnoMap)) {
            if (normalized.includes(key)) {
                return value;
            }
        }

        return null;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;

        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    getSpeedRange(speed) {
        if (speed === 0) return 'Unknown';
        if (speed < 1) return '0-1';
        if (speed < 5) return '1-5';
        if (speed < 10) return '5-10';
        if (speed < 30) return '10-30';
        if (speed < 70) return '30-70';
        if (speed < 100) return '70-100';
        return '100+';
    }

    populateFilters() {
        const allowedProviders = ['DITO', 'Globe', 'Smart'];
        const providers = [...new Set(this.rawData.map(d => d.provider))]
            .filter(p => allowedProviders.includes(p))
            .sort();

        // Extract provinces from rawCitiesData (Location Name: "City, Province, Philippines")
        let provinces = [];
        if (this.rawCitiesData && this.rawCitiesData.length > 0) {
            provinces = [...new Set(this.rawCitiesData
                .map(d => {
                    const parts = (d['Location Name'] || '').split(',');
                    return parts.length >= 2 ? parts[1].trim() : null;
                })
                .filter(p => p)
            )].sort();
        } else {
            // Fallback
            provinces = [...new Set(this.rawData.map(d => d.province).filter(p => p))].sort();
        }

        const providerFiltersDiv = document.getElementById('provider-filters');
        providerFiltersDiv.innerHTML = providers.map(provider => {
            return `
            <label class="flex items-center space-x-2 provider-checkbox-label">
                <input type="checkbox" value="${provider}" checked class="provider-checkbox">
                <span class="text-sm text-gray-700 dark:text-gray-300">${provider}</span>
            </label>
            `;
        }).join('');

        document.querySelectorAll('.provider-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filters.providers = Array.from(
                    document.querySelectorAll('.provider-checkbox:checked')
                ).map(cb => cb.value);
                this.applyFilters();
            });
        });

        this.filters.providers = providers;

        const provinceSelect = document.getElementById('province-filter');
        provinceSelect.innerHTML = '<option value="">All Provinces</option>' +
            provinces.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    updateCityFilter() {
        const province = this.filters.province;
        const citySelect = document.getElementById('city-filter');

        let cities = [];
        if (this.rawCitiesData && this.rawCitiesData.length > 0) {
            const locations = this.rawCitiesData
                .map(d => {
                    const parts = (d['Location Name'] || '').split(',');
                    if (parts.length >= 2) {
                        return { city: parts[0].trim(), province: parts[1].trim() };
                    }
                    return null;
                })
                .filter(l => l);

            if (province) {
                cities = [...new Set(locations.filter(l => l.province === province).map(l => l.city))].sort();
            } else {
                cities = [...new Set(locations.map(l => l.city))].sort();
            }
        } else {
            // Fallback
            if (province) {
                cities = [...new Set(this.rawData.filter(d => d.province === province).map(d => d.city).filter(c => c))].sort();
            } else {
                cities = [...new Set(this.rawData.map(d => d.city).filter(c => c))].sort();
            }
        }

        citySelect.innerHTML = '<option value="">All Cities</option>' +
            cities.map(c => `<option value="${c}">${c}</option>`).join('');
        this.filters.city = '';
    }

    applyFilters() {
        console.log('Applying filters:', JSON.stringify(this.filters));

        // Filter cities data for summary cards, charts, and map
        if (this.rawCitiesData) {
            this.filteredCitiesData = this.rawCitiesData.filter(row => {
                // Provider Filter
                if (this.filters.providers && this.filters.providers.length > 0) {
                    if (!this.filters.providers.includes(row.Provider)) {
                        return false;
                    }
                }

                // Location Filter
                if (this.filters.province || this.filters.city) {
                    const parts = (row['Location Name'] || '').split(',');
                    if (parts.length < 2) return false;

                    const city = parts[0].trim();
                    const province = parts[1].trim();

                    if (this.filters.province && province !== this.filters.province) {
                        return false;
                    }
                    if (this.filters.city && city !== this.filters.city) {
                        return false;
                    }
                }

                return true;
            });
        } else {
            this.filteredCitiesData = [];
        }

        this.currentPage = 1;
        this.updateSummaryCards();
        this.updateCharts();
        this.updateMap();

        // Update trend charts if data is loaded
        if (this.rawTrendData.length > 0) {
            this.processTrendData(this.rawTrendData);
        }
    }

    resetFilters() {
        const allowedProviders = ['DITO', 'Globe', 'Smart'];
        this.filters = {
            providers: [...new Set(this.rawData.map(d => d.provider))]
                .filter(p => allowedProviders.includes(p))
                .sort(),
            province: '',
            city: '',
            dateFrom: '',
            dateTo: '',
            speedRange: ''
        };

        document.querySelectorAll('.provider-checkbox').forEach(cb => cb.checked = true);
        document.getElementById('province-filter').value = '';
        document.getElementById('city-filter').value = '';
        document.getElementById('table-search').value = '';

        this.applyFilters();
    }

    updateVisualization() {
        this.updateSummaryCards();
        this.updateCharts();
        this.updateMap();
        this.renderTable();
    }

    updateSummaryCards() {
        const data = this.filteredCitiesData || [];

        let totalTests = 0;
        let weightedDownload = 0;
        let weightedUpload = 0;
        let weightedLatency = 0;

        data.forEach(row => {
            const tests = parseInt(row['Test Count']) || 0;
            const download = parseFloat(row['Download Speed Mbps']) || 0;
            const upload = parseFloat(row['Upload Speed Mbps']) || 0;
            const latency = parseFloat(row['Minimum Latency']) || 0;

            totalTests += tests;
            weightedDownload += download * tests;
            weightedUpload += upload * tests;
            weightedLatency += latency * tests;
        });

        const avgDownload = totalTests > 0 ? weightedDownload / totalTests : 0;
        const avgUpload = totalTests > 0 ? weightedUpload / totalTests : 0;
        const avgLatency = totalTests > 0 ? weightedLatency / totalTests : 0;

        // Format total tests with commas for readability
        document.getElementById('total-tests').textContent = totalTests.toLocaleString();
        document.getElementById('avg-download').textContent = `${avgDownload.toFixed(2)} Mbps`;
        document.getElementById('avg-upload').textContent = `${avgUpload.toFixed(2)} Mbps`;
        document.getElementById('avg-latency').textContent = `${avgLatency.toFixed(0)} ms`;
    }

    calculateStatistics(data) {
        // This method might be unused now for summary cards, but kept if needed for other calculations
        if (data.length === 0) {
            return {
                totalTests: 0,
                avgDownload: 0,
                avgUpload: 0,
                avgLatency: null
            };
        }

        const totalDownload = data.reduce((sum, d) => sum + d.download, 0);
        const totalUpload = data.reduce((sum, d) => sum + d.upload, 0);
        const latencies = data.filter(d => d.latency !== null).map(d => d.latency);
        const avgLatency = latencies.length ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : null;

        return {
            totalTests: data.length,
            avgDownload: totalDownload / data.length,
            avgUpload: totalUpload / data.length,
            avgLatency: avgLatency
        };
    }

    initializeCharts() {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#d1d5db' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = true;

        this.charts.providerComparison = new Chart(
            document.getElementById('provider-comparison-chart'),
            {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: 16
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Speed (Mbps)',
                                font: {
                                    size: 14
                                }
                            }
                        }
                    }
                }
            }
        );

        this.charts.speedDistribution = new Chart(
            document.getElementById('speed-distribution-chart'),
            {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    indexAxis: 'y', // Horizontal bar chart
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'Download Speed (Mbps)' }
                        },
                        y: {
                            title: { display: true, text: 'City' }
                        }
                    }
                }
            }
        );

        this.charts.providerRadar = new Chart(
            document.getElementById('provider-radar-chart'),
            {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    indexAxis: 'y', // Horizontal bar chart
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'Download Speed (Mbps)' }
                        },
                        y: {
                            title: { display: true, text: 'City' }
                        }
                    }
                }
            }
        );

        this.charts.marketShare = new Chart(
            document.getElementById('market-share-chart'),
            {
                type: 'doughnut',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            }
        );

        this.charts.timeSeries = new Chart(
            document.getElementById('time-series-chart'),
            {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Speed (Mbps)' }
                        }
                    }
                }
            }
        );

        this.initializeTrendCharts();
    }

    initializeTrendCharts() {
        // Charts will be initialized when data is loaded
        this.charts.trendDownload = null;
        this.charts.trendUpload = null;
        this.charts.trendLatency = null;
    }

    async loadTrendData(url) {
        console.log('Loading trend data from:', url);
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                complete: (results) => {
                    console.log('Trend data loaded:', results);
                    this.rawTrendData = results.data; // Store raw data
                    this.processTrendData(this.rawTrendData);
                    this.updateProviderComparisonChart(); // Update comparison chart with new data
                    this.updateSummaryCards(); // Update summary cards with trend data
                    this.updateProviderRadarChart(); // Update provider performance radar chart
                    this.updateMarketShareChart(); // Update market share chart
                    resolve();
                },
                error: (error) => {
                    console.error('Error loading trend data:', error);
                    reject(error);
                }
            });
        });
    }

    async loadDailyTrendData(url) {
        console.log('Loading daily trend data from:', url);
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                complete: (results) => {
                    console.log('Daily trend data loaded:', results);
                    this.rawDailyTrendData = results.data; // Store raw daily data
                    this.updateTimeSeriesChart(); // Update time series chart with daily data
                    resolve();
                },
                error: (error) => {
                    console.error('Error loading daily trend data:', error);
                    reject(error);
                }
            });
        });
    }

    async loadCitiesData(url) {
        console.log('Loading cities data from:', url);
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                complete: (results) => {
                    console.log('Cities data loaded:', results);
                    this.rawCitiesData = results.data; // Store raw cities data
                    this.updateMap(); // Update map with cities data
                    this.updateSpeedDistributionChart(); // Update top cities chart
                    resolve();
                },
                error: (error) => {
                    console.error('Error loading cities data:', error);
                    reject(error);
                }
            });
        });
    }

    processTrendData(data) {
        // Helper to parse "MMM-YY" or "MMM YYYY" date format
        const parseTrendDate = (dateStr) => {
            if (!dateStr) return null;
            // Handle both "Jun-25" and "Jun 2025" formats
            const separator = dateStr.includes('-') ? '-' : ' ';
            const [monthStr, yearStr] = dateStr.split(separator);

            const monthMap = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            const month = monthMap[monthStr];

            // Handle 2-digit or 4-digit years
            let year = parseInt(yearStr);
            if (year < 100) year += 2000;

            if (month === undefined || isNaN(year)) return null;
            return new Date(year, month, 1);
        };

        // Filter out empty rows and apply filters
        const validData = data.filter(row => {
            if (!row.Provider || !row['Aggregate Date']) return false;

            // Apply provider filter
            if (this.filters.providers && this.filters.providers.length > 0) {
                if (!this.filters.providers.includes(this.normalizeProvider(row.Provider))) {
                    return false;
                }
            }

            // Apply date filter
            const rowDate = parseTrendDate(row['Aggregate Date']);
            if (rowDate) {
                if (this.filters.dateFrom) {
                    const fromDate = new Date(this.filters.dateFrom);
                    // Reset time to start of day for comparison
                    fromDate.setHours(0, 0, 0, 0);
                    if (rowDate < fromDate) return false;
                }
                if (this.filters.dateTo) {
                    const toDate = new Date(this.filters.dateTo);
                    // Set to end of day for comparison
                    toDate.setHours(23, 59, 59, 999);
                    if (rowDate > toDate) return false;
                }
            } else {
                // If date can't be parsed, exclude it to be safe, or keep it? 
                // Better to exclude if we can't filter it properly when filters are active.
                if (this.filters.dateFrom || this.filters.dateTo) return false;
            }

            return true;
        });

        if (validData.length > 0) {
            console.log('First row sample:', validData[0]);
        }

        // Group by Provider
        const providers = [...new Set(validData.map(d => d.Provider))];
        const dates = [...new Set(validData.map(d => d['Aggregate Date']))];

        console.log('Providers:', providers);
        console.log('Dates:', dates);

        // Helper to get color for provider
        const getProviderColor = (provider) => {
            const colors = {
                'Smart': '#10b981', // Green
                'Globe': '#3b82f6', // Blue
                'DITO': '#ef4444',  // Red
                'Sun Cellular (MVNO)': '#f97316' // Orange
            };
            return colors[provider] || '#9ca3af';
        };

        // Prepare datasets
        const createDatasets = (metricKey) => {
            console.log('Creating datasets for:', metricKey);
            return providers.map(provider => {
                const providerData = validData.filter(d => d.Provider === provider);
                // Map dates to values, ensuring alignment
                const dataPoints = dates.map(date => {
                    const entry = providerData.find(d => d['Aggregate Date'] === date);
                    return entry ? parseFloat(entry[metricKey]) : null;
                });

                console.log(`Data for ${provider} (${metricKey}):`, dataPoints);

                return {
                    label: provider,
                    data: dataPoints,
                    borderColor: getProviderColor(provider),
                    backgroundColor: getProviderColor(provider),
                    tension: 0.1,
                    fill: false
                };
            });
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        };

        // Destroy existing charts if they exist
        if (this.charts.trendDownload) this.charts.trendDownload.destroy();
        if (this.charts.trendUpload) this.charts.trendUpload.destroy();
        if (this.charts.trendLatency) this.charts.trendLatency.destroy();

        // Create new charts
        this.charts.trendDownload = new Chart(
            document.getElementById('trend-download-chart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: createDatasets('Download Speed Mbps')
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Mbps' }
                        }
                    }
                }
            }
        );

        this.charts.trendUpload = new Chart(
            document.getElementById('trend-upload-chart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: createDatasets('Upload Speed Mbps')
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Mbps' }
                        }
                    }
                }
            }
        );

        this.charts.trendLatency = new Chart(
            document.getElementById('trend-latency-chart'),
            {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: createDatasets('Multi-Server Latency')
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'ms' }
                        }
                    }
                }
            }
        );
    }

    updateCharts() {
        this.updateProviderComparisonChart();
        this.updateSpeedDistributionChart();
        this.updateProviderRadarChart();
        this.updateMarketShareChart();
        this.updateTimeSeriesChart();
    }

    updateProviderComparisonChart() {
        // Use filteredCitiesData to respect filters
        const data = this.filteredCitiesData || [];

        if (data.length === 0) {
            console.log('No filtered cities data available for provider comparison');
            // Clear chart or show empty state
            this.charts.providerComparison.data = {
                labels: [],
                datasets: []
            };
            this.charts.providerComparison.update();
            return;
        }

        // Group by provider and calculate weighted averages
        const providerStats = {};

        data.forEach(row => {
            const provider = row.Provider;
            const tests = parseInt(row['Test Count']) || 0;
            const download = parseFloat(row['Download Speed Mbps']) || 0;
            const upload = parseFloat(row['Upload Speed Mbps']) || 0;

            if (!providerStats[provider]) {
                providerStats[provider] = {
                    totalTests: 0,
                    weightedDownload: 0,
                    weightedUpload: 0
                };
            }

            providerStats[provider].totalTests += tests;
            providerStats[provider].weightedDownload += download * tests;
            providerStats[provider].weightedUpload += upload * tests;
        });

        // Calculate averages and prepare chart data
        const providers = Object.keys(providerStats).sort();
        const avgDownloads = providers.map(p => {
            const stats = providerStats[p];
            return stats.totalTests > 0 ? stats.weightedDownload / stats.totalTests : 0;
        });
        const avgUploads = providers.map(p => {
            const stats = providerStats[p];
            return stats.totalTests > 0 ? stats.weightedUpload / stats.totalTests : 0;
        });

        // Provider-specific colors
        const getProviderColors = (provider) => {
            switch (provider) {
                case 'DITO':
                    return {
                        download: { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' }, // Red
                        upload: { bg: 'rgba(220, 38, 38, 0.7)', border: 'rgb(220, 38, 38)' }     // Darker red
                    };
                case 'Globe':
                    return {
                        download: { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }, // Blue
                        upload: { bg: 'rgba(37, 99, 235, 0.7)', border: 'rgb(37, 99, 235)' }      // Darker blue
                    };
                case 'Smart':
                    return {
                        download: { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' }, // Green
                        upload: { bg: 'rgba(5, 150, 105, 0.7)', border: 'rgb(5, 150, 105)' }      // Darker green
                    };
                default:
                    return {
                        download: { bg: 'rgba(156, 163, 175, 0.7)', border: 'rgb(156, 163, 175)' }, // Gray
                        upload: { bg: 'rgba(107, 114, 128, 0.7)', border: 'rgb(107, 114, 128)' }    // Darker gray
                    };
            }
        };

        // Create color arrays based on provider order
        const downloadColors = providers.map(p => getProviderColors(p).download);
        const uploadColors = providers.map(p => getProviderColors(p).upload);

        this.charts.providerComparison.data = {
            labels: providers,
            datasets: [
                {
                    label: 'Avg Download',
                    data: avgDownloads,
                    backgroundColor: downloadColors.map(c => c.bg),
                    borderColor: downloadColors.map(c => c.border),
                    borderWidth: 1
                },
                {
                    label: 'Avg Upload',
                    data: avgUploads,
                    backgroundColor: uploadColors.map(c => c.bg),
                    borderColor: uploadColors.map(c => c.border),
                    borderWidth: 1
                }
            ]
        };
        this.charts.providerComparison.update();

        // Update provider download summary
        this.updateProviderDownloadSummary(providers, avgDownloads);
    }

    updateProviderDownloadSummary(providers, avgDownloads) {
        const summaryContainer = document.getElementById('provider-download-summary');
        if (!summaryContainer) return;

        // Create array of provider-speed pairs and sort by speed descending
        const providerSpeeds = providers.map((provider, index) => ({
            provider: provider,
            speed: avgDownloads[index]
        })).sort((a, b) => b.speed - a.speed);

        // Get provider colors
        const getProviderColor = (provider) => {
            switch (provider) {
                case 'DITO':
                    return 'text-red-500';
                case 'Globe':
                    return 'text-blue-500';
                case 'Smart':
                    return 'text-green-500';
                default:
                    return 'text-gray-700';
            }
        };

        // Generate HTML for summary
        const summaryHTML = providerSpeeds.map(item => `
            <div class="flex items-center gap-2">
                <span class="${getProviderColor(item.provider)} font-bold text-xs sm:text-sm md:text-base">${item.provider}:</span>
                <span class="text-xs sm:text-sm md:text-base text-gray-700">${item.speed.toFixed(2)} Mbps</span>
            </div>
        `).join('');

        summaryContainer.innerHTML = summaryHTML;
    }

    updateSpeedDistributionChart() {
        console.log('updateSpeedDistributionChart called, filteredCitiesData length:', this.filteredCitiesData ? this.filteredCitiesData.length : 0);

        // Use filtered cities data to respect filters
        if (!this.filteredCitiesData || this.filteredCitiesData.length === 0) {
            console.log('No filtered cities data available for Top Cities chart');
            // Fallback: show message or empty chart
            this.charts.speedDistribution.data = {
                labels: [],
                datasets: []
            };
            this.charts.speedDistribution.update();
            return;
        }

        // Group by city and calculate weighted average download speed per city
        const cityData = {};

        this.filteredCitiesData.forEach(row => {
            const locationKey = Object.keys(row).find(k => k.trim() === 'Location Name') || 'Location Name';
            const downloadKey = Object.keys(row).find(k => k.trim() === 'Download Speed Mbps') || 'Download Speed Mbps';
            const testCountKey = Object.keys(row).find(k => k.trim() === 'Test Count') || 'Test Count';

            const location = row[locationKey];
            const download = parseFloat(row[downloadKey]);
            const testCount = parseInt(row[testCountKey]) || 0;

            if (!location || isNaN(download) || testCount === 0) return;

            // Extract city name (before first comma)
            const cityName = location.split(',')[0].trim();

            if (!cityData[cityName]) {
                cityData[cityName] = {
                    totalWeightedSpeed: 0,
                    totalTests: 0
                };
            }

            cityData[cityName].totalWeightedSpeed += download * testCount;
            cityData[cityName].totalTests += testCount;
        });

        // Calculate weighted averages and filter cities with at least 20 tests
        const cities = Object.keys(cityData)
            .filter(city => cityData[city].totalTests >= 20) // Only include cities with 20+ tests
            .map(city => {
                const avgSpeed = cityData[city].totalWeightedSpeed / cityData[city].totalTests;
                return {
                    name: city,
                    avgSpeed: avgSpeed,
                    testCount: cityData[city].totalTests
                };
            });

        // Sort by average speed and take top 15
        cities.sort((a, b) => b.avgSpeed - a.avgSpeed);
        const topCities = cities.slice(0, 15);

        console.log('Top cities (20+ tests):', topCities);

        if (topCities.length === 0) {
            console.log('No cities with 20+ tests found');
            this.charts.speedDistribution.data = {
                labels: [],
                datasets: []
            };
            this.charts.speedDistribution.update();
            return;
        }

        // Create gradient colors based on speed (green for high, yellow for medium, orange for low)
        // Use yellow color for all bars
        const backgroundColor = 'rgba(245, 158, 11, 0.7)'; // Yellow
        const borderColor = 'rgb(245, 158, 11)'; // Yellow border

        const backgroundColors = topCities.map(() => backgroundColor);
        const borderColors = topCities.map(() => borderColor);

        this.charts.speedDistribution.data = {
            labels: topCities.map(c => c.name),
            datasets: [{
                label: 'Avg Download Speed (Mbps)',
                data: topCities.map(c => c.avgSpeed),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        };

        // Update chart to horizontal bar
        if (this.charts.speedDistribution.config) {
            this.charts.speedDistribution.config.type = 'bar';
            this.charts.speedDistribution.config.options = this.charts.speedDistribution.config.options || {};
            this.charts.speedDistribution.config.options.indexAxis = 'y';
        }

        this.charts.speedDistribution.options.indexAxis = 'y';
        this.charts.speedDistribution.options.plugins = {
            ...this.charts.speedDistribution.options.plugins,
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const city = topCities[context.dataIndex];
                        return `Avg Speed: ${context.parsed.x.toFixed(2)} Mbps(${city.testCount} tests)`;
                    }
                }
            }
        };

        this.charts.speedDistribution.update();
        console.log('Top Cities chart updated successfully');
    }

    updateProviderRadarChart() {
        console.log('updateProviderRadarChart called (now showing lowest cities), filteredCitiesData length:', this.filteredCitiesData ? this.filteredCitiesData.length : 0);

        // Use filtered cities data to respect filters
        if (!this.filteredCitiesData || this.filteredCitiesData.length === 0) {
            this.charts.providerRadar.data = {
                labels: [],
                datasets: []
            };
            this.charts.providerRadar.update();
            return;
        }

        // Group by city and calculate weighted average download speed
        const cityStats = {};

        this.filteredCitiesData.forEach(row => {
            // Extract city from Location Name (format: "City, Province, Country")
            const locationName = row['Location Name'] || '';
            const city = locationName.split(',')[0].trim() || 'Unknown';

            const testCount = parseInt(row['Test Count']) || 0;
            const downloadSpeed = parseFloat(row['Download Speed Mbps']) || 0;

            if (!cityStats[city]) {
                cityStats[city] = {
                    totalTests: 0,
                    weightedDownload: 0
                };
            }

            cityStats[city].totalTests += testCount;
            cityStats[city].weightedDownload += downloadSpeed * testCount;
        });

        // Calculate average and filter cities with 20+ tests
        const cities = Object.keys(cityStats).map(city => {
            const stats = cityStats[city];
            return {
                name: city,
                avgSpeed: stats.totalTests > 0 ? stats.weightedDownload / stats.totalTests : 0,
                testCount: stats.totalTests
            };
        }).filter(city => city.testCount >= 20);

        // Sort by average speed ascending and take bottom 10
        const lowestCities = cities
            .sort((a, b) => a.avgSpeed - b.avgSpeed)
            .slice(0, 10);

        if (lowestCities.length === 0) {
            this.charts.providerRadar.data = {
                labels: [],
                datasets: []
            };
            this.charts.providerRadar.update();
            return;
        }

        // Use yellow color for all bars
        const backgroundColor = 'rgba(245, 158, 11, 0.7)'; // Yellow
        const borderColor = 'rgb(245, 158, 11)'; // Yellow border

        this.charts.providerRadar.data = {
            labels: lowestCities.map(c => c.name),
            datasets: [{
                label: 'Avg Download Speed (Mbps)',
                data: lowestCities.map(c => c.avgSpeed),
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        };

        // Update chart options to include tooltip with test count
        this.charts.providerRadar.options.plugins.tooltip = {
            callbacks: {
                afterLabel: function (context) {
                    const city = lowestCities[context.dataIndex];
                    return `Tests: ${city.testCount}`;
                }
            }
        };

        this.charts.providerRadar.update();
    }
    updateMarketShareChart() {
        // Use filteredCitiesData to respect filters
        const data = this.filteredCitiesData || [];

        if (data.length === 0) {
            this.charts.marketShare.data = {
                labels: [],
                datasets: []
            };
            this.charts.marketShare.update();
            return;
        }

        const providerTestCounts = {};

        // Sum test counts for each provider from filtered cities data
        data.forEach(row => {
            const provider = row.Provider;
            const testCount = parseInt(row['Test Count']) || 0;

            if (provider && testCount > 0) {
                providerTestCounts[provider] = (providerTestCounts[provider] || 0) + testCount;
            }
        });

        const providers = Object.keys(providerTestCounts).sort();
        const counts = providers.map(p => providerTestCounts[p]);

        // Provider-specific colors
        const getProviderColor = (provider) => {
            switch (provider) {
                case 'DITO':
                    return 'rgba(239, 68, 68, 0.7)'; // Red
                case 'Globe':
                    return 'rgba(59, 130, 246, 0.7)'; // Blue
                case 'Smart':
                    return 'rgba(16, 185, 129, 0.7)'; // Green
                default:
                    return 'rgba(156, 163, 175, 0.7)'; // Gray
            }
        };

        const colors = providers.map(p => getProviderColor(p));

        this.charts.marketShare.data = {
            labels: providers,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        };
        this.charts.marketShare.update();

        // Update summary
        this.updateMarketShareSummary(providerTestCounts);
    }

    updateMarketShareSummary(providerTestCounts) {
        const container = document.getElementById('market-share-summary');
        if (!container) return;

        const totalTests = Object.values(providerTestCounts).reduce((a, b) => a + b, 0);
        if (totalTests === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No data available</p>';
            return;
        }

        const summaryData = Object.keys(providerTestCounts).map(provider => {
            const count = providerTestCounts[provider];
            const percentage = (count / totalTests) * 100;
            return { provider, percentage };
        }).sort((a, b) => b.percentage - a.percentage);

        const getProviderTextColor = (provider) => {
            switch (provider) {
                case 'DITO': return 'text-red-500';
                case 'Globe': return 'text-blue-500';
                case 'Smart': return 'text-green-500';
                default: return 'text-gray-700';
            }
        };

        container.innerHTML = summaryData.map(item => `
            <div class="flex items-center gap-2">
                <span class="${getProviderTextColor(item.provider)} font-bold text-xs sm:text-sm md:text-base">${item.provider}:</span>
                <span class="text-xs sm:text-sm md:text-base text-gray-700">${item.percentage.toFixed(2)}%</span>
            </div>
        `).join('');
    }

    updateTimeSeriesChart() {
        if (!this.rawDailyTrendData || this.rawDailyTrendData.length === 0) {
            return;
        }

        const dateGroups = {};

        // Group data by date from daily trend data
        this.rawDailyTrendData.forEach(row => {
            const dateStr = row['Aggregate Date'] || row['aggregate date'];
            if (!dateStr) return;

            // Parse the date (format: "Oct 26, 2025" or "Nov 1, 2025")
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;

            const formattedDate = date.toISOString().split('T')[0];

            // Find keys robustly (handling potential whitespace)
            const downloadKey = Object.keys(row).find(k => k.trim() === 'Download Speed Mbps') || 'Download Speed Mbps';
            const uploadKey = Object.keys(row).find(k => k.trim() === 'Upload Speed Mbps') || 'Upload Speed Mbps';

            if (!dateGroups[formattedDate]) {
                dateGroups[formattedDate] = { downloads: [], uploads: [] };
            }

            const download = parseFloat(row[downloadKey]);
            const upload = parseFloat(row[uploadKey]);

            if (!isNaN(download)) dateGroups[formattedDate].downloads.push(download);
            if (!isNaN(upload)) dateGroups[formattedDate].uploads.push(upload);
        });

        const dates = Object.keys(dateGroups).sort();
        const avgDownloads = dates.map(d => {
            const downloads = dateGroups[d].downloads;
            return downloads.length ? downloads.reduce((sum, dl) => sum + dl, 0) / downloads.length : 0;
        });
        const avgUploads = dates.map(d => {
            const uploads = dateGroups[d].uploads;
            return uploads.length ? uploads.reduce((sum, ul) => sum + ul, 0) / uploads.length : 0;
        });

        this.charts.timeSeries.data = {
            labels: dates,
            datasets: [
                {
                    label: 'Avg Download',
                    data: avgDownloads,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Avg Upload',
                    data: avgUploads,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };
        this.charts.timeSeries.update();
    }

    updateChartsTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#d1d5db' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        Object.values(this.charts).forEach(chart => {
            chart.options.plugins.legend.labels.color = textColor;
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    scale.ticks.color = textColor;
                    scale.grid.color = gridColor;
                    if (scale.title) {
                        scale.title.color = textColor;
                    }
                });
            }
            chart.update();
        });
    }

    initializeMap() {
        this.map = L.map('performance-map').setView([12.8797, 121.7740], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        this.markerCluster = L.markerClusterGroup();
        this.map.addLayer(this.markerCluster);
    }

    getLocationCoordinates(city, province) {
        const coordinates = this.getCityCoordinates();

        if (city && coordinates[city]) {
            return coordinates[city];
        }

        if (province && coordinates[province]) {
            return coordinates[province];
        }

        return null;
    }

    getCityCoordinates() {
        return {
            'Manila': [14.5995, 120.9842],
            'Quezon City': [14.6760, 121.0437],
            'Makati': [14.5547, 121.0244],
            'Makati City': [14.5547, 121.0244],
            'Cebu City': [10.3157, 123.8854],
            'Davao City': [7.1907, 125.4553],
            'Pasig': [14.5764, 121.0851],
            'Pasig City': [14.5764, 121.0851],
            'Taguig': [14.5176, 121.0509],
            'Taguig City': [14.5176, 121.0509],
            'Pasay': [14.5378, 120.9896],
            'Pasay City': [14.5378, 120.9896],
            'Caloocan': [14.6507, 120.9838],
            'Caloocan City': [14.6507, 120.9838],
            'Antipolo': [14.5833, 121.1750],
            'Antipolo City': [14.5833, 121.1750],
            'ANTIPOLO CITY': [14.5833, 121.1750],
            'Parañaque': [14.4793, 121.0198],
            'Parañaque City': [14.4793, 121.0198],
            'Las Piñas': [14.4453, 120.9842],
            'Las Piñas City': [14.4453, 120.9842],
            'Muntinlupa': [14.3810, 121.0413],
            'Muntinlupa City': [14.3810, 121.0413],
            'Valenzuela': [14.6940, 120.9831],
            'Valenzuela City': [14.6940, 120.9831],
            'Malabon': [14.6650, 120.9567],
            'Malabon City': [14.6650, 120.9567],
            'Navotas': [14.6583, 120.9417],
            'Navotas City': [14.6583, 120.9417],
            'San Juan': [14.6019, 121.0355],
            'San Juan City': [14.6019, 121.0355],
            'Mandaluyong': [14.5794, 121.0359],
            'Mandaluyong City': [14.5794, 121.0359],
            'Marikina': [14.6507, 121.1029],
            'Marikina City': [14.6507, 121.1029],
            'Sorsogon City': [12.9706, 124.0051],
            'Guinayangan': [13.9036, 122.4453],
            'Mabalacat City': [15.2253, 120.5715],
            'Mabalacat': [15.2253, 120.5715],
            'General Mariano Alvarez': [14.2964, 121.0055],
            'San Mateo': [14.6971, 121.1218],
            'Rodriguez': [14.7173, 121.1080],
            'Montalban': [14.7173, 121.1080],
            'Cainta': [14.5778, 121.1222],
            'Taytay': [14.5632, 121.1324],
            'General Trias': [14.3869, 120.8817],
            'Santa Rosa': [14.3123, 121.1114],
            'Cabuyao': [14.2783, 121.1247],
            'Tacloban City': [11.2433, 125.0039],
            'Tacloban': [11.2433, 125.0039],
            'Batangas City': [13.7565, 121.0583],
            'Batangas': [13.7565, 121.0583],
            'Pateros': [14.5425, 121.0658],
            'Bacolor': [14.9979, 120.6601],
            'San Pedro': [14.3553, 121.0165],
            'Iligan City': [8.2280, 124.2452],
            'Iligan': [8.2280, 124.2452],
            'Novaliches': [14.7253, 121.0349],
            'Zamboanga City': [6.9214, 122.0790],
            'Zamboanga': [6.9214, 122.0790],
            'Bacolod City': [10.6770, 122.9503],
            'Bacolod': [10.6770, 122.9503],
            'Binan': [14.3364, 121.0864],
            'Biñan': [14.3364, 121.0864],
            'Biñan City': [14.3364, 121.0864],
            'BINAN CITY LAGUNA': [14.3364, 121.0864],
            'Angeles City': [15.1450, 120.5887],
            'ANGELES CITY': [15.1450, 120.5887],
            'Angeles': [15.1450, 120.5887],
            'Meycauayan': [14.7358, 120.9553],
            'Dasmarinas': [14.3294, 120.9367],
            'Dasmariñas': [14.3294, 120.9367],
            'Tanza': [14.4080, 120.8467],
            'Lipa City': [13.9411, 121.1630],
            'Lipa': [13.9411, 121.1630],
            'Donsol': [12.9067, 123.5933],
            'Enrique B. Magalona': [10.8133, 123.0167],
            'Toledo City': [10.3775, 123.6414],
            'Toledo': [10.3775, 123.6414],
            'Malvar': [14.0433, 121.1606],
            'Calamba': [14.2117, 121.1653],
            'Calamba City': [14.2117, 121.1653],
            'Guiuan': [11.0337, 125.7267],
            'Hinundayan': [10.3006, 125.2703],
            'Bacoor': [14.4593, 120.9364],
            'Imus': [14.4297, 120.9367],
            'Cavite City': [14.4791, 120.8970],
            'Tagaytay': [14.1054, 120.9616],
            'San Fernando': [15.0283, 120.6892],
            'Olongapo': [14.8294, 120.2828],
            'Baguio': [16.4023, 120.5960],
            'Baguio City': [16.4023, 120.5960],
            'Dagupan': [16.0433, 120.3334],
            'Dagupan City': [16.0433, 120.3334],
            'Cagayan de Oro': [8.4542, 124.6319],
            'Cagayan de Oro City': [8.4542, 124.6319],
            'General Santos': [6.1164, 125.1716],
            'General Santos City': [6.1164, 125.1716],
            'Butuan': [8.9475, 125.5406],
            'Butuan City': [8.9475, 125.5406],
            'Naga': [13.6192, 123.1814],
            'Naga City': [13.6192, 123.1814],
            'Legazpi': [13.1391, 123.7436],
            'Legazpi City': [13.1391, 123.7436],
            'Iloilo City': [10.7202, 122.5621],
            'Iloilo': [10.7202, 122.5621],
            'Lapu-Lapu': [10.3103, 123.9494],
            'Lapu-Lapu City': [10.3103, 123.9494],
            'Mandaue': [10.3236, 123.9223],
            'Mandaue City': [10.3236, 123.9223],
            'Talisay': [10.2444, 123.8492],
            'Talisay City': [10.2444, 123.8492],
            'Angono': [14.5262, 121.1531],
            'Morong': [14.5117, 121.2394],
            'Tanay': [14.4992, 121.2861],
            'Binangonan': [14.4647, 121.1925],
            'BINANGONAN RIZAL': [14.4647, 121.1925],
            'Cardona': [14.4847, 121.2267],
            'Pililla': [14.4836, 121.3064],
            'Jala-Jala': [14.3597, 121.3269],
            'Teresa': [14.5594, 121.2078],
            'Baras': [14.5275, 121.2650],
            'San Mateo': [14.6971, 121.1218],
            'Cavite': [14.4791, 120.8970],
            'Laguna': [14.2691, 121.4113],
            'Pampanga': [15.0794, 120.6200],
            'Rizal': [14.6037, 121.3084],
            'Bulacan': [14.7942, 120.8794],
            'BULACAN': [14.7942, 120.8794],
            'Negros Occidental': [10.6770, 122.9503],
            'Cebu': [10.3157, 123.8854],
            'Sorsogon': [12.9706, 124.0051],
            'Metro Manila': [14.5995, 120.9842],
            'Eastern Samar': [11.5000, 125.5000],
            'Southern Leyte': [10.3333, 125.1667],
            'Quezon': [14.0297, 122.1308],
            'Quezon Province': [14.0297, 122.1308],
            'Nueva Ecija': [15.5784, 121.1113],
            'Tarlac': [15.4754, 120.5963],
            'Pangasinan': [15.8949, 120.2863],
            'La Union': [16.6159, 120.3209],
            'Ilocos Norte': [18.1712, 120.7394],
            'Ilocos Sur': [17.2263, 120.5739],
            'Isabela': [16.9754, 121.8076],
            'Cagayan': [17.6132, 121.7270],
            'Abra': [17.5965, 120.7898],
            'Benguet': [16.5583, 120.7495],
            'Mountain Province': [17.0739, 121.0221],
            'Ifugao': [16.8351, 121.1710],
            'Kalinga': [17.4068, 121.4277],
            'Apayao': [18.0119, 121.1710],
            'Bataan': [14.6417, 120.4818],
            'Zambales': [15.5082, 119.9695],
            'Albay': [13.1775, 123.5244],
            'ALBAY': [13.1775, 123.5244],
            'Camarines Sur': [13.5291, 123.3481],
            'Camarines Norte': [14.1386, 122.7594],
            'Catanduanes': [13.7058, 124.2422],
            'Masbate': [12.3700, 123.6300],
            'Samar': [11.5804, 125.0000],
            'Western Samar': [12.0000, 124.8333],
            'Leyte': [10.8178, 124.9547],
            'Biliran': [11.5833, 124.4667],
            'Bohol': [9.8500, 124.1435],
            'Negros Oriental': [9.3167, 123.3000],
            'Palawan': [9.8349, 118.7384],
            'Aklan': [11.8092, 122.0858],
            'AKLAN': [11.8092, 122.0858],
            'Antique': [11.5700, 121.9500],
            'ANTIQUE': [11.5700, 121.9500],
            'Capiz': [11.3510, 122.7474],
            'Guimaras': [10.5922, 122.6322],
            'Zamboanga del Norte': [8.5500, 123.2500],
            'Zamboanga del Sur': [7.8381, 123.2956],
            'Zamboanga Sibugay': [7.7167, 122.4500],
            'Basilan': [6.4281, 121.9869],
            'Sulu': [6.0500, 121.0000],
            'Tawi-Tawi': [5.1292, 119.9519],
            'Lanao del Norte': [8.0000, 123.8333],
            'Lanao del Sur': [7.8236, 124.4197],
            'Maguindanao': [6.9417, 124.4142],
            'North Cotabato': [7.2167, 124.8500],
            'Sultan Kudarat': [6.4833, 124.2667],
            'South Cotabato': [6.3250, 124.7750],
            'Sarangani': [5.9275, 124.9975],
            'Davao del Norte': [7.5628, 125.6531],
            'Davao del Sur': [6.7700, 125.3289],
            'Davao Oriental': [7.3222, 126.5419],
            'Davao de Oro': [7.6294, 126.0819],
            'Agusan del Norte': [8.9456, 125.5317],
            'Agusan del Sur': [8.5569, 125.9753],
            'Surigao del Norte': [9.7858, 125.4814],
            'del Norte': [9.7858, 125.4814],
            'Surigao del Sur': [8.5472, 126.1175],
            'Dinagat Islands': [10.1278, 125.6050],
            'Misamis Occidental': [8.3289, 123.7053],
            'Misamis Oriental': [8.5050, 124.6231],
            'Camiguin': [9.1733, 124.7297],
            'Bukidnon': [8.0542, 124.9261],
            'Nueva Vizcaya': [16.3300, 121.1700],
            'Quirino': [16.2714, 121.5369],
            'Aurora': [15.7494, 121.6367],
            'Marinduque': [13.4767, 121.9033],
            'Romblon': [12.5778, 122.2692],
            'Mindoro Occidental': [13.1000, 120.7667],
            'Mindoro Oriental': [13.4000, 121.4167],
            'Oriental Mindoro': [13.4000, 121.4167]
        };
    }

    updateMap() {
        this.markerCluster.clearLayers();
        let markersAdded = 0;
        let markersSkipped = 0;

        // Use cities data if available, otherwise fall back to filteredData
        const dataSource = this.rawCitiesData && this.rawCitiesData.length > 0
            ? this.rawCitiesData
            : this.filteredData;

        dataSource.forEach(row => {
            let lat, lng, download, provider, location;

            // Handle cities data format
            if (this.rawCitiesData && this.rawCitiesData.length > 0) {
                lat = parseFloat(row['Latitude'] || row['latitude']);
                lng = parseFloat(row['Longitude'] || row['longitude']);

                // Find keys robustly (handling potential whitespace)
                const downloadKey = Object.keys(row).find(k => k.trim() === 'Download Speed Mbps') || 'Download Speed Mbps';
                const uploadKey = Object.keys(row).find(k => k.trim() === 'Upload Speed Mbps') || 'Upload Speed Mbps';
                const providerKey = Object.keys(row).find(k => k.trim() === 'Provider') || 'Provider';
                const locationKey = Object.keys(row).find(k => k.trim() === 'Location Name') || 'Location Name';

                download = parseFloat(row[downloadKey]);
                const upload = parseFloat(row[uploadKey]);
                provider = row[providerKey];
                location = row[locationKey];

                if (isNaN(lat) || isNaN(lng) || isNaN(download)) {
                    markersSkipped++;
                    return;
                }

                markersAdded++;

                const speedClass = download >= 30 ? 'speed-excellent'
                    : download >= 10 ? 'speed-good'
                        : download >= 5 ? 'speed-average'
                            : 'speed-poor';

                const marker = L.circleMarker([lat, lng], {
                    radius: 6,
                    fillColor: speedClass.includes('excellent') ? '#10b981'
                        : speedClass.includes('good') ? '#3b82f6'
                            : speedClass.includes('average') ? '#f59e0b'
                                : '#ef4444',
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });

                marker.bindPopup(`
            < h3 > ${provider}</h3 >
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>Download:</strong> ${download.toFixed(2)} Mbps</p>
                    <p><strong>Upload:</strong> ${upload.toFixed(2)} Mbps</p>
        `);

                this.markerCluster.addLayer(marker);
            } else {
                // Fall back to old method with hardcoded coordinates
                const coords = this.getLocationCoordinates(row.city, row.province);
                if (!coords) {
                    markersSkipped++;
                    return;
                }

                markersAdded++;

                const [lat, lng] = coords;
                const jitter = () => (Math.random() - 0.5) * 0.02;

                const speedClass = row.download >= 30 ? 'speed-excellent'
                    : row.download >= 10 ? 'speed-good'
                        : row.download >= 5 ? 'speed-average'
                            : 'speed-poor';

                const marker = L.circleMarker([lat + jitter(), lng + jitter()], {
                    radius: 6,
                    fillColor: speedClass.includes('excellent') ? '#10b981'
                        : speedClass.includes('good') ? '#3b82f6'
                            : speedClass.includes('average') ? '#f59e0b'
                                : '#ef4444',
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });

                marker.bindPopup(`
            < h3 > ${row.provider}</h3 >
                    <p><strong>Location:</strong> ${row.city}, ${row.province}</p>
                    <p><strong>Download:</strong> ${row.download.toFixed(2)} Mbps</p>
                    <p><strong>Upload:</strong> ${row.upload.toFixed(2)} Mbps</p>
                    <p><strong>Latency:</strong> ${row.latency ? row.latency.toFixed(0) + ' ms' : 'N/A'}</p>
                    <p><strong>Date:</strong> ${row.date ? row.date.toLocaleDateString() : 'N/A'}</p>
        `);

                this.markerCluster.addLayer(marker);
            }
        });

        if (this.DEBUG) {
            console.log(`Map updated: ${markersAdded} markers added, ${markersSkipped} skipped(no coordinates)`);
        }
    }

    renderTable() {
        const tbody = document.getElementById('table-body');
        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const maxRows = 10;
        const pageData = this.rawData.slice(start, Math.min(end, start + maxRows));

        if (pageData.length === 0) {
            this.showEmptyState();
            return;
        }

        tbody.innerHTML = pageData.map((row, index) => {
            const speedClass = row.download >= 30 ? 'speed-excellent'
                : row.download >= 10 ? 'speed-good'
                    : row.download >= 5 ? 'speed-average'
                        : 'speed-poor';

            const rowId = `row-${start + index}`;

            return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" data-row-id="${rowId}">
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${row.date ? row.date.toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${row.provider}
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${speedClass} font-bold">
                    ${row.download.toFixed(2)} Mbps
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden md:table-cell">
                    ${row.upload.toFixed(2)} Mbps
                </td>
                <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden md:table-cell">
                    ${row.latency ? row.latency.toFixed(0) + ' ms' : 'N/A'}
                </td>
                <td class="px-3 sm:px-6 py-4 text-sm text-gray-900 dark:text-gray-100 hidden lg:table-cell">
                    ${row.city ? row.city + ', ' + row.province : row.province || 'Unknown'}
                </td>
                <td class="px-3 py-4 text-center md:hidden">
                    <button onclick="app.toggleRowDetails('${rowId}')" class="text-blue-600 hover:text-blue-800 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center mx-auto" aria-label="View details">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </td>
            </tr>
            <tr id="${rowId}-details" class="hidden bg-blue-50 border-t-2 border-blue-200 md:hidden">
                <td colspan="4" class="px-4 py-4">
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="font-semibold text-gray-700">Upload:</span>
                            <span class="text-gray-900">${row.upload.toFixed(2)} Mbps</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-semibold text-gray-700">Latency:</span>
                            <span class="text-gray-900">${row.latency ? row.latency.toFixed(0) + ' ms' : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-semibold text-gray-700">Location:</span>
                            <span class="text-gray-900">${row.city ? row.city + ', ' + row.province : row.province || 'Unknown'}</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        document.getElementById('page-info').textContent =
            `${start + 1} -${Math.min(end, this.rawData.length)} of ${this.rawData.length} `;

        const totalPages = Math.ceil(this.rawData.length / this.rowsPerPage);
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages;
    }

    toggleRowDetails(rowId) {
        const detailsRow = document.getElementById(`${rowId} -details`);
        if (detailsRow) {
            detailsRow.classList.toggle('hidden');
        }
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredData.sort((a, b) => {
            let aVal, bVal;

            switch (column) {
                case 'date':
                    aVal = a.date ? a.date.getTime() : 0;
                    bVal = b.date ? b.date.getTime() : 0;
                    break;
                case 'provider':
                    aVal = a.provider;
                    bVal = b.provider;
                    break;
                case 'download':
                    aVal = a.download;
                    bVal = b.download;
                    break;
                case 'upload':
                    aVal = a.upload;
                    bVal = b.upload;
                    break;
                case 'latency':
                    aVal = a.latency || 0;
                    bVal = b.latency || 0;
                    break;
                case 'location':
                    aVal = a.city + a.province;
                    bVal = b.city + b.province;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        document.querySelectorAll('#data-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const th = document.querySelector(`#data - table th[data - sort= "${column}"]`);
        th.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');

        this.renderTable();
    }

    searchTable(query) {
        // Table search is disabled - table always shows all data
        // This method is kept for compatibility but does nothing
        console.log('Table search is disabled');
    }

    applyBasicFilters() {
        return this.rawData.filter(row => {
            if (this.filters.providers.length && !this.filters.providers.includes(row.provider)) {
                return false;
            }
            if (this.filters.province && row.province !== this.filters.province) {
                return false;
            }
            if (this.filters.city && row.city !== this.filters.city) {
                return false;
            }
            if (this.filters.dateFrom && row.date) {
                const fromDate = new Date(this.filters.dateFrom);
                if (row.date < fromDate) return false;
            }
            if (this.filters.dateTo && row.date) {
                const toDate = new Date(this.filters.dateTo);
                if (row.date > toDate) return false;
            }
            if (this.filters.speedRange) {
                const range = this.filters.speedRange;
                if (range === '100+') {
                    if (row.download < 100) return false;
                } else {
                    const [min, max] = range.split('-').map(Number);
                    if (row.download < min || row.download >= max) return false;
                }
            }
            return true;
        });
    }

    exportData() {
        const csv = Papa.unparse(this.rawData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `mno_performance_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

const app = new MNOPerformanceApp();

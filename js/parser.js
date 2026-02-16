// Data parser utilities
class DataParser {
    static getColumnIndexMap() {
        if (typeof DataCalculations !== 'undefined' && typeof DataCalculations.getColumnIndices === 'function') {
            return DataCalculations.getColumnIndices();
        }

        return {
            engagementIndex: 12,
            seacomIndex: 25
        };
    }

    static getReportData() {
        const data = sessionStorage.getItem('reportData');
        if (!data) {
            window.location.href = 'index.html';
            return null;
        }
        return JSON.parse(data);
    }

    static calculateSummaryStats(data) {
        const dataset = data && data.current ? data.current : data;
        if (!dataset) {
            return {
                totalResponses: 0,
                totalQuestions: 0,
                completionRate: 0,
                dateRange: 'N/A',
                engagementIndexScore: null,
                seacomIndexScore: null
            };
        }

        // `dataset.rows` is expected to contain respondent rows only (Excel Row 3+).
        const responseRows = Array.isArray(dataset.rows) ? dataset.rows : [];

        const totalResponses = Number.isInteger(dataset.totalResponses)
            ? dataset.totalResponses
            : responseRows.length;
        const columns = dataset.headers ? dataset.headers.length : 0;
        
        // Calculate completion rate (rows with all fields filled)
        const completeResponses = responseRows.filter(row => 
            row.length === columns && row.every(cell => cell !== undefined && cell !== '')
        ).length;
        
        const completionRate = totalResponses > 0 
            ? Math.round((completeResponses / totalResponses) * 100) 
            : 0;

        // Get date range if there's a date column
        let dateRange = 'N/A';
        const dateColumnIndex = dataset.headers
            ? dataset.headers.findIndex(h => 
            h && h.toLowerCase().includes('date')
            )
            : -1;

        if (dateColumnIndex !== -1) {
            const dates = responseRows
                .map(row => row[dateColumnIndex])
                .filter(d => d)
                .sort();
            
            if (dates.length > 0) {
                dateRange = `${dates[0]} - ${dates[dates.length - 1]}`;
            }
        }

        const columnIndices = this.getColumnIndexMap();
        const engagementIndexScore = this.calculateColumnAverage(dataset.rows, columnIndices.engagementIndex);
        const seacomIndexScore = this.calculateColumnAverage(dataset.rows, columnIndices.seacomIndex);

        return {
            totalResponses,
            totalQuestions: columns,
            completionRate,
            dateRange,
            engagementIndexScore,
            seacomIndexScore
        };
    }

    static getSampleData(data, limit = 10) {
        const dataset = data && data.current ? data.current : data;
        if (!dataset) {
            return { headers: [], rows: [] };
        }

        return {
            headers: dataset.headers || [],
            rows: (dataset.rows || []).slice(0, limit)
        };
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static getCurrentDate() {
        return new Date().toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static calculateColumnAverage(rows = [], columnIndex) {
        if (!Array.isArray(rows) || columnIndex === undefined) {
            return null;
        }
        const responseRows = rows;

        const numericValues = responseRows
            .map(row => Array.isArray(row) ? row[columnIndex] : null)
            .filter(value => value !== null && value !== undefined && value !== '' && !isNaN(value))
            .map(value => Number(value));

        if (numericValues.length === 0) {
            return null;
        }

        const sum = numericValues.reduce((total, value) => total + value, 0);
        return Math.round(sum / numericValues.length);
    }
}


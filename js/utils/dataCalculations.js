/**
 * Utility functions for data calculations and transformations
 */
const ENGAGEMENT_INDEX_COLUMN = 12; // Column M (0-based index)
const SEACOM_INDEX_COLUMN = 25;     // Column Z (0-based index)
const CORE_DIMENSION_COLUMNS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]; // Columns N-Y
const ADDITIONAL_DIMENSION_COLUMNS = [26, 30, 35, 45, 50, 53]; // AA, AE, AJ, AT, AY, BB
const ENPS_COLUMN = 71; // Column BT (0-based index)
const COMMENT_COLUMNS = [78, 79, 80, 81, 82, 83, 84]; // CA, CB, CC, CD, CE, CF, CG (0-based)
const RETENTION_OVERALL_COLUMN = 8; // Column I
const RETENTION_RISK1_COLUMN = 9;   // Column J
const RETENTION_RISK2_COLUMN = 10;  // Column K
const TEN_POINT_SCALE_COLUMNS = [65, 67]; // Columns BN and BP - 10-point scale questions in Diversity & Inclusion

// Configurable threshold for significant change in heatmap scores (percentage points)
// Change this value to adjust when arrows change from grey to green/red
const SIGNIFICANT_CHANGE_THRESHOLD = 5;

class DataCalculations {
    /**
     * Expose key column indices for other modules
     * @returns {Object} Column index map
     */
    static getColumnIndices() {
        return {
            engagementIndex: ENGAGEMENT_INDEX_COLUMN,
            seacomIndex: SEACOM_INDEX_COLUMN
        };
    }

    /**
     * Returns respondent rows.
     *
     * NOTE: With the current upload format, `dataset.rows` already contains only
     * respondent rows (Excel Row 3+). This helper exists for backwards-compatible
     * call sites and should not drop any rows.
     *
     * @param {Array} rows
     * @returns {Array}
     */
    static getResponseRows(rows = []) {
        return Array.isArray(rows) ? rows : [];
    }
    /**
     * Calculate engagement index scores from raw survey data
     * @param {Array} responses - Array of survey responses
     * @param {Array} questions - Array of question identifiers
     * @returns {Object} Calculated scores
     */
    static calculateEngagementScore(responses, questions) {
        if (!responses || responses.length === 0) {
            return { score: 0, percentage: 0, count: 0 };
        }

        const validResponses = responses.filter(r => r !== null && r !== undefined && r !== '');
        const sum = validResponses.reduce((acc, val) => acc + Number(val), 0);
        const average = sum / validResponses.length;
        
        return {
            score: Math.round(average * 10) / 10,
            percentage: Math.round((average / 5) * 100), // Assuming 5-point scale
            count: validResponses.length
        };
    }

    /**
     * Calculate year-over-year comparison
     * @param {number} current - Current year value
     * @param {number} previous - Previous year value
     * @returns {Object} Comparison data
     */
    static calculateYoYComparison(current, previous) {
        const difference = current - previous;
        const percentageChange = previous !== 0 ? (difference / previous) * 100 : 0;
        
        return {
            difference: Math.round(difference * 10) / 10,
            percentageChange: Math.round(percentageChange * 10) / 10,
            trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable'
        };
    }

    /**
     * Calculate retention risk score
     * @param {Array} responses - Survey responses
     * @param {Object} columnIndices - Column indices for overall, risk1, risk2
     * @returns {Object} Risk scores
     */
    static calculateRetentionRisk(responses, columnIndices = {}) {
        if (!Array.isArray(responses) || responses.length === 0) {
            return { risk1: 0, risk2: 0, overall: 0, totalResponses: 0 };
        }

        const overallIndex = Number.isInteger(columnIndices.overall)
            ? columnIndices.overall
            : RETENTION_OVERALL_COLUMN;
        const risk1Index = Number.isInteger(columnIndices.risk1)
            ? columnIndices.risk1
            : RETENTION_RISK1_COLUMN;
        const risk2Index = Number.isInteger(columnIndices.risk2)
            ? columnIndices.risk2
            : RETENTION_RISK2_COLUMN;

        const averageColumn = (rows, index) => {
            const values = rows
                .map(row => row[index])
                .filter(val => val !== null && val !== undefined && val !== '' && !isNaN(val))
                .map(val => Number(val));
            if (!values.length) return 0;
            const sum = values.reduce((acc, val) => acc + val, 0);
            return Math.round(sum / values.length);
        };
        
        return {
            overall: averageColumn(responses, overallIndex),
            risk1: averageColumn(responses, risk1Index),
            risk2: averageColumn(responses, risk2Index),
            totalResponses: responses.length
        };
    }

    /**
     * Get risk level classification
     * @param {number} percentage - Risk percentage
     * @returns {string} Risk level (low, medium, high, very-high)
     */
    static getRiskLevel(percentage) {
        if (percentage < 20) return 'low';
        if (percentage < 35) return 'medium';
        // High Risk is inclusive of 50 (35 - 50); Very High is strictly > 50.
        if (percentage <= 50) return 'high';
        return 'very-high';
    }

    /**
     * Get engagement level color
     * @param {number} percentage - Engagement percentage
     * @returns {string} Color code
     */
    static getEngagementColor(percentage) {
        if (percentage >= 70) return '#10b981'; // Green - engaged
        if (percentage >= 50) return '#f59e0b'; // Yellow - moderate
        return '#ef4444'; // Red - disengaged
    }

    /**
     * Filter data by dimension
     * @param {Array} data - Complete dataset
     * @param {string} dimension - Dimension name (location, department, etc.)
     * @param {string} value - Dimension value to filter by
     * @returns {Array} Filtered dataset
     */
    static filterByDimension(data, dimension, value) {
        return data.filter(row => row[dimension] === value);
    }

    /**
     * Group data by dimension
     * @param {Array} data - Complete dataset
     * @param {string} dimension - Dimension to group by
     * @returns {Object} Grouped data
     */
    static groupByDimension(data, dimension) {
        return data.reduce((acc, row) => {
            const key = row[dimension] || 'Unknown';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(row);
            return acc;
        }, {});
    }

    /**
     * Paginate data for slides
     * @param {Array} data - Data to paginate
     * @param {number} itemsPerPage - Items per slide
     * @returns {Array} Array of pages
     */
    static paginateData(data, itemsPerPage) {
        const pages = [];
        for (let i = 0; i < data.length; i += itemsPerPage) {
            pages.push(data.slice(i, i + itemsPerPage));
        }
        return pages;
    }

    /**
     * Calculate summary statistics
     * @param {Array} values - Numeric values
     * @returns {Object} Statistics
     */
    static calculateStats(values) {
        const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
        
        if (validValues.length === 0) {
            return { mean: 0, median: 0, min: 0, max: 0, count: 0 };
        }

        const sorted = [...validValues].sort((a, b) => a - b);
        const sum = validValues.reduce((acc, val) => acc + val, 0);
        
        return {
            mean: Math.round((sum / validValues.length) * 10) / 10,
            median: sorted[Math.floor(sorted.length / 2)],
            min: sorted[0],
            max: sorted[sorted.length - 1],
            count: validValues.length
        };
    }

    /**
     * Format percentage for display
     * @param {number} value - Numeric value
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage
     */
    static formatPercentage(value, decimals = 0) {
        return `${value.toFixed(decimals)}%`;
    }

    /**
     * Parse engagement dimensions from Excel data
     * @param {Object} excelData - Parsed Excel data
     * @returns {Object} Structured engagement data
     */
    static parseEngagementData(excelData) {
        const headers = excelData.headers;
        const rows = excelData.rows;
        
        // Find column indices for key metrics
        const dimensionColumns = this.findDimensionColumns(headers);
        
        return {
            raw: rows,
            headers,
            dimensions: dimensionColumns,
            summary: this.calculateOverallEngagement(rows, dimensionColumns)
        };
    }

    /**
     * Find dimension columns in headers
     * @param {Array} headers - Column headers
     * @returns {Object} Column indices
     */
    static findDimensionColumns(headers) {
        const columns = {};
        
        headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            
            if (lowerHeader.includes('location')) columns.location = index;
            if (lowerHeader.includes('department')) columns.department = index;
            if (lowerHeader.includes('cost centre')) columns.costCentre = index;
            if (lowerHeader.includes('engagement')) columns.engagement = index;
        });
        
        return columns;
    }

    /**
     * Calculate overall engagement metrics
     * @param {Array} rows - Data rows
     * @param {Object} dimensionColumns - Column indices
     * @returns {Object} Overall metrics
     */
    static calculateOverallEngagement(rows, dimensionColumns) {
        return {
            totalResponses: rows.length,
            locations: new Set(rows.map(r => r[dimensionColumns.location])).size,
            departments: new Set(rows.map(r => r[dimensionColumns.department])).size
        };
    }

    /**
     * Calculate Engagement Index scores for bar chart
     * @param {Object} excelData - Parsed Excel data from Sheet 1
     * @returns {Object} Bar chart data with dimensions and scores
     */
    static calculateEngagementIndexScores(excelData) {
        return this.calculateBarChartData(excelData, this.getBarChartCategoryConfigs());
    }

    static calculateSeacomDimensionScores(excelData) {
        return this.calculateBarChartData(excelData, this.getAdditionalBarChartCategoryConfigs());
    }

    static calculateBarChartData(excelData, categoryConfigs = []) {
        if (!excelData || !excelData.current) {
            throw new Error('Sheet 1 data is missing or empty. Please ensure your Excel file contains survey response data in Sheet 1.');
        }

        if (!Array.isArray(categoryConfigs) || categoryConfigs.length === 0) {
            throw new Error('No category configuration provided for bar chart calculation.');
        }

        const categories = categoryConfigs.map(config => config.label);
        const currentRows = this.getResponseRows(excelData.current.rows || []);

        const currentScores = categoryConfigs.map(config => {
            const columnIndex = config.columns[0];
            return this.calculateAverageScore(currentRows, columnIndex) ?? 0;
        });

        let previousScores = null;
        if (excelData.previous && excelData.previous.rows) {
            const previousRows = this.getResponseRows(excelData.previous.rows);
            if (previousRows.length) {
                previousScores = categoryConfigs.map(config => {
                    const columnIndex = config.columns[0];
                    return this.calculateAverageScore(previousRows, columnIndex) ?? 0;
                });
            }
        }

        const currentLabel = excelData.currentYearLabel
            ? excelData.currentYearLabel
            : this.getYearLabel(excelData.current.sheetName, 'Current Year');

        const previousLabel = previousScores
            ? (excelData.previousYearLabel
                ? excelData.previousYearLabel
                : this.getYearLabel(
                    excelData.previous ? excelData.previous.sheetName : null,
                    'Previous Year'
                ))
            : null;

        return {
            categories,
            currentYear: {
                label: currentLabel,
                scores: currentScores
            },
            previousYear: previousScores ? {
                label: previousLabel,
                scores: previousScores
            } : null
        };
    }

    static getBarChartCategoryConfigs() {
        // Match the heatmap overall row order: Engagement Index first, then 12 core dimensions
        return [
            {
                label: 'Overall\nengagement\nindex',
                columns: [ENGAGEMENT_INDEX_COLUMN] // Column M (index 12)
            },
            { label: 'Expectations\nknown', columns: [CORE_DIMENSION_COLUMNS[0]] }, // Column N
            { label: 'Materials &\nequipment', columns: [CORE_DIMENSION_COLUMNS[1]] }, // Column O
            { label: 'Do what I\ndo best', columns: [CORE_DIMENSION_COLUMNS[2]] }, // Column P
            { label: 'Recognition in\nthe last 7 days', columns: [CORE_DIMENSION_COLUMNS[3]] }, // Column Q
            { label: 'Supervisor\nCares', columns: [CORE_DIMENSION_COLUMNS[4]] }, // Column R
            { label: 'Development\nEncouraged', columns: [CORE_DIMENSION_COLUMNS[5]] }, // Column S
            { label: 'Opinions\nCount', columns: [CORE_DIMENSION_COLUMNS[6]] }, // Column T
            { label: 'My work is\nImportant', columns: [CORE_DIMENSION_COLUMNS[7]] }, // Column U
            { label: 'Co-workers\ncommitted to\nquality', columns: [CORE_DIMENSION_COLUMNS[8]] }, // Column V
            { label: '6-month\nprogress talk', columns: [CORE_DIMENSION_COLUMNS[9]] }, // Column W
            { label: 'Growth\nopportunities', columns: [CORE_DIMENSION_COLUMNS[10]] }, // Column X
            { label: 'Manager', columns: [CORE_DIMENSION_COLUMNS[11]] } // Column Y
        ];
    }

    static getAdditionalBarChartCategoryConfigs() {
        return [
            { label: 'Seacom\nIndex', columns: [SEACOM_INDEX_COLUMN] },
            { label: 'Communication', columns: [ADDITIONAL_DIMENSION_COLUMNS[0]] },
            { label: 'Trust', columns: [ADDITIONAL_DIMENSION_COLUMNS[1]] },
            { label: 'Direct\nManager', columns: [ADDITIONAL_DIMENSION_COLUMNS[2]] },
            { label: 'Brand', columns: [ADDITIONAL_DIMENSION_COLUMNS[3]] },
            { label: 'Change\nManagement', columns: [ADDITIONAL_DIMENSION_COLUMNS[4]] },
            { label: 'Diversity &\nInclusion', columns: [ADDITIONAL_DIMENSION_COLUMNS[5]] }
        ];
    }

    static getYearLabel(sheetName, fallback) {
        if (!sheetName) return fallback;
        const match = sheetName.toString().match(/(19|20)\d{2}/);
        if (match) return match[0];
        return sheetName;
    }

    /**
     * Calculate satisfaction data from Column L responses
     * @param {Object} excelData - Parsed Excel data
     * @param {string} dimension - Dimension to group by: 'location', 'costCenter', or 'department'
     * @returns {Object} Satisfaction data structure
     */
    static calculateSatisfactionData(excelData, dimension) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing or empty');
        }

        const currentResult = this.computeSatisfactionForDataset(excelData.current, dimension);
        if (!currentResult) {
            throw new Error('Current year data is missing or empty');
        }
        const previousResult = excelData.previous
            ? (this.computeSatisfactionForDataset(excelData.previous, dimension) || this.createEmptySatisfactionResult(false))
            : this.createEmptySatisfactionResult(false);

        const mergedBreakdown = this.mergeSatisfactionBreakdowns(
            currentResult.breakdown,
            previousResult.breakdown
        );

        return {
            current: currentResult,
            previous: previousResult,
            mergedBreakdown
        };
    }

    static computeSatisfactionForDataset(dataset, dimension) {
        if (!dataset || !dataset.rows || dataset.rows.length === 0) {
            return null;
        }

        const responseRows = this.getResponseRows(dataset.rows);
        if (responseRows.length === 0) {
            return null;
        }

        const satisfactionColIndex = 11; // Column L
        const dimensionColMap = {
            department: 1, // Column B
            costCenter: 2, // Column C
            location: 3    // Column D
        };

        const dimensionColIndex = dimensionColMap[dimension];
        if (dimensionColIndex === undefined) {
            throw new Error(`Invalid dimension: ${dimension}`);
        }

        let overallSatisfied = 0;
        let overallDissatisfied = 0;
        let overallTotal = 0;
        const dimensionGroups = {};
        const allDimensionValues = new Set();

        // Helper function to normalize dimension values consistently
        // Handles null/undefined, empty strings, whitespace, and normalizes spacing
        const normalizeDimensionValue = (value) => {
            if (value == null || value === undefined) return null;
            const str = value.toString();
            // Handle empty strings, whitespace-only strings, and normalize
            const trimmed = str.trim();
            if (!trimmed) return null;
            // Normalize multiple spaces to single space, then uppercase
            return trimmed.replace(/\s+/g, ' ').toUpperCase();
        };

        // First pass: collect all unique dimension values (departments/locations/cost centers)
        for (const row of responseRows) {
            const dimensionValue = row[dimensionColIndex];
            const groupKey = normalizeDimensionValue(dimensionValue);
            if (groupKey) {
                allDimensionValues.add(groupKey);
                // Initialize all dimension groups to ensure they appear even with 0 responses
                if (!dimensionGroups[groupKey]) {
                    dimensionGroups[groupKey] = { satisfied: 0, dissatisfied: 0, total: 0 };
                }
            }
        }

        // Second pass: calculate satisfaction for rows that have satisfaction data
        for (const row of responseRows) {
            const satisfactionValue = row[satisfactionColIndex];
            const dimensionValue = row[dimensionColIndex];

            if (!satisfactionValue) continue;

            const lowerValue = satisfactionValue.toString().toLowerCase();
            const isSatisfied = lowerValue.includes('satisfied') && !lowerValue.includes('dissatisfied');

            overallTotal++;
            if (isSatisfied) {
                overallSatisfied++;
            } else {
                overallDissatisfied++;
            }

            // Process dimension value using same normalization as first pass
            const groupKey = normalizeDimensionValue(dimensionValue);
            if (groupKey) {
                // Ensure group exists (should already exist from first pass, but create if missing)
                if (!dimensionGroups[groupKey]) {
                    dimensionGroups[groupKey] = { satisfied: 0, dissatisfied: 0, total: 0 };
                }
                dimensionGroups[groupKey].total++;
                if (isSatisfied) {
                    dimensionGroups[groupKey].satisfied++;
                } else {
                    dimensionGroups[groupKey].dissatisfied++;
                }
            }
        }

        const overallEngagementIndex = this.calculateAverageScore(responseRows, ENGAGEMENT_INDEX_COLUMN);
        const overallSeacomIndex = this.calculateAverageScore(responseRows, SEACOM_INDEX_COLUMN);

        const overallResult = overallTotal > 0
            ? {
                satisfied: Math.round((overallSatisfied / overallTotal) * 100),
                dissatisfied: Math.round((overallDissatisfied / overallTotal) * 100),
                count: overallTotal
            }
            : { satisfied: 0, dissatisfied: 0, count: 0 };

        const breakdown = Object.keys(dimensionGroups).sort().map(key => {
            const group = dimensionGroups[key];
            return {
                name: key,
                satisfied: Math.round((group.satisfied / group.total) * 100),
                dissatisfied: Math.round((group.dissatisfied / group.total) * 100),
                count: group.total
            };
        });

        return {
            overall: overallResult,
            breakdown,
            hasData: overallTotal > 0,
            engagementIndex: overallEngagementIndex,
            seacomIndex: overallSeacomIndex
        };
    }

    static mergeSatisfactionBreakdowns(currentBreakdown = [], previousBreakdown = []) {
        const map = new Map();

        currentBreakdown.forEach(item => {
            map.set(item.name, { name: item.name, current: item, previous: null });
        });

        previousBreakdown.forEach(item => {
            if (map.has(item.name)) {
                map.get(item.name).previous = item;
            } else {
                map.set(item.name, { name: item.name, current: null, previous: item });
            }
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    static createEmptySatisfactionResult(hasData = false) {
        return {
            overall: { satisfied: 0, dissatisfied: 0, count: 0 },
            breakdown: [],
            hasData,
            engagementIndex: null,
            seacomIndex: null
        };
    }

    /**
     * Extract survey questions from Excel Row 2
     * @param {Object} excelData - Parsed Excel data
     * @returns {Array} Array of dimension objects with questions extracted from Excel
     */
    static extractSurveyQuestionsFromExcel(excelData) {
        if (!excelData) {
            throw new Error('Survey questions could not be extracted: parsed Excel data is missing.');
        }

        if (!Array.isArray(excelData.headers) || excelData.headers.length === 0) {
            throw new Error('Survey questions could not be extracted: header row (Row 2) is missing.');
        }

        const questionRow = excelData.headers; // Excel Row 2 (header/question text)

        const columnMappings = this.getQuestionColumnMappings(false);

        const dimensions = [];

        Object.entries(columnMappings).forEach(([dimensionName, config]) => {
            // Skip "Overall Engagement Index" and "SEACOM Index" - these are aggregates, not dimensions
            if (dimensionName === 'Overall Engagement Index' || dimensionName === 'SEACOM Index') {
                return;
            }
            const questions = config.columns.map(colIndex => {
                if (colIndex >= questionRow.length) {
                    throw new Error(`Missing header text for ${dimensionName}. ${config.range} was not found in Row 2 (the header row).`);
                }

                const question = questionRow[colIndex];

                if (!question || question.toString().trim() === '') {
                    throw new Error(`Missing header text for ${dimensionName}. Please populate ${config.range} in Row 2 of the spreadsheet.`);
                }

                return question.toString().trim();
            });

            if (questions.length === 0) {
                throw new Error(`No question text detected for ${dimensionName}. Verify ${config.range} contains the survey questions.`);
            }

            dimensions.push({ name: dimensionName, questions });
        });

        return dimensions;
    }

    static getQuestionColumnMappings(includeOverall = false) {
        const baseMappings = {
            'Expectations known': { columns: [13], range: 'Column N' },
            'Materials & equipment': { columns: [14], range: 'Column O' },
            'Do what I do best': { columns: [15], range: 'Column P' },
            'Recognition in the last 7 days': { columns: [16], range: 'Column Q' },
            'Supervisor cares': { columns: [17], range: 'Column R' },
            'Development encouraged': { columns: [18], range: 'Column S' },
            'Opinions count': { columns: [19], range: 'Column T' },
            'My work is important': { columns: [20], range: 'Column U' },
            'Co-workers committed to quality': { columns: [21], range: 'Column V' },
            '6-month progress talk': { columns: [22], range: 'Column W' },
            'Growth opportunities': { columns: [23], range: 'Column X' },
            'Manager': { columns: [24], range: 'Column Y' },
            'Communication': { columns: [27, 28, 29], range: 'Columns AB-AD' },
            'Trust': { columns: [31, 32, 33, 34], range: 'Columns AF-AI' },
            'Direct Manager': { columns: [36, 37, 38, 39, 40, 41, 42, 43, 44], range: 'Columns AK-AS' },
            'Brand': { columns: [46, 47, 48, 49], range: 'Columns AU-AX' },
            'Change Management': { columns: [51, 52], range: 'Columns AZ-BA' },
            'Diversity & Inclusion': { columns: [54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68], range: 'Columns BC-BQ' }
        };

        if (!includeOverall) {
            return baseMappings;
        }

        return {
            'Overall Engagement Index': { columns: [ENGAGEMENT_INDEX_COLUMN], range: 'Column M' },
            ...baseMappings,
            'SEACOM Index': { columns: [SEACOM_INDEX_COLUMN], range: 'Column Z' }
        };
    }


    /**
     * Paginate survey questions into groups for slides
     * Specifically structured for 3 pages:
     * - Page 1: Core 12 dimensions
     * - Page 2: Communication, Trust, Direct Manager
     * - Page 3: Brand, Change Management, Diversity & Inclusion
     * @param {Object} excelData - Parsed Excel data (optional)
     * @returns {Array} Array of question groups
     */
    static paginateSurveyQuestions(excelData = null) {
        if (!excelData || !excelData.current) {
            throw new Error('Survey questions could not be generated because the current year data is missing.');
        }

        let allQuestions;
        try {
            allQuestions = this.extractSurveyQuestionsFromExcel(excelData.current);
        } catch (error) {
            throw new Error(`Survey questions extraction failed: ${error.message}`);
        }
        
        // Manually structure into 3 specific pages
        const pages = [
            // Page 1: First 12 core dimensions
            allQuestions.slice(0, 12),
            // Page 2: Communication, Trust, Direct Manager (indices 12-14)
            allQuestions.slice(12, 15),
            // Page 3: Brand, Change Management, Diversity & Inclusion (indices 15-17)
            allQuestions.slice(15, 18)
        ];
        
        return pages;
    }

    static calculateTopBottomStatements(excelData, questionSet = 'engagement', limit = 3) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for Top & Bottom statements.');
        }

        const currentRows = this.getResponseRows(excelData.current.rows || []);
        if (!currentRows.length) {
            throw new Error('Current year data contains no engagement responses for statements.');
        }

        const previousRows = excelData.previous && excelData.previous.rows
            ? this.getResponseRows(excelData.previous.rows)
            : null;
        const hasPrevious = Boolean(previousRows && previousRows.length);

        const questionRow = excelData.current.headers || [];
        const columnMappings = this.getQuestionColumnMappingsForSet(questionSet);

        const statements = [];

        Object.entries(columnMappings).forEach(([driver, config]) => {
            config.columns.forEach((colIndex, idx) => {
                // Skip 10-point scale questions - they are handled separately
                if (this.isTenPointScaleColumn(colIndex)) {
                    return;
                }

                const questionText = this.getQuestionTextForColumn(questionRow, colIndex, driver, idx);
                const currentScore = this.calculateAverageScore(currentRows, colIndex);
                if (currentScore === null || currentScore === undefined) {
                    return;
                }

                const previousScore = hasPrevious ? this.calculateAverageScore(previousRows, colIndex) : null;
                const shiftValue = this.calculateScoreShift(currentScore, previousScore);

                statements.push({
                    driver,
                    question: questionText,
                    columnIndex: colIndex,
                    currentScore,
                    previousScore,
                    shiftValue
                });
            });
        });

        if (!statements.length) {
            throw new Error(`Unable to calculate Top & Bottom statements for ${questionSet} set. No numeric columns were detected.`);
        }

        const sortedDesc = [...statements].sort((a, b) => b.currentScore - a.currentScore);
        const sortedAsc = [...statements].sort((a, b) => a.currentScore - b.currentScore);

        const topStatements = sortedDesc.slice(0, limit);
        const bottomStatements = sortedAsc.slice(0, limit);

        const yearLabels = {
            current: excelData.currentYearLabel || this.getYearLabel(excelData.current.sheetName, '2025'),
            previous: hasPrevious
                ? (excelData.previousYearLabel || this.getYearLabel(excelData.previous.sheetName, '2024'))
                : null
        };

        return {
            topStatements,
            bottomStatements,
            yearLabels
        };
    }

    static getQuestionColumnMappingsForSet(questionSet) {
        if (questionSet === 'engagement') {
            return {
                'Overall Engagement Index': { columns: [ENGAGEMENT_INDEX_COLUMN], range: 'Column M' },
                'Expectations known': { columns: [CORE_DIMENSION_COLUMNS[0]], range: 'Column N' },
                'Materials & equipment': { columns: [CORE_DIMENSION_COLUMNS[1]], range: 'Column O' },
                'Do what I do best': { columns: [CORE_DIMENSION_COLUMNS[2]], range: 'Column P' },
                'Recognition in the last 7 days': { columns: [CORE_DIMENSION_COLUMNS[3]], range: 'Column Q' },
                'Supervisor cares': { columns: [CORE_DIMENSION_COLUMNS[4]], range: 'Column R' },
                'Development encouraged': { columns: [CORE_DIMENSION_COLUMNS[5]], range: 'Column S' },
                'Opinions count': { columns: [CORE_DIMENSION_COLUMNS[6]], range: 'Column T' },
                'My work is important': { columns: [CORE_DIMENSION_COLUMNS[7]], range: 'Column U' },
                'Co-workers committed to quality': { columns: [CORE_DIMENSION_COLUMNS[8]], range: 'Column V' },
                '6-month progress talk': { columns: [CORE_DIMENSION_COLUMNS[9]], range: 'Column W' },
                'Growth opportunities': { columns: [CORE_DIMENSION_COLUMNS[10]], range: 'Column X' },
                'Manager': { columns: [CORE_DIMENSION_COLUMNS[11]], range: 'Column Y' }
            };
        } else if (questionSet === 'seacom') {
            return {
                'SEACOM Index': { columns: [SEACOM_INDEX_COLUMN], range: 'Column Z' },
                'Communication': { columns: [27, 28, 29], range: 'Columns AB-AD' },
                'Trust': { columns: [31, 32, 33, 34], range: 'Columns AF-AI' },
                'Direct Manager': { columns: [36, 37, 38, 39, 40, 41, 42, 43, 44], range: 'Columns AK-AS' },
                'Brand': { columns: [46, 47, 48, 49], range: 'Columns AU-AX' },
                'Change Management': { columns: [51, 52], range: 'Columns AZ-BA' },
                'Diversity & Inclusion': { columns: [54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68], range: 'Columns BC-BQ' }
            };
        } else {
            throw new Error(`Invalid question set: ${questionSet}. Must be 'engagement' or 'seacom'.`);
        }
    }

    static getQuestionTextForColumn(questionRow = [], colIndex, driver, position = 0) {
        if (!Array.isArray(questionRow) || colIndex >= questionRow.length) {
            return position > 0 ? `${driver} (Q${position + 1})` : driver;
        }

        const rawValue = questionRow[colIndex];
        if (!rawValue || rawValue.toString().trim() === '') {
            return position > 0 ? `${driver} (Q${position + 1})` : driver;
        }

        return rawValue.toString().trim();
    }

    static calculateScoreShift(currentValue, previousValue) {
        if (previousValue === null || previousValue === undefined || Number.isNaN(previousValue)) {
            return null;
        }

        const diff = Math.round(currentValue - previousValue);
        return diff;
    }

    /**
     * Calculate heatmap data with 12 core dimensions + 6 additional dimensions + SEACOM INDEX
     * @param {Object} excelData - Dual-year data structure with current and previous
     * @param {string} breakdownType - Type of breakdown: 'location', 'costCentre', 'department', 'gender', 'race', 'age', 'tenure'
     * @param {Object} options - Optional settings like showShiftIndicators
     * @returns {Array} Row data for heatmap table
     */
    static calculateHeatMapData(excelData, breakdownType, options = {}) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for heatmap');
        }

        const currentData = excelData.current;
        const previousData = excelData.previous;
        const hasPreviousData = Boolean(previousData && previousData.rows && previousData.rows.length);

        const coreColumnIndices = CORE_DIMENSION_COLUMNS;
        const additionalColumnIndices = ADDITIONAL_DIMENSION_COLUMNS;

        // Engagement Index column: Column M (index 12)
        const engagementIndexColumn = ENGAGEMENT_INDEX_COLUMN;
        // Seacom Index column: Column Z (index 25)
        const seacomIndexColumn = SEACOM_INDEX_COLUMN;

        const breakdownColumn = this.getBreakdownColumnIndex(breakdownType);

        // Group data by breakdown category
        const allCurrentRows = this.getResponseRows(currentData.rows || []);
        const allPreviousRows = hasPreviousData ? this.getResponseRows(previousData.rows || []) : [];

        const groupedData = this.groupRowsByColumn(allCurrentRows, breakdownColumn);
        const previousGroupedData = hasPreviousData ? this.groupRowsByColumn(allPreviousRows, breakdownColumn) : {};

        // Calculate overall SEACOM ENGAGEMENT INDEX first (always first row)
        const rowData = [];
        
        // Overall engagement index
        const overallEngagementIndex = this.calculateAverageScore(allCurrentRows, engagementIndexColumn);
        const previousOverallEngagementIndex = hasPreviousData ? this.calculateAverageScore(allPreviousRows, engagementIndexColumn) : null;
        
        // Overall core dimensions
        const overallCoreScores = coreColumnIndices.map(colIdx => 
            this.calculateAverageScore(allCurrentRows, colIdx)
        );
        const previousOverallCoreScores = hasPreviousData ? coreColumnIndices.map(colIdx =>
            this.calculateAverageScore(allPreviousRows, colIdx)
        ) : [];
        
        // Overall additional dimensions
        const overallAdditionalScores = additionalColumnIndices.map(colIdx =>
            this.calculateAverageScore(allCurrentRows, colIdx)
        );
        const previousOverallAdditionalScores = hasPreviousData ? additionalColumnIndices.map(colIdx =>
            this.calculateAverageScore(allPreviousRows, colIdx)
        ) : [];
        
        // Overall SEACOM INDEX (Column Z)
        const overallSeacomIndex = this.calculateAverageScore(allCurrentRows, seacomIndexColumn);
        const previousOverallSeacomIndex = hasPreviousData ? this.calculateAverageScore(allPreviousRows, seacomIndexColumn) : null;
        
        // Build shift data for overall
        let overallShifts = null;
        if (hasPreviousData && options.showShiftIndicators !== false) {
            overallShifts = {
                engagementIndex: {
                    previous: previousOverallEngagementIndex,
                    isSignificant: previousOverallEngagementIndex !== null && Math.abs(overallEngagementIndex - previousOverallEngagementIndex) >= 5
                },
                core: overallCoreScores.map((score, idx) => ({
                    previous: previousOverallCoreScores[idx],
                    isSignificant: previousOverallCoreScores[idx] !== null && Math.abs(score - previousOverallCoreScores[idx]) >= 5
                })),
                additional: overallAdditionalScores.map((score, idx) => ({
                    previous: previousOverallAdditionalScores[idx],
                    isSignificant: previousOverallAdditionalScores[idx] !== null && Math.abs(score - previousOverallAdditionalScores[idx]) >= 5
                })),
                seacomIndex: {
                    previous: previousOverallSeacomIndex,
                    isSignificant: previousOverallSeacomIndex !== null && Math.abs(overallSeacomIndex - previousOverallSeacomIndex) >= 5
                }
            };
        }
        
        // Add overall row first
        rowData.push({
            name: 'SEACOM ENGAGEMENT INDEX',
            sampleSize: allCurrentRows.length,
            engagementIndex: overallEngagementIndex,
            coreScores: overallCoreScores,
            additionalScores: overallAdditionalScores,
            seacomIndex: overallSeacomIndex,
            shifts: overallShifts,
            isOverall: true
        });

        // Calculate scores for each breakdown category
        Object.keys(groupedData).forEach(category => {
            if (!category || category === '') return;

            const currentRows = groupedData[category];
            const previousRows = previousGroupedData[category] || [];

            // Engagement Index
            const engagementIndex = this.calculateAverageScore(currentRows, engagementIndexColumn);
            const previousEngagementIndex = hasPreviousData ? this.calculateAverageScore(previousRows, engagementIndexColumn) : null;

            // Core 12 dimensions
            const coreScores = coreColumnIndices.map(colIdx => 
                this.calculateAverageScore(currentRows, colIdx)
            );
            const previousCoreScores = hasPreviousData ? coreColumnIndices.map(colIdx =>
                this.calculateAverageScore(previousRows, colIdx)
            ) : [];

            // Additional 6 dimensions
            const additionalScores = additionalColumnIndices.map(colIdx =>
                this.calculateAverageScore(currentRows, colIdx)
            );
            const previousAdditionalScores = hasPreviousData ? additionalColumnIndices.map(colIdx =>
                this.calculateAverageScore(previousRows, colIdx)
            ) : [];

            // SEACOM INDEX: Column Z
            const seacomIndex = this.calculateAverageScore(currentRows, seacomIndexColumn);
            const previousSeacomIndex = hasPreviousData ? this.calculateAverageScore(previousRows, seacomIndexColumn) : null;

            // Build shift data if previous year exists
            let shifts = null;
            if (hasPreviousData && options.showShiftIndicators !== false) {
                shifts = {
                    engagementIndex: {
                        previous: previousEngagementIndex,
                        isSignificant: previousEngagementIndex !== null && Math.abs(engagementIndex - previousEngagementIndex) >= SIGNIFICANT_CHANGE_THRESHOLD
                    },
                    core: coreScores.map((score, idx) => ({
                        previous: previousCoreScores[idx],
                        isSignificant: previousCoreScores[idx] !== null && Math.abs(score - previousCoreScores[idx]) >= SIGNIFICANT_CHANGE_THRESHOLD
                    })),
                    additional: additionalScores.map((score, idx) => ({
                        previous: previousAdditionalScores[idx],
                        isSignificant: previousAdditionalScores[idx] !== null && Math.abs(score - previousAdditionalScores[idx]) >= SIGNIFICANT_CHANGE_THRESHOLD
                    })),
                    seacomIndex: {
                        previous: previousSeacomIndex,
                        isSignificant: previousSeacomIndex !== null && Math.abs(seacomIndex - previousSeacomIndex) >= SIGNIFICANT_CHANGE_THRESHOLD
                    }
                };
            }

            rowData.push({
                name: category,
                sampleSize: currentRows.length,
                engagementIndex: engagementIndex,
                coreScores: coreScores,
                additionalScores: additionalScores,
                seacomIndex: seacomIndex,
                shifts: shifts,
                isOverall: false
            });
        });

        return this.sortHeatmapRows(rowData, breakdownType);
    }

    /**
     * Group rows by a specific column value
     * @param {Object} data - Excel data with headers and rows
     * @param {number} columnIndex - Column index to group by
     * @returns {Object} Grouped data keyed by column value
     */
    static groupRowsByColumn(rows, columnIndex) {
        const grouped = {};
        rows.forEach(row => {
            const key = row[columnIndex];
            if (key && key !== '') {
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(row);
            }
        });
        return grouped;
    }

    static sortHeatmapRows(rows, breakdownType) {
        if (!Array.isArray(rows) || rows.length === 0) {
            return rows;
        }

        const overallRows = rows.filter(row => row && row.isOverall);
        const otherRows = rows.filter(row => row && !row.isOverall);

        if (breakdownType === 'age' || breakdownType === 'tenure') {
            otherRows.sort((a, b) => {
                const aValue = this.extractRangeStart(a.name);
                const bValue = this.extractRangeStart(b.name);

                if (aValue === bValue) {
                    return (a.name || '').localeCompare(b.name || '');
                }
                return aValue - bValue;
            });
        } else if (breakdownType === 'race' || breakdownType === 'gender') {
            otherRows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return [...overallRows, ...otherRows];
    }

    static extractRangeStart(label = '') {
        const match = label.match(/\d+/);
        if (match) {
            return parseInt(match[0], 10);
        }

        if (/less|under|below/i.test(label)) {
            return 0;
        }

        return Number.POSITIVE_INFINITY;
    }

    /**
     * Check if a column uses 10-point scale
     * @param {number} columnIndex - Column index to check
     * @returns {boolean} True if column uses 10-point scale
     */
    static isTenPointScaleColumn(columnIndex) {
        return TEN_POINT_SCALE_COLUMNS.includes(columnIndex);
    }

    /**
     * Calculate average score for a specific column across rows
     * @param {Array} rows - Array of data rows
     * @param {number} columnIndex - Column index to calculate average for
     * @returns {number} Average score (rounded to nearest integer)
     */
    static calculateAverageScore(rows, columnIndex) {
        const values = rows
            .map(row => row[columnIndex])
            .filter(val => val !== null && val !== undefined && val !== '' && !isNaN(val))
            .map(val => Number(val));

        if (values.length === 0) return null;

        const sum = values.reduce((acc, val) => acc + val, 0);
        const average = sum / values.length;
        return Math.round(average);
    }

    static calculateAverageForColumns(rows, columnIndices = []) {
        if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(columnIndices) || columnIndices.length === 0) {
            return null;
        }

        const values = [];
        rows.forEach(row => {
            columnIndices.forEach(idx => {
                const value = row[idx];
                if (value !== null && value !== undefined && value !== '' && !isNaN(value)) {
                    values.push(Number(value));
                }
            });
        });

        if (values.length === 0) {
            return null;
        }

        const sum = values.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / values.length);
    }

    static getBreakdownColumnIndex(breakdownType) {
        const breakdownColumnMap = {
            location: 3,     // Column D
            costCentre: 2,   // Column C (UK spelling)
            costCenter: 2,   // Column C (US spelling)
            department: 1,   // Column B
            gender: 4,       // Column E
            race: 5,         // Column F
            age: 6,          // Column G
            tenure: 7        // Column H / LoS Group
        };

        const columnIndex = breakdownColumnMap[breakdownType];
        if (columnIndex === undefined) {
            throw new Error(`Unknown breakdown type: ${breakdownType}`);
        }

        return columnIndex;
    }

    static getRiskColumnIndices(overrides = {}) {
        return {
            overall: Number.isInteger(overrides.overall) ? overrides.overall : RETENTION_OVERALL_COLUMN,
            risk1: Number.isInteger(overrides.risk1) ? overrides.risk1 : RETENTION_RISK1_COLUMN,
            risk2: Number.isInteger(overrides.risk2) ? overrides.risk2 : RETENTION_RISK2_COLUMN
        };
    }

    static getRetentionQuestionTexts(excelData) {
        if (!excelData || !excelData.current || !Array.isArray(excelData.current.headers)) {
            return {
                risk1: 'I intend to look for a job in another company in the near future.',
                risk2: 'At the present time, I am actively searching for another job.'
            };
        }
        const questionRow = excelData.current.headers || [];

        const risk1Text = questionRow[RETENTION_RISK1_COLUMN];
        const risk2Text = questionRow[RETENTION_RISK2_COLUMN];

        const defaults = {
            risk1: 'I intend to look for a job in another company in the near future.',
            risk2: 'At the present time, I am actively searching for another job.'
        };

        return {
            risk1: (risk1Text && risk1Text.toString().trim()) || defaults.risk1,
            risk2: (risk2Text && risk2Text.toString().trim()) || defaults.risk2
        };
    }

    static getEnpsQuestionText(excelData) {
        if (!excelData || !excelData.current || !Array.isArray(excelData.current.headers)) {
            return 'How likely is it that you would recommend SEACOM to a friend or colleague?';
        }
        const questionRow = excelData.current.headers || [];
        const questionText = questionRow[ENPS_COLUMN];
        if (!questionText || !questionText.toString().trim()) {
            return 'How likely is it that you would recommend SEACOM to a friend or colleague?';
        }
        return questionText.toString().trim();
    }

    static calculateEnpsStats(rows = []) {
        if (!Array.isArray(rows) || !rows.length) {
            return {
                totalResponses: 0,
                detractors: 0,
                passives: 0,
                promoters: 0,
                detractorsPct: 0,
                passivesPct: 0,
                promotersPct: 0,
                detractorsPctExact: 0,
                passivesPctExact: 0,
                promotersPctExact: 0,
                enpsScore: 0
            };
        }

        let detractors = 0;
        let passives = 0;
        let promoters = 0;

        rows.forEach(row => {
            const rawValue = row[ENPS_COLUMN];
            if (rawValue === null || rawValue === undefined || rawValue === '') {
                return;
            }
            const score = Number(rawValue);
            if (Number.isNaN(score)) {
                return;
            }
            if (score <= 6) {
                detractors++;
            } else if (score <= 8) {
                passives++;
            } else if (score <= 10) {
                promoters++;
            }
        });

        const total = detractors + passives + promoters;
        if (total === 0) {
            return {
                totalResponses: 0,
                detractors: 0,
                passives: 0,
                promoters: 0,
                detractorsPct: 0,
                passivesPct: 0,
                promotersPct: 0,
                detractorsPctExact: 0,
                passivesPctExact: 0,
                promotersPctExact: 0,
                enpsScore: 0
            };
        }

        // Raw exact percentages (float). These sum to 100 mathematically, but can drift when rounded for display.
        const detractorsPctRaw = (detractors / total) * 100;
        const passivesPctRaw = (passives / total) * 100;
        const promotersPctRaw = (promoters / total) * 100;

        // Display-safe rounding (2 decimals) that always sums to exactly 100.00%
        // We allocate in basis points (0.01%) using the largest remainder method.
        const buckets = [
            { key: 'detractors', count: detractors },
            { key: 'passives', count: passives },
            { key: 'promoters', count: promoters }
        ].map(b => {
            const numerator = b.count * 10000; // basis points
            const floorBp = Math.floor(numerator / total);
            const remainder = numerator % total;
            return { ...b, floorBp, remainder };
        });

        const sumFloorBp = buckets.reduce((acc, b) => acc + b.floorBp, 0);
        let remainingBp = 10000 - sumFloorBp;

        // Distribute remaining basis points to the largest remainders.
        // We only have 3 buckets, but do this generally and deterministically.
        buckets.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < buckets.length && remainingBp > 0; i++) {
            buckets[i].floorBp += 1;
            remainingBp -= 1;
        }

        // Re-map to stable order
        const byKey = new Map(buckets.map(b => [b.key, b.floorBp]));
        const detractorsPctExact = (byKey.get('detractors') || 0) / 100;
        const passivesPctExact = (byKey.get('passives') || 0) / 100;
        const promotersPctExact = (byKey.get('promoters') || 0) / 100;

        // Keep whole-number fields for compatibility (not used for display anymore)
        const detractorsPct = Math.round(detractorsPctRaw);
        const passivesPct = Math.round(passivesPctRaw);
        const promotersPct = 100 - detractorsPct - passivesPct;

        const enpsScore = Math.round(promotersPctRaw - detractorsPctRaw);

        return {
            totalResponses: total,
            detractors,
            passives,
            promoters,
            detractorsPct,
            passivesPct,
            promotersPct,
            detractorsPctExact,
            passivesPctExact,
            promotersPctExact,
            enpsScore
        };
    }

    static calculateEnpsByDimension(excelData, breakdownType) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for eNPS.');
        }

        const questionText = this.getEnpsQuestionText(excelData);
        const currentRows = this.getResponseRows(excelData.current.rows || []);
        if (!currentRows.length) {
            throw new Error('Current year data contains no responses for eNPS.');
        }

        const breakdownColumn = this.getBreakdownColumnIndex(breakdownType);
        const groupedRows = this.groupRowsByColumn(currentRows, breakdownColumn);

        const overallStats = this.calculateEnpsStats(currentRows);
        const detailRows = Object.keys(groupedRows)
            .sort((a, b) => (a || '').localeCompare(b || ''))
            .map(name => {
                const stats = this.calculateEnpsStats(groupedRows[name]);
                return {
                    name,
                    n: stats.totalResponses,
                    detractorsPct: stats.detractorsPct,
                    passivesPct: stats.passivesPct,
                    promotersPct: stats.promotersPct,
                    detractorsPctExact: stats.detractorsPctExact,
                    passivesPctExact: stats.passivesPctExact,
                    promotersPctExact: stats.promotersPctExact,
                    detractors: stats.detractors,
                    passives: stats.passives,
                    promoters: stats.promoters,
                    enpsScore: stats.enpsScore
                };
            })
            .filter(row => row.n > 0);

        const currentYearLabel = excelData.currentYearLabel
            ? this.getYearLabel(excelData.currentYearLabel, '2025')
            : this.getYearLabel(excelData.current.sheetName, '2025');

        return {
            questionText,
            yearLabel: currentYearLabel,
            overall: {
                name: 'SEACOM OVERALL',
                isOverall: true,
                n: overallStats.totalResponses,
                detractorsPct: overallStats.detractorsPct,
                passivesPct: overallStats.passivesPct,
                promotersPct: overallStats.promotersPct,
                detractorsPctExact: overallStats.detractorsPctExact,
                passivesPctExact: overallStats.passivesPctExact,
                promotersPctExact: overallStats.promotersPctExact,
                detractors: overallStats.detractors,
                passives: overallStats.passives,
                promoters: overallStats.promoters,
                enpsScore: overallStats.enpsScore
            },
            rows: detailRows
        };
    }

    /**
     * Format text from Excel cells to preserve line breaks and basic formatting
     * Supports: line breaks (\n), markdown-style bold (**text**), and HTML bold tags
     * @param {string} text - Raw text from Excel cell
     * @returns {string} Formatted HTML string
     */
    static formatCommentText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        // Escape HTML to prevent XSS attacks
        const escapeHtml = (str) => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return str.replace(/[&<>"']/g, m => map[m]);
        };

        // Escape the text first
        let formatted = escapeHtml(text);

        // Convert markdown-style bold (**text**) to HTML bold
        // Use non-greedy matching to handle multiple bold sections
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Convert line breaks to <br> tags
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    static calculateCommentSummaries(excelData) {
        if (!excelData || !excelData.current || !Array.isArray(excelData.current.rows)) {
            throw new Error('Current year data is missing for employee comments.');
        }

        const questionRow = excelData.current.headers || []; // Excel Row 2
        const responseRows = this.getResponseRows(excelData.current.rows);

        return COMMENT_COLUMNS.map((columnIndex, idx) => {
            const rawQuestionText = (questionRow[columnIndex] && questionRow[columnIndex].toString().trim())
                || `Question ${idx + 1}`;
            const questionText = this.formatCommentText(rawQuestionText);

            const rawSummaryText = 'No summary content available for this question.';
            const summaryText = this.formatCommentText(rawSummaryText);

            const responses = responseRows
                .map(row => row[columnIndex])
                .filter(value => value !== null && value !== undefined && value.toString().trim() !== '')
                .map(value => value.toString().trim());

            return {
                question: questionText,
                questionRaw: rawQuestionText, // Keep raw for PPT export
                columnIndex,
                responses,
                responseCount: responses.length,
                summary: summaryText,
                summaryRaw: rawSummaryText // Keep raw for PPT export
            };
        });
    }

    static calculateRetentionRiskByDimension(excelData, breakdownType, options = {}) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for retention risk.');
        }

        const currentDataset = excelData.current;
        const currentRows = this.getResponseRows(currentDataset.rows || []);
        if (!currentRows.length) {
            throw new Error('Current year data contains no responses for retention risk.');
        }

        const breakdownColumn = this.getBreakdownColumnIndex(breakdownType);
        const columnIndices = this.getRiskColumnIndices(options.columnOverrides);

        const groupedRows = this.groupRowsByColumn(currentRows, breakdownColumn);
        const buildRow = (name, rowsForGroup) => {
            if (!rowsForGroup || !rowsForGroup.length) {
                return null;
            }

            const stats = this.calculateRetentionRisk(rowsForGroup, columnIndices);
            return {
                name,
                n: stats.totalResponses,
                overall: stats.overall,
                risk1: stats.risk1,
                risk2: stats.risk2,
                isOverall: name === 'SEACOM OVERALL'
            };
        };

        const rows = [];
        const overallRow = buildRow('SEACOM OVERALL', currentRows);
        if (overallRow) {
            rows.push(overallRow);
        }

        Object.keys(groupedRows)
            .sort((a, b) => (a || '').localeCompare(b || ''))
            .forEach(category => {
                const row = buildRow(category, groupedRows[category]);
                if (row) {
                    rows.push(row);
                }
            });

        if (!rows.length) {
            throw new Error(`Unable to calculate retention risk for ${breakdownType}.`);
        }

        return rows;
    }

    /**
     * Calculate Seacom Index dimension data with statements for horizontal bar charts
     * Returns one entry per dimension with dimension name, statements, and scores
     * @param {Object} excelData - Parsed Excel data
     * @returns {Array} Array of dimension data objects
     */
    static calculateSeacomDimensionStatements(excelData) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for Seacom dimension statements.');
        }

        const currentRows = this.getResponseRows(excelData.current.rows || []);
        if (!currentRows.length) {
            throw new Error('Current year data contains no responses for Seacom dimensions.');
        }

        const previousRows = excelData.previous && excelData.previous.rows
            ? this.getResponseRows(excelData.previous.rows)
            : null;
        const hasPrevious = Boolean(previousRows && previousRows.length);

        const questionRow = excelData.current.headers || [];
        const seacomMappings = {
            'Communication': { columns: [27, 28, 29] },
            'Trust': { columns: [31, 32, 33, 34] },
            'Direct Manager': { columns: [36, 37, 38, 39, 40, 41, 42, 43, 44] },
            'Brand': { columns: [46, 47, 48, 49] },
            'Change Management': { columns: [51, 52] },
            'Diversity & Inclusion': { columns: [54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68] }
        };

        const dimensions = [];

        Object.entries(seacomMappings).forEach(([dimensionName, config]) => {
            const statements = [];
            
            config.columns.forEach((colIndex) => {
                // Skip 10-point scale questions - they will be handled separately
                if (this.isTenPointScaleColumn(colIndex)) {
                    return;
                }

                const questionText = this.getQuestionTextForColumn(questionRow, colIndex, dimensionName, statements.length);
                const currentScore = this.calculateAverageScore(currentRows, colIndex);
                
                if (currentScore === null || currentScore === undefined) {
                    return;
                }

                const previousScore = hasPrevious ? this.calculateAverageScore(previousRows, colIndex) : null;

                statements.push({
                    text: questionText,
                    columnIndex: colIndex,
                    currentScore: Math.round(currentScore),
                    previousScore: previousScore !== null ? Math.round(previousScore) : null
                });
            });

            if (statements.length > 0) {
                dimensions.push({
                    name: dimensionName,
                    statements: statements
                });
            }
        });

        const yearLabels = {
            current: excelData.currentYearLabel || this.getYearLabel(excelData.current.sheetName, '2025'),
            previous: hasPrevious
                ? (excelData.previousYearLabel || this.getYearLabel(excelData.previous.sheetName, '2024'))
                : null
        };

        return {
            dimensions,
            yearLabels
        };
    }

    /**
     * Calculate distribution for 10-point scale questions
     * Returns percentage of responses for each rating (0-10)
     * @param {Object} excelData - Parsed Excel data
     * @returns {Array} Array of question distribution data
     */
    static calculateTenPointScaleDistribution(excelData) {
        if (!excelData || !excelData.current) {
            throw new Error('Current year data is missing for 10-point scale distribution.');
        }

        const currentRows = this.getResponseRows(excelData.current.rows || []);
        if (!currentRows.length) {
            throw new Error('Current year data contains no responses for 10-point scale questions.');
        }

        const previousRows = excelData.previous && excelData.previous.rows
            ? this.getResponseRows(excelData.previous.rows)
            : null;
        const hasPrevious = Boolean(previousRows && previousRows.length);

        const questionRow = excelData.current.headers || [];
        const distributions = [];

        TEN_POINT_SCALE_COLUMNS.forEach((colIndex) => {
            const questionText = this.getQuestionTextForColumn(questionRow, colIndex, 'Diversity & Inclusion', 0);
            
            // Calculate distribution for current year
            const currentDistribution = this.calculateRatingDistribution(currentRows, colIndex, 0, 10);
            
            // Calculate distribution for previous year if available
            const previousDistribution = hasPrevious 
                ? this.calculateRatingDistribution(previousRows, colIndex, 0, 10)
                : null;

            distributions.push({
                questionText,
                columnIndex: colIndex,
                currentDistribution,
                previousDistribution
            });
        });

        const yearLabels = {
            current: excelData.currentYearLabel || this.getYearLabel(excelData.current.sheetName, '2025'),
            previous: hasPrevious
                ? (excelData.previousYearLabel || this.getYearLabel(excelData.previous.sheetName, '2024'))
                : null
        };

        return {
            distributions,
            yearLabels
        };
    }

    /**
     * Calculate rating distribution for a column
     * @param {Array} rows - Response rows
     * @param {number} columnIndex - Column index
     * @param {number} minRating - Minimum rating (default 0)
     * @param {number} maxRating - Maximum rating (default 10)
     * @returns {Array} Array of {rating, count, percentage} objects
     */
    static calculateRatingDistribution(rows, columnIndex, minRating = 0, maxRating = 10) {
        const ratingCounts = {};
        let totalResponses = 0;

        // Initialize counts for all ratings
        for (let i = minRating; i <= maxRating; i++) {
            ratingCounts[i] = 0;
        }

        // Count responses
        rows.forEach(row => {
            const value = row[columnIndex];
            if (value !== null && value !== undefined && value !== '' && !isNaN(value)) {
                const rating = Math.round(Number(value));
                if (rating >= minRating && rating <= maxRating) {
                    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
                    totalResponses++;
                }
            }
        });

        // Convert to array with percentages
        const distribution = [];
        for (let i = minRating; i <= maxRating; i++) {
            const count = ratingCounts[i] || 0;
            const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
            distribution.push({
                rating: i,
                count: count,
                percentage: percentage
            });
        }

        return {
            distribution,
            totalResponses
        };
    }
}


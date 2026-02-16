/**
 * Helper: wrap a label into multiple lines based on canvas text width
 * @param {string|string[]} label - original label
 * @param {CanvasRenderingContext2D} ctx - chart canvas context
 * @param {number} maxWidth - max width per line in pixels
 * @returns {string[]} array of lines
 */
function wrapLabelByWidth(label, ctx, maxWidth) {
    // If it's already an array, just return as-is
    if (Array.isArray(label)) return label;

    const text = String(label || '');
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine.trim().length > 0) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Horizontal bar chart slide for Seacom Index dimensions
 * Displays dimension name and statements with horizontal bars showing percentages
 */
class HorizontalBarChartSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'dimensionName', 'statements']);
        this.chartInstance = null;
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-chart horizontal-barchart-slide'
        );

        this.canvasId = `horizontal-chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const body = this.createBody();
        contentArea.appendChild(body);

        requestAnimationFrame(() => {
            setTimeout(() => {
                const canvas = document.getElementById(this.canvasId);
                if (canvas) {
                    this.initHorizontalBarChart(canvas);
                }
            }, 50);
        });

        return slide;
    }

    createBody() {
        const body = document.createElement('div');
        body.className = 'horizontal-barchart-content';

        const chartContainer = document.createElement('div');
        chartContainer.className = 'horizontal-chart-container';

        const canvas = document.createElement('canvas');
        canvas.className = 'horizontal-chart-canvas';
        canvas.id = this.canvasId;

        chartContainer.appendChild(canvas);
        body.appendChild(chartContainer);

        if (this.data.yearLabels && this.data.yearLabels.previous) {
            const legend = this.createLegend();
            body.appendChild(legend);
        }

        return body;
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';

        const legendHTML = `
            <div class="chart-legend-item">
                <div class="chart-legend-color blue"></div>
                <span>${this.data.yearLabels.current || 'Current Year'}</span>
            </div>
            <div class="chart-legend-item">
                <div class="chart-legend-color black"></div>
                <span>${this.data.yearLabels.previous || 'Previous Year'}</span>
            </div>
        `;

        legend.innerHTML = legendHTML;
        return legend;
    }

    initHorizontalBarChart(canvas) {
        const ctx = canvas.getContext('2d');

        if (window.ChartDataLabels) {
            Chart.register(ChartDataLabels);
        }

        const statements = this.data.statements || [];
        const hasPreviousData = statements.some(s => s.previousScore !== null);

        // Original full text labels (for tooltips, exports, etc.)
        const rawLabels = statements.map(stmt => stmt.text);

        // IMPORTANT: match the tick font so measureText is accurate
        ctx.font = '400 12px Poppins';

        // Max width for each line (must be <= ticks.maxWidth)
        const MAX_LABEL_LINE_WIDTH = 360; // px, safe within ticks.maxWidth = 380

        // Wrapped labels: arrays of lines for long questions
        const labels = rawLabels.map(label =>
            wrapLabelByWidth(label, ctx, MAX_LABEL_LINE_WIDTH)
        );

        const barThickness = this.calculateBarThickness(statements.length);

        // IMPORTANT: color used to fake the 1px gap
        const chartBgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';

        const currentScores = statements.map(s => s.currentScore);
        const previousScores = hasPreviousData ? statements.map(s => s.previousScore || null) : null;

        const datasets = [
            {
                label: this.data.yearLabels?.current || 'Current Year',
                data: currentScores,
                backgroundColor: ColorMapper.COLORS.chart.primary,
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: 2, left: 0, right: 0 }, // gap on the bottom
                barThickness: barThickness,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 11,
                        family: 'Poppins',
                        weight: 600
                    },
                    formatter: (value) => value !== null ? value + '%' : ''
                }
            }
        ];

        if (hasPreviousData && previousScores) {
            datasets.push({
                label: this.data.yearLabels?.previous || 'Previous Year',
                data: previousScores,
                backgroundColor: ColorMapper.COLORS.chart.secondary,
                borderColor: chartBgColor,
                borderWidth: { top: 2, bottom: 0, left: 0, right: 0 }, // gap on the top
                barThickness: barThickness,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 11,
                        family: 'Poppins',
                        weight: 600
                    },
                    formatter: (value) => value !== null ? value + '%' : ''
                }
            });
        }

        const config = {
            type: 'bar',
            data: {
                labels: labels, // wrapped, multi-line labels
                datasets: datasets
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 13, family: 'Poppins', weight: 600 },
                        bodyFont: { size: 12, family: 'Poppins' },
                        padding: 12,
                        callbacks: {
                            title: function(tooltipItems) {
                                const dataIndex = tooltipItems[0].dataIndex;
                                // Use the full original question text in tooltip
                                return rawLabels[dataIndex];
                            },
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.x + '%';
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 5,
                        right: 5
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                family: 'Poppins',
                                size: 12
                            },
                            stepSize: 20
                        },
                        grid: {
                            color: ColorMapper.COLORS.chart.grid || '#e5e7eb'
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                family: 'Poppins',
                                size: 12,
                                weight: 400
                            },
                            padding: 12,
                            maxWidth: 380,
                            // Let Chart.js use the label (string or array) as-is
                            callback: function(value) {
                                return this.getLabelForValue(value);
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        this.chartInstance = new Chart(ctx, config);
    }

    /**
     * Calculate bar thickness based on number of statements
     * More statements = thinner bars, fewer statements = thicker bars
     * @param {number} statementCount - Number of statements
     * @returns {number} Bar thickness in pixels
     */
    calculateBarThickness(statementCount) {
        if (statementCount <= 2) {
            return 35;
        } else if (statementCount <= 4) {
            return 30;
        } else if (statementCount <= 6) {
            return 25;
        } else if (statementCount <= 9) {
            return 20;
        } else if (statementCount <= 12) {
            return 18;
        } else {
            return 15;
        }
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

SlideFactory.register('horizontal-barchart', HorizontalBarChartSlide);

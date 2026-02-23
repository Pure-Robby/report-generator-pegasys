/**
 * Helper: wrap a label into multiple lines based on canvas text width
 */
function wrapLabelByWidth(label, ctx, maxWidth) {
    if (Array.isArray(label)) return label;

    const text = String(label || '');
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine.trim().length > 0) lines.push(currentLine);
    return lines;
}

/**
 * Horizontal bar chart slide for dimension statement breakdowns.
 * Supports N data series via `scores` map on each statement and `yearLabels` array.
 * Falls back to legacy `currentScore`/`previousScore` when `scores` is absent.
 * The first statement may be flagged `isDimensionAggregate: true` and gets a visual separator.
 */
class HorizontalBarChartSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'dimensionName', 'statements']);
        this.chartInstance = null;
    }

    static DEFAULT_COLORS = ['#FFB800', '#FA6401', '#333333', '#999999', '#6366f1', '#10b981'];

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
                if (canvas) this.initHorizontalBarChart(canvas);
            }, 50);
        });

        return slide;
    }

    getYearLabels() {
        const yl = this.data.yearLabels;
        if (Array.isArray(yl)) return yl;
        if (yl && typeof yl === 'object') {
            var labels = [yl.current];
            if (yl.previous) labels.push(yl.previous);
            return labels;
        }
        return ['Current'];
    }

    getSeriesColors() {
        return this.data.seriesColors || HorizontalBarChartSlide.DEFAULT_COLORS;
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

        const yearLabels = this.getYearLabels();
        if (yearLabels.length > 1) {
            body.appendChild(this.createLegend());
        }

        return body;
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';

        const yearLabels = this.getYearLabels();
        const colors = this.getSeriesColors();

        legend.innerHTML = yearLabels.map((label, i) =>
            `<div class="chart-legend-item">
                <div class="chart-legend-color" style="background:${colors[i % colors.length]}"></div>
                <span>${label}</span>
            </div>`
        ).join('');

        return legend;
    }

    initHorizontalBarChart(canvas) {
        const ctx = canvas.getContext('2d');

        if (window.ChartDataLabels) {
            Chart.register(ChartDataLabels);
        }

        const fontFamily = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-font-family').trim()
            || 'sans-serif';

        const statements = this.data.statements || [];
        const yearLabels = this.getYearLabels();
        const colors = this.getSeriesColors();
        const usesScoresMap = statements.length > 0 && statements[0].scores;

        const rawLabels = statements.map(s => s.isDimensionAggregate ? ('● ' + s.text) : s.text);

        ctx.font = `400 12px ${fontFamily}`;
        const MAX_LABEL_LINE_WIDTH = 360;
        const labels = rawLabels.map(label => wrapLabelByWidth(label, ctx, MAX_LABEL_LINE_WIDTH));

        const barThickness = this.calculateBarThickness(statements.length, yearLabels.length);
        const chartBgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';

        var datasets;
        if (usesScoresMap) {
            datasets = yearLabels.map(function (year, i) {
                var isFirst = i === 0;
                var isLast = i === yearLabels.length - 1;
                return {
                    label: year,
                    data: statements.map(function (s) { return s.scores[year] !== undefined ? s.scores[year] : null; }),
                    backgroundColor: colors[i % colors.length],
                    borderColor: chartBgColor,
                    borderWidth: { top: isFirst ? 0 : 1, bottom: isLast ? 0 : 1, left: 0, right: 0 },
                    barThickness: barThickness,
                    datalabels: {
                        align: 'end',
                        anchor: 'end',
                        color: '#1e293b',
                        font: { size: 11, family: fontFamily, weight: 600 },
                        formatter: function (value) { return value !== null ? value + '%' : ''; }
                    }
                };
            });
        } else {
            var hasPrevious = statements.some(function (s) { return s.previousScore !== null; });
            datasets = [{
                label: yearLabels[0] || 'Current Year',
                data: statements.map(function (s) { return s.currentScore; }),
                backgroundColor: colors[0],
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: hasPrevious ? 1 : 0, left: 0, right: 0 },
                barThickness: barThickness,
                datalabels: {
                    align: 'end', anchor: 'end', color: '#1e293b',
                    font: { size: 11, family: fontFamily, weight: 600 },
                    formatter: function (value) { return value !== null ? value + '%' : ''; }
                }
            }];
            if (hasPrevious) {
                datasets.push({
                    label: yearLabels[1] || 'Previous Year',
                    data: statements.map(function (s) { return s.previousScore || null; }),
                    backgroundColor: colors[1 % colors.length],
                    borderColor: chartBgColor,
                    borderWidth: { top: 1, bottom: 0, left: 0, right: 0 },
                    barThickness: barThickness,
                    datalabels: {
                        align: 'end', anchor: 'end', color: '#1e293b',
                        font: { size: 11, family: fontFamily, weight: 600 },
                        formatter: function (value) { return value !== null ? value + '%' : ''; }
                    }
                });
            }
        }

        var aggregateIndex = -1;
        statements.forEach(function (s, i) {
            if (s.isDimensionAggregate) aggregateIndex = i;
        });

        var config = {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 13, family: fontFamily, weight: 600 },
                        bodyFont: { size: 12, family: fontFamily },
                        padding: 12,
                        callbacks: {
                            title: function (tooltipItems) {
                                return rawLabels[tooltipItems[0].dataIndex];
                            },
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.x + '%';
                            }
                        }
                    }
                },
                layout: { padding: { left: 5, right: 5 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function (value) { return value + '%'; },
                            font: { family: fontFamily, size: 12 },
                            stepSize: 20
                        },
                        grid: { color: ColorMapper.COLORS.chart.grid || '#e5e7eb' }
                    },
                    y: {
                        ticks: {
                            font: function (context) {
                                var idx = context.index;
                                if (idx === aggregateIndex) {
                                    return { family: fontFamily, size: 12, weight: 700 };
                                }
                                return { family: fontFamily, size: 12, weight: 400 };
                            },
                            padding: 12,
                            maxWidth: 380,
                            callback: function (value) {
                                return this.getLabelForValue(value);
                            }
                        },
                        grid: {
                            display: true,
                            drawTicks: false,
                            color: function (context) {
                                if (aggregateIndex >= 0 && context.index === aggregateIndex) {
                                    return 'rgba(0,0,0,0.25)';
                                }
                                return 'transparent';
                            }
                        }
                    }
                }
            }
        };

        this.chartInstance = new Chart(ctx, config);
    }

    calculateBarThickness(statementCount, seriesCount) {
        var base;
        if (statementCount <= 2) base = 35;
        else if (statementCount <= 4) base = 30;
        else if (statementCount <= 6) base = 25;
        else if (statementCount <= 9) base = 20;
        else if (statementCount <= 12) base = 18;
        else base = 15;
        if (seriesCount > 2) return Math.max(8, Math.round(base * 0.6));
        return base;
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

SlideFactory.register('horizontal-barchart', HorizontalBarChartSlide);

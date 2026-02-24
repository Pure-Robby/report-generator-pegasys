/**
 * Bar chart slide for engagement index scores.
 * Supports N data series via a `series` array, or legacy `current`/`previous` props.
 * Series colors are sourced from `data.seriesColors` (theme) with hardcoded fallbacks.
 */
class BarChartSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'categories']);
        this.chartInstance = null;
    }

    static DEFAULT_COLORS = ['#FFB800', '#FA6401', '#333333', '#999999', '#6366f1', '#10b981'];

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-chart barchart-slide'
        );

        const body = this.createBody();

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';

        const canvas = document.createElement('canvas');
        canvas.className = 'chart-canvas';
        canvas.id = `chart-${Date.now()}`;

        chartContainer.appendChild(canvas);
        body.appendChild(chartContainer);

        if (this.options.showLegend !== false) {
            body.appendChild(this.createLegend());
        }

        contentArea.appendChild(body);

        setTimeout(() => this.initChart(canvas), 100);

        return slide;
    }

    getNormalizedSeries() {
        if (this.data.series && this.data.series.length) {
            return this.data.series;
        }
        const series = [{ label: this.data.currentLabel || 'Current Year', scores: this.data.current }];
        if (this.data.previous && this.data.previous.length) {
            series.push({ label: this.data.previousLabel || 'Previous Year', scores: this.data.previous });
        }
        return series;
    }

    getSeriesColors() {
        return this.data.seriesColors || BarChartSlide.DEFAULT_COLORS;
    }

    initChart(canvas) {
        const ctx = canvas.getContext('2d');

        if (window.ChartDataLabels) {
            Chart.register(ChartDataLabels);
        }

        const fontFamily = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-font-family').trim() || 'sans-serif';

        const labels = this.data.categories.map(label =>
            typeof label === 'string' ? label.split('\n') : label
        );

        const series = this.getNormalizedSeries();
        const colors = this.getSeriesColors();
        const barThickness = this.calculateBarThickness(labels.length, series.length);
        const chartBgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';

        const datasets = series.map((s, i) => {
            const isFirst = i === 0;
            const isLast = i === series.length - 1;
            return {
                label: s.label,
                data: s.scores,
                backgroundColor: colors[i % colors.length],
                borderColor: chartBgColor,
                borderWidth: {
                    top: 0,
                    bottom: 0,
                    left: isFirst ? 0 : 1,
                    right: isLast ? 0 : 1
                },
                barThickness: barThickness,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#1e293b',
                    font: { size: 10, family: fontFamily, weight: 600 },
                    formatter: (value) => value !== null ? value + '%' : ''
                }
            };
        });

        const config = {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, family: fontFamily },
                        bodyFont: { size: 13, family: fontFamily },
                        padding: 12,
                        callbacks: {
                            title: function (tooltipItems) {
                                const originalLabel = labels[tooltipItems[0].dataIndex];
                                return Array.isArray(originalLabel) ? originalLabel.join(' ') : originalLabel;
                            },
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                layout: { padding: { top: 25 } },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%',
                            font: { family: fontFamily, size: 12 }
                        },
                        grid: { color: ColorMapper.COLORS.chart.grid }
                    },
                    x: {
                        ticks: {
                            font: { family: fontFamily, size: 12 },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            padding: 8,
                            maxWidth: 100
                        },
                        grid: { display: false }
                    }
                }
            }
        };

        this.chartInstance = new Chart(ctx, config);
    }

    calculateBarThickness(categoryCount, seriesCount) {
        const base = categoryCount <= 5 ? 40 : categoryCount <= 8 ? 35 : categoryCount <= 12 ? 30 : categoryCount <= 15 ? 25 : 20;
        if (seriesCount > 2) return Math.max(12, Math.round(base * 0.7));
        return base;
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';

        const series = this.getNormalizedSeries();
        const colors = this.getSeriesColors();

        legend.innerHTML = series.map((s, i) =>
            `<div class="chart-legend-item">
                <div class="chart-legend-color" style="background:${colors[i % colors.length]}"></div>
                <span>${s.label}</span>
            </div>`
        ).join('');

        return legend;
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

SlideFactory.register('barchart', BarChartSlide);

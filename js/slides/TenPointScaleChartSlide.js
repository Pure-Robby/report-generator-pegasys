/**
 * Ten Point Scale Chart Slide
 * Displays distribution of responses for 10-point scale questions (0-10)
 * Shows question text at top (left-aligned) and vertical bar chart with distribution
 */
class TenPointScaleChartSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['questionText', 'distribution']);
        this.chartInstance = null;
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title || 'Diversity & Inclusion - Statement Scores',
            pageNumber,
            'slide-chart ten-point-scale-chart-slide'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        requestAnimationFrame(() => {
            setTimeout(() => {
                const canvas = document.getElementById(this.canvasId);
                if (canvas) {
                    this.initChart(canvas);
                }
            }, 50);
        });

        return slide;
    }

    createBody() {
        const body = document.createElement('div');
        body.className = 'ten-point-scale-content';

        // Question text at top, left-aligned
        const questionContainer = document.createElement('div');
        questionContainer.className = 'ten-point-question-text';
        questionContainer.style.textAlign = 'left';
        questionContainer.style.marginBottom = '20px';
        questionContainer.style.fontSize = '18px';
        questionContainer.style.fontWeight = '600';
        questionContainer.style.color = '#1e293b';
        questionContainer.textContent = this.data.questionText;
        body.appendChild(questionContainer);

        // Chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'ten-point-chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.height = '450px';

        this.canvasId = `ten-point-chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const canvas = document.createElement('canvas');
        canvas.className = 'ten-point-chart-canvas';
        canvas.id = this.canvasId;

        chartContainer.appendChild(canvas);
        body.appendChild(chartContainer);

        // Legend if previous year data exists
        if (this.data.previousDistribution) {
            const legend = this.createLegend();
            body.appendChild(legend);
        }

        return body;
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        legend.style.marginTop = '15px';
        legend.style.display = 'flex';
        legend.style.justifyContent = 'center';
        legend.style.gap = '20px';

        const legendHTML = `
            <div class="chart-legend-item">
                <div class="chart-legend-color blue"></div>
                <span>${this.data.yearLabels?.current || 'Current Year'}</span>
            </div>
            <div class="chart-legend-item">
                <div class="chart-legend-color black"></div>
                <span>${this.data.yearLabels?.previous || 'Previous Year'}</span>
            </div>
        `;

        legend.innerHTML = legendHTML;
        return legend;
    }

    initChart(canvas) {
        const ctx = canvas.getContext('2d');

        if (window.ChartDataLabels) {
            Chart.register(ChartDataLabels);
        }

        const fontFamily = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-font-family').trim() || 'sans-serif';

        const currentDist = this.data.distribution.distribution || [];
        const previousDist = this.data.previousDistribution?.distribution || [];
        const hasPrevious = previousDist.length > 0;

        // Create labels for x-axis (0-10 with special labels for 0, 5, 10)
        const labels = [];
        const xAxisLabels = [];
        for (let i = 0; i <= 10; i++) {
            labels.push(i);
            if (i === 0) {
                xAxisLabels.push('0\n(Not Included)');
            } else if (i === 5) {
                xAxisLabels.push('5\n(Neutral)');
            } else if (i === 10) {
                xAxisLabels.push('10\n(Included)');
            } else {
                xAxisLabels.push(i.toString());
            }
        }

        // Extract percentages for each rating
        const currentPercentages = labels.map(rating => {
            const item = currentDist.find(d => d.rating === rating);
            return item ? item.percentage : 0;
        });

        const previousPercentages = hasPrevious ? labels.map(rating => {
            const item = previousDist.find(d => d.rating === rating);
            return item ? item.percentage : 0;
        }) : null;

        // Calculate max percentage from all data points
        const allPercentages = [...currentPercentages];
        if (hasPrevious && previousPercentages) {
            allPercentages.push(...previousPercentages);
        }
        const maxPercentage = Math.max(...allPercentages, 0);
        
        // Round up to next 5% interval, then add one more 5% interval for extra tick
        // e.g., 24% -> 25% -> 30%, 52% -> 55% -> 60%
        const roundedMax = Math.ceil(maxPercentage / 5) * 5;
        const yAxisMax = roundedMax + 5;
        // Ensure minimum of 25% for better visualization (20% + one extra tick)
        const finalYAxisMax = Math.max(yAxisMax, 25);

        const chartBgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';

        const datasets = [
            {
                label: this.data.yearLabels?.current || 'Current Year',
                data: currentPercentages,
                backgroundColor: ColorMapper.COLORS.chart.primary,
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: 0, left: 0, right: 2 },
                barThickness: 30,
                datalabels: {
                    align: 'top',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 11,
                        family: fontFamily,
                        weight: 600
                    },
                    formatter: (value) => value > 0 ? value + '%' : ''
                }
            }
        ];

        if (hasPrevious && previousPercentages) {
            datasets.push({
                label: this.data.yearLabels?.previous || 'Previous Year',
                data: previousPercentages,
                backgroundColor: ColorMapper.COLORS.chart.secondary,
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: 0, left: 2, right: 0 },
                barThickness: 30,
                datalabels: {
                    align: 'top',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 11,
                        family: fontFamily,
                        weight: 600
                    },
                    formatter: (value) => value > 0 ? value + '%' : ''
                }
            });
        }

        const config = {
            type: 'bar',
            data: {
                labels: xAxisLabels,
                datasets: datasets
            },
            options: {
                indexAxis: 'x',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 13, family: fontFamily, weight: 600 },
                        bodyFont: { size: 12, family: fontFamily },
                        padding: 12,
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Rating: ${tooltipItems[0].label.replace(/\n.*/, '')}`;
                            },
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y + '%';
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
                    y: {
                        beginAtZero: true,
                        max: finalYAxisMax,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                family: fontFamily,
                                size: 12
                            },
                            stepSize: 5
                        },
                        grid: {
                            color: ColorMapper.COLORS.chart.grid || '#e5e7eb'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: fontFamily,
                                size: 12,
                                weight: 400
                            },
                            padding: 8
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

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

SlideFactory.register('ten-point-scale-chart', TenPointScaleChartSlide);


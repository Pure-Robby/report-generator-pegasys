/**
 * Bar chart slide for engagement index scores
 * Displays comparison of current vs previous year scores
 */
class BarChartSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        // Previous year data is optional
        this.validateData(['title', 'categories', 'current']);
        this.chartInstance = null;
    }

    render() {
        // Use standard layout
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title, 
            pageNumber, 
            'slide-chart barchart-slide'
        );
        
        const body = this.createBody();
        
        // Create canvas for chart
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-canvas';
        canvas.id = `chart-${Date.now()}`;
        
        chartContainer.appendChild(canvas);
        body.appendChild(chartContainer);
        
        // Add legend
        if (this.options.showLegend !== false) {
            const legend = this.createLegend();
            body.appendChild(legend);
        }
        
        contentArea.appendChild(body);
        
        // Initialize chart after DOM insertion
        setTimeout(() => this.initChart(canvas), 100);
        
        return slide;
    }

    initChart(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Register datalabels plugin if available
        if (window.ChartDataLabels) {
            Chart.register(ChartDataLabels);
        }
        
        // Prepare data - convert \n to arrays for multi-line labels
        const labels = this.data.categories.map(label => 
            typeof label === 'string' ? label.split('\n') : label
        );
        const currentData = this.data.current;
        const previousData = this.data.previous;
        const hasPreviousData = previousData && previousData.length > 0;
        
        const barThickness = this.calculateBarThickness(labels.length);

        // IMPORTANT: color used to fake the 1px gap
        // If you have a specific chart background color, use that instead of '#ffffff'
        const chartBgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';
        
        // Build datasets array - only include previous if available
        const datasets = [
            {
                label: this.data.currentLabel || 'Current Year',
                data: currentData,
                backgroundColor: ColorMapper.COLORS.chart.primary,
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: 0, left: 0, right: 2 }, // gap on the right
                barThickness: barThickness,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 10,
                        family: 'Poppins',
                        weight: 600
                    },
                    formatter: (value) => value + '%'
                }
            }
        ];
        
        if (hasPreviousData) {
            datasets.push({
                label: this.data.previousLabel || 'Previous Year',
                data: previousData,
                backgroundColor: ColorMapper.COLORS.chart.secondary,
                borderColor: chartBgColor,
                borderWidth: { top: 0, bottom: 0, left: 2, right: 0 }, // gap on the left
                barThickness: barThickness,
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    color: '#1e293b',
                    font: {
                        size: 10,
                        family: 'Poppins',
                        weight: 600
                    },
                    formatter: (value) => value + '%'
                }
            });
        }
        
        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, family: 'Poppins' },
                        bodyFont: { size: 13, family: 'Poppins' },
                        padding: 12,
                        callbacks: {
                            title: function(tooltipItems) {
                                // Get the label and convert array to string with spaces
                                const dataIndex = tooltipItems[0].dataIndex;
                                const originalLabel = labels[dataIndex];
                                if (Array.isArray(originalLabel)) {
                                    return originalLabel.join(' ');
                                }
                                return originalLabel;
                            },
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 25 // Space for value labels on top
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                family: 'Poppins',
                                size: 11
                            }
                        },
                        grid: {
                            color: ColorMapper.COLORS.chart.grid
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Poppins',
                                size: 11
                            },
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: false,
                            padding: 8,
                            maxWidth: 100
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
     * Calculate bar thickness based on number of categories
     * More categories = thinner bars, fewer categories = thicker bars
     * @param {number} categoryCount - Number of categories
     * @returns {number} Bar thickness in pixels
     */
    calculateBarThickness(categoryCount) {
        if (categoryCount <= 5) {
            return 40;
        } else if (categoryCount <= 8) {
            return 35;
        } else if (categoryCount <= 12) {
            return 30;
        } else if (categoryCount <= 15) {
            return 25;
        } else {
            return 20;
        }
    }

    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        
        const hasPreviousData = this.data.previous && this.data.previous.length > 0;
        
        let legendHTML = `
            <div class="chart-legend-item">
                <div class="chart-legend-color blue"></div>
                <span>${this.data.currentLabel || '2024 Scores'}</span>
            </div>
        `;
        
        if (hasPreviousData) {
            legendHTML += `
                <div class="chart-legend-item">
                    <div class="chart-legend-color black"></div>
                    <span>${this.data.previousLabel || '2023 Scores'}</span>
                </div>
            `;
        }
        
        legend.innerHTML = legendHTML;
        return legend;
    }

    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

// Register slide type
SlideFactory.register('barchart', BarChartSlide);


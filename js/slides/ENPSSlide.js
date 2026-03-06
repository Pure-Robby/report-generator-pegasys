class ENPSSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'questionText', 'chartData', 'rows']);
        this.chartId = `enps-chart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-chart enps-slide'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        const description = document.createElement('p');
        description.classList = 'enps-description w-100 mb-0';
        description.textContent = this.data.questionText;
        body.appendChild(description);

        const chartContainer = document.createElement('div');
        chartContainer.className = 'enps-chart-container';
        const canvas = document.createElement('canvas');
        canvas.id = this.chartId;
        chartContainer.appendChild(canvas);
        body.appendChild(chartContainer);

        const table = this.createTable();
        body.appendChild(table);

        requestAnimationFrame(() => this.initChart());

        return slide;
    }

    createTable() {
        const table = document.createElement('table');
        table.className = 'enps-table striped';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const headers = [
            '',
            'n',
            'eNPS',
            { icon: 'assets/detractor-icon.png', alt: 'Detractors' },
            { icon: 'assets/passive-icon.png', alt: 'Passives' },
            { icon: 'assets/promoter-icon.png', alt: 'Promoters' }
        ];

        headers.forEach((header, index) => {
            const th = document.createElement('th');
            if (typeof header === 'string') {
                th.textContent = header;
            } else {
                const img = document.createElement('img');
                img.src = header.icon;
                img.alt = header.alt;
                th.appendChild(img);
                th.classList = 'enps-icon-header bg-white';
            }

            if (index === 1 || index === 2) {
                th.classList.add('enps-header-metric');
            }
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        this.data.rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            if (row.isOverall && index === 0) {
                tr.classList.add('enps-overall-row');
            }
            const isInsufficientSample = Boolean(row && !row.isOverall && Number(row.n) < 3);

            const nameCell = document.createElement('th');
            nameCell.classList.add('text-start');
            nameCell.textContent = row.name || 'Unknown';
            tr.appendChild(nameCell);

            const nCell = document.createElement('td');
            nCell.textContent = row.n;
            tr.appendChild(nCell);

            const scoreCell = document.createElement('td');
            scoreCell.textContent = isInsufficientSample ? '' : this.formatScore(row.enpsScore);
            tr.appendChild(scoreCell);

            const detCell = document.createElement('td');
            detCell.textContent = isInsufficientSample ? '' : this.formatPercentage(row.detractorsPctExact, row.detractors);
            tr.appendChild(detCell);

            const passiveCell = document.createElement('td');
            passiveCell.textContent = isInsufficientSample ? '' : this.formatPercentage(row.passivesPctExact, row.passives);
            tr.appendChild(passiveCell);

            const promCell = document.createElement('td');
            promCell.textContent = isInsufficientSample ? '' : this.formatPercentage(row.promotersPctExact, row.promoters);
            tr.appendChild(promCell);

            if (isInsufficientSample) {
                scoreCell.classList.add('insufficient-sample');
                detCell.classList.add('insufficient-sample');
                passiveCell.classList.add('insufficient-sample');
                promCell.classList.add('insufficient-sample');
            }

            if (row.isOverall && index === 0) {
                nameCell.classList.add('enps-overall-highlight');
                nCell.classList.add('enps-overall-highlight');
                scoreCell.classList.add('enps-overall-highlight');
                detCell.classList.add('enps-cell-detractors');
                passiveCell.classList.add('enps-cell-passives');
                promCell.classList.add('enps-cell-promoters');
            }

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    }

    initChart() {
        const ctx = document.getElementById(this.chartId);
        if (!ctx) return;

        if (window.ChartDataLabels && !Chart.registry.plugins.get('datalabels')) {
            Chart.register(ChartDataLabels);
        }

        const { detractorsPct, passivesPct, promotersPct, yearLabel } = this.data.chartData;
        const datasets = [
            {
                label: 'Detractors',
                data: [detractorsPct],
                backgroundColor: '#fe0000',
                borderWidth: 0,
                datalabels: { color: '#ffffff' }
            },
            {
                label: 'Passives',
                data: [passivesPct],
                backgroundColor: '#ffc000',
                borderWidth: 0,
                datalabels: { color: '#000000' }
            },
            {
                label: 'Promoters',
                data: [promotersPct],
                backgroundColor: '#00af50',
                borderWidth: 0,
                datalabels: { color: '#ffffff' }
            }
        ];

        const formatPct = (value) => `${this.formatPercentageValue(value)}%`;

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [yearLabel || '2025'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatPct(context.parsed.x)}`
                        }
                    },
                    datalabels: {
                        anchor: 'center',
                        align: 'center',
                        formatter: value => formatPct(value),
                        font: { weight: '600' }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        max: 100,
                        ticks: {
                            callback: value => `${value}%`
                        }
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }

    formatScore(score) {
        return score.toString();
    }

    formatPercentageValue(value) {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        // Keep up to 2 decimals, then trim trailing zeros (and trailing dot).
        return value.toFixed(2).replace(/\.?0+$/, '');
    }

    formatPercentage(value, count) {
        const formattedValue = this.formatPercentageValue(value);
        if (!formattedValue) return '';
        const pct = `${formattedValue}%`;
        if (typeof count === 'number') {
            return `${pct} (n = ${count})`;
        }
        return pct;
    }
}

SlideFactory.register('enps', ENPSSlide);



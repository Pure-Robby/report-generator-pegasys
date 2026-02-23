/**
 * Yes/No horizontal bar chart slide.
 *
 * Data shape:
 *   title      – slide header title (e.g. "BRAND AFFINITY")
 *   question   – question text shown inside the slide content above the chart
 *   yesPercent – integer 0-100
 *   noPercent  – integer 0-100
 *   sampleSize – total respondents
 */
class YesNoChartSlide extends SlideBase {
  constructor(data, options = {}) {
    super(data, options);
    this.validateData(['title', 'yesPercent', 'noPercent', 'sampleSize']);
    this.chartInstance = null;
  }

  render() {
    const pageNumber = this.options.pageNumber || 1;
    const { slide, contentArea } = this.createStandardLayout(
      this.data.title,
      pageNumber,
      'slide-chart yes-no-chart-slide'
    );

    this.canvasId = `yesno-chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const body = document.createElement('div');
    body.className = 'yes-no-chart-content';

    if (this.data.question) {
      const questionEl = document.createElement('p');
      questionEl.className = 'yes-no-question';
      questionEl.textContent = this.data.question;
      body.appendChild(questionEl);
    }

    const chartContainer = document.createElement('div');
    chartContainer.className = 'yes-no-chart-container';

    const canvas = document.createElement('canvas');
    canvas.id = this.canvasId;
    chartContainer.appendChild(canvas);
    body.appendChild(chartContainer);

    const footerNote = document.createElement('p');
    footerNote.className = 'yes-no-footer-note';
    footerNote.textContent =
      'Response percentage is based on total of option selected divided by total sample of ' +
      this.data.sampleSize + ' respondents.';
    body.appendChild(footerNote);

    contentArea.appendChild(body);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const canvas = document.getElementById(this.canvasId);
        if (canvas) this.initChart(canvas);
      }, 50);
    });

    return slide;
  }

  initChart(canvas) {
    if (window.ChartDataLabels) Chart.register(ChartDataLabels);

    const ctx     = canvas.getContext('2d');
    const bgColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.background) || '#ffffff';
    const gridColor = (ColorMapper.COLORS.chart && ColorMapper.COLORS.chart.grid) || '#e5e7eb';

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Yes', 'No'],
        datasets: [{
          data: [this.data.yesPercent, this.data.noPercent],
          backgroundColor: ['#4caf50', '#e53935'],
          borderColor: bgColor,
          borderWidth: 0,
          barThickness: 100,
          datalabels: {
            align: 'end',
            anchor: 'end',
            color: '#1e293b',
            font: { size: 13, weight: 600 },
            formatter: v => (v != null ? v + '%' : '')
          }
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => c.label + ': ' + c.parsed.x + '%' }
          }
        },
        layout: { padding: { left: 5, right: 60 } },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 10, callback: v => v + '%', font: { size: 12 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: { font: { size: 13, weight: 500 }, padding: 12 },
            grid: { display: false }
          }
        }
      }
    });
  }

  destroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}

SlideFactory.register('yes-no-chart', YesNoChartSlide);

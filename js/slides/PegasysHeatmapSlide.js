/**
 * Pegasys-specific heatmap slide with configurable column headers.
 *
 * Data shape:
 *   title           – slide title
 *   columnHeaders   – string[] of dimension names
 *   rowData         – array of row objects
 *   showShiftIndicators – boolean
 *
 * Each row:
 *   name       – string (category label)
 *   sampleSize – number
 *   scores     – number[] matching columnHeaders
 *   shifts     – { previous, isSignificant }[] | null
 *   isOverall  – boolean
 */
class PegasysHeatmapSlide extends SlideBase {
  constructor(data, options) {
    super(data, options || {});
    if (!Array.isArray(this.data.rowData)) {
      throw new Error('Missing required field: rowData for PegasysHeatmapSlide');
    }
    if (!Array.isArray(this.data.columnHeaders) || !this.data.columnHeaders.length) {
      throw new Error('Missing required field: columnHeaders for PegasysHeatmapSlide');
    }
  }

  render() {
    var pageNumber = this.options.pageNumber || 1;
    var layout = this.createStandardLayout(this.data.title, pageNumber, 'slide-table heatmap-slide pegasys-heatmap-slide');
    var slide = layout.slide;
    var contentArea = layout.contentArea;

    var body = document.createElement('div');
    body.className = 'heatmap-content d-flex flex-column justify-content-between h-100';

    body.appendChild(this.createTable());

    var showShifts = this.data.showShiftIndicators !== false;
    var legendHtml = LegendComponent.generateEngagementLegend({
      showCategories: true,
      showShiftIndicators: showShifts
    });
    var legendDiv = document.createElement('div');
    legendDiv.innerHTML = legendHtml;
    body.appendChild(legendDiv);

    contentArea.appendChild(body);
    return slide;
  }

  createTable() {
    var headers = this.data.columnHeaders;
    var rows    = this.data.rowData || [];
    var showShifts = this.data.showShiftIndicators !== false;

    var table = document.createElement('table');
    table.className = showShifts ? 'heatmap-table has-shift-indicators' : 'heatmap-table';

    // ── thead ──
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');

    var corner = document.createElement('th');
    corner.className = 'corner-cell';
    headerRow.appendChild(corner);

    var nHeader = document.createElement('th');
    nHeader.className = 'sample-size-header';
    nHeader.textContent = 'N';
    headerRow.appendChild(nHeader);

    headers.forEach(function (name, idx) {
      var th = document.createElement('th');
      th.className = 'vertical-text' + (idx === 0 ? ' engagement-index-header' : '');
      th.innerHTML = '<div class="text-wrapper">' + name + '</div>';
      headerRow.appendChild(th);

      if (showShifts) {
        var arrow = document.createElement('th');
        arrow.className = 'arrow-column-header';
        headerRow.appendChild(arrow);
      }
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    var colCount = headerRow.children.length;

    // ── tbody ──
    var tbody = document.createElement('tbody');
    var self = this;

    rows.forEach(function (row) {
      if (row && row.isSectionDivider) {
        var divTr = document.createElement('tr');
        divTr.className = 'section-divider-row';
        var divTd = document.createElement('th');
        divTd.colSpan = colCount;
        divTd.textContent = row.label || '';
        divTr.appendChild(divTd);
        tbody.appendChild(divTr);
        return;
      }

      var tr = document.createElement('tr');
      if (row.isFiltered) tr.className = 'filtered-report-row';
      var insufficient = Boolean(row && !row.isOverall && !row.isFiltered && Number(row.sampleSize) < 3);

      var rowHeader = document.createElement('th');
      rowHeader.className = 'row-header-cell';
      rowHeader.textContent = row.name;
      tr.appendChild(rowHeader);

      var sizeCell = document.createElement('td');
      sizeCell.className = 'sample-size-cell';
      sizeCell.textContent = row.sampleSize;
      tr.appendChild(sizeCell);

      var scores = row.scores || [];
      var shifts = row.shifts || [];

      scores.forEach(function (score, i) {
        self.addDataCell(tr, score, shifts[i] || null, insufficient);
        if (showShifts) {
          self.addArrowCell(tr, score, shifts[i] || null, insufficient);
        }
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
  }

  addDataCell(row, value, shift, insufficient) {
    var td = document.createElement('td');
    if (insufficient) {
      td.textContent = '';
      td.className = 'insufficient-sample';
      row.appendChild(td);
      return;
    }
    if (value !== null && value !== undefined && value !== '') {
      var num = typeof value === 'number' ? value : parseInt(value);
      td.textContent = num + '%';
      td.className = ColorMapper.getCellClass(num, 'engagement');
    } else {
      td.textContent = '-';
      td.style.backgroundColor = '#f8fafc';
      td.style.color = '#94a3b8';
    }
    row.appendChild(td);
  }

  addArrowCell(row, value, shift, suppress) {
    var td = document.createElement('td');
    td.className = 'arrow-column-cell';
    if (suppress) { row.appendChild(td); return; }
    if (value !== null && value !== undefined && value !== '') {
      var num = typeof value === 'number' ? value : parseFloat(value);
      if (shift && shift.previous !== null && shift.previous !== undefined && shift.previous !== '') {
        var html = LegendComponent.getShiftIndicator(num, shift.previous, shift.isSignificant || false);
        if (html) td.innerHTML = html;
      }
    }
    row.appendChild(td);
  }
}

SlideFactory.register('pegasys-heatmap', PegasysHeatmapSlide);

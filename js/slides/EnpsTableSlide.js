/**
 * Pegasys eNPS table slide.
 *
 * Data shape:
 *   title          – slide title
 *   question       – eNPS question text
 *   overallRow     – { label, n, currentEnps, previousEnps, shift }
 *   breakdownRows  – array of { label, n, currentEnps, previousEnps, shift }
 *   yearLabels     – { current, previous }
 */
class EnpsTableSlide extends SlideBase {
  constructor(data, options) {
    super(data, options || {});
    this.validateData(['title', 'question', 'overallRow', 'breakdownRows']);
  }

  render() {
    var pageNumber = this.options.pageNumber || 1;
    var layout = this.createStandardLayout(this.data.title, pageNumber, 'slide-table enps-table-slide');
    var slide = layout.slide;
    var contentArea = layout.contentArea;

    var body = document.createElement('div');
    body.className = 'enps-table-content';

    body.appendChild(this.createHeader());
    body.appendChild(this.createTable());
    body.appendChild(this.createKey());
    body.appendChild(this.createCalcNote());

    contentArea.appendChild(body);
    return slide;
  }

  createHeader() {
    var header = document.createElement('div');
    header.className = 'enps-header';
    header.innerHTML =
      '<p class="enps-intro">Employee Net Promoter Score (eNPS) is based on the question asked:</p>' +
      '<p class="enps-question"><em>' + this.escapeHtml(this.data.question) + '</em></p>';
    return header;
  }

  createTable() {
    var labels = this.data.yearLabels || {};
    var hasPrevious = labels.previous != null;

    var table = document.createElement('table');
    table.className = 'enps-breakdown-table';

    // ── thead ──
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    ['', 'n', (labels.current || 'Current') + ' eNPS']
      .forEach(function (text) {
        var th = document.createElement('th');
        th.textContent = text;
        tr.appendChild(th);
      });

    if (hasPrevious) {
      var prevTh = document.createElement('th');
      prevTh.textContent = labels.previous + ' eNPS';
      tr.appendChild(prevTh);

      var shiftTh = document.createElement('th');
      shiftTh.textContent = 'SHIFT (' + labels.previous + ' / ' + labels.current + ')';
      tr.appendChild(shiftTh);
    }

    thead.appendChild(tr);
    table.appendChild(thead);

    // ── tbody ──
    var tbody = document.createElement('tbody');
    var overall = this.data.overallRow;
    tbody.appendChild(this.buildRow(overall, hasPrevious, true));

    (this.data.breakdownRows || []).forEach(function (row) {
      tbody.appendChild(this.buildRow(row, hasPrevious, false));
    }.bind(this));

    table.appendChild(tbody);
    return table;
  }

  buildRow(row, hasPrevious, isOverall) {
    var tr = document.createElement('tr');
    if (isOverall) tr.className = 'enps-overall-row';

    var labelTd = document.createElement(isOverall ? 'th' : 'td');
    labelTd.textContent = row.label;
    tr.appendChild(labelTd);

    var nTd = document.createElement('td');
    nTd.textContent = row.n;
    tr.appendChild(nTd);

    var currentTd = document.createElement('td');
    currentTd.textContent = row.currentEnps !== null && row.currentEnps !== undefined ? row.currentEnps : '';
    tr.appendChild(currentTd);

    if (hasPrevious) {
      var prevTd = document.createElement('td');
      prevTd.textContent = row.previousEnps !== null && row.previousEnps !== undefined ? row.previousEnps : '';
      tr.appendChild(prevTd);

      var shiftTd = document.createElement('td');
      shiftTd.textContent = row.shift !== null && row.shift !== undefined ? row.shift : '-';
      tr.appendChild(shiftTd);
    }

    return tr;
  }

  createKey() {
    var key = document.createElement('div');
    key.className = 'enps-key';
    key.innerHTML =
      '<table class="enps-key-table">' +
      '<thead><tr><th colspan="2">KEY</th></tr></thead>' +
      '<tbody>' +
      '<tr><td class="enps-key-label"><strong>Promoters (score 9-10)</strong></td>' +
      '<td>Employees are loyal enthusiasts who continue to strive for excellence and deliver high quality work.</td></tr>' +
      '<tr><td class="enps-key-label"><strong>Passives (score 7-8)</strong></td>' +
      '<td>Employees are satisfied yet, unenthusiastic employees. These employees deliver what is required, but do not exceed expectations.</td></tr>' +
      '<tr><td class="enps-key-label"><strong>Detractors (score 0-6)</strong></td>' +
      '<td>Employees are unhappy and disengaged employees who can have a negative effect on both the organization and other employees morale.</td></tr>' +
      '</tbody></table>';
    return key;
  }

  createCalcNote() {
    var div = document.createElement('div');
    div.className = 'enps-calc-note';
    div.innerHTML =
      '<p>To calculate your company\u2019s NPS, take the percentage of customers who are Promoters and subtract the percentage who are Detractors.</p>';
    return div;
  }

  escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }
}

SlideFactory.register('enps-table', EnpsTableSlide);

/**
 * Dual multi-select table slide.
 * Shows a table of shared statements against two multi-select question columns.
 *
 * Data shape:
 *   title      – slide header title (e.g. "MANAGEMENT")
 *   question   – intro question text shown above the table
 *   col1Header – short header for the first % column
 *   col2Header – short header for the second % column
 *   rows       – [{ statement, col1Percent, col2Percent }]
 *   sampleSize – total respondents
 */
class DualMultiSelectSlide extends SlideBase {
  constructor(data, options = {}) {
    super(data, options);
    this.validateData(['title', 'question', 'col1Header', 'col2Header', 'rows', 'sampleSize']);
  }

  render() {
    const pageNumber = this.options.pageNumber || 1;
    const { slide, contentArea } = this.createStandardLayout(
      this.data.title,
      pageNumber,
      'slide-table dual-multiselect-slide'
    );

    const body = document.createElement('div');
    body.className = 'dual-multiselect-content';

    const question = document.createElement('p');
    question.className = 'dual-multiselect-question';
    question.textContent = this.data.question;
    body.appendChild(question);

    body.appendChild(this.createTable());
    body.appendChild(this.createFooterNote());

    contentArea.appendChild(body);
    return slide;
  }

  createTable() {
    const table = document.createElement('table');
    table.className = 'dual-multiselect-table striped';

    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    ['Statement', this.data.col1Header, this.data.col2Header].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      tr.appendChild(th);
    });

    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (this.data.rows || []).forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="dual-multiselect-statement">' + this.escapeHtml(row.statement) + '</td>' +
        '<td>' + (row.col1Percent != null ? row.col1Percent + '%' : '') + '</td>' +
        '<td>' + (row.col2Percent != null ? row.col2Percent + '%' : '') + '</td>';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
  }

  createFooterNote() {
    const note = document.createElement('p');
    note.className = 'dual-multiselect-footer-note';
    note.textContent =
      'Response percentage is based on total of option selected divided by total sample of ' +
      this.data.sampleSize + ' respondents.';
    return note;
  }

  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }
}

SlideFactory.register('dual-multiselect', DualMultiSelectSlide);

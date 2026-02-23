/**
 * Retention table slide: paired "reason for leaving" vs "reason for staying" table.
 *
 * Data shape:
 *   title      – slide header title (e.g. "Retention")
 *   question   – intro question text shown above the table
 *   rows       – [{ grouping, leavingStatement, leavingPercent, stayingStatement, stayingPercent }]
 *   sampleSize – total respondents
 */
class RetentionTableSlide extends SlideBase {
  constructor(data, options = {}) {
    super(data, options);
    this.validateData(['title', 'question', 'rows', 'sampleSize']);
  }

  render() {
    const pageNumber = this.options.pageNumber || 1;
    const { slide, contentArea } = this.createStandardLayout(
      this.data.title,
      pageNumber,
      'slide-table retention-table-slide'
    );

    const body = document.createElement('div');
    body.className = 'retention-table-content';

    const question = document.createElement('p');
    question.className = 'retention-table-question';
    question.textContent = this.data.question;
    body.appendChild(question);

    body.appendChild(this.createTable());
    body.appendChild(this.createFooterNote());

    contentArea.appendChild(body);
    return slide;
  }

  createTable() {
    const table = document.createElement('table');
    table.className = 'retention-table striped';

    const thead = document.createElement('thead');
    thead.innerHTML =
      '<tr>' +
        '<th class="retention-col-grouping">Grouping</th>' +
        '<th class="retention-col-statement">Statement / Reason for leaving</th>' +
        '<th class="retention-col-pct">% of reason for leaving</th>' +
        '<th class="retention-col-statement">Statement / Reason for staying</th>' +
        '<th class="retention-col-pct">% of reason for staying</th>' +
      '</tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (this.data.rows || []).forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="retention-grouping">' + this.escapeHtml(row.grouping) + '</td>' +
        '<td>' + this.escapeHtml(row.leavingStatement) + '</td>' +
        '<td class="retention-pct">' + (row.leavingPercent != null ? row.leavingPercent + '%' : '') + '</td>' +
        '<td>' + this.escapeHtml(row.stayingStatement) + '</td>' +
        '<td class="retention-pct">' + (row.stayingPercent != null ? row.stayingPercent + '%' : '') + '</td>';
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
  }

  createFooterNote() {
    const note = document.createElement('p');
    note.className = 'retention-table-footer-note';
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

SlideFactory.register('retention-table', RetentionTableSlide);

/**
 * Brand Affinity slide: two UGR tables (Internal and External) with Option | % columns.
 */
class BrandAffinitySlide extends SlideBase {
  constructor(data, options = {}) {
    super(data, options);
    this.validateData(['title', 'internalUgr', 'externalUgr', 'sampleSize']);
  }

  render() {
    const pageNumber = this.options.pageNumber || 1;
    const { slide, contentArea } = this.createStandardLayout(
      this.data.title,
      pageNumber,
      'slide-table brand-affinity-slide'
    );

    const body = document.createElement('div');
    body.className = 'brand-affinity-content';

    body.appendChild(this.createUgrSection(this.data.internalUgr));
    body.appendChild(this.createUgrSection(this.data.externalUgr));
    body.appendChild(this.createFooterNote());

    contentArea.appendChild(body);
    return slide;
  }

  createUgrSection(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'brand-affinity-section';

    const question = document.createElement('p');
    question.className = 'brand-affinity-question';
    question.textContent = section.question || '';
    wrapper.appendChild(question);

    wrapper.appendChild(this.createOptionTable(section.rows || []));
    return wrapper;
  }

  createOptionTable(rows) {
    const table = document.createElement('table');
    table.className = 'brand-affinity-table striped';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Option</th><th>%</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (rows || []).forEach(function (row) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + this.escapeHtml(row.option) + '</td>' +
        '<td>' + (row.percent != null ? row.percent + '%' : '') + '</td>';
      tbody.appendChild(tr);
    }.bind(this));
    table.appendChild(tbody);

    return table;
  }

  createFooterNote() {
    const n = this.data.sampleSize;
    const note = document.createElement('p');
    note.className = 'brand-affinity-footer-note';
    note.textContent = 'Response percentage is based on total of option selected divided by total sample of ' + n + ' respondents.';
    return note;
  }

  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }
}

SlideFactory.register('brand-affinity', BrandAffinitySlide);

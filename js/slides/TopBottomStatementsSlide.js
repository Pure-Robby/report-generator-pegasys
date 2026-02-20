/**
 * Top & Bottom scoring statements slide.
 * Supports multi-year columns when `yearLabels` is an array (N years).
 * Falls back to legacy {current, previous} object format for backward compat.
 */
class TopBottomStatementsSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'topStatements', 'bottomStatements', 'yearLabels']);
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-table top-bottom-statements'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        return slide;
    }

    getNormalizedYearLabels() {
        const yl = this.data.yearLabels;
        if (Array.isArray(yl)) return yl;
        if (yl && typeof yl === 'object') {
            var labels = [yl.current];
            if (yl.previous) labels.push(yl.previous);
            return labels;
        }
        return ['Current'];
    }

    createBody() {
        const container = document.createElement('div');
        container.className = 'top-bottom-content';

        const sectionsWrapper = document.createElement('div');
        sectionsWrapper.className = 'top-bottom-sections';

        var topCount = (this.data.topStatements || []).length;
        var bottomCount = (this.data.bottomStatements || []).length;
        sectionsWrapper.appendChild(
            this.createSection('Top ' + topCount + ' Scoring Statements', this.data.topStatements)
        );
        sectionsWrapper.appendChild(
            this.createSection('Bottom ' + bottomCount + ' Scoring Statements', this.data.bottomStatements)
        );

        container.appendChild(sectionsWrapper);

        const legendWrapper = document.createElement('div');
        legendWrapper.className = 'top-bottom-legend';
        legendWrapper.innerHTML = LegendComponent.generateEngagementLegend({
            showCategories: true,
            showShiftIndicators: false
        });
        container.appendChild(legendWrapper);

        return container;
    }

    createSection(title, statements) {
        const section = document.createElement('div');
        section.className = 'top-bottom-section';

        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'top-bottom-table striped';

        const thead = document.createElement('thead');
        thead.appendChild(this.createHeaderRow());
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        (statements || []).forEach(statement => {
            tbody.appendChild(this.createStatementRow(statement));
        });
        table.appendChild(tbody);

        section.appendChild(table);
        return section;
    }

    createHeaderRow() {
        const row = document.createElement('tr');
        const yearLabels = this.getNormalizedYearLabels();

        var headers = ['Core Drivers', 'Question'];
        yearLabels.forEach(function (label) {
            headers.push(label + ' Score');
        });
        headers.push('% Shift');

        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            row.appendChild(th);
        });

        return row;
    }

    createStatementRow(statement) {
        const row = document.createElement('tr');
        const yearLabels = this.getNormalizedYearLabels();
        const hasScoresMap = statement.scores && typeof statement.scores === 'object';

        const driverCell = document.createElement('td');
        driverCell.className = 'text-start';
        driverCell.textContent = statement.driver;
        row.appendChild(driverCell);

        const questionCell = document.createElement('td');
        questionCell.className = 'text-start question-cell';
        questionCell.textContent = statement.question;
        row.appendChild(questionCell);

        if (hasScoresMap) {
            yearLabels.forEach(year => {
                row.appendChild(this.createScoreCell(statement.scores[year], statement.columnIndex));
            });
        } else {
            row.appendChild(this.createScoreCell(statement.currentScore, statement.columnIndex));
            if (yearLabels.length > 1) {
                row.appendChild(this.createScoreCell(statement.previousScore, statement.columnIndex));
            }
        }

        const shiftCell = document.createElement('td');
        shiftCell.className = 'shift-cell';
        shiftCell.textContent = this.formatShiftValue(statement.shiftValue, statement.columnIndex);
        row.appendChild(shiftCell);

        return row;
    }

    createScoreCell(score, columnIndex) {
        const cell = document.createElement('td');
        if (score === null || score === undefined) {
            cell.textContent = '\u2014';
            cell.className = 'score-cell score-empty';
            return cell;
        }

        const isTenPoint = columnIndex !== null && DataCalculations.isTenPointScaleColumn(columnIndex);
        cell.textContent = isTenPoint ? score.toString() : score + '%';
        cell.className = 'score-cell ' + ColorMapper.getCellClass(score, 'engagement');
        return cell;
    }

    formatShiftValue(shiftValue, columnIndex) {
        if (shiftValue === null || shiftValue === undefined) return '\u2014';
        if (shiftValue === 0) return '\u2013';
        const isTenPoint = columnIndex !== null && DataCalculations.isTenPointScaleColumn(columnIndex);
        const sign = shiftValue > 0 ? '+' : '';
        return isTenPoint ? (sign + shiftValue) : (sign + shiftValue + '%');
    }
}

SlideFactory.register('top-bottom-statements', TopBottomStatementsSlide);

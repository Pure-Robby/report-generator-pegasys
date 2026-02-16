/**
 * Introductory slide for retention risk section.
 * Provides context, rating scale, question mapping, and legend before data tables.
 */
class RetentionIntroSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'description', 'questions']);
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-table retention-intro-slide'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        // Description
        const description = document.createElement('p');
        description.className = 'retention-intro-description';
        description.textContent = this.data.description;
        body.appendChild(description);

        // Rating scale
        const ratingScale = RatingScaleComponent.createTable();
        ratingScale.classList.add('retention-rating-scale');
        body.appendChild(ratingScale);

        // Question mapping table
        const mappingTable = this.createQuestionsTable();
        body.appendChild(mappingTable);

        // Legend wrapper for risk legend
        const legendWrapper = document.createElement('div');
        legendWrapper.className = 'risk-legend-wrapper';
        legendWrapper.innerHTML = ColorMapper.generateLegend('risk');
        body.appendChild(legendWrapper);

        return slide;
    }

    createQuestionsTable() {
        const table = document.createElement('table');
        table.className = 'retention-questions-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="text-start">DIMENSION</th>
                <th class="text-start">QUESTION</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        (this.data.questions || []).forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-start">${item.dimension}</td>
                <td class="text-start">${item.question}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        return table;
    }
}

SlideFactory.register('retention-intro', RetentionIntroSlide);



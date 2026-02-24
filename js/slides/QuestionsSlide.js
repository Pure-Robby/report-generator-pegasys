/**
 * Questions slide showing survey dimensions and their associated questions
 * Displays dimensions grouped with their questions
 */
class QuestionsSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'dimensions']);
    }

    render() {
        // Use standard layout
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title, 
            pageNumber, 
            'slide-table questions-slide'
        );

        if (this.options.slideClass) {
            slide.classList.add(this.options.slideClass);
        }
        
        const body = this.createBody();
        contentArea.appendChild(body);
        
        return slide;
    }

    createBody() {
        const body = document.createElement('div');
        body.className = 'questions-content';
        
        // Description paragraph – scale points from theme (4 or 5)
        const theme = (typeof window !== 'undefined' && window.ThemeManager && window.ThemeManager.getActiveTheme && window.ThemeManager.getActiveTheme()) || null;
        const points = (theme && theme.ratingScale && theme.ratingScale.points) || 5;
        const description = document.createElement('p');
        description.className = 'questions-description';
        description.textContent = `Statements with subsequent agreement factors that made use of a ${points} point scale, which formed the base for the engagement index (%).`;
        body.appendChild(description);
        
        // Rating scale table
        const ratingScale = this.createRatingScaleTable();
        body.appendChild(ratingScale);
        
        // Questions table - add compact class for pages 2 & 3 to prevent overflow
        const questionsTable = this.createQuestionsTable();
        body.appendChild(questionsTable);
        
        return body;
    }

    createRatingScaleTable() {
        return RatingScaleComponent.createTable();
    }

    createQuestionsTable() {
        const table = document.createElement('table');
        
        // Determine if this needs compact styling based on page indicator in options
        const pageNumber = this.options.pageNumber || 1;
        const isCompact = this.data.title && (
            this.data.title.includes('Page 2') || 
            this.data.title.includes('Page 3')
        );
        
        const tableClasses = ['survey-questions', 'striped'];
        if (isCompact) {
            tableClasses.push('compact');
        }
        if (this.options.extraCompact) {
            tableClasses.push('extra-compact');
        }
        if (this.options.tableClass) {
            tableClasses.push(this.options.tableClass);
        }
        table.className = tableClasses.join(' ');
        
        const dimensions = this.data.dimensions || [];
        const startIndex = this.data.startIndex || 0;
        const endIndex = this.data.endIndex || dimensions.length;
        const pageDimensions = dimensions.slice(startIndex, endIndex);
        const showCategory = pageDimensions.some(d => d && d.group);

        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        if (showCategory) {
            headerRow.innerHTML = '<th class="category-col">CATEGORY</th><th class="dimension-col">DIMENSION</th><th>QUESTIONS</th>';
        } else {
            headerRow.innerHTML = '<th class="dimension-col">DIMENSION</th><th>QUESTIONS</th>';
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        if (showCategory) {
            this.appendQuestionsRowsWithCategory(tbody, pageDimensions);
        } else {
            this.appendQuestionsRowsTwoColumns(tbody, pageDimensions);
        }
        
        table.appendChild(tbody);
        return table;
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(String(str)));
        return div.innerHTML;
    }

    appendQuestionsRowsWithCategory(tbody, pageDimensions) {
        const groups = [];
        let currentGroup = null;
        pageDimensions.forEach(dim => {
            const groupName = dim && dim.group ? dim.group : '';
            if (!currentGroup || currentGroup.name !== groupName) {
                currentGroup = { name: groupName, dimensions: [] };
                groups.push(currentGroup);
            }
            currentGroup.dimensions.push(dim);
        });

        let dimensionIndex = 0;
        groups.forEach(group => {
            let categoryRowCount = 0;
            group.dimensions.forEach(dim => {
                const questions = dim.questions || [];
                categoryRowCount += questions.length > 0 ? questions.length : 1;
            });

            let isFirstRowInCategory = true;
            group.dimensions.forEach(dimension => {
                const backgroundClass = dimensionIndex % 2 === 0 ? 'odd-group' : 'even-group';
                const questions = dimension.questions || [];
                const rowCount = questions.length > 0 ? questions.length : 1;
                const emptyLabel = questions.length === 0 ? 'No questions defined' : '';

                if (questions.length === 0) {
                    const row = document.createElement('tr');
                    row.className = backgroundClass;
                    const categoryCell = isFirstRowInCategory
                        ? `<td class="category-cell" rowspan="${categoryRowCount}">${this.escapeHtml(group.name)}</td>`
                        : '';
                    row.innerHTML = categoryCell + `<td class="dimension-name">${this.escapeHtml(dimension.name)}</td><td>${emptyLabel}</td>`;
                    tbody.appendChild(row);
                    isFirstRowInCategory = false;
                } else {
                    questions.forEach((question, qIndex) => {
                        const row = document.createElement('tr');
                        row.className = backgroundClass;
                        let html = '';
                        if (isFirstRowInCategory) {
                            html += `<td class="category-cell" rowspan="${categoryRowCount}">${this.escapeHtml(group.name)}</td>`;
                            isFirstRowInCategory = false;
                        }
                        if (qIndex === 0) {
                            html += `<td class="dimension-name" rowspan="${rowCount}">${this.escapeHtml(dimension.name)}</td>`;
                        }
                        html += `<td>${this.escapeHtml(question)}</td>`;
                        row.innerHTML = html;
                        tbody.appendChild(row);
                    });
                }
                dimensionIndex++;
            });
        });
    }

    appendQuestionsRowsTwoColumns(tbody, pageDimensions) {
        let groupIndex = 0;
        pageDimensions.forEach(dimension => {
            const questions = dimension.questions || [];
            const backgroundClass = groupIndex % 2 === 0 ? 'odd-group' : 'even-group';
            
            if (questions.length === 0) {
                const row = document.createElement('tr');
                row.className = backgroundClass;
                row.innerHTML = `
                    <td class="dimension-name">${this.escapeHtml(dimension.name)}</td>
                    <td>No questions defined</td>
                `;
                tbody.appendChild(row);
            } else if (questions.length === 1) {
                const row = document.createElement('tr');
                row.className = backgroundClass;
                row.innerHTML = `
                    <td class="dimension-name">${this.escapeHtml(dimension.name)}</td>
                    <td>${this.escapeHtml(questions[0])}</td>
                `;
                tbody.appendChild(row);
            } else {
                questions.forEach((question, qIndex) => {
                    const row = document.createElement('tr');
                    row.className = backgroundClass;
                    if (qIndex === 0) {
                        row.innerHTML = `
                            <td class="dimension-name" rowspan="${questions.length}">${this.escapeHtml(dimension.name)}</td>
                            <td>${this.escapeHtml(question)}</td>
                        `;
                    } else {
                        row.innerHTML = `<td>${this.escapeHtml(question)}</td>`;
                    }
                    tbody.appendChild(row);
                });
            }
            groupIndex++;
        });
    }
}

// Register slide type
SlideFactory.register('questions', QuestionsSlide);
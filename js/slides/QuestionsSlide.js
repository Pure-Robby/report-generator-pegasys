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
        
        // Description paragraph
        const description = document.createElement('p');
        description.className = 'questions-description';
        description.textContent = 'Statements with subsequent agreement factors that made use of a 5 point scale, which formed the base for the engagement index (%).';
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
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="dimension-col">DIMENSION</th>
                <th>QUESTIONS</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        const dimensions = this.data.dimensions || [];
        
        // Handle pagination if provided
        const startIndex = this.data.startIndex || 0;
        const endIndex = this.data.endIndex || dimensions.length;
        const pageDimensions = dimensions.slice(startIndex, endIndex);
        
        // Build rows for each dimension and its questions
        // Track group index for consistent striping across rowspan
        let groupIndex = 0;
        
        pageDimensions.forEach(dimension => {
            const questions = dimension.questions || [];
            const backgroundClass = groupIndex % 2 === 0 ? 'odd-group' : 'even-group';
            
            if (questions.length === 0) {
                // No questions for this dimension
                const row = document.createElement('tr');
                row.className = backgroundClass;
                row.innerHTML = `
                    <td class="dimension-name">${dimension.name}</td>
                    <td>No questions defined</td>
                `;
                tbody.appendChild(row);
            } else if (questions.length === 1) {
                // Single question - simple row
                const row = document.createElement('tr');
                row.className = backgroundClass;
                row.innerHTML = `
                    <td class="dimension-name">${dimension.name}</td>
                    <td>${questions[0]}</td>
                `;
                tbody.appendChild(row);
            } else {
                // Multiple questions - first row with rowspan, all with same background
                questions.forEach((question, qIndex) => {
                    const row = document.createElement('tr');
                    row.className = backgroundClass; // Same class for all rows in this dimension
                    if (qIndex === 0) {
                        // First question - include dimension with rowspan
                        row.innerHTML = `
                            <td class="dimension-name" rowspan="${questions.length}">${dimension.name}</td>
                            <td>${question}</td>
                        `;
                    } else {
                        // Subsequent questions - no dimension cell
                        row.innerHTML = `<td>${question}</td>`;
                    }
                    tbody.appendChild(row);
                });
            }
            
            groupIndex++; // Increment for next dimension group
        });
        
        table.appendChild(tbody);
        return table;
    }
}

// Register slide type
SlideFactory.register('questions', QuestionsSlide);
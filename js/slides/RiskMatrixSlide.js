/**
 * Risk matrix slide for retention risk by department
 * Shows risk scores with color coding
 */
class RiskMatrixSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title']);
        this.entityLabel = data.entityLabel || 'Department';
    }

    render() {
        // Use standard layout
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title, 
            pageNumber, 
            'slide-table risk-matrix-slide'
        );
        
        const body = this.createBody();
        
        // Create risk matrix table
        const table = this.createRiskMatrixTable();
        body.appendChild(table);
        
        // Add legend
        const legend = document.createElement('div');
        legend.classList = 'risk-legend-wrapper mb-4';
        legend.innerHTML = ColorMapper.generateLegend('risk');
        body.appendChild(legend);
        
        // Add risk definitions if provided
        if (this.data.riskDefinitions) {
            const definitions = this.createRiskDefinitions();
            body.appendChild(definitions);
        }
        
        contentArea.appendChild(body);
        
        return slide;
    }

    createRiskMatrixTable() {
        const rows = this.getRows();
        if (!rows.length) {
            throw new Error('RiskMatrixSlide requires at least one row of data.');
        }

        const table = document.createElement('table');
        table.className = 'risk-matrix-table mb-3';
        
        // Create thead
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const entityHeader = this.entityLabel.toUpperCase();
        const headers = [entityHeader, 'n', 'RETENTION RISK OVERALL', 'RISK 1', 'RISK 2'];
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
            if (index === 0) th.className = 'text-start';
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create tbody
        const tbody = document.createElement('tbody');
        
        rows.forEach(dept => {
            const row = document.createElement('tr');
            const isInsufficientSample = Boolean(dept && !dept.isOverall && Number(dept.n) <= 3);
            
            // Department name
            const thName = document.createElement('th');
            thName.textContent = dept.name;
            row.appendChild(thName);
            
            // Sample size (n)
            const tdN = document.createElement('td');
            tdN.className = 'cell-n';
            tdN.textContent = dept.n;
            thName.className = 'text-start';
            row.appendChild(tdN);
            
            // Overall risk
            const tdOverall = document.createElement('td');
            if (isInsufficientSample) {
                tdOverall.textContent = '';
                tdOverall.className = 'insufficient-sample';
            } else {
                tdOverall.textContent = dept.overall + '%';
                tdOverall.className = ColorMapper.getCellClass(dept.overall, 'risk');
            }
            row.appendChild(tdOverall);
            
            // Risk 1
            const tdRisk1 = document.createElement('td');
            if (isInsufficientSample) {
                tdRisk1.textContent = '';
                tdRisk1.className = 'insufficient-sample';
            } else {
                tdRisk1.textContent = dept.risk1 + '%';
                tdRisk1.className = ColorMapper.getCellClass(dept.risk1, 'risk');
            }
            row.appendChild(tdRisk1);
            
            // Risk 2
            const tdRisk2 = document.createElement('td');
            if (isInsufficientSample) {
                tdRisk2.textContent = '';
                tdRisk2.className = 'insufficient-sample';
            } else {
                tdRisk2.textContent = dept.risk2 + '%';
                tdRisk2.className = ColorMapper.getCellClass(dept.risk2, 'risk');
            }
            row.appendChild(tdRisk2);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        
        return table;
    }

    createRiskDefinitions() {
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; gap: 1rem; margin-top: 0.75rem;';
        
        const definitions = [
            {
                title: 'RISK 1',
                text: 'I intend to look for a job in another company in the near future',
                color: '#0B2265'
            },
            {
                title: 'RISK 2',
                text: 'At the present time, I am actively searching for another job',
                color: '#0B2265'
            }
        ];
        
        definitions.forEach(def => {
            const box = document.createElement('div');
            box.style.cssText = `flex: 1; padding: 0.5rem 0.75rem; border-left: 3px solid ${def.color}; background: #f8fafc;`;
            box.innerHTML = `
                <strong style="display: block; margin-bottom: 0.25rem; font-size: 0.75rem;">${def.title}</strong>
                <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${def.text}</p>
            `;
            container.appendChild(box);
        });
        
        return container;
    }

    getRows() {
        if (Array.isArray(this.data.rows)) {
            return this.data.rows;
        }

        if (Array.isArray(this.data.departments)) {
            return this.data.departments;
        }

        return [];
    }
}

// Register slide type
SlideFactory.register('risk-matrix', RiskMatrixSlide);


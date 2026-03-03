/**
 * Heat map slide for engagement breakdown by location/department/demographics
 * Displays matrix with 12 core dimensions + 6 additional dimensions + SEACOM INDEX
 */
class HeatMapSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        const hasRowData = Array.isArray(this.data.rowData);
        const hasSubTables = Array.isArray(this.data.subTables) && this.data.subTables.length > 0;

        if (!hasRowData && !hasSubTables) {
            throw new Error('Missing required field: rowData for HeatMapSlide');
        }

        if (!hasRowData) {
            this.data.rowData = [];
        }
    }

    render() {
        // Use standard layout
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title, 
            pageNumber, 
            'slide-table heatmap-slide'
        );
        
        const body = this.createBody();
        contentArea.appendChild(body);
        
        return slide;
    }

    createBody() {
        const body = document.createElement('div');
        body.classList = 'heatmap-content d-flex flex-column justify-content-between h-100';

        const isCombinedDemographics = this.data.breakdownType === 'demographics-gender-race' ||
            this.data.breakdownType === 'demographics-age-tenure';

        if (isCombinedDemographics && Array.isArray(this.data.subTables) && this.data.subTables.length > 0) {
            const combinedRows = this.buildCombinedRows(this.data.subTables);
            const table = this.createHeatMapTable(combinedRows);
            body.appendChild(table);
        } else {
            // Single table
            const table = this.createHeatMapTable(this.data.rowData);
            body.appendChild(table);
        }
        
        // Add legend
        const showShiftIndicators = this.data.showShiftIndicators !== false;
        const legendHtml = LegendComponent.generateEngagementLegend({
            showCategories: true,
            showShiftIndicators: showShiftIndicators
        });
        
        const legendDiv = document.createElement('div');
        legendDiv.innerHTML = legendHtml;
        body.appendChild(legendDiv);
        
        return body;
    }

    createHeatMapTable(rowData, subtitle) {
        const safeRows = Array.isArray(rowData) ? rowData : [];
        const table = document.createElement('table');
        
        // Check if shift indicators should be shown (previous data exists)
        const showShiftIndicators = this.data.showShiftIndicators !== false;
        
        // Add class to table when comparison data exists for CSS targeting
        table.className = showShiftIndicators 
            ? 'heatmap-table has-shift-indicators' 
            : 'heatmap-table';
        
        // Add subtitle if provided (for demographics sub-tables)
        if (subtitle) {
            const caption = document.createElement('caption');
            caption.textContent = subtitle;
            caption.className = 'heatmap-subtitle';
            table.appendChild(caption);
        }
        
        // Column headers for the 12 core dimensions
        const coreDimensions = [
            'EXPECTATIONS KNOWN',
            'MATERIALS & EQUIPMENT',
            'DO WHAT I DO BEST',
            'RECOGNITION IN THE LAST 7 DAYS',
            'SUPERVISOR CARES',
            'DEVELOPMENT ENCOURAGED',
            'OPINIONS COUNT',
            'MY WORK IS IMPORTANT',
            'CO-WORKERS COMMITTED TO QUALITY',
            '6-MONTH PROGRESS TALK',
            'GROWTH OPPORTUNITIES',
            'LINE MANAGER'
        ];
        
        // Column headers for the 6 additional dimensions
        const additionalDimensions = [
            'COMMUNICATION',
            'TRUST',
            'DIRECT MANAGER',
            'BRAND',
            'CHANGE MANAGEMENT',
            'DIVERSITY & INCLUSION'
        ];
        
        // Create thead
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Empty corner cell (for row names)
        const cornerCell = document.createElement('th');
        cornerCell.className = 'corner-cell';
        headerRow.appendChild(cornerCell);

        // Sample size column header
        const sampleSizeHeader = document.createElement('th');
        sampleSizeHeader.className = 'sample-size-header';
        sampleSizeHeader.textContent = 'N';
        headerRow.appendChild(sampleSizeHeader);
        
        // Engagement Index column (light blue)
        const engagementIndexHeader = document.createElement('th');
        engagementIndexHeader.className = 'vertical-text engagement-index-header';
        engagementIndexHeader.innerHTML = '<div class="text-wrapper">ENGAGEMENT INDEX</div>';
        headerRow.appendChild(engagementIndexHeader);
        
        // Arrow column header for Engagement Index (only if previous data exists)
        if (showShiftIndicators) {
            const engagementArrowHeader = document.createElement('th');
            engagementArrowHeader.className = 'arrow-column-header';
            headerRow.appendChild(engagementArrowHeader);
        }
        
        // Core dimensions (12 columns with vertical text) + arrow columns
        coreDimensions.forEach(dim => {
            const th = document.createElement('th');
            th.className = 'vertical-text';
            th.innerHTML = `<div class="text-wrapper">${dim}</div>`;
            headerRow.appendChild(th);
            
            // Arrow column header after each dimension (only if previous data exists)
            if (showShiftIndicators) {
                const arrowHeader = document.createElement('th');
                arrowHeader.className = 'arrow-column-header';
                headerRow.appendChild(arrowHeader);
            }
        });
        
        // Separator column (empty header with dotted border)
        const separatorCell = document.createElement('th');
        separatorCell.className = 'separator-col';
        headerRow.appendChild(separatorCell);
        
        // SEACOM INDEX column (highlighted in blue, first after separator)
        const seacomIndexHeader = document.createElement('th');
        seacomIndexHeader.className = 'vertical-text seacom-index-header';
        seacomIndexHeader.innerHTML = '<div class="text-wrapper">SEACOM INDEX</div>';
        headerRow.appendChild(seacomIndexHeader);
        
        // Arrow column header for SEACOM INDEX (only if previous data exists)
        if (showShiftIndicators) {
            const seacomArrowHeader = document.createElement('th');
            seacomArrowHeader.className = 'arrow-column-header';
            headerRow.appendChild(seacomArrowHeader);
        }
        
        // Additional dimensions (6 columns with vertical text) + arrow columns
        additionalDimensions.forEach(dim => {
            const th = document.createElement('th');
            th.className = 'vertical-text';
            const verticalTextContainer = document.createElement('div');
            verticalTextContainer.className = 'vertical-text-container';
            th.appendChild(verticalTextContainer);
            verticalTextContainer.innerHTML = `<div class="text-wrapper">${dim}</div>`;
            headerRow.appendChild(th);
            
            // Arrow column header after each dimension (only if previous data exists)
            if (showShiftIndicators) {
                const arrowHeader = document.createElement('th');
                arrowHeader.className = 'arrow-column-header';
                headerRow.appendChild(arrowHeader);
            }
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const columnCount = headerRow.children.length;
        
        // Create tbody
        const tbody = document.createElement('tbody');
        
        safeRows.forEach(row => {
            if (row && row.isSectionDivider) {
                tbody.appendChild(this.createSectionDividerRow(row.label, columnCount));
                return;
            }

            const tr = document.createElement('tr');
            const isInsufficientSample = Boolean(row && !row.isOverall && Number(row.sampleSize) < 3);
            
            // Row header with name only
            const rowHeader = document.createElement('th');
            rowHeader.className = 'row-header-cell';
            rowHeader.textContent = row.name;
            tr.appendChild(rowHeader);
            
            // Sample size cell
            const sampleSizeCell = document.createElement('td');
            sampleSizeCell.className = 'sample-size-cell';
            sampleSizeCell.textContent = row.sampleSize;
            tr.appendChild(sampleSizeCell);
            
            // Engagement Index cell
            this.addDataCell(tr, row.engagementIndex, row.shifts ? row.shifts.engagementIndex : null, isInsufficientSample);
            
            // Arrow cell for Engagement Index (only if previous data exists)
            if (showShiftIndicators) {
                this.addArrowCell(tr, row.engagementIndex, row.shifts ? row.shifts.engagementIndex : null, isInsufficientSample);
            }
            
            // Core dimension cells (12 columns) with arrow cells
            const coreScores = row.coreScores || [];
            const coreShifts = row.shifts ? row.shifts.core || [] : [];
            for (let i = 0; i < 12; i++) {
                this.addDataCell(tr, coreScores[i], coreShifts[i], isInsufficientSample);
                if (showShiftIndicators) {
                    this.addArrowCell(tr, coreScores[i], coreShifts[i], isInsufficientSample);
                }
            }
            
            // Separator cell
            const sepCell = document.createElement('td');
            sepCell.className = 'separator-col';
            tr.appendChild(sepCell);
            
            // SEACOM INDEX cell (highlighted, first after separator)
            const seacomCell = document.createElement('td');
            seacomCell.className = 'seacom-index-cell';

            if (isInsufficientSample) {
                seacomCell.textContent = '';
                seacomCell.classList.add('insufficient-sample');
            } else if (row.seacomIndex !== null && row.seacomIndex !== undefined) {
                seacomCell.textContent = row.seacomIndex + '%';
                seacomCell.classList.add(ColorMapper.getCellClass(row.seacomIndex, 'engagement'));
            } else {
                seacomCell.textContent = '-';
                seacomCell.style.backgroundColor = '#f8fafc';
                seacomCell.style.color = '#94a3b8';
            }
            tr.appendChild(seacomCell);
            
            // Arrow cell for SEACOM INDEX (only if previous data exists)
            if (showShiftIndicators) {
                this.addArrowCell(tr, row.seacomIndex, row.shifts ? row.shifts.seacomIndex : null, isInsufficientSample);
            }
            
            // Additional dimension cells (6 columns) with arrow cells
            const additionalScores = row.additionalScores || [];
            const additionalShifts = row.shifts ? row.shifts.additional || [] : [];
            for (let i = 0; i < 6; i++) {
                this.addDataCell(tr, additionalScores[i], additionalShifts[i], isInsufficientSample);
                if (showShiftIndicators) {
                    this.addArrowCell(tr, additionalScores[i], additionalShifts[i], isInsufficientSample);
                }
            }
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        
        return table;
    }

    buildCombinedRows(subTables = []) {
        const rows = [];

        subTables.forEach((subTableData, index) => {
            if (!subTableData || !Array.isArray(subTableData.rowData)) {
                return;
            }

            if (index > 0) {
                rows.push({ isSectionDivider: true });
            }

            const sanitizedRows = (subTableData.rowData || []).filter(row => {
                if (!row) return false;
                if (index === 0) return true;
                return !row.isOverall;
            });

            rows.push(...sanitizedRows);
        });

        return rows;
    }

    createSectionDividerRow(label, columnCount) {
        const tr = document.createElement('tr');
        tr.className = 'section-divider-row';

        const cell = document.createElement('th');
        cell.colSpan = columnCount;
        cell.textContent = label || '';
        tr.appendChild(cell);

        return tr;
    }

    addDataCell(row, value, shift, isInsufficientSample = false) {
        const td = document.createElement('td');

        if (isInsufficientSample) {
            td.textContent = '';
            td.className = 'insufficient-sample';
            row.appendChild(td);
            return;
        }
        
        if (value !== null && value !== undefined && value !== '') {
            const numValue = typeof value === 'number' ? value : parseInt(value);
            td.textContent = numValue + '%';
            td.className = ColorMapper.getCellClass(numValue, 'engagement');
        } else {
            td.textContent = '-';
            td.style.backgroundColor = '#f8fafc';
            td.style.color = '#94a3b8';
        }
        
        row.appendChild(td);
    }

    addArrowCell(row, value, shift, suppressArrow = false) {
        const td = document.createElement('td');
        td.className = 'arrow-column-cell';
        
        // Keep the arrow cell, but never show an arrow when the row has no data (e.g. insufficient sample size).
        if (suppressArrow) {
            row.appendChild(td);
            return;
        }
        
        // Always create the cell for visual consistency, even if empty
        if (value !== null && value !== undefined && value !== '') {
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            
            if (shift && shift.previous !== null && shift.previous !== undefined && shift.previous !== '') {
                const shiftHtml = LegendComponent.getShiftIndicator(
                    numValue,
                    shift.previous,
                    shift.isSignificant || false
                );
                if (shiftHtml) {
                    td.innerHTML = shiftHtml;
                }
            }
        }
        
        row.appendChild(td);
    }
}

// Register slide type
SlideFactory.register('heatmap', HeatMapSlide);

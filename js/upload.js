// Upload form handler
class UploadManager {
    constructor() {
        this.form = document.getElementById('upload-form');
        this.fileInput = document.getElementById('excel-file');
        this.uploadBtn = document.getElementById('upload-btn');
        this.themeSelect = document.getElementById('theme');
        this.filterToggle = document.getElementById('filter-toggle');
        this.filterCheckbox = document.getElementById('enable-filter');
        this.filterPanel = document.getElementById('filter-panel');
        this.filterDimensionsContainer = document.getElementById('filter-dimensions');
        this.filterMatchCount = document.getElementById('filter-match-count');
        this.isProcessing = false;
        this.workbook = null;
        this.previewRows = null;
        this.filterDimensions = [];
        
        this.init();
    }

    init() {
        this.populateThemeOptions();
        this.applySelectedTheme();
        this.updateSurveyNameVisibility();
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => {
                this.applySelectedTheme();
                this.updateSurveyNameVisibility();
                if (this.workbook && this.filterCheckbox && this.filterCheckbox.checked) {
                    this.populateFilters();
                }
            });
        }
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileChange(e));
        if (this.filterCheckbox) {
            this.filterCheckbox.addEventListener('change', () => this.toggleFilterPanel());
        }
    }

    applySelectedTheme() {
        const themeId = this.themeSelect ? this.themeSelect.value : null;
        if (themeId && window.ThemeManager && typeof window.ThemeManager.applyTheme === 'function') {
            window.ThemeManager.applyTheme(themeId);
        }
    }

    populateThemeOptions() {
        if (!this.themeSelect) return;

        const themes = (window.ThemeRegistry && typeof window.ThemeRegistry.listThemes === 'function')
            ? window.ThemeRegistry.listThemes()
            : [{ id: 'default', name: 'Default' }];

        const defaultId = (window.ThemeRegistry && window.ThemeRegistry.defaultThemeId)
            ? window.ThemeRegistry.defaultThemeId
            : (themes[0] ? themes[0].id : 'default');

        this.themeSelect.innerHTML = themes
            .map(t => `<option value="${t.id}">${t.name}</option>`)
            .join('');

        this.themeSelect.value = defaultId;
    }

    updateSurveyNameVisibility() {
        const themeId = this.themeSelect ? this.themeSelect.value : null;
        const theme = (themeId && window.ThemeRegistry && window.ThemeRegistry.getTheme)
            ? window.ThemeRegistry.getTheme(themeId) : null;
        const surveyNameInput = document.getElementById('survey-name');
        if (!surveyNameInput) return;

        const coverSurveyName = theme && theme.cover && theme.cover.surveyName;
        if (coverSurveyName) {
            surveyNameInput.value = coverSurveyName;
            surveyNameInput.removeAttribute('required');
        } else {
            surveyNameInput.value = '';
            surveyNameInput.setAttribute('required', '');
        }
    }

    async handleFileChange(e) {
        const file = e.target.files[0];
        this.workbook = null;
        this.previewRows = null;
        this.filterDimensions = [];
        if (this.filterDimensionsContainer) this.filterDimensionsContainer.innerHTML = '';
        if (this.filterCheckbox) this.filterCheckbox.checked = false;
        if (this.filterPanel) this.filterPanel.classList.add('hidden');
        if (this.filterToggle) this.filterToggle.classList.add('hidden');
        this.updateMatchCount();

        if (file) {
            const fileName = document.querySelector('.file-name');
            if (fileName) {
                fileName.textContent = file.name;
                fileName.style.display = 'block';
            }

            try {
                this.workbook = await this.readWorkbook(file);
                this.previewRows = this.extractPreviewRows();
                if (this.filterToggle) this.filterToggle.classList.remove('hidden');
                showToast('File loaded successfully. You can now configure filters.', 'success');
            } catch (err) {
                console.warn('Pre-parse for filters failed:', err.message);
            }
        }
    }

    extractPreviewRows() {
        if (!this.workbook || !this.workbook.SheetNames) return null;
        const yearSheets = this.workbook.SheetNames.filter(n => /^\d{4}$/.test(n.trim()));
        if (!yearSheets.length) return null;
        yearSheets.sort((a, b) => parseInt(b) - parseInt(a));
        const sheet = this.workbook.Sheets[yearSheets[0]];
        if (!sheet) return null;
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!json || json.length < 5) return null;
        const row4 = json[4];
        const startRow = (row4 && typeof row4[0] === 'string' && row4[0].toLowerCase() === 'code') ? 5 : 4;
        return json.slice(startRow).filter(row =>
            Array.isArray(row) && row.some(cell => cell !== undefined && cell !== '')
        );
    }

    updateMatchCount() {
        if (!this.filterMatchCount) return;
        if (!this.previewRows) {
            this.filterMatchCount.classList.add('hidden');
            return;
        }

        const filters = this.collectActiveFilters();
        if (!filters) {
            this.filterMatchCount.classList.add('hidden');
            return;
        }

        const count = this.previewRows.filter(row =>
            filters.every(f => {
                const val = (row[f.col] ?? '').toString().trim();
                return f.values.includes(val);
            })
        ).length;

        this.filterMatchCount.textContent = '\u{1F4A1} ' + count + ' response' +
            (count !== 1 ? 's' : '') + ' match all selected filters';
        this.filterMatchCount.classList.remove('hidden');
    }

    collectActiveFilters() {
        if (!this.filterDimensionsContainer) return null;
        const filters = [];
        const checkboxes = this.filterDimensionsContainer.querySelectorAll('.filter-dimension-checkbox:checked');
        checkboxes.forEach(cb => {
            const key = cb.dataset.filterKey;
            const select = this.filterDimensionsContainer.querySelector(
                `select.filter-dimension-select[data-filter-key="${key}"]`
            );
            if (!select) return;
            const selected = Array.from(select.selectedOptions).map(o => o.value);
            if (selected.length) {
                filters.push({ key, col: parseInt(select.dataset.filterCol, 10), values: selected });
            }
        });
        return filters.length ? filters : null;
    }

    toggleFilterPanel() {
        if (!this.filterPanel) return;
        const show = this.filterCheckbox && this.filterCheckbox.checked;
        this.filterPanel.classList.toggle('hidden', !show);
        if (show && this.workbook) {
            this.populateFilters();
        }
        this.updateMatchCount();
    }

    populateFilters() {
        if (!this.filterDimensionsContainer || !this.workbook) return;

        const themeId = this.themeSelect ? this.themeSelect.value : null;
        const theme = (themeId && window.ThemeRegistry && window.ThemeRegistry.getTheme)
            ? window.ThemeRegistry.getTheme(themeId) : null;
        const profileId = theme && theme.profileId;
        const profile = (profileId && window.ProfileRegistry && window.ProfileRegistry.getProfile)
            ? window.ProfileRegistry.getProfile(profileId) : null;

        if (!profile || typeof profile.getFilterDimensions !== 'function') {
            this.filterDimensionsContainer.innerHTML =
                '<p class="filter-instructions">Filtering is not available for this theme.</p>';
            this.filterDimensions = [];
            return;
        }

        this.filterDimensions = profile.getFilterDimensions(this.workbook);
        this.filterDimensionsContainer.innerHTML = '';

        this.filterDimensions.forEach(dim => {
            const block = document.createElement('div');
            block.className = 'filter-dimension';

            const header = document.createElement('label');
            header.className = 'filter-dimension-header';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.filterKey = dim.key;
            checkbox.className = 'filter-dimension-checkbox';

            const strong = document.createElement('strong');
            strong.textContent = dim.label;

            header.appendChild(checkbox);
            header.appendChild(strong);
            block.appendChild(header);

            const select = document.createElement('select');
            select.multiple = true;
            select.size = Math.min(dim.values.length, 6);
            select.dataset.filterKey = dim.key;
            select.dataset.filterCol = dim.col;
            select.className = 'filter-dimension-select';
            select.disabled = true;

            checkbox.addEventListener('change', () => {
                select.disabled = !checkbox.checked;
                if (!checkbox.checked) {
                    Array.from(select.options).forEach(o => { o.selected = false; });
                }
                this.updateMatchCount();
            });

            select.addEventListener('change', () => this.updateMatchCount());

            dim.values.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
            });

            block.appendChild(select);
            this.filterDimensionsContainer.appendChild(block);
        });

        this.updateMatchCount();
    }

    collectFilterSelections() {
        if (!this.filterCheckbox || !this.filterCheckbox.checked) return null;
        if (!this.filterDimensionsContainer) return null;

        const filters = [];
        const checkboxes = this.filterDimensionsContainer.querySelectorAll('.filter-dimension-checkbox:checked');
        checkboxes.forEach(cb => {
            const key = cb.dataset.filterKey;
            const select = this.filterDimensionsContainer.querySelector(
                `select.filter-dimension-select[data-filter-key="${key}"]`
            );
            if (!select) return;
            const selected = Array.from(select.selectedOptions).map(o => o.value);
            if (selected.length) {
                filters.push({ key, col: parseInt(select.dataset.filterCol, 10), values: selected });
            }
        });
        return filters.length ? filters : null;
    }

    buildFilteredData(data, filters) {
        if (!filters || !filters.length) return null;

        function filterRows(rows) {
            if (!rows || !rows.length) return rows;
            return rows.filter(row =>
                filters.every(f => {
                    const val = (row[f.col] ?? '').toString().trim();
                    return f.values.includes(val);
                })
            );
        }

        function copySheet(sheet) {
            if (!sheet) return null;
            const rows = filterRows(sheet.rows);
            return Object.assign({}, sheet, { rows, totalResponses: rows.length });
        }

        const filtered = {
            current: copySheet(data.current),
            previous: copySheet(data.previous),
            currentYearLabel: data.currentYearLabel,
            previousYearLabel: data.previousYearLabel,
            allYears: (data.allYears || []).map(entry => ({
                year: entry.year,
                data: copySheet(entry.data)
            }))
        };

        return filtered;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isProcessing) {
            showToast('Processing already in progress', 'warning');
            return;
        }

        const themeId = this.themeSelect ? this.themeSelect.value : null;
        const theme = (themeId && window.ThemeRegistry && window.ThemeRegistry.getTheme)
            ? window.ThemeRegistry.getTheme(themeId) : null;
        const reportName = document.getElementById('report-name').value.trim();
        const file = this.fileInput.files[0];

        const surveyNameInput = document.getElementById('survey-name');
        const surveyName = (surveyNameInput ? surveyNameInput.value.trim() : '') ||
            (theme && theme.cover && theme.cover.surveyName) || '';

        if (!themeId || !reportName || !file) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        if (!(theme && theme.cover && theme.cover.surveyName) && !surveyName) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const slideSize = (theme && theme.slideSize === '4x3') ? '4x3' : '16x9';

        if (!this.validateFile(file)) {
            return;
        }

        this.isProcessing = true;
        this.uploadBtn.disabled = true;
        showLoading();

        const profileId = theme && theme.profileId;
        if (!profileId) {
            showToast('Theme has no profile configured.', 'error');
            return;
        }
        const profile = (window.ProfileRegistry && window.ProfileRegistry.getProfile)
            ? window.ProfileRegistry.getProfile(profileId) : null;
        if (!profile || typeof profile.validateAndParseWorkbook !== 'function') {
            showToast('Profile not found or invalid for this theme.', 'error');
            return;
        }

        try {
            const wb = this.workbook || await this.readWorkbook(file);
            const data = await profile.validateAndParseWorkbook(wb);

            const filters = this.collectFilterSelections();
            const filteredData = filters ? this.buildFilteredData(data, filters) : null;

            const reportData = {
                surveyName,
                reportName,
                theme: themeId,
                slideSize,
                data,
                filteredData,
                filters: filters || null,
                timestamp: new Date().toISOString()
            };

            sessionStorage.setItem('reportData', JSON.stringify(reportData));

            showToast('File processed successfully!', 'success');

            setTimeout(() => {
                window.location.href = 'preview.html';
            }, 1000);

        } catch (error) {
            console.error('Error processing file:', error);
            showToast('Error processing file: ' + error.message, 'error');
            this.isProcessing = false;
            this.uploadBtn.disabled = false;
            hideLoading();
        }
    }

    validateFile(file) {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (!validTypes.includes(file.type) && !hasValidExtension) {
            showToast('Please upload a valid Excel file (.xlsx or .xls)', 'error');
            return false;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showToast('File size exceeds 10MB limit', 'error');
            return false;
        }

        return true;
    }

    readWorkbook(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
}

// Toast notification system
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠'
    };

    const isPersistent = type === 'error';
    if (isPersistent) {
        toast.classList.add('persistent');
    }

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '•'}</span>
        <span class="toast-message">${message}</span>
        <button type="button" class="toast-close" aria-label="Dismiss notification">×</button>
    `;

    const removeToast = () => {
        if (toast.dataset.dismissed) return;
        toast.dataset.dismissed = 'true';
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    container.appendChild(toast);

    if (!isPersistent) {
        setTimeout(removeToast, 3000);
    }
}

// Loading overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new UploadManager();
});


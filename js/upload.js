// Upload form handler
class UploadManager {
    constructor() {
        this.form = document.getElementById('upload-form');
        this.fileInput = document.getElementById('excel-file');
        this.uploadBtn = document.getElementById('upload-btn');
        this.themeSelect = document.getElementById('theme');
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.populateThemeOptions();
        this.updateSurveyNameVisibility();
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => this.updateSurveyNameVisibility());
        }
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileChange(e));
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

    handleFileChange(e) {
        const file = e.target.files[0];
        if (file) {
            const fileName = document.querySelector('.file-name');
            if (fileName) {
                fileName.textContent = file.name;
                fileName.style.display = 'block';
            }
        }
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

        try {
            const data = await this.processExcelFile(file);
            
            const reportData = {
                surveyName,
                reportName,
                theme: themeId,
                slideSize,
                data,
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

    async processExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        reject(new Error('Excel file contains no sheets'));
                        return;
                    }

                    const processSheet = (sheetIndex, { required = false } = {}) => {
                        const sheetName = workbook.SheetNames[sheetIndex];
                        if (!sheetName) return null;
                        
                        const sheet = workbook.Sheets[sheetName];
                        if (!sheet) return null;
                        
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        if (!jsonData || jsonData.length === 0) {
                            return null;
                        }

                        const fail = (message) => {
                            if (required) {
                                throw new Error(message);
                            }
                            return null;
                        };

                        // Expected spreadsheet shape:
                        // - Excel Row 1: optional "grouping" headers (visual grouping only)
                        // - Excel Row 2: actual column headers / question text
                        // - Excel Row 3+: respondent rows
                        if (jsonData.length < 2) {
                            return fail(
                                `Sheet "${sheetName}" is missing required rows. ` +
                                `Expected: Row 1 (grouping, optional), Row 2 (headers, required), Row 3+ (responses, required).`
                            );
                        }

                        const groupHeaders = Array.isArray(jsonData[0]) ? jsonData[0] : [];
                        const headers = Array.isArray(jsonData[1]) ? jsonData[1] : [];
                        const rows = jsonData
                            .slice(2)
                            .filter(row => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== ''));

                        const normalize = (value) => (value ?? '').toString().trim().toLowerCase();

                        // Minimal structural validation: this project relies on fixed column positions.
                        // Validate the first key columns to catch wrong header-row placement early.
                        const expectedHeaderChecks = [
                            { index: 0, contains: 'code', label: 'code' },
                            { index: 1, contains: 'department', label: 'department' },
                            { index: 2, contains: 'cost', label: 'cost centre' },
                            { index: 3, contains: 'location', label: 'location' }
                        ];

                        const headerLooksValid = expectedHeaderChecks.every(check => {
                            const cell = headers[check.index];
                            return normalize(cell).includes(check.contains);
                        });

                        if (!headers.length) {
                            return fail(
                                `Sheet "${sheetName}" header row is missing. ` +
                                `Expected headers in Excel Row 2 (e.g. "code", "department", "cost centre", "location").`
                            );
                        }

                        if (!headerLooksValid) {
                            const headerPreview = headers
                                .slice(0, 6)
                                .map(v => (v ?? '').toString().trim())
                                .filter(Boolean)
                                .join(', ') || '(empty)';

                            return fail(
                                `Sheet "${sheetName}" does not appear to have the expected headers in Excel Row 2. ` +
                                `The first columns should include: code, department, cost centre, location. ` +
                                `Detected header preview: ${headerPreview}`
                            );
                        }

                        if (!rows.length) {
                            return fail(
                                `Sheet "${sheetName}" contains no response rows. ` +
                                `Expected responses starting in Excel Row 3.`
                            );
                        }

                        return {
                            groupHeaders,
                            headers,
                            rows,
                            totalResponses: rows.length,
                            sheetName,
                            sheetIndex
                        };
                    };

                    let currentData;
                    try {
                        currentData = processSheet(0, { required: true });
                    } catch (error) {
                        reject(error);
                        return;
                    }

                    const previousData = workbook.SheetNames.length > 1 ? processSheet(1) : null;

                    const processedData = {
                        current: currentData,
                        previous: previousData,
                        currentYearLabel: '2025',
                        previousYearLabel: previousData ? '2024' : null
                    };

                    resolve(processedData);
                } catch (error) {
                    reject(error);
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


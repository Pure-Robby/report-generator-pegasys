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
        this.applySelectedTheme();
        this.updateSurveyNameVisibility();
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => {
                this.applySelectedTheme();
                this.updateSurveyNameVisibility();
            });
        }
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileChange(e));
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
            const workbook = await this.readWorkbook(file);
            const data = await profile.validateAndParseWorkbook(workbook);

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


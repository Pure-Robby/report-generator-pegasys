// Slide generation logic (Class-based architecture)
class SlideGenerator {
    constructor() {
        this.reportData = DataParser.getReportData();
        if (!this.reportData) return;

        this.slideInstances = [];
        this.tocEntries = [];
        this.totalSlideCount = 0;
        const tm = window.ThemeManager;
        const themeOptions = (tm && typeof tm.getDefaultSlideOptions === 'function')
            ? tm.getDefaultSlideOptions(this.reportData.theme)
            : {};
        const slideSize = this.reportData.slideSize === '4x3' ? '4x3' : '16x9';
        const dims = (tm && typeof tm.getSlideDimensions === 'function')
            ? tm.getSlideDimensions(slideSize)
            : { width: 1280, height: slideSize === '4x3' ? 960 : 720 };
        this.defaultSlideOptions = { ...themeOptions, ...dims };
        
        this.init();
    }

    init() {
        this.generateSlides();
        this.buildTOC();
        this.setupPageNavigation();
        this.setupExportButtons();
        this.setupBackButton();
        this.setupEditableTitle();
    }

    setupEditableTitle() {
        const titleElement = document.getElementById('preview-title');
        if (!titleElement) return;

        titleElement.textContent = this.reportData.reportName;
        
        // Handle blur (when user clicks away)
        titleElement.addEventListener('blur', () => {
            this.updateReportName(titleElement.textContent.trim());
        });

        // Handle Enter key to save and blur
        titleElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur();
            }
        });

        // Prevent empty title
        titleElement.addEventListener('input', (e) => {
            if (e.target.textContent.trim() === '') {
                e.target.textContent = this.reportData.reportName;
            }
        });

        // Handle edit icon click to focus the title
        const editIcon = document.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.addEventListener('click', (e) => {
                e.preventDefault();
                titleElement.focus();
                
                // Place cursor at the end of the text
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(titleElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            });
        }
    }

    updateReportName(newName) {
        if (!newName || newName.trim() === '') {
            const titleElement = document.getElementById('preview-title');
            titleElement.textContent = this.reportData.reportName;
            return;
        }

        const trimmedName = newName.trim();
        
        // Only update if the name actually changed
        if (trimmedName === this.reportData.reportName) {
            return;
        }
        
        // Update local reportData
        this.reportData.reportName = trimmedName;
        
        // Update sessionStorage
        const reportData = DataParser.getReportData();
        if (reportData) {
            reportData.reportName = trimmedName;
            sessionStorage.setItem('reportData', JSON.stringify(reportData));
        }

        // Update cover slide if it exists
        this.updateCoverSlide(trimmedName);

        showToast('Report name updated', 'success');
    }

    updateCoverSlide(newReportName) {
        // Find the cover slide and update its report name
        const coverSlide = document.querySelector('.slide-title');
        if (coverSlide) {
            const reportNameElement = coverSlide.querySelector('h2');
            if (reportNameElement) {
                reportNameElement.textContent = newReportName;
            }
        }
    }

    generateSlides() {
        const container = document.getElementById('slide-container');
        if (!container) return;

        const themeId = this.reportData.theme;
        const theme = (themeId && window.ThemeRegistry && window.ThemeRegistry.getTheme)
            ? window.ThemeRegistry.getTheme(themeId) : null;
        const profileId = theme && theme.profileId;
        if (!profileId) {
            showToast('Theme has no profile configured.', 'error');
            return;
        }
        const profile = (window.ProfileRegistry && window.ProfileRegistry.getProfile)
            ? window.ProfileRegistry.getProfile(profileId) : null;
        if (!profile || typeof profile.buildSlides !== 'function') {
            showToast('Profile not found or invalid for this theme.', 'error');
            return;
        }

        profile.buildSlides(this, container, this.reportData);
    }

    /**
     * Add a slide using the factory pattern
     * @param {string} type - Slide type
     * @param {Object} data - Slide data
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Additional options (pageNumber, logoPath, etc.)
     */
    addSlide(type, data, container, options = {}) {
        try {
            const mergedOptions = { ...this.defaultSlideOptions, ...options };
            const slideInstance = SlideFactory.createSlide(type, data, mergedOptions);
            const slideElement = slideInstance.getSlideElement();
            
            // Add unique ID based on pageNumber if available
            if (mergedOptions.pageNumber) {
                slideElement.id = `slide-${mergedOptions.pageNumber}`;
            }
            
            container.appendChild(slideElement);
            this.slideInstances.push(slideInstance);
            
            // Update total slide count
            if (mergedOptions.pageNumber) {
                this.totalSlideCount = Math.max(this.totalSlideCount, mergedOptions.pageNumber);
            }

            const tocTitle = data.title || (type === 'cover' ? 'Cover' : type);
            this.tocEntries.push({
                pageNumber: mergedOptions.pageNumber || this.tocEntries.length,
                title: tocTitle,
                type: type,
                id: slideElement.id
            });
        } catch (error) {
            console.error(`Error creating ${type} slide:`, error);
            showToast(`Error creating slide: ${error.message}`, 'error');
        }
    }

    buildTOC() {
        if (!this.tocEntries.length) return;

        const groups = [];
        this.tocEntries.forEach(entry => {
            const last = groups[groups.length - 1];
            if (last && last.title === entry.title) {
                last.entries.push(entry);
            } else {
                groups.push({ title: entry.title, entries: [entry] });
            }
        });

        const sidebar = document.createElement('nav');
        sidebar.id = 'toc-sidebar';
        sidebar.className = 'toc-sidebar collapsed';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toc-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Toggle table of contents');
        toggleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
        });
        sidebar.appendChild(toggleBtn);

        document.addEventListener('click', (e) => {
            if (!sidebar.classList.contains('collapsed') && !sidebar.contains(e.target)) {
                sidebar.classList.add('collapsed');
            }
        });

        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const content = document.createElement('div');
        content.className = 'toc-content';

        const heading = document.createElement('div');
        heading.className = 'toc-header';
        heading.innerHTML = '<h3>Contents</h3>';
        content.appendChild(heading);

        const list = document.createElement('ul');
        list.className = 'toc-list';

        groups.forEach(group => {
            const li = document.createElement('li');
            li.className = 'toc-item';
            li.dataset.pages = group.entries.map(e => e.pageNumber).join(',');

            const pageNum = document.createElement('span');
            pageNum.className = 'toc-page-num';
            pageNum.textContent = group.entries[0].pageNumber;

            const title = document.createElement('span');
            title.className = 'toc-title';
            title.textContent = group.title;

            li.appendChild(pageNum);
            li.appendChild(title);

            if (group.entries.length > 1) {
                const count = document.createElement('span');
                count.className = 'toc-count';
                count.textContent = group.entries.length;
                li.appendChild(count);
            }

            li.addEventListener('click', () => {
                if (this.scrollToSlide) {
                    this.scrollToSlide(group.entries[0].pageNumber);
                }
            });

            list.appendChild(li);
        });

        content.appendChild(list);
        sidebar.appendChild(content);
        document.body.appendChild(sidebar);
    }

    updateActiveTocEntry(pageNumber) {
        const items = document.querySelectorAll('.toc-item');
        if (!items.length) return;

        items.forEach(item => {
            const pages = item.dataset.pages.split(',').map(Number);
            if (pages.includes(pageNumber)) {
                if (!item.classList.contains('active')) {
                    item.classList.add('active');
                    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else {
                item.classList.remove('active');
            }
        });
    }

    setupBackButton() {
        document.getElementById('back-btn').addEventListener('click', () => {
            if (confirm('Return to upload page? Current progress will be lost.')) {
                sessionStorage.removeItem('reportData');
                window.location.href = 'index.html';
            }
        });
    }

    setupPageNavigation() {
        const navElement = document.getElementById('page-navigation');
        const inputElement = document.getElementById('page-nav-input');
        const totalElement = document.getElementById('page-nav-total');
        const upButton = document.getElementById('page-nav-up');
        const downButton = document.getElementById('page-nav-down');

        if (!navElement || !inputElement || !totalElement || !upButton || !downButton) {
            return;
        }

        // Hide navigation if no slides
        if (this.totalSlideCount === 0) {
            navElement.style.display = 'none';
            return;
        }

        // Initialize total pages display
        totalElement.textContent = this.totalSlideCount;
        inputElement.max = this.totalSlideCount;

        let currentPage = 1;
        let isNavigating = false; // Prevent observer from updating during manual navigation

        // Update UI based on current page
        const updateUI = (page) => {
            inputElement.value = page;
            upButton.disabled = page <= 1;
            downButton.disabled = page >= this.totalSlideCount;
        };

        // Scroll to a specific slide
        const scrollToSlide = (pageNumber) => {
            const slideElement = document.getElementById(`slide-${pageNumber}`);
            if (slideElement) {
                slideVisibility.clear();
                isNavigating = true;
                currentPage = pageNumber;
                updateUI(currentPage);
                this.updateActiveTocEntry(currentPage);
                slideElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => {
                    isNavigating = false;
                    slideVisibility.clear();
                }, 500);
            }
        };
        this.scrollToSlide = scrollToSlide;

        // Intersection Observer to detect which slide is most visible
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -20% 0px', // Consider slide visible when 20% from top/bottom
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };

        const slideVisibility = new Map();
        
        const observerCallback = (entries) => {
            // Ignore observer updates during manual navigation
            if (isNavigating) return;

            entries.forEach(entry => {
                const slideId = entry.target.id;
                if (!slideId) return;
                
                const pageNum = parseInt(slideId.replace('slide-', ''));
                if (isNaN(pageNum)) return;
                
                if (entry.isIntersecting) {
                    // Calculate visibility ratio (how much of the slide is visible)
                    const rect = entry.boundingClientRect;
                    const viewportHeight = window.innerHeight;
                    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                    const visibilityRatio = Math.max(0, visibleHeight / rect.height);
                    slideVisibility.set(pageNum, visibilityRatio);
                } else {
                    slideVisibility.delete(pageNum);
                }
            });

            // Find the slide with highest visibility
            // Only update if we have visibility data and we're not navigating
            if (slideVisibility.size > 0 && !isNavigating) {
                let maxVisibility = 0;
                let mostVisiblePage = currentPage;

                slideVisibility.forEach((ratio, pageNum) => {
                    if (ratio > maxVisibility) {
                        maxVisibility = ratio;
                        mostVisiblePage = pageNum;
                    }
                });

                if (mostVisiblePage !== currentPage && maxVisibility > 0.3) {
                    currentPage = mostVisiblePage;
                    updateUI(currentPage);
                    this.updateActiveTocEntry(currentPage);
                }
            }
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all slides
        for (let i = 1; i <= this.totalSlideCount; i++) {
            const slideElement = document.getElementById(`slide-${i}`);
            if (slideElement) {
                observer.observe(slideElement);
            }
        }

        // Initial check to detect the currently visible slide on page load
        setTimeout(() => {
            let mostVisiblePage = 1;
            let maxVisibility = 0;

            for (let i = 1; i <= this.totalSlideCount; i++) {
                const slideElement = document.getElementById(`slide-${i}`);
                if (slideElement) {
                    const rect = slideElement.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                    const visibilityRatio = Math.max(0, visibleHeight / rect.height);
                    
                    if (visibilityRatio > maxVisibility) {
                        maxVisibility = visibilityRatio;
                        mostVisiblePage = i;
                    }
                }
            }

            if (mostVisiblePage !== currentPage) {
                currentPage = mostVisiblePage;
                updateUI(currentPage);
                this.updateActiveTocEntry(currentPage);
            }
        }, 100);

        // Input field handlers
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const pageNum = parseInt(inputElement.value);
                if (pageNum >= 1 && pageNum <= this.totalSlideCount) {
                    scrollToSlide(pageNum);
                } else {
                    inputElement.value = currentPage;
                }
                inputElement.blur();
            }
        });

        inputElement.addEventListener('blur', () => {
            const pageNum = parseInt(inputElement.value);
            if (pageNum >= 1 && pageNum <= this.totalSlideCount) {
                if (pageNum !== currentPage) {
                    scrollToSlide(pageNum);
                }
            } else {
                inputElement.value = currentPage;
            }
        });

        // Navigation button handlers
        upButton.addEventListener('click', () => {
            if (currentPage > 1 && !isNavigating) {
                const targetPage = currentPage - 1;
                scrollToSlide(targetPage);
            }
        });

        downButton.addEventListener('click', () => {
            if (currentPage < this.totalSlideCount && !isNavigating) {
                const targetPage = currentPage + 1;
                scrollToSlide(targetPage);
            }
        });

        // Initialize UI state
        updateUI(1);
    }

    setupExportButtons() {
        document.getElementById('export-ppt-btn').addEventListener('click', () => {
            exportToPPT(this.reportData, this.slideInstances);
        });

        document.getElementById('export-pdf-btn').addEventListener('click', () => {
            exportToPDF(this.reportData);
        });
    }
    getYearLabel(label, fallback) {
        if (!label) return fallback;
        const match = label.toString().match(/(19|20)\d{2}/);
        if (match) return match[0];
        return label;
    }
}

// Helper function for toast notifications (if not already loaded)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new SlideGenerator();
});


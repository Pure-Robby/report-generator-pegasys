// Export functions for PPT and PDF

/**
 * Capture a slide element as an image using html2canvas
 * @param {HTMLElement} slideElement - The slide DOM element to capture
 * @param {{ width: number, height: number }} [dimensions] - Optional slide dimensions (from getSlideDimensions); used to force size during capture
 * @returns {Promise<string>} Base64 data URL of the captured image
 */
function getCaptureDimensions(dimensions) {
    if (dimensions && typeof dimensions.width === 'number' && typeof dimensions.height === 'number') {
        return dimensions;
    }
    const tm = window.ThemeManager;
    return (tm && typeof tm.getSlideDimensions === 'function' && typeof tm.getReportSlideSize === 'function')
        ? tm.getSlideDimensions(tm.getReportSlideSize())
        : { width: 1280, height: 720 };
}

function setExportGuard(enabled) {
    const handler = (e) => {
        e.preventDefault();
        e.returnValue = '';
    };

    if (enabled) {
        window.addEventListener('beforeunload', handler);
        window.__exportBeforeUnloadHandler = handler;
    } else if (window.__exportBeforeUnloadHandler) {
        window.removeEventListener('beforeunload', window.__exportBeforeUnloadHandler);
        window.__exportBeforeUnloadHandler = null;
    }
}

async function captureSlideAsImage(slideElement, dimensions) {
    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library is not loaded. Please check the HTML file.');
    }

    const { width: captureWidth, height: captureHeight } = getCaptureDimensions(dimensions);

    // Store original scroll position and styles
    const originalScrollY = window.scrollY;
    const originalScrollX = window.scrollX;
    
    // Store original styles for elements we'll modify
    const originalStyles = {
        images: [],
        header: null,
        contentArea: null
    };
    
    // Ensure slide is visible and maintains chosen dimensions for capture
    slideElement.style.display = 'flex';
    slideElement.style.visibility = 'visible';
    slideElement.style.opacity = '1';
    slideElement.style.width = `${captureWidth}px`;
    slideElement.style.maxWidth = `${captureWidth}px`;
    slideElement.style.minWidth = `${captureWidth}px`;
    slideElement.style.height = `${captureHeight}px`;
    
    // Get natural dimensions - verify element is actually visible
    const rect = slideElement.getBoundingClientRect();
    
    const computedStyle = window.getComputedStyle(slideElement);
    const naturalWidth = parseInt(computedStyle.width) || captureWidth;
    const naturalHeight = parseInt(computedStyle.height) || captureHeight;
    
    // Pre-load all images and ensure they're accessible
    const images = slideElement.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            // Store original styles
            originalStyles.images.push({
                element: img,
                display: img.style.display,
                visibility: img.style.visibility,
                opacity: img.style.opacity,
                crossOrigin: img.crossOrigin
            });
            
            // Fix in original DOM: ensure visibility and CORS
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
            if (img.crossOrigin !== 'anonymous') {
                img.crossOrigin = 'anonymous';
            }
            
            if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
            }
            
            const timeout = setTimeout(() => resolve(), 5000);
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(); // Continue even if image fails
            };
            
            // Force reload if needed
            if (img.src && !img.complete) {
                const src = img.src;
                img.src = '';
                img.src = src;
            }
        });
    });
    await Promise.all(imagePromises);
    
    // Pre-load background images (cover, divider)
    const bgImageUrls = [];
    const slideTitle = slideElement.querySelector('.slide-title');
    const slideDivider = slideElement.querySelector('.slide-divider');
    
    // Helper to resolve relative URLs to absolute
    const resolveUrl = (url) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        // Resolve relative path
        const a = document.createElement('a');
        a.href = url;
        return a.href;
    };
    
    if (slideTitle) {
        const bgStyle = window.getComputedStyle(slideTitle).backgroundImage;
        const urlMatch = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
            bgImageUrls.push(resolveUrl(urlMatch[1]));
        }
    }
    
    if (slideDivider) {
        const bgStyle = window.getComputedStyle(slideDivider).backgroundImage;
        const urlMatch = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
            bgImageUrls.push(resolveUrl(urlMatch[1]));
        }
    }
    
    // Pre-load background images
    const bgImagePromises = bgImageUrls.map(url => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => resolve(), 5000);
            img.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(); // Continue even if fails
            };
            img.src = url;
        });
    });
    await Promise.all(bgImagePromises);
    
    // Wait for all images to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Remove max-height constraint from content area
    const contentArea = slideElement.querySelector('.slide-page-content');
    if (contentArea) {
        originalStyles.contentArea = {
            element: contentArea,
            maxHeight: contentArea.style.maxHeight,
            overflow: contentArea.style.overflow
        };
        contentArea.style.maxHeight = 'none';
        contentArea.style.overflow = 'visible';
    }

    // Boost Chart.js resolution for export (temporary)
    // This improves chart sharpness when slides are captured/upscaled.
    const EXPORT_CHART_DPR = 3; // try 2 first if performance becomes heavy

    // We'll store originals in originalStyles so we can restore in finally
    originalStyles.charts = [];

    const canvases = slideElement.querySelectorAll('canvas');

    canvases.forEach((canvas) => {
    let chart = null;

    // 1) If you (or a plugin) attached it manually
    if (canvas.chart) chart = canvas.chart;

    // 2) Chart.js v3/v4 supported lookup
    if (!chart && window.Chart && typeof window.Chart.getChart === 'function') {
        chart = window.Chart.getChart(canvas);
    }

    // 3) Fallback for setups that still expose instances collections
    if (!chart && window.Chart && window.Chart.instances) {
        try {
        const instances = Array.isArray(window.Chart.instances)
            ? window.Chart.instances
            : Object.values(window.Chart.instances);

        chart = instances.find((c) => c && c.canvas === canvas) || null;
        } catch (_) {}
    }

    if (!chart || !chart.options) return;

    // Store originals for restore
    originalStyles.charts.push({
        chart,
        dpr: chart.options.devicePixelRatio,
        animation: chart.options.animation
    });

    // Apply export settings
    chart.options.devicePixelRatio = EXPORT_CHART_DPR;
    chart.options.animation = false;

    // Force re-render at higher DPR
    if (typeof chart.resize === 'function') chart.resize();
    if (typeof chart.update === 'function') chart.update('none');
    });

    // Small settle time for canvas redraw
    await new Promise((resolve) => setTimeout(resolve, 50));


    try {
        // Verify element is in viewport and visible before capture
        const checkRect = slideElement.getBoundingClientRect();
        const finalComputed = window.getComputedStyle(slideElement);
        
        // Element should now be at top of viewport (0,0)
        const finalRect = slideElement.getBoundingClientRect();
        
        // Capture the slide - element is now at top of viewport
        // Get the actual bounding rect to ensure we capture the full element
        const captureRect = slideElement.getBoundingClientRect();
        const canvas = await html2canvas(slideElement, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: true, // Enable logging to debug - check console for errors
            allowTaint: true, // Allow local images
            removeContainer: false,
            width: naturalWidth,
            height: naturalHeight,
            // Don't specify x/y - let html2canvas calculate from element's bounding rect
            // This ensures the full element is captured regardless of viewport size
            windowWidth: Math.max(window.innerWidth, naturalWidth), // Ensure viewport is wide enough
            windowHeight: Math.max(window.innerHeight, naturalHeight), // Ensure viewport is tall enough
            foreignObjectRendering: false, // Disable experimental feature - may cause blank captures
            imageTimeout: 20000, // Longer timeout for images
            ignoreElements: (element) => {
                return element.id === 'loading-overlay' || 
                       element.classList.contains('preview-header') ||
                       element.classList.contains('back-to-top') ||
                       element.id === 'toast-container' ||
                       element.id === 'export-thumbnails';
            },
            onclone: (clonedDoc, element) => {
                // IMPORTANT: `element` is the cloned version of `slideElement`
                const clonedSlide = element;
            
                // Make the cloned document predictable
                clonedDoc.documentElement.style.width = 'auto';
                clonedDoc.documentElement.style.height = 'auto';
                clonedDoc.body.style.margin = '0';
                clonedDoc.body.style.padding = '0';
                clonedDoc.body.style.overflow = 'hidden';
            
                // Remove UI in clone (belt & braces – you already ignore some too)
                clonedDoc.getElementById('loading-overlay')?.remove();
                clonedDoc.querySelector('.preview-header')?.remove();
                clonedDoc.querySelector('.back-to-top')?.remove();
                clonedDoc.getElementById('toast-container')?.remove();
                clonedDoc.getElementById('export-thumbnails')?.remove();
            
                // Put ONLY the cloned slide at top-left for capture
                clonedSlide.style.position = 'fixed';
                clonedSlide.style.left = '0';
                clonedSlide.style.top = '0';
                clonedSlide.style.margin = '0';
                clonedSlide.style.transform = 'none';
                clonedSlide.style.zIndex = '1';
                // White background and no border-radius so captured image has no black corners
                clonedSlide.style.backgroundColor = '#ffffff';
                clonedSlide.style.borderRadius = '0';
            
                // ---- keep your existing background-image preservation logic below ----
                const elementsWithBg = clonedSlide.querySelectorAll('.slide-title, .slide-divider');
                elementsWithBg.forEach(el => {
                    const classMatch = Array.from(slideElement.querySelectorAll('*')).find(orig => {
                        return orig.classList.contains(el.classList[0]);
                    });
            
                    if (classMatch) {
                        const computedStyle = window.getComputedStyle(classMatch);
                        if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
                            const bgImage = computedStyle.backgroundImage;
                            el.style.backgroundImage = bgImage;
                            el.style.backgroundSize = computedStyle.backgroundSize || 'cover';
                            el.style.backgroundPosition = computedStyle.backgroundPosition || 'center center';
                            el.style.backgroundRepeat = computedStyle.backgroundRepeat || 'no-repeat';
                            el.style.backgroundAttachment = 'scroll';
                            void el.offsetHeight;
                        }
                    }
                });
            }
            
        });

        // Verify canvas has content
        if (canvas.width === 0 || canvas.height === 0) {
            console.error('Canvas has invalid dimensions:', canvas.width, 'x', canvas.height);
            console.error('Slide element:', slideElement);
            console.error('Slide rect:', slideElement.getBoundingClientRect());
            throw new Error(`Canvas has invalid dimensions: ${canvas.width}x${canvas.height}`);
        }
        
        // Check if canvas is actually blank (all white/transparent)
        const ctx = canvas.getContext('2d');
        const sampleData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const hasNonWhitePixels = sampleData.data.some((val, idx) => {
            return idx % 4 !== 3 && val !== 255; // Check RGB channels, skip alpha
        });
        
        if (!hasNonWhitePixels && canvas.width > 0 && canvas.height > 0) {
        }
        
        // Convert canvas to base64 image
        // const imageDataUrl = canvas.toDataURL('image/png', 1.0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8); //jpeg produces smaller files
        
        if (!imageDataUrl || imageDataUrl === 'data:,') {
            throw new Error('Failed to generate image data from slide');
        }
        
        return imageDataUrl;
    } finally {
        slideElement.style.width = '';
        slideElement.style.maxWidth = '';
        slideElement.style.minWidth = '';
        
        // Restore scroll position
        window.scrollTo(originalScrollX, originalScrollY);
        
        // Restore image styles
        originalStyles.images.forEach(({ element, display, visibility, opacity, crossOrigin }) => {
            element.style.display = display;
            element.style.visibility = visibility;
            element.style.opacity = opacity;
            if (crossOrigin) {
                element.crossOrigin = crossOrigin;
            }
        });
        
        // // Restore header border
        // if (originalStyles.header) {
        //     const { element, borderBottom } = originalStyles.header;
        //     element.style.borderBottom = borderBottom;
        // }
        
        // Restore content area styles
        if (originalStyles.contentArea) {
            const { element, maxHeight, overflow } = originalStyles.contentArea;
            element.style.maxHeight = maxHeight;
            element.style.overflow = overflow;
        }

        // Restore Chart.js DPR/animation
        if (originalStyles.charts && originalStyles.charts.length) {
            originalStyles.charts.forEach(({ chart, dpr, animation }) => {
            if (!chart || !chart.options) return;
        
            // Restore DPR (delete if it was originally undefined)
            if (typeof dpr === 'undefined') {
                delete chart.options.devicePixelRatio;
            } else {
                chart.options.devicePixelRatio = dpr;
            }
        
            // Restore animation config
            chart.options.animation = animation;
        
            if (typeof chart.resize === 'function') chart.resize();
            if (typeof chart.update === 'function') chart.update('none');
            });
        }  
    }
}

// Export to PowerPoint using PptxGenJS - Image-based approach
async function exportToPPT(reportData, slideInstances) {
    showLoading();

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = loadingOverlay?.querySelector('p');
    const progressBar = document.getElementById('export-progress'); // optional
    const exportThumb = document.getElementById('export-thumb');    // single thumbnail
    const cancelBtn = document.getElementById('cancel-export');     // optional

    // Cancel support (optional)
    let exportCancelled = false;
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            exportCancelled = true;
            if (loadingText) loadingText.textContent = 'Cancelling export...';
        };
    }

    // UI elements to hide during export
    const header = document.querySelector('.preview-header');
    const backToTop = document.querySelector('.back-to-top');
    const toastContainer = document.getElementById('toast-container');

    const originalHeaderDisplay = header ? header.style.display : '';
    const originalBackToTopDisplay = backToTop ? backToTop.style.display : '';
    const originalToastDisplay = toastContainer ? toastContainer.style.display : '';

    try {
        // Library checks
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library is not loaded.');
        }

        if (typeof PptxGenJS === 'undefined') {
            if (typeof pptxgen !== 'undefined') {
                window.PptxGenJS = pptxgen;
            } else {
                throw new Error('PptxGenJS library is not loaded.');
            }
        }

        const pptx = new PptxGenJS();
        const slideSize = reportData.slideSize === '4x3' ? '4x3' : '16x9';
        const dims = (window.ThemeManager && window.ThemeManager.getSlideDimensions)
            ? window.ThemeManager.getSlideDimensions(slideSize)
            : { width: 1280, height: slideSize === '4x3' ? 960 : 720 };
        pptx.layout = slideSize === '4x3' ? 'LAYOUT_4x3' : 'LAYOUT_16x9';
        pptx.author = 'PPT Report Generator';
        pptx.title = reportData.reportName;
        pptx.subject = reportData.surveyName;

        const slideElements = document.querySelectorAll('.slide');
        if (!slideElements.length) {
            throw new Error('No slides found to export.');
        }

        // Hide non-export UI
        if (header) header.style.display = 'none';
        if (backToTop) backToTop.style.display = 'none';
        if (toastContainer) toastContainer.style.display = 'none';

        // Ensure overlay is on top
        if (loadingOverlay) {
            loadingOverlay.style.zIndex = '99999';
        }

        // Initial UI state
        if (loadingText) loadingText.textContent = 'Preparing export...';
        if (progressBar) progressBar.style.width = '0%';
        if (exportThumb) exportThumb.src = '';

        // Ensure slides are rendered
        slideElements.forEach((slide, index) => {
            slide.style.display = 'flex';
            slide.style.visibility = 'visible';
            if (!slide.dataset.slideId) {
                slide.dataset.slideId = `slide-${index}`;
            }
        });

        // Small delay to allow charts/layouts to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // ---- MAIN EXPORT LOOP ----
        for (let i = 0; i < slideElements.length; i++) {
            if (exportCancelled) {
                throw new Error('Export cancelled by user');
            }

            const slideElement = slideElements[i];

            // Update loading message
            if (loadingText) {
                loadingText.textContent =
                    `Processing slide ${i + 1} of ${slideElements.length}...`;
            }

            // Update progress bar
            if (progressBar) {
                const pct = Math.round(((i + 1) / slideElements.length) * 100);
                progressBar.style.width = `${pct}%`;
            }

            try {
                // Capture slide at report's chosen dimensions
                const imageData = await captureSlideAsImage(slideElement, dims);

                // ✅ Update SINGLE thumbnail element
                if (exportThumb) {
                    exportThumb.src = imageData;
                }

                // Add slide to PPT (inches: 16:9 = 10x5.625, 4:3 = 10x7.5)
                const pptSlide = pptx.addSlide();
                const pptH = slideSize === '4x3' ? 7.5 : 5.625;
                pptSlide.addImage({
                    data: imageData,
                    x: 0,
                    y: 0,
                    w: 10,
                    h: pptH
                });

            } catch (slideError) {
                console.error(`Error capturing slide ${i + 1}:`, slideError);
                // Continue exporting remaining slides
            }
        }

        // Finalise
        if (loadingText) loadingText.textContent = 'Finalising PowerPoint file...';

        const fileName =
            `${reportData.reportName.replace(/[^a-z0-9]/gi, '_')}.pptx`;

        await pptx.writeFile({ fileName });

        showToast('PowerPoint exported successfully!', 'success');

    } catch (error) {
        console.error('Error exporting to PPT:', error);

        if (error.message === 'Export cancelled by user') {
            showToast('Export cancelled', 'error');
        } else {
            showToast('Error exporting to PowerPoint: ' + error.message, 'error');
        }

    } finally {        
        try { setExportGuard(false); } catch (_) {}
        document.body.classList.remove('exporting');

        if (header) header.style.display = originalHeaderDisplay;
        if (backToTop) backToTop.style.display = originalBackToTopDisplay;
        if (toastContainer) toastContainer.style.display = originalToastDisplay;

        hideLoading();
    }
}

async function exportToPDF(reportData) {
    showLoading();
  
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = loadingOverlay?.querySelector('p');
    const progressBar = document.getElementById('export-progress'); // optional
    const exportThumb = document.getElementById('export-thumb');    // single thumb
    const cancelBtn = document.getElementById('cancel-export');     // optional
  
    // Cancel support (optional)
    let exportCancelled = false;
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        exportCancelled = true;
        if (loadingText) loadingText.textContent = 'Cancelling export...';
      };
    }
  
    // Hide UI elements that shouldn't appear in capture
    const header = document.querySelector('.preview-header');
    const backToTop = document.querySelector('.back-to-top');
    const toastContainer = document.getElementById('toast-container');
  
    const originalHeaderDisplay = header ? header.style.display : '';
    const originalBackToTopDisplay = backToTop ? backToTop.style.display : '';
    const originalToastDisplay = toastContainer ? toastContainer.style.display : '';
  
    // Helper: px -> pt (PDF points). Assumes 96dpi screen CSS pixels.
    const pxToPt = (px) => px * 72 / 96;
  
    try {
      // jsPDF availability
      const jsPDF = window.jspdf?.jsPDF;
      if (!jsPDF) throw new Error('jsPDF is not loaded.');
  
      const slideElements = document.querySelectorAll('.slide');
      if (!slideElements.length) throw new Error('No slides found to export.');

      const pdfSlideSize = reportData.slideSize === '4x3' ? '4x3' : '16x9';
      const pdfDims = (window.ThemeManager && window.ThemeManager.getSlideDimensions)
        ? window.ThemeManager.getSlideDimensions(pdfSlideSize)
        : { width: 1280, height: pdfSlideSize === '4x3' ? 960 : 720 };
      const pageWPt = pxToPt(pdfDims.width);
      const pageHPt = pxToPt(pdfDims.height);
  
      // Hide non-export UI
      if (header) header.style.display = 'none';
      if (backToTop) backToTop.style.display = 'none';
      if (toastContainer) toastContainer.style.display = 'none';
  
      if (loadingOverlay) loadingOverlay.style.zIndex = '99999';
  
      if (loadingText) loadingText.textContent = 'Preparing PDF export...';
      if (progressBar) progressBar.style.width = '0%';
      if (exportThumb) exportThumb.src = '';
  
      // Ensure slides are rendered
      slideElements.forEach((slide) => {
        slide.style.display = 'flex';
        slide.style.visibility = 'visible';
      });
  
      await new Promise(r => setTimeout(r, 300));
  
      // Determine page size from first slide’s rendered size
      const pdf = new jsPDF({
        orientation: pageWPt >= pageHPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageWPt, pageHPt],
        compress: true
      });
  
      for (let i = 0; i < slideElements.length; i++) {
        if (exportCancelled) throw new Error('Export cancelled by user');
  
        if (loadingText) {
          loadingText.textContent = `Processing slide ${i + 1} of ${slideElements.length}...`;
        }
        if (progressBar) {
          const pct = Math.round(((i + 1) / slideElements.length) * 100);
          progressBar.style.width = `${pct}%`;
        }
  
        // Capture slide at report's chosen dimensions
        const imageData = await captureSlideAsImage(slideElements[i], pdfDims);
  
        // Update overlay thumbnail
        if (exportThumb) exportThumb.src = imageData;
  
        // Add new page after the first
        if (i > 0) {
          pdf.addPage([pageWPt, pageHPt], pageWPt >= pageHPt ? 'landscape' : 'portrait');
        }
  
        // Full-bleed image
        // If your captureSlideAsImage outputs JPEG data URLs, use 'JPEG'. If PNG, use 'PNG'.
        const isPng = imageData.startsWith('data:image/png');
        pdf.addImage(imageData, isPng ? 'PNG' : 'JPEG', 0, 0, pageWPt, pageHPt);
      }
  
      if (loadingText) loadingText.textContent = 'Finalising PDF file...';
  
      const fileName = `${reportData.reportName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdf.save(fileName);
  
      showToast('PDF exported successfully!', 'success');
  
    } catch (error) {
      console.error('Error exporting to PDF:', error);
  
      if (error?.message === 'Export cancelled by user') {
        showToast('Export cancelled', 'info');
      } else {
        showToast('Error exporting to PDF: ' + error.message, 'error');
      }
  
    } finally {
      // Always restore state + guard off
      try { setExportGuard(false); } catch (_) {}
      document.body.classList.remove('exporting');
  
      if (header) header.style.display = originalHeaderDisplay;
      if (backToTop) backToTop.style.display = originalBackToTopDisplay;
      if (toastContainer) toastContainer.style.display = originalToastDisplay;
  
      hideLoading();
    }
  }
  

// // Export to PDF
// function exportToPDF(reportData) {
//     try {
//         // Hide loading overlay before printing
//         hideLoading();
        
//         // Use browser's print functionality for PDF export
//         const originalTitle = document.title;
//         document.title = reportData.reportName;

//         // Show all slides for printing
//         const slides = document.querySelectorAll('.slide');
//         const lastSlide = slides[slides.length - 1];
        
//         slides.forEach((slide, index) => {
//             slide.style.display = 'flex';
//             slide.classList.remove('active');
//             // Remove page-break-after from last slide to prevent blank page
//             if (slide === lastSlide) {
//                 slide.style.pageBreakAfter = 'auto';
//             }
//         });

//         // Hide all UI elements that shouldn't be printed
//         const header = document.querySelector('.preview-header');
//         const backToTop = document.querySelector('.back-to-top');
//         const toastContainer = document.getElementById('toast-container');
//         const loadingOverlay = document.getElementById('loading-overlay');
        
//         if (header) header.style.display = 'none';
//         if (backToTop) backToTop.style.display = 'none';
//         if (toastContainer) toastContainer.style.display = 'none';
//         if (loadingOverlay) loadingOverlay.style.display = 'none';

//         // Small delay to ensure styles are applied before print
//         setTimeout(() => {
//             // Trigger print dialog
//             window.print();

//             // Restore original state after print dialog closes
//             setTimeout(() => {
//                 document.title = originalTitle;
//                 slides.forEach((slide, index) => {
//                     if (index !== document.querySelector('.slide.active')) {
//                         slide.style.display = 'none';
//                     }
//                     // Restore page-break-after for all slides
//                     slide.style.pageBreakAfter = '';
//                 });
                
//                 // Restore UI elements
//                 if (header) header.style.display = '';
//                 if (backToTop) backToTop.style.display = '';
//                 if (toastContainer) toastContainer.style.display = '';
//                 if (loadingOverlay) loadingOverlay.style.display = '';
                
//                 showToast('PDF export completed. If you saved the file, check your downloads folder.', 'success');
//             }, 500);
//         }, 100);

//     } catch (error) {
//         console.error('Error exporting to PDF:', error);
//         hideLoading();
//         showToast('Error exporting to PDF: ' + error.message, 'error');
//     }
// }

// Toast and loading functions (shared with upload.js)
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

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}


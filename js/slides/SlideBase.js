/**
 * Base class for all slide types
 * Provides common functionality and enforces interface
 */
class SlideBase {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      width: 1280,
      height: 720,
      ...options,
    };
    this.slideElement = null;
  }

  /**
   * Render the slide as HTML element
   * Must be implemented by subclasses
   * @returns {HTMLElement}
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Get or create the slide element
   * @returns {HTMLElement}
   */
  getSlideElement() {
    if (!this.slideElement) {
      this.slideElement = this.render();
    }
    return this.slideElement;
  }

  /**
   * Create base slide container
   * @param {string} className - Additional CSS class
   * @returns {HTMLElement}
   */
  createSlideContainer(className = '') {
    const slide = document.createElement('div');
    slide.className = `slide ${className}`;
    return slide;
  }

  /**
   * Create standard slide layout with header, footer, logo, page number
   * @param {string} title - Slide title for header
   * @param {number} pageNumber - Page number
   * @param {string} className - Additional CSS class
   * @returns {Object} Object containing slide element and content area
   */
  createStandardLayout(title, pageNumber, className = '') {
    const slide = this.createSlideContainer(`slide-standard ${className}`);

    // Page Header
    const header = document.createElement('div');
    header.className = 'slide-page-header';

    const headerTitle = document.createElement('h1');
    headerTitle.textContent = title;
    header.appendChild(headerTitle);

    // Logo
    const logo = this.createLogo();
    header.appendChild(logo);

    slide.appendChild(header);

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'slide-page-content';
    slide.appendChild(contentArea);

    // Footer
    const footer = this.createFooter(pageNumber);
    slide.appendChild(footer);

    return {
      slide,
      contentArea,
    };
  }

  /**
   * Create logo element
   * @returns {HTMLElement}
   */
  createLogo() {
    const img = document.createElement('img');
    // Use custom logo path from options, or default to company logo
    img.src = this.options.logoPath || 'assets/logo.png';
    img.alt = 'Pegasys Logo';
    img.height = 30;
    img.className = 'slide-page-logo';

    // Fallback to placeholder if image fails to load
    img.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'slide-page-logo-placeholder';
      placeholder.textContent = 'Pegasys';
      img.parentNode.replaceChild(placeholder, img);
    };

    return img;
  }

  /**
   * Create footer with copyright and page number
   * @param {number} pageNumber - Page number
   * @returns {HTMLElement}
   */
  createFooter(pageNumber) {
    const footer = document.createElement('div');
    footer.className = 'slide-page-footer';

    const footerLeft = document.createElement('div');
    footerLeft.className = 'slide-page-footer-left';
    footerLeft.innerHTML = (
      this.options.footerText ||
      'Powered by Pure Survey (PTY) Ltd © <span id="year"></span>. Rights Reserved'
    ).replace('<span id="year"></span>', new Date().getFullYear());

    const footerRight = document.createElement('div');
    footerRight.className = 'slide-page-footer-right';
    footerRight.textContent = pageNumber;

    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);

    return footer;
  }

  /**
   * Create slide header (for content within standard layout)
   * @param {string} title - Header title
   * @returns {HTMLElement}
   */
  createHeader(title) {
    const header = document.createElement('div');
    header.className = 'slide-header';
    header.innerHTML = `<h2>${title}</h2>`;
    return header;
  }

  /**
   * Create slide body
   * @returns {HTMLElement}
   */
  createBody() {
    const body = document.createElement('div');
    body.className = 'slide-body';
    return body;
  }

  /**
   * Get slide type name
   * @returns {string}
   */
  getType() {
    return this.constructor.name.replace('Slide', '').toLowerCase();
  }

  /**
   * Validate required data fields
   * @param {Array} requiredFields - Array of required field names
   * @throws {Error} If required fields are missing
   */
  validateData(requiredFields) {
    for (const field of requiredFields) {
      if (!(field in this.data)) {
        throw new Error(
          `Missing required field: ${field} for ${this.constructor.name}`
        );
      }
    }
  }
}

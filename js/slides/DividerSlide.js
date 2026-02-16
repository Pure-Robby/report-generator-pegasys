/**
 * Divider slide for section breaks
 */
class DividerSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title']);
    }

    render() {
        const slide = this.createSlideContainer('slide-divider');
        
        slide.innerHTML = `
            <div class="divider-content">
                <h1>${this.data.title}</h1>
                ${this.data.subtitle ? `<p class="subtitle">${this.data.subtitle}</p>` : ''}
            </div>
        `;
        
        return slide;
    }
}

// Register slide type
SlideFactory.register('divider', DividerSlide);


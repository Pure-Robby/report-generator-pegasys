/**
 * Cover slide with background image
 */
class CoverSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['surveyName', 'reportName', 'date']);
    }

    render() {
        const slide = this.createSlideContainer('slide-title');
        const placement = this.data.textPlacement === 'left' ? 'left' : 'right';
        slide.classList.add(`slide-title--${placement}`);

        slide.innerHTML = `
            <div class="title-content">
                <h1 class="survey-name mb-4">${this.data.surveyName}</h1>
                <h2>${this.data.reportName}</h2>
                <p class="date">${this.data.date}</p>
            </div>
        `;
        
        return slide;
    }
}

// Register slide type
SlideFactory.register('cover', CoverSlide);


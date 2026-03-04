/**
 * Thank you slide: full-bleed, centered logo and "Thank You" text.
 */
class ThankYouSlide extends SlideBase {
  constructor(data, options = {}) {
    super(data || {}, options);
  }

  render() {
    const slide = this.createSlideContainer('thank-you-slide');
    const logoPath = this.options.logoPath || this.data.logoPath || 'assets/pegasys/pegasys-logo-v2.png';
    const wrapper = document.createElement('div');
    wrapper.className = 'thank-you-slide__content';
    const img = document.createElement('img');
    img.src = logoPath;
    img.alt = 'Logo';
    img.className = 'thank-you-slide__logo';
    const heading = document.createElement('h1');
    heading.className = 'thank-you-slide__title';
    heading.textContent = 'Thank You';
    wrapper.appendChild(img);
    wrapper.appendChild(heading);
    slide.appendChild(wrapper);
    return slide;
  }
}

SlideFactory.register('thank-you', ThankYouSlide);

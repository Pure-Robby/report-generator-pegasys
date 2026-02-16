/**
 * Shared rating scale component (5-point agreement scale).
 * Used on question and intro slides to keep visuals consistent.
 */
class RatingScaleComponent {
  /**
   * Create the rating scale element.
   * @returns {HTMLTableElement}
   */
  static createTable() {
    const ratingScale = document.createElement('div');
    ratingScale.className = 'rating-scale';

    ratingScale.innerHTML = `
            <div><span class="fw-semibold">STRONGLY DISAGREE:</span><span>0%</span></div>
            <div><span class="fw-semibold">DISAGREE:</span><span>25%</span></div>
            <div><span class="fw-semibold">NEUTRAL:</span><span>50%</span></div>
            <div><span class="fw-semibold">AGREE:</span><span>75%</span></div>
            <div><span class="fw-semibold">STRONGLY AGREE:</span><span>100%</span></div>
        `;

    return ratingScale;
  }
}

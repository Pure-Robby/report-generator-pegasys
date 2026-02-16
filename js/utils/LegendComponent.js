/**
 * Reusable legend component for engagement categories and shift indicators
 * Used across methodology and heatmap slides
 */
class LegendComponent {
  /**
   * Generate engagement legend HTML
   * @param {Object} options - Configuration options
   * @param {boolean} options.showCategories - Show color-coded engagement categories (default: true)
   * @param {boolean} options.showShiftIndicators - Show shift indicator legend (default: false)
   * @returns {string} HTML string for legend
   */
  static generateEngagementLegend(options = {}) {
    const { showCategories = true, showShiftIndicators = false } = options;

    let html = '<div class="engagement-legend-wrapper">';

    if (showCategories) {
      html += `
                <div class="engagement-categories">
                    <div>Actively Disengaged (&lt;25%)</div>
                    <div>Disengaged (>=25% AND &lt;52%)</div>
                    <div>Ambivalent (>=52% AND &lt;65%)</div>
                    <div>Engaged (>=65% AND &lt;75%)</div>
                    <div>Actively Engaged (>=75%)</div>
                </div>
            `;
    }

    if (showShiftIndicators) {
      html += `
                <div class="shift-indicators-legend">
                    <div class="legend-item">
                        <div>
                            <span class="shift-symbol significant-up">↑</span>
                            <span class="shift-symbol significant-down">↓</span>
                        </div>
                        <span>Statistically significant improvement/decline since previous survey</span>
                    </div>
                    <div class="legend-item">
                        <div>                        
                            <span class="shift-symbol up">↑</span>
                            <span class="shift-symbol down">↓</span>
                        </div>
                        <span>Shows movement since previous survey</span>
                    </div>
                    <div class="legend-item">
                        <span>|</span>
                        <span>n = Sample size </span>
                        <span>|</span>
                        <span>Please Note: No data shown for a group of 3 or less people</span>
                    </div>
                </div>
            `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Get shift indicator HTML for a cell
   * @param {number} currentValue - Current year value
   * @param {number} previousValue - Previous year value (optional)
   * @param {boolean} isSignificant - Whether the change is statistically significant
   * @returns {string} HTML string for shift indicator
   */
  static getShiftIndicator(currentValue, previousValue, isSignificant = false) {
    if (
      !previousValue ||
      previousValue === null ||
      previousValue === undefined ||
      previousValue === ''
    ) {
      return '';
    }

    const diff = currentValue - previousValue;

    if (Math.abs(diff) < 1) {
      return ''; // No significant movement
    }

    const direction = diff > 0 ? 'up' : 'down';
    const arrow = diff > 0 ? '↑' : '↓';
    const className = `shift-indicator ${direction}${
      isSignificant ? ' significant' : ''
    }`;

    return `<span class="${className}">${arrow}</span>`;
  }
}

/**
 * Shared rating scale component. Renders from theme.ratingScale (4- or 5-point).
 */
class RatingScaleComponent {
  /**
   * Create the rating scale element from active theme config.
   * @param {Object} [overrideTheme] - Optional theme override (e.g. for tests)
   * @returns {HTMLDivElement}
   */
  static createTable(overrideTheme) {
    const theme = overrideTheme || (typeof window !== 'undefined' && window.ThemeManager && window.ThemeManager.getActiveTheme && window.ThemeManager.getActiveTheme());
    const defaultScale = (typeof window !== 'undefined' && window.ThemeRegistry && window.ThemeRegistry.defaultRatingScale) ? window.ThemeRegistry.defaultRatingScale : null;
    const scale = (theme && theme.ratingScale && theme.ratingScale.items) ? theme.ratingScale : (defaultScale || {
      points: 5,
      items: [
        { label: 'STRONGLY DISAGREE', pct: '0%' },
        { label: 'DISAGREE', pct: '25%' },
        { label: 'NEUTRAL', pct: '50%' },
        { label: 'AGREE', pct: '75%' },
        { label: 'STRONGLY AGREE', pct: '100%' }
      ]
    });
    const items = scale.items || [];

    const ratingScale = document.createElement('div');
    ratingScale.className = 'rating-scale';
    ratingScale.innerHTML = items.map(item => `
      <div><span class="fw-semibold">${item.label}:</span><span>${item.pct}</span></div>
    `).join('');

    return ratingScale;
  }
}

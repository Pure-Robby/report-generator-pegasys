/**
 * Theme manager (runtime).
 * - Reads reportData.theme from sessionStorage
 * - Applies CSS variables to :root
 * - Updates ColorMapper chart palette (JS-driven charts)
 * - Exposes default slide options (logoPath)
 */
(function () {
  const applyCssVar = (name, value) => {
    if (value === null || value === undefined || value === '') return;
    document.documentElement.style.setProperty(name, value);
  };

  const applyTheme = (themeId) => {
    const theme = window.ThemeRegistry ? window.ThemeRegistry.getTheme(themeId) : null;
    if (!theme) return null;

    const toAbsoluteUrl = (maybeRelativeUrl) => {
      if (!maybeRelativeUrl) return null;
      try {
        return new URL(maybeRelativeUrl, document.baseURI).href;
      } catch {
        return null;
      }
    };

    // Core colors / fonts (reuse existing variable names where possible)
    applyCssVar('--primary-color', theme.colors.primary);
    applyCssVar('--secondary-color', theme.colors.secondary);
    applyCssVar('--text-color', theme.colors.text);
    applyCssVar('--text-muted-color', theme.colors.textMuted);
    applyCssVar('--text-subtle-color', theme.colors.textSubtle);
    applyCssVar('--bg-color', theme.colors.background);
    applyCssVar('--border-color', theme.colors.border);

    applyCssVar('--primary-font-family', theme.fonts.body);
    applyCssVar('--headings-font-family', theme.fonts.headings);

    // Slide imagery
    const coverAbs = toAbsoluteUrl(theme.assets.coverImage);
    const dividerAbs = toAbsoluteUrl(theme.assets.dividerImage);
    applyCssVar('--slide-cover-image', coverAbs ? `url("${coverAbs}")` : null);
    applyCssVar('--slide-divider-image', dividerAbs ? `url("${dividerAbs}")` : null);

    // Surfaces / tables
    applyCssVar('--surface-color', theme.colors.surface);
    applyCssVar('--surface-muted-color', theme.colors.surfaceMuted);
    applyCssVar('--table-header-bg', theme.colors.tableHeaderBg);
    applyCssVar('--table-header-text', theme.colors.tableHeaderText);
    applyCssVar('--table-accent-row-bg', theme.colors.tableAccentRowBg);
    applyCssVar('--heatmap-highlight', theme.colors.heatmapHighlight);

    // Charts
    applyCssVar('--chart-series-primary', theme.charts.seriesPrimary);
    applyCssVar('--chart-series-secondary', theme.charts.seriesSecondary);

    if (window.ColorMapper && window.ColorMapper.COLORS && window.ColorMapper.COLORS.chart) {
      window.ColorMapper.COLORS.chart.primary = theme.charts.seriesPrimary;
      window.ColorMapper.COLORS.chart.secondary = theme.charts.seriesSecondary;
      window.ColorMapper.COLORS.chart.text = theme.colors.text;
      window.ColorMapper.COLORS.chart.grid = theme.colors.border;
      window.ColorMapper.COLORS.chart.accent = theme.colors.secondary;
    }

    return theme;
  };

  const getReportThemeId = () => {
    try {
      const raw = sessionStorage.getItem('reportData');
      if (!raw) return window.ThemeRegistry ? window.ThemeRegistry.defaultThemeId : null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.theme ? parsed.theme : (window.ThemeRegistry ? window.ThemeRegistry.defaultThemeId : null);
    } catch {
      return window.ThemeRegistry ? window.ThemeRegistry.defaultThemeId : null;
    }
  };

  const getDefaultSlideOptions = (themeId) => {
    const theme = window.ThemeRegistry ? window.ThemeRegistry.getTheme(themeId) : null;
    return theme ? { logoPath: theme.assets.logoPath } : {};
  };

  const activeThemeId = getReportThemeId();
  const activeTheme = applyTheme(activeThemeId);

  window.ThemeManager = {
    getActiveThemeId: () => activeThemeId,
    getActiveTheme: () => activeTheme,
    applyTheme,
    getDefaultSlideOptions
  };
})();


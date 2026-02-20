/**
 * Theme registry (no bundler). Exposes window.ThemeRegistry.
 *
 * A theme provides:
 * - colors: primary/secondary + neutrals
 * - fonts: body/headings
 * - assets: logo + slide background images
 * - charts: primary/secondary series colors
 */
(function () {
  const themes = {
    pegasys: {
      id: 'pegasys',
      name: 'Pegasys',
      slideSize: '16x9',
      cover: {
        surveyName: 'Employee Engagement Survey',
        date: 'February 2026'
      },
      colors: {
        primary: '#4b4b55',
        secondary: '#fa6401',
        text: '#1e293b',
        textMuted: '#64748b',
        textSubtle: '#94a3b8',
        background: '#f8fafc',
        border: '#e2e8f0',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        tableHeaderBg: '#1e293b',
        tableHeaderText: '#ffffff',
        tableAccentRowBg: '#e0e7ff',
        heatmapHighlight: '#3b82f6'
      },
      fonts: {
        body: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        headings: "'Merriweather', serif"
      },
      assets: {
        logoPath: 'assets/pegasys-logo.png',
        coverImage: 'assets/pagasys-cover-image.jpg',
        dividerImage: 'assets/pagasys-divider.jpg'
      },
      charts: {
        seriesPrimary: '#4472C4',
        seriesSecondary: '#000000'
      }
    },
    neutral: {
      id: 'neutral',
      name: 'Neutral (Blue)',
      slideSize: '16x9',
      cover: {
        surveyName: '',
        date: ''
      },
      colors: {
        primary: '#0f172a',
        secondary: '#2563eb',
        text: '#0f172a',
        textMuted: '#475569',
        textSubtle: '#94a3b8',
        background: '#f8fafc',
        border: '#e2e8f0',
        surface: '#ffffff',
        surfaceMuted: '#f1f5f9',
        tableHeaderBg: '#0f172a',
        tableHeaderText: '#ffffff',
        tableAccentRowBg: '#dbeafe',
        heatmapHighlight: '#2563eb'
      },
      fonts: {
        body: "Roboto, sans-serif, system-ui, -apple-system, 'Segoe UI', Arial",
        headings: "Roboto, sans-serif, system-ui, -apple-system, 'Segoe UI', Arial"
      },
      assets: {
        logoPath: 'assets/logo.png',
        coverImage: 'assets/cover image.png',
        dividerImage: 'assets/divider.jpg'
      },
      charts: {
        seriesPrimary: '#2563eb',
        seriesSecondary: '#111827'
      }
    }
  };

  const defaultThemeId = 'pegasys';

  const listThemes = () =>
    Object.values(themes).map(({ id, name }) => ({ id, name }));

  const getTheme = (id) => {
    if (id && themes[id]) return themes[id];
    return themes[defaultThemeId];
  };

  window.ThemeRegistry = {
    defaultThemeId,
    listThemes,
    getTheme
  };
})();


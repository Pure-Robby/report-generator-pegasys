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
      profileId: 'pegasys',
      slideSize: '4x3',
      cover: {
        surveyName: 'Employee Engagement Survey',
        date: 'February 2026',
        textPlacement: 'right'
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
        logoPath: 'assets/pegasys/pegasys-logo.png',
        coverImage: 'assets/pegasys/pegasys-cover.jpg',
        dividerImage: 'assets/pegasys/pegasys-divider.jpg'
      },
      charts: {
        seriesPrimary: '#4472C4',
        seriesSecondary: '#000000',
        seriesColors: ['#FFB800', '#FA6401', '#333333', '#999999']
      }
    },
    seacom: {
      id: 'seacom',
      name: 'Seacom',
      profileId: 'seacom',
      slideSize: '16x9',
      cover: {
        surveyName: '',
        date: '',
        textPlacement: 'left'
      },
      colors: {
        primary: '#2563eb',
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
        body: "Poppins, sans-serif, system-ui, -apple-system, 'Segoe UI', Arial",
        headings: "Poppins, sans-serif, system-ui, -apple-system, 'Segoe UI', Arial"
      },
      assets: {
        logoPath: 'assets/seacom/seacom-logo.png',
        coverImage: 'assets/seacom/seacom-cover.jpg',
        dividerImage: 'assets/seacom/seacom-divider.jpg'
      },
      charts: {
        seriesPrimary: '#2563eb',
        seriesSecondary: '#111827',
        seriesColors: ['#2563eb', '#111827']
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


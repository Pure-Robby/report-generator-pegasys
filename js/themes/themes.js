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
      methodology: {
        invitations: 146
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
      },
      ratingScale: {
        points: 4,
        items: [
          { label: 'STRONGLY AGREE', pct: '100%' },
          { label: 'AGREE', pct: '66%' },
          { label: 'DISAGREE', pct: '33%' },
          { label: 'STRONGLY DISAGREE', pct: '0%' }
        ]
      },
      engagementLegend: {
        layout: 'table',
        thresholds: [50, 65, 85],
        items: [
          { range: '≥85', category: 'Actively Engaged', description: 'Exceptionally high levels of motivation and passion which will help move the company forward', class: 'engagement-peg-1' },
          { range: '65-&lt;85', category: 'Engaged', description: 'High levels of motivation and care which will drive growth and high performance', class: 'engagement-peg-2' },
          { range: '51-&lt;65', category: 'Ambivalent', description: 'Adequate levels of motivation which will contribute to maintenance of current operations', class: 'engagement-peg-3' },
          { range: '&lt;50', category: 'Disengaged', description: 'Some indicators of unhappiness and dissatisfaction which are impacting poorly on motivation', class: 'engagement-peg-4' }
        ]
      },
      riskLegend: {
        items: [
          { label: 'Low Risk (< 20)', class: 'risk-low' },
          { label: 'Medium Risk (20 - 35)', class: 'risk-medium' },
          { label: 'High Risk (35 - 50)', class: 'risk-high' },
          { label: 'Very High Risk (> 50)', class: 'risk-very-high' }
        ]
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
      methodology: {
        invitations: 444
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
      },
      ratingScale: {
        points: 5,
        items: [
          { label: 'STRONGLY DISAGREE', pct: '0%' },
          { label: 'DISAGREE', pct: '25%' },
          { label: 'NEUTRAL', pct: '50%' },
          { label: 'AGREE', pct: '75%' },
          { label: 'STRONGLY AGREE', pct: '100%' }
        ]
      },
      engagementLegend: {
        layout: 'list',
        thresholds: [25, 52, 65, 75],
        items: [
          { label: 'Actively Disengaged (< 25%)', class: 'engagement-very-low' },
          { label: 'Disengaged (25 - 52%)', class: 'engagement-low' },
          { label: 'Ambivalent (52 - 65%)', class: 'engagement-moderate' },
          { label: 'Engaged (65 - 75%)', class: 'engagement-high' },
          { label: 'Actively Engaged (≥ 75%)', class: 'engagement-very-high' }
        ]
      },
      riskLegend: {
        items: [
          { label: 'Low Risk (< 20)', class: 'risk-low' },
          { label: 'Medium Risk (20 - 35)', class: 'risk-medium' },
          { label: 'High Risk (35 - 50)', class: 'risk-high' },
          { label: 'Very High Risk (> 50)', class: 'risk-very-high' }
        ]
      }
    }
  };

  const defaultRatingScale = {
    points: 5,
    items: [
      { label: 'STRONGLY DISAGREE', pct: '0%' },
      { label: 'DISAGREE', pct: '25%' },
      { label: 'NEUTRAL', pct: '50%' },
      { label: 'AGREE', pct: '75%' },
      { label: 'STRONGLY AGREE', pct: '100%' }
    ]
  };

  const defaultEngagementLegend = {
    layout: 'list',
    items: [
      { label: 'Actively Disengaged (< 25%)', class: 'engagement-very-low' },
      { label: 'Disengaged (25 - 52%)', class: 'engagement-low' },
      { label: 'Ambivalent (52 - 65%)', class: 'engagement-moderate' },
      { label: 'Engaged (65 - 75%)', class: 'engagement-high' },
      { label: 'Actively Engaged (≥ 75%)', class: 'engagement-very-high' }
    ]
  };

  const defaultRiskLegend = {
    items: [
      { label: 'Low Risk (< 20)', class: 'risk-low' },
      { label: 'Medium Risk (20 - 35)', class: 'risk-medium' },
      { label: 'High Risk (35 - 50)', class: 'risk-high' },
      { label: 'Very High Risk (> 50)', class: 'risk-very-high' }
    ]
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
    getTheme,
    defaultRatingScale,
    defaultEngagementLegend,
    defaultRiskLegend
  };
})();


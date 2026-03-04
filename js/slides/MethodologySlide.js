/**
 * Report Methodology Slide
 * Introduces the report methodology and provides a glossary of terms
 * Includes rating scale for the survey questions and scoring legend
 * Includes dynamic data: number of responses, total headcount, response rate
 */
class MethodologySlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title']);
    }

    render() {
        // Use standard layout
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title, 
            pageNumber, 
            'slide-text methodology-slide'
        );
        
        const body = this.createBody();
        
        contentArea.appendChild(body);
        
        
        return slide;
    }

    createBody() {
        const body = document.createElement('div');
        body.className = 'methodology-content';

        const formatNumber = (value) => {
            if (value === null || value === undefined || value === '') return '—';
            if (typeof value === 'number' && Number.isFinite(value)) {
                return new Intl.NumberFormat().format(value);
            }
            if (typeof value === 'string') {
                const normalized = value.replace(/,/g, '').trim();
                const asNumber = Number(normalized);
                if (Number.isFinite(asNumber)) return new Intl.NumberFormat().format(asNumber);
                return value;
            }
            return String(value);
        };

        const formatPercent = (value) => {
            if (value === null || value === undefined || value === '') return '—';
            if (typeof value === 'string' && value.trim().endsWith('%')) return value.trim();
            const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
            const asNumber = Number(normalized);
            if (Number.isFinite(asNumber)) return `${asNumber}%`;
            return String(value);
        };

        const theme = (typeof window !== 'undefined' && window.ThemeManager && window.ThemeManager.getActiveTheme && window.ThemeManager.getActiveTheme()) || null;
        const defaultScale = (typeof window !== 'undefined' && window.ThemeRegistry && window.ThemeRegistry.defaultRatingScale) ? window.ThemeRegistry.defaultRatingScale : null;
        const scale = (theme && theme.ratingScale && theme.ratingScale.items) ? theme.ratingScale : defaultScale;
        const scaleItems = (scale && scale.items) ? scale.items : [
            { label: 'STRONGLY DISAGREE', pct: '0%' },
            { label: 'DISAGREE', pct: '25%' },
            { label: 'NEUTRAL', pct: '50%' },
            { label: 'AGREE', pct: '75%' },
            { label: 'STRONGLY AGREE', pct: '100%' }
        ];
        const ratingHeaders = scaleItems.map(item => `<th>${item.label}</th>`).join('');
        const ratingNumbers = scaleItems.map((_, i) => `<td>${i + 1}</td>`).join('');
        const ratingPcts = scaleItems.map(item => `<td>${item.pct}</td>`).join('');

        const engagementConfig = (theme && theme.engagementLegend) || (window.ThemeRegistry && window.ThemeRegistry.defaultEngagementLegend) || null;
        const engagementLegendHtml = (typeof ColorMapper !== 'undefined' && ColorMapper.buildEngagementLegendFromConfig)
            ? ColorMapper.buildEngagementLegendFromConfig(engagementConfig)
            : '';

        const hideDistribution = Boolean(
            this.data.isFiltered &&
            theme &&
            theme.methodology &&
            theme.methodology.hideDistributionWhenFiltered
        );
        const distributionSection = hideDistribution ? '' : `
            <h3>Distribution Details</h3>
            <div class="kpi-grid mb-3" role="list" aria-label="Survey distribution KPIs">
                <div class="kpi-card" role="listitem">
                    <div class="kpi-label">Invitations</div>
                    <div class="kpi-value">${formatNumber(this.data.invitations)}</div>
                    <div class="kpi-subtext">Email invitations distributed</div>
                </div>
                <div class="kpi-card" role="listitem">
                    <div class="kpi-label">Unique responses</div>
                    <div class="kpi-value">${formatNumber(this.data.uniqueResponses)}</div>
                    <div class="kpi-subtext">Responses at survey close</div>
                </div>
                <div class="kpi-card kpi-card--accent" role="listitem">
                    <div class="kpi-label">Participation rate</div>
                    <div class="kpi-value">${formatPercent(this.data.responseRate)}</div>
                    <div class="kpi-subtext">Overall response rate</div>
                </div>
            </div>
            `;

        body.innerHTML = `
            <h3>Confidentiality</h3>
            <p class="mb-3">All survey responses and scores are hosted by Pure Survey and your individual feedback will remain completely anonymous.  All data that is 
            collected and reported on by Pure Survey is stored in a secure database, on a secure server platform, ensuring confidentiality and integrity of the data.
            </p>

            <p class="mb-3">Pure Survey is aligned with SAMRA (South African Marketing Research Association) and strives to promote and maintain professional standards in research.</p>
            
            ${distributionSection}

            <h3>Satisfaction Index (%)</h3>
            <p class="mb-3">Statements with subsequent agreement factors, which made use of a ${(scale && scale.points) || 5} point scale. Statements were selected as the base for the Engagement Index. 
            All responses given for the questions were converted into a percentage based ${(scale && scale.points) === 4 ? '33%' : '25%'} integers.
            </p>

            <h3>Rating Scale</h3>
            <table class="mb-3 methodology-rating-table">
                <thead>
                    <tr>                        
                        ${ratingHeaders}
                    </tr>
                </thead>
                <tbody>
                
                <tr>
                    
                    ${ratingPcts}
                </tr>
                </tbody>
            </table>
            <p>The responses were multiplied by each weighting and this total is then divided by the total sample. Therefore, an engagement index is calculated per statement. Each statement or dimension is then colour coded as per the groupings below.</p>
            <div class="engagement-categories">${engagementLegendHtml}</div>
        `;
        
        return body;
    }

}

// Register slide type
SlideFactory.register('methodology', MethodologySlide);
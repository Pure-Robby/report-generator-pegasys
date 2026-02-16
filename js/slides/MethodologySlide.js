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
        
        body.innerHTML = `
            <h3>Confidentiality</h3>
            <p class="mb-3">All survey responses and scores are hosted by Pure Survey and your individual feedback will remain completely anonymous.  All data that is 
            collected and reported on by Pure Survey is stored in a secure database, on a secure server platform, ensuring confidentiality and integrity of the data.
            </p>

            <p class="mb-3">Pure Survey is aligned with SAMRA (South African Marketing Research Association) and strives to promote and maintain professional standards in research.</p>
            
            <h3>Distribution Details</h3>
            <div class="kpi-grid mb-3" role="list" aria-label="Survey distribution KPIs">
                <div class="kpi-card" role="listitem">
                    <div class="kpi-label">Invitations</div>
                    <div class="kpi-value">146</div><!-- TODO: Add invitations ${formatNumber(this.data.invitations)}-->
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

            <h3>Satisfaction Index (%)</h3>
            <p class="mb-3">Statements with subsequent agreement factors, which made use of a 4 point scale. Statements were selected as the base for the Engagement Index. 
            All responses given for the questions were converted into a percentage based 33% integers.
            </p>

            <h3>Rating Scale</h3>
            <table class="mb-3">
                <thead>
                    <tr>
                        <th rowspan="2"></th>
                        <th>STRONGLY DISAGREE</th>
                        <th>DISAGREE</th>
                        <th>AGREE</th>
                        <th>STRONGLY AGREE</th>
                    </tr>
                </thead>
                <tbody>
                <tr>
                    <td></td>
                    <td>1</td>
                    <td>2</td>
                    <td>3</td>
                    <td>4</td>
                </tr>
                <tr>
                    <td>Analysis</td>
                    <td>0%</td>
                    <td>33%</td>
                    <td>66%</td>
                    <td>100%</td>
                </tr>
                </tbody>
            </table>
            <p>The responses were multiplied by each weighting and this total is then divided by the total sample. Therefore, an engagement index is calculated per statement. Each statement or dimension is then colour coded as per the groupings below.</p>
            <div class="engagement-categories">
                <div>Actively Disengaged (< 25%)</div>
                <div>Disengaged (>=25% AND <52%)</div>
                <div>Ambivalent (>=52% AND <65%)</div>
                <div>Engaged (>=65% AND <75%)</div>
                <div>Actively Engaged (>=75%)</div>
            </div>

        `;
        
        return body;
    }

}

// Register slide type
SlideFactory.register('methodology', MethodologySlide);
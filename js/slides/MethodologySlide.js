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
        
        body.innerHTML = `
            <h3>Confidentiality</h3>
            <p class="mb-3">Pure Survey is a member of the South African Marketing Research Association (SAMRA) and abides by the ethical standards set by SAMRA, of which confidentiality is a key stipulation. All survey responses are hosted by Pure Survey. All data that is collected and reported on by Pure Survey is in line with SEACOM's data protection requirements.</p>
            
            <h3>Surveying Methods</h3>
            <p class="mb-3">The Employee Engagement Survey was conducted electronically via the internet and email. The survey was distributed by means of an email invitation, which contained a clickable link directing participants to the survey hosted on Pure Survey's server. There were ${this.data.uniqueResponses} unique responses completed out of the total headcount of ${this.data.totalHeadcount} which equates to a response rate of ${this.data.responseRate}%</p>


            <h3>Glossary</h3>
            <ul class="mb-3">
                <li>eNPS: Employee Net Promoter Score calculated from one question of "How likely are you to recommend SEACOM to friends or family?"</li>
                <li>n: Sample size</li>
                <li>Insufficient sample sizes: No data shown for a group of 3 or less people</li>
            </ul>

            <h3>Rating Scale</h3>
            <p class="mb-3">The rating scale was translated into a percentage for ease of analysis and interpretation.</p>
            <table class="mb-3">
                <thead>
                    <tr>
                        <th rowspan="2"></th>
                        <th>STRONGLY DISAGREE</th>
                        <th>DISAGREE</th>
                        <th>NEUTRAL</th>
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
                    <td>5</td>
                </tr>
                <tr>
                    <td>Analysis</td>
                    <td>0%</td>
                    <td>25%</td>
                    <td>50%</td>
                    <td>75%</td>
                    <td>100%</td>
                </tr>
                </tbody>
            </table>
            <p>The ratings from the questions are then combined into an index, segmenting employees into five (5) categories:</p>
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
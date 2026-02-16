/**
 * Color mapping utilities for heat maps and visualizations
 */
class ColorMapper {
    // Color palettes
    static COLORS = {
        // Engagement colors (matching legend colors)
        engagement: {
            veryHigh: { bg: '#00AF50', text: '#ffffff', hex: '00AF50' }, // Green - Actively Engaged (>=75%)
            high: { bg: '#92D051', text: '#ffffff', hex: '92D051' },     // Light green - Engaged (65-75%)
            moderate: { bg: '#FFC000', text: '#000000', hex: 'FFC000' }, // Yellow/Orange - Ambivalent (52-65%)
            low: { bg: '#FE0000', text: '#ffffff', hex: 'FE0000' },      // Red - Disengaged (25-52%)
            veryLow: { bg: '#B00108', text: '#ffffff', hex: 'B00108' }   // Dark red - Actively Disengaged (<25%)
        },
        
        // Risk colors
        risk: {
            low: { bg: '#10b981', text: '#ffffff', hex: '10b981' },      // Green
            medium: { bg: '#f59e0b', text: '#000000', hex: 'f59e0b' },   // Yellow
            high: { bg: '#f97316', text: '#ffffff', hex: 'f97316' },     // Orange
            veryHigh: { bg: '#ef4444', text: '#ffffff', hex: 'ef4444' }  // Red
        },
        
        // Chart colors
        chart: {
            primary: '#4472C4',    // Blue
            secondary: '#000000',  // Black
            accent: '#667eea',
            grid: '#e2e8f0',
            text: '#1e293b'
        }
    };

    /**
     * Get engagement color based on percentage
     * @param {number} percentage - Engagement percentage (0-100)
     * @returns {Object} Color object with bg, text, hex
     */
    static getEngagementColor(percentage) {
        // Match legend thresholds: <25%, 25-52%, 52-65%, 65-75%, >=75%
        if (percentage >= 75) return this.COLORS.engagement.veryHigh;
        if (percentage >= 65) return this.COLORS.engagement.high;
        if (percentage >= 52) return this.COLORS.engagement.moderate;
        if (percentage >= 25) return this.COLORS.engagement.low;
        return this.COLORS.engagement.veryLow;
    }

    /**
     * Get risk color based on percentage
     * @param {number} percentage - Risk percentage (0-100)
     * @returns {Object} Color object with bg, text, hex
     */
    static getRiskColor(percentage) {
        if (percentage < 20) return this.COLORS.risk.low;
        if (percentage < 35) return this.COLORS.risk.medium;
        // High Risk is inclusive of 50 (35 - 50); Very High is strictly > 50.
        if (percentage <= 50) return this.COLORS.risk.high;
        return this.COLORS.risk.veryHigh;
    }

    /**
     * Get CSS style string for cell
     * @param {number} value - Numeric value
     * @param {string} type - Type ('engagement' or 'risk')
     * @returns {string} CSS style string
     */
    static getCellStyle(value, type = 'engagement') {
        const color = type === 'risk' 
            ? this.getRiskColor(value) 
            : this.getEngagementColor(value);
        
        return `background-color: ${color.bg}; color: ${color.text};`;
    }

    /**
     * Get CSS class for cell
     * @param {number} value - Numeric value
     * @param {string} type - Type ('engagement' or 'risk')
     * @returns {string} CSS class name
     */
    static getCellClass(value, type = 'engagement') {
        if (type === 'risk') {
            if (value < 20) return 'risk-low';
            if (value < 35) return 'risk-medium';
            // High Risk is inclusive of 50 (35 - 50); Very High is strictly > 50.
            if (value <= 50) return 'risk-high';
            return 'risk-very-high';
        } else {
            // Match legend thresholds: <25%, 25-52%, 52-65%, 65-75%, >=75%
            if (value >= 75) return 'engagement-very-high';
            if (value >= 65) return 'engagement-high';
            if (value >= 52) return 'engagement-moderate';
            if (value >= 25) return 'engagement-low';
            return 'engagement-very-low';
        }
    }

    /**
     * Generate legend HTML
     * @param {string} type - Legend type ('engagement' or 'risk')
     * @returns {string} HTML string
     */
    static generateLegend(type = 'engagement') {
        const items = type === 'risk' ? [
            { label: 'Low Risk (< 20)', class: 'risk-low' },
            { label: 'Medium Risk (20 - 35)', class: 'risk-medium' },
            { label: 'High Risk (35 - 50)', class: 'risk-high' },
            { label: 'Very High Risk (> 50)', class: 'risk-very-high' }
        ] : [
            { label: 'Actively Engaged (> 75%)', class: 'engagement-very-high' },
            { label: 'Engaged (65 - 75%)', class: 'engagement-high' },
            { label: 'Moderate (50 - 65%)', class: 'engagement-moderate' },
            { label: 'Disengaged (35 - 50%)', class: 'engagement-low' },
            { label: 'Actively Disengaged (< 35%)', class: 'engagement-very-low' }
        ];

        return `
            <div class="legend">
                ${items.map(item => `
                    <div class="legend-item">
                        <span class="legend-color ${item.class}"></span>
                        <span class="legend-label">${item.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}


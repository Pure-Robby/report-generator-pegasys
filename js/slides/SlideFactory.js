/**
 * Factory for creating slide instances
 * Centralizes slide creation logic
 */
class SlideFactory {
    static slideTypes = {};

    /**
     * Register a slide type
     * @param {string} type - Slide type identifier
     * @param {Class} SlideClass - Slide class constructor
     */
    static register(type, SlideClass) {
        this.slideTypes[type] = SlideClass;
    }

    /**
     * Create a slide instance
     * @param {string} type - Slide type identifier
     * @param {Object} data - Slide data
     * @param {Object} options - Slide options
     * @returns {SlideBase} Slide instance
     */
    static createSlide(type, data, options = {}) {
        const SlideClass = this.slideTypes[type];
        
        if (!SlideClass) {
            console.error(`Available slide types: ${Object.keys(this.slideTypes).join(', ')}`);
            throw new Error(`Unknown slide type: ${type}`);
        }

        return new SlideClass(data, options);
    }

    /**
     * Get all registered slide types
     * @returns {Array} Array of registered type names
     */
    static getRegisteredTypes() {
        return Object.keys(this.slideTypes);
    }

    /**
     * Check if a slide type is registered
     * @param {string} type - Slide type identifier
     * @returns {boolean}
     */
    static isRegistered(type) {
        return type in this.slideTypes;
    }
}


/**
 * Introductory slide explaining the Employee Net Promoter Score (eNPS).
 * Static content to provide context before displaying eNPS data.
 */
class ENPSIntroSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title']);
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'slide-table enps-intro-slide'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        this.buildContent(body);

        return slide;
    }

    buildContent(container) {
        const sections = [
            {
                title: 'What is eNPS?',
                paragraphs: [
                    'The Employee Net Promoter Score (eNPS) is a metric used to measure employee satisfaction and loyalty towards their employer. It is based on the Net Promoter Score (NPS), which measures customer loyalty. Employees are asked a single question: "On a scale of 0 to 10, how likely are you to recommend our company as a place to work?"'
                ]
            },
            {
                title: 'How are employees classified?',
                paragraphs: ['Employees fall into one of three categories based on their score:'],
                list: [
                    'Promoters (score of 9-10): Highly satisfied employees who enthusiastically recommend their employer.',
                    'Passives (score of 7-8): Generally satisfied employees who may not actively promote the organization.',
                    'Detractors (score of 0-6): Dissatisfied employees who may discourage others from joining.'
                ]
            },
            {
                title: 'How is eNPS calculated?',
                paragraphs: [
                    'The eNPS is calculated by subtracting the percentage of detractors from the percentage of promoters. Scores range from -100 (all detractors) to 100 (all promoters).'
                ]
            },
            {
                title: 'What is a “good” eNPS score?',
                paragraphs: [
                    'A good eNPS score varies by industry and organization size. Generally, scores between 0 and 30 are considered good; scores above 30 are excellent.',
                    'A score of 0 to 30 indicates most employees are satisfied but there may still be detractors impacting productivity or retention.',
                    'A score above 30 suggests high satisfaction and loyalty, with a large majority of employees acting as promoters.'
                ]
            }
        ];

        sections.forEach(section => {
            const sectionEl = document.createElement('section');
            sectionEl.className = 'enps-section';

            const heading = document.createElement('h3');
            heading.textContent = section.title;
            sectionEl.appendChild(heading);

            (section.paragraphs || []).forEach(text => {
                const p = document.createElement('p');
                p.textContent = text;
                sectionEl.appendChild(p);
            });

            if (section.list && section.list.length) {
                const ul = document.createElement('ul');
                section.list.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });
                sectionEl.appendChild(ul);
            }

            container.appendChild(sectionEl);
        });
    }
}

SlideFactory.register('enps-intro', ENPSIntroSlide);



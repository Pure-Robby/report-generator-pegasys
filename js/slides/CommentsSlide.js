class CommentsSlide extends SlideBase {
    constructor(data, options = {}) {
        super(data, options);
        this.validateData(['title', 'questions']);
    }

    render() {
        const pageNumber = this.options.pageNumber || 1;
        const { slide, contentArea } = this.createStandardLayout(
            this.data.title,
            pageNumber,
            'comments-slide'
        );

        const body = this.createBody();
        contentArea.appendChild(body);

        (this.data.questions || []).forEach((question, index) => {
            body.appendChild(this.createQuestionCard(question, index));
        });

        return slide;
    }

    createQuestionCard(question, index) {
        const card = document.createElement('div');
        card.className = 'comment-card';

        const heading = document.createElement('h3');
        heading.textContent = question.questionRaw || question.question || `Question ${index + 1}`;
        card.appendChild(heading);

        const subHeading = document.createElement('p');
        subHeading.className = 'comment-subheading';
        subHeading.textContent = 'TOP 3 AREAS FOR IMPROVEMENT';
        card.appendChild(subHeading);

        const summary = document.createElement('div');
        summary.className = 'comment-summary';
        // Use innerHTML to render formatted text with line breaks and bold
        summary.innerHTML = question.summary || 'No responses were provided for this question.';
        card.appendChild(summary);

        return card;
    }
}

SlideFactory.register('comments', CommentsSlide);



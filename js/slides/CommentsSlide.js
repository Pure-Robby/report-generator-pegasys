/**
 * Comments slide supporting two modes:
 *   'dump'    – paginated <ul> listing of all responses per question
 *   'summary' – analysis cards (legacy default)
 *
 * Mode is set via `data.commentMode`; defaults to 'summary' for backward compat.
 */
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

        const mode = this.data.commentMode || 'summary';
        const questions = this.data.questions || [];

        questions.forEach((question, index) => {
            if (mode === 'dump') {
                body.appendChild(this.createDumpCard(question, index));
            } else {
                body.appendChild(this.createQuestionCard(question, index));
            }
        });

        return slide;
    }

    createDumpCard(question, index) {
        const card = document.createElement('div');
        card.className = 'comment-card';

        if (!question.isContinuation) {
            const countEl = document.createElement('p');
            countEl.className = 'comment-count';
            countEl.textContent = question.responseCount + ' responses';
            card.appendChild(countEl);
        }

        const list = document.createElement('ul');
        list.className = 'comment-response-list';
        (question.responses || []).forEach(resp => {
            const li = document.createElement('li');
            li.textContent = resp;
            list.appendChild(li);
        });
        card.appendChild(list);

        return card;
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
        summary.innerHTML = question.summary || 'No responses were provided for this question.';
        card.appendChild(summary);

        return card;
    }
}

SlideFactory.register('comments', CommentsSlide);

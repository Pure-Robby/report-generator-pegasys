/**
 * Engagement Model Slide
 * Static slide describing the engagement model pillars
 */
class EngagementModelSlide extends SlideBase {
  constructor(data, options = {}) {
    super(data, options);
    this.validateData(['title']);
  }

  render() {
    const pageNumber = this.options.pageNumber || 1;
    const { slide, contentArea } = this.createStandardLayout(
      this.data.title,
      pageNumber,
      'slide-text engagement-model-slide'
    );

    const body = this.createBody();
    contentArea.appendChild(body);

    return slide;
  }

  createBody() {
    const body = document.createElement('div');
    body.className = 'engagement-model';

    const columns = [
      {
        key: 'drivers',
        title: 'Organisation Drivers',
        items: ['Brand Affinity', 'Company Leadership', 'Strategy'],
        description:
          'The Strategic Goals, Senior Leadership and Brand describe the purpose and personality of the organisation.',
      },
      {
        key: 'enablers',
        title: 'Enablers',
        items: [
          'Change Management',
          'Collaboration',
          'Communication',
          'Innovation',
          'Management',
          'Performance',
          'Reward and Recognition',
        ],
        description:
          'Achievement of the purpose is supported by management practices, rewards system, communication channels and opportunity to innovate and excel. This is “how” organisations work towards their goals.',
      },
      {
        key: 'commitment',
        title: 'Commitment',
        items: [
          'Inspiration',
          'Integrity',
          'Personal Growth',
          'Support',
          'Transformation & Inclusivity',
        ],
        description:
          'Employee Commitment is how people feel about the organisation and their place in it. These are the values and practices that capture hearts.',
      },
      {
        key: 'effort',
        title: 'Effort and Retention',
        items: ['Effort', 'Retention'],
        description:
          'Performance is the results of employee commitment and is evident in the level of extra effort employees are willing to give. Attention to Management practices, reward systems and communication pays off key resources.',
      },
    ];

    body.innerHTML = `
      <div class="engagement-model-grid" role="list" aria-label="Engagement model pillars">
        ${columns
          .map(
            (c) => `
              <section class="engagement-model-col engagement-model-col--${c.key}" role="listitem">
                <div class="engagement-model-header">${c.title}</div>
                <div class="engagement-model-box">
                  <ul class="engagement-model-list">
                    ${c.items.map((item) => `<li>${item}</li>`).join('')}
                  </ul>
                </div>
                <div class="engagement-model-desc">${c.description}</div>
              </section>
            `
          )
          .join('')}
      </div>
    `;

    return body;
  }
}

// Register slide type
SlideFactory.register('engagement-model', EngagementModelSlide);


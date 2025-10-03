import { describe, it, expect } from 'vitest';
import { computeClarifications } from './clarifications';

const sampleConverted = JSON.stringify({
  flow: 'Sample Flow',
  vars: {
    request_id: 'input variable (request_id)',
  },
  steps: [
    {
      userTask: {
        description: 'Ask manager to approve {request_id}',
        assignee: 'manager',
        type: 'human_input',
      },
    },
    {
      if: '{request_total} > 1000',
    },
  ],
});

describe('computeClarifications', () => {
  it('identifies when actors are present', () => {
    const summary = computeClarifications(
      'Flow: Sample Flow\nAsk manager to approve {request_id}\nIf {request_total} > 1000\n  Stop',
      sampleConverted,
    );

    const missingActors = summary.prompts.find(prompt => prompt.id === 'missing-actors');
    expect(missingActors).toBeUndefined();
    expect(summary.warnings).not.toContain('No actors identified');
  });

  it('flags missing actors when none are found', () => {
    const converted = JSON.stringify({
      flow: 'System Flow',
      vars: {},
      steps: [
        { serviceTask: { description: 'Do: process payment automatically', type: 'system_operation' } },
      ],
    });

    const summary = computeClarifications('Flow: System Flow\nDo: process payment automatically\nStop', converted);

    expect(summary.prompts.some(prompt => prompt.id === 'missing-actors')).toBe(true);
    expect(summary.warnings).toContain('No actors identified');
  });

  it('flags missing variables when none are declared', () => {
    const summary = computeClarifications('Flow: Email Broadcast\nSend newsletter to customers\nStop', JSON.stringify({ steps: [] }));

    expect(summary.prompts.some(prompt => prompt.id === 'missing-variables')).toBe(true);
  });

  it('extracts actors from inline SimpleScript YAML', () => {
    const yamlStory = `flow: Approve Vacation
steps:
  - ask: manager to approve {dates} for {employee}
    id: askApproval
    if:
      cond: ${'{approved}'}
      then:
        - do: update HR system with {dates}
        - send: email to {employee} "Approved"
        - stop: success
      else:
        - send: email to {employee} "Not approved"
        - stop: success
`;

    const summary = computeClarifications(yamlStory, '');

    expect(summary.insights.actors).toContain('manager');
    expect(summary.prompts.some(prompt => prompt.id === 'missing-actors')).toBe(false);
  });
});

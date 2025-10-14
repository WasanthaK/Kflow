import { describe, it, expect } from 'vitest';
import { storyToSimple, storyToIr } from '../src/storyflow/compile';

describe('storyToSimple', () => {
  it('converts plain text to SimpleScript JSON string', () => {
    const result = storyToSimple('Flow: Demo\nAsk user for input\nStop');
    const parsed = JSON.parse(result);
    expect(parsed.flow).toBe('Demo');
    expect(parsed.steps).toHaveLength(2);
  });

  it('extracts variables, actors, systems, and converts actions to templates', () => {
    const story = `Flow: Sample
Ask manager to approve {request}
Do: update CRM system with customer data
If approved
  Do: calculate total amount
Send email to customer: "Approved"
Stop`;

    const parsed = JSON.parse(storyToSimple(story));

    expect(parsed.vars).toMatchObject({
      request: 'input variable (request)',
      manager: 'workflow actor',
      customer: 'workflow actor',
      system: 'target system',
      approved: 'boolean state from approval decision',
      update: 'workflow action',
      send: 'workflow action',
    });

    const askStep = parsed.steps.find((step: any) => step.userTask);
    expect(askStep).toBeDefined();
    expect(askStep.userTask.assignee).toBe('manager');
  expect(askStep.userTask.description).toBe('{manager} to approve {request}');

  const serviceTask = parsed.steps.find((step: any) => step.serviceTask);
  expect(serviceTask?.serviceTask.description).toBe('{update} CRM {system} with {customer} data');

  const scriptTask = parsed.steps.find((step: any) => step.scriptTask);
  expect(scriptTask?.scriptTask.subtype).toBe('financial_calculation');
  expect(scriptTask?.scriptTask.executable).toBe(false);

    const messageTask = parsed.steps.find((step: any) => step.messageTask);
  expect(messageTask?.messageTask.messageType).toBe('email');
  expect(messageTask?.messageTask.description).toBe('email to {customer}: "Approved"');
  });
});

describe('storyToIr', () => {
  it('creates wait states for timed pauses', () => {
    const story = `Flow: Timed Pause
Wait 10 minutes for stabilization
Stop`;

    const ir = storyToIr(story);
    const waitState = ir.states.find(state => state.kind === 'wait');

    expect(waitState).toBeDefined();
    expect(waitState?.delayMs).toBe(10 * 60 * 1000);
    expect(waitState?.name).toBe('10 minutes for stabilization');
    expect(waitState?.until).toBe('stabilization');
  });

  it('creates wait states for open-ended waits', () => {
    const story = `Flow: Event Pause
Wait for shipping confirmation
Stop`;

    const ir = storyToIr(story);
    const waitState = ir.states.find(state => state.kind === 'wait');

    expect(waitState).toBeDefined();
    expect(waitState?.delayMs).toBeUndefined();
    expect(waitState?.until).toBe('shipping confirmation');
    expect(waitState?.name).toBe('Wait for shipping confirmation');
  });
});

import { describe, expect, it } from 'vitest';
import { extractNarrativeInsights, narrativeToStory, narrativeToSteps } from '../src/storyflow/narrative.js';
import { storyToSimple } from '../src/storyflow/compile.js';

const narrative = `Requirement Brief: The sales manager needs a simple approval flow for rush orders. When a rush order request arrives, collect the customer name, requested items, and promised ship date. The operations analyst should verify inventory availability in the warehouse system. If stock is available and the order value is greater than $5,000, the finance manager must review the pricing and either approve or reject. For rejected requests, notify the requester with the reason and stop. When approved, send an email confirmation to the requester, schedule a rush shipment, and wait for the carrier pickup confirmation before closing the request.`;

describe('narrative extraction', () => {
  it('generates StoryFlow syntax from a narrative brief', () => {
    const story = narrativeToStory(narrative, { flowName: 'Rush Order Handling' });

    expect(story).toContain('Flow: Rush Order Handling');
    expect(story).toContain('Ask requester to provide');
    expect(story).toContain('Do: verify inventory availability in warehouse system');
    expect(story).toContain('If');
    expect(story).toContain('Send email to requester');

    const simple = JSON.parse(storyToSimple(story));
    expect(simple.flow).toBe('Rush Order Handling');
    expect(simple.steps.length).toBeGreaterThan(3);
  });

  it('exposes extracted steps for further processing', () => {
    const steps = narrativeToSteps(narrative);
    expect(steps[0]).toMatch(/Ask requester/);
    expect(steps.some(step => step.startsWith('If '))).toBe(true);
    expect(steps.includes('Stop')).toBe(true);
  });

  it('derives actors, intents, and variable insights', () => {
    const insights = extractNarrativeInsights(narrative);
    expect(insights.actors).toEqual(
      expect.arrayContaining(['sales manager', 'operations analyst', 'finance manager', 'requester']),
    );
    expect(insights.intents.some(intent => intent.toLowerCase().includes('rush order'))).toBe(true);
    const variableNames = insights.variables.map(variable => variable.name);
    expect(variableNames).toEqual(
      expect.arrayContaining(['customer_name', 'requested_items', 'promised_ship_date', 'order_value']),
    );
    const orderValue = insights.variables.find(variable => variable.name === 'order_value');
    expect(orderValue?.origins).toContain('condition');
  });
});

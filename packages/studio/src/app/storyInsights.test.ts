import { describe, it, expect } from 'vitest';
import { extractStoryInsights } from './storyInsights';

const REQUIREMENT_BRIEF = `Requirement Brief: The sales manager needs a simple approval flow for rush orders.
When a rush order request arrives, collect the customer name, requested items, and promised ship date.
The operations analyst should verify inventory availability in the warehouse system.
If stock is available and the order value is greater than $5,000, the finance manager must review the pricing and either approve or reject.
For rejected requests, notify the requester with the reason and stop.
When approved, send an email confirmation to the requester, schedule a rush shipment, and wait for the carrier pickup confirmation before closing the request.`;

describe('storyInsights', () => {
  it('extracts actors, actions, and resources from narrative text', () => {
    const insights = extractStoryInsights(REQUIREMENT_BRIEF);

    expect(insights.actors).toContain('Sales Manager');
    expect(insights.actors).toContain('Operations Analyst');
    expect(insights.actors).toContain('Warehouse');
    expect(insights.actors).toContain('Finance Manager');

    expect(insights.actions.some(action => action.startsWith('collect'))).toBe(true);
    expect(insights.actions.some(action => action.includes('verify inventory'))).toBe(true);
    expect(insights.actions.some(action => action.includes('send an email confirmation'))).toBe(true);

    expect(insights.resources).toContain('Requested Items');
    expect(insights.resources).toContain('Ship Date');
    expect(insights.resources).toContain('Inventory');
  });

  it('returns empty insights for blank input', () => {
    const insights = extractStoryInsights('   ');
    expect(insights).toEqual({ actors: [], actions: [], resources: [] });
  });
});

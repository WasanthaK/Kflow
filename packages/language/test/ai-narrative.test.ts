import { describe, expect, it } from 'vitest';
import { assessNarrativeEscalation } from '../src/ai/diagnostics.js';
import { generateStoryFromNarrative } from '../src/ai/narrative.js';
import type { NarrativeVariableOrigin } from '../src/storyflow/narrative.js';

const narrative = `Collect the customer name and amount. Finance manager must approve when order value exceeds $5,000. Send email confirmation when approved.`;

describe('generateStoryFromNarrative', () => {
  it('falls back to heuristic when no LLM provided', async () => {
    const result = await generateStoryFromNarrative({ narrative, flowName: 'Sample Flow' });
    expect(result.origin).toBe('heuristic');
    expect(result.story).toContain('Flow: Sample Flow');
    expect(result.story).toMatch(/Ask requester/);
    expect(result.insights.actors).toEqual(expect.arrayContaining(['finance manager', 'requester']));
    expect(Array.isArray(result.insights.intents)).toBe(true);
    expect(result.insights.variables.map(variable => variable.name)).toEqual(
      expect.arrayContaining(['customer_name', 'amount']),
    );
    const orderValue = result.insights.variables.find(variable => variable.name === 'order_value');
    if (orderValue) {
      expect(orderValue.origins).toContain('condition');
    }
    expect(typeof result.confidence).toBe('number');
    expect(Array.isArray(result.warnings)).toBe(true);

    const escalation = assessNarrativeEscalation(result, { minimumConfidence: 0.7 });
    expect(escalation.escalate).toBe(true);
    expect(escalation.reasons.length).toBeGreaterThan(0);
  });

  it('uses provided LLM output when available', async () => {
    const llm = async () => ({
      story: 'Flow: AI Draft\nAsk manager to approve order\nStop',
      reasoning: 'detected approval pattern',
      insights: {
        actors: ['approver'],
        intents: ['Accelerate approvals'],
        variables: [
          {
            name: 'rush_flag',
            description: 'Rush order flag',
            origins: ['input'] as NarrativeVariableOrigin[],
          },
        ],
      },
    });

    const result = await generateStoryFromNarrative({ narrative, llm });
    expect(result.origin).toBe('llm');
    expect(result.story.startsWith('Flow: AI Draft')).toBe(true);
    expect(result.llmMetadata?.reasoning).toBe('detected approval pattern');
    expect(result.insights.actors).toEqual(['approver']);
    expect(result.insights.intents).toEqual(['Accelerate approvals']);
    expect(result.insights.variables).toEqual([
      expect.objectContaining({ name: 'rush_flag', origins: ['input'] }),
    ]);
    expect(result.provider).toBe('custom-llm');
    expect(result.warnings).toEqual([]);
  });
});

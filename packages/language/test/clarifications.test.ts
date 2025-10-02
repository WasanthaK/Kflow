import { describe, it, expect } from 'vitest';
import type { GenerateStoryResult } from '../src/ai/narrative.js';
import { buildClarificationPrompts } from '../src/ai/clarifications.js';

const baseResult: GenerateStoryResult = {
  story: 'Flow: Test\nStop',
  origin: 'llm',
  insights: { actors: [], intents: [], variables: [] },
  warnings: [],
  provider: 'openai',
};

describe('buildClarificationPrompts', () => {
  it('asks for actors when none are detected', () => {
    const prompts = buildClarificationPrompts({
      ...baseResult,
      warnings: ['No actors identified'],
    });

    const actorPrompt = prompts.find(p => p.id === 'missing-actors');
    expect(actorPrompt?.severity).toBe('critical');
  });

  it('flags low confidence results', () => {
    const prompts = buildClarificationPrompts({
      ...baseResult,
      confidence: 0.4,
    });

    const lowConfidence = prompts.find(p => p.id === 'low-confidence');
    expect(lowConfidence).toBeTruthy();
    expect(lowConfidence?.prompt).toMatch('40');
  });

  it('asks for variable origins when missing', () => {
    const prompts = buildClarificationPrompts({
      ...baseResult,
      insights: {
        actors: ['analyst'],
        intents: ['route exceptions'],
        variables: [
          {
            name: 'exception_code',
            origins: [],
          },
        ],
      },
    });

    expect(prompts.some(p => p.id === 'variable-origins')).toBe(true);
  });

  it('returns a generic prompt when no other conditions match', () => {
    const prompts = buildClarificationPrompts({
      ...baseResult,
      insights: { actors: ['analyst'], intents: ['resolve'], variables: [] },
      warnings: [],
      confidence: 0.9,
    });

    expect(prompts).toHaveLength(1);
    expect(prompts[0].id).toBe('general-follow-up');
  });
});

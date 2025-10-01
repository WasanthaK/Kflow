import { describe, expect, it, beforeEach } from 'vitest';
import {
  configureAIAnalytics,
  getAIAnalyticsHandler,
  recordAIAdoption,
  recordAIFeedback,
  recordAISuggestion,
} from '../src/ai/telemetry';
import type { AIAnalyticsHandler, AISuggestion } from '../src/ai/types';

describe('AI telemetry', () => {
  const suggestions: AISuggestion[] = [];
  const adoptions: any[] = [];
  const feedback: any[] = [];

  const handler: AIAnalyticsHandler = {
    onSuggestion: suggestion => suggestions.push(suggestion),
    onAdoption: event => adoptions.push(event),
    onFeedback: event => feedback.push(event),
  };

  beforeEach(() => {
    suggestions.length = 0;
    adoptions.length = 0;
    feedback.length = 0;
    configureAIAnalytics(handler);
  });

  it('invokes handler for suggestions, adoption, and feedback', () => {
    const suggestion: AISuggestion = {
      id: 's-1',
      source: 'studio',
      stage: 'draft',
      createdAt: new Date().toISOString(),
      content: 'Suggest new flow',
      context: { flowName: 'Demo' },
    };

    recordAISuggestion(suggestion);
    recordAIAdoption({ suggestionId: 's-1', accepted: true, editsApplied: 1 });
    recordAIFeedback({ suggestionId: 's-1', rating: 'positive', comment: 'Helpful' });

    expect(suggestions).toHaveLength(1);
    expect(adoptions).toHaveLength(1);
    expect(feedback).toHaveLength(1);
  });

  it('supports clearing the handler', () => {
    configureAIAnalytics(undefined);
    recordAISuggestion({
      id: 's-2',
      source: 'cli',
      stage: 'final',
      createdAt: new Date().toISOString(),
      content: 'Another',
      context: { flowName: 'Demo' },
    });

    expect(suggestions).toHaveLength(0);
    expect(getAIAnalyticsHandler()).toBeUndefined();
  });
});

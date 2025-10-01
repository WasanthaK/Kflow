import type { AIAdoptionEvent, AIAnalyticsHandler, AIFeedbackEvent, AISuggestion } from './types.js';

let handler: AIAnalyticsHandler | undefined;

export function configureAIAnalytics(next: AIAnalyticsHandler | undefined) {
  handler = next;
}

export function recordAISuggestion(suggestion: AISuggestion) {
  handler?.onSuggestion?.(suggestion);
}

export function recordAIAdoption(event: AIAdoptionEvent) {
  handler?.onAdoption?.(event);
}

export function recordAIFeedback(event: AIFeedbackEvent) {
  handler?.onFeedback?.(event);
}

export function getAIAnalyticsHandler() {
  return handler;
}

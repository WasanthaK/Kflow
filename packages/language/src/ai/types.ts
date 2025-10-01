export type AISource = 'studio' | 'cli' | 'api' | 'extension';

export type AISuggestionStage = 'draft' | 'refined' | 'final';

export interface AIContextSnapshot {
  flowName: string;
  languageVersion?: string;
  filePath?: string;
  cursorLine?: number;
  surroundingText?: string;
}

export interface AISuggestion {
  id: string;
  source: AISource;
  stage: AISuggestionStage;
  createdAt: string;
  promptTokens?: number;
  completionTokens?: number;
  content: string;
  rationale?: string;
  context: AIContextSnapshot;
}

export interface AIAdoptionEvent {
  suggestionId: string;
  accepted: boolean;
  acceptedAt?: string;
  discardedReason?: string;
  editsApplied?: number;
}

export interface AIFeedbackEvent {
  suggestionId: string;
  rating?: 'positive' | 'neutral' | 'negative';
  comment?: string;
}

export interface AIAnalyticsHandler {
  onSuggestion?(suggestion: AISuggestion): void;
  onAdoption?(event: AIAdoptionEvent): void;
  onFeedback?(event: AIFeedbackEvent): void;
}

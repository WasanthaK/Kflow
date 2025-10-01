import type { GenerateStoryResult } from './narrative.js';

export type EscalationAssessment = {
  escalate: boolean;
  reasons: string[];
  confidence?: number;
};

export type EscalationOptions = {
  minimumConfidence?: number;
  requireActors?: boolean;
  requireVariables?: boolean;
  requireIntents?: boolean;
};

const DEFAULT_OPTIONS: Required<EscalationOptions> = {
  minimumConfidence: 0.8,
  requireActors: true,
  requireVariables: true,
  requireIntents: false,
};

export function assessNarrativeEscalation(
  result: GenerateStoryResult,
  options: EscalationOptions = {},
): EscalationAssessment {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const reasons: string[] = [];

  const confidence = result.confidence ?? 0;
  if (confidence < config.minimumConfidence) {
    reasons.push(`Confidence ${confidence.toFixed(2)} below threshold ${config.minimumConfidence}`);
  }

  if (config.requireActors && result.insights.actors.length === 0) {
    reasons.push('No actors detected');
  }

  if (config.requireVariables && result.insights.variables.length === 0) {
    reasons.push('No variables detected');
  }

  if (config.requireIntents && result.insights.intents.length === 0) {
    reasons.push('No intents detected');
  }

  if (result.origin === 'heuristic') {
    reasons.push('Heuristic fallback used instead of LLM');
  }

  if (result.warnings.length) {
    for (const warning of result.warnings) {
      reasons.push(`Warning: ${warning}`);
    }
  }

  return {
    escalate: reasons.length > 0,
    reasons,
    confidence,
  };
}

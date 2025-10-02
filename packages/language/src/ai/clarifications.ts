import type { GenerateStoryResult } from './narrative.js';
import type { NarrativeVariableInsight } from '../storyflow/narrative.js';

export type ClarificationSeverity = 'info' | 'warning' | 'critical';

export type ClarificationCategory =
  | 'actors'
  | 'intents'
  | 'variables'
  | 'signals'
  | 'confidence'
  | 'follow-ups';

export interface ClarificationPrompt {
  id: string;
  category: ClarificationCategory;
  severity: ClarificationSeverity;
  prompt: string;
  suggestion?: string;
}

const warningMatchers = new Map<RegExp, ClarificationPrompt>([
  [
    /no actors identified/i,
    {
      id: 'missing-actors',
      category: 'actors',
      severity: 'critical',
      prompt: 'No actors were detected. Who performs each major step in this workflow?',
      suggestion: 'List key roles such as approvers, reviewers, analysts, and external stakeholders.',
    },
  ],
  [
    /no variables extracted/i,
    {
      id: 'missing-variables',
      category: 'variables',
      severity: 'warning',
      prompt: 'No dynamic data points were found. What inputs or outputs does this process require?',
      suggestion: 'Call out values like {order_id}, {customer_name}, {due_date}, or system flags that drive decisions.',
    },
  ],
  [
    /no intent detected/i,
    {
      id: 'missing-intents',
      category: 'intents',
      severity: 'warning',
      prompt: 'The business intent is unclear. What outcome should this workflow deliver?',
      suggestion: 'Describe the reason the workflow exists: approve loans, resolve incidents, onboard customers, etc.',
    },
  ],
]);

export function buildClarificationPrompts(result: GenerateStoryResult): ClarificationPrompt[] {
  const prompts: ClarificationPrompt[] = [];
  const { insights, warnings, confidence, llmMetadata } = result;

  const existingIds = new Set<string>();
  const pushPrompt = (prompt: ClarificationPrompt) => {
    if (existingIds.has(prompt.id)) return;
    prompts.push(prompt);
    existingIds.add(prompt.id);
  };

  for (const warning of warnings) {
    for (const [regex, prompt] of warningMatchers.entries()) {
      if (regex.test(warning)) {
        pushPrompt(prompt);
      }
    }
  }

  if (confidence !== undefined && confidence < 0.55) {
    pushPrompt({
      id: 'low-confidence',
      category: 'confidence',
      severity: 'critical',
      prompt: `Overall confidence is ${(confidence * 100).toFixed(0)}%. What details would increase clarity?`,
      suggestion: 'Clarify ambiguous steps, actors, or conditions that influence branching decisions.',
    });
  }

  const variablesNeedingOrigins = (insights.variables ?? []).filter(needsOriginClarification);
  if (variablesNeedingOrigins.length) {
    pushPrompt({
      id: 'variable-origins',
      category: 'variables',
      severity: 'info',
      prompt: `Confirm how these variables are captured or produced: ${variablesNeedingOrigins
        .map(v => v.name)
        .join(', ')}.`,
      suggestion: 'Specify whether each value comes from user input, a system lookup, a calculation, or an external event.',
    });
  }

  const providerWarnings = llmMetadata?.warnings ?? [];
  for (const providerWarning of providerWarnings) {
    if (/missing signal/i.test(providerWarning)) {
      pushPrompt({
        id: 'missing-signals',
        category: 'signals',
        severity: 'warning',
        prompt: 'Are there external systems or events that trigger this workflow?',
        suggestion: 'Mention integrations such as CRM updates, monitoring alerts, scheduled jobs, or partner APIs.',
      });
    }
  }

  if (!prompts.length) {
    pushPrompt({
      id: 'general-follow-up',
      category: 'follow-ups',
      severity: 'info',
      prompt: 'Review the generated story for accuracy and note any domain nuances the AI might have missed.',
    });
  }

  return prompts;
}

function needsOriginClarification(variable: NarrativeVariableInsight): boolean {
  if (!variable.origins?.length) {
    return true;
  }
  if (variable.origins.length === 1 && variable.origins[0] === 'input') {
    return !variable.description;
  }
  return false;
}

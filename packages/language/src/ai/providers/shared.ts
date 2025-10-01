import type {
  NarrativeInsights,
  NarrativeVariableInsight,
  NarrativeVariableOrigin,
} from '../../storyflow/narrative.js';

export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 1200;

export const ALLOWED_ORIGINS: NarrativeVariableOrigin[] = ['input', 'condition', 'output', 'system'];

export function buildSystemPrompt(instructions?: string, extraSystemInstruction?: string): string {
  const base = instructions?.trim()
    ? instructions.trim()
    : `You are an expert workflow analyst. Convert business narratives into Kflow StoryFlow scripts.`;

  const jsonDirective = `Always respond with a valid JSON object using this structure:
{
  "story": "Flow: ...",
  "insights": {
    "actors": string[],
    "intents": string[],
    "variables": [{ "name": string, "description"?: string, "origins": string[] }]
  },
  "reasoning"?: string,
  "confidence"?: number,
  "warnings"?: string[]
}
Do not include Markdown code fences or commentary outside the JSON.`;

  if (extraSystemInstruction?.trim()) {
    return `${base}\n${jsonDirective}\n${extraSystemInstruction.trim()}`;
  }

  return `${base}\n${jsonDirective}`;
}

export function buildUserPrompt(narrative: string, flowName?: string): string {
  const trimmedNarrative = narrative.trim();
  const header = flowName?.trim()
    ? `Requested Flow Name: ${flowName.trim()}`
    : 'No flow name provided; infer an appropriate name.';
  return `${header}\n\nBusiness Narrative:\n${trimmedNarrative}`;
}

type ModelVariable = {
  name?: unknown;
  description?: unknown;
  origins?: unknown;
};

type ModelInsights = {
  actors?: unknown;
  intents?: unknown;
  variables?: unknown;
};

type ModelPayload = {
  story?: unknown;
  reasoning?: unknown;
  confidence?: unknown;
  warnings?: unknown;
  insights?: ModelInsights;
};

export function parseModelPayload(content: string | null | undefined): ModelPayload | undefined {
  if (!content) return undefined;

  try {
    return JSON.parse(content) as ModelPayload;
  } catch (error) {
    return undefined;
  }
}

export function sanitizeInsights(insights?: ModelInsights): NarrativeInsights | undefined {
  if (!insights) return undefined;

  const actors = Array.isArray(insights.actors) ? insights.actors.filter(isNonEmptyString) : [];
  const intents = Array.isArray(insights.intents) ? insights.intents.filter(isNonEmptyString) : [];
  const variables = Array.isArray(insights.variables)
    ? insights.variables
        .map(variable => sanitizeVariable(variable as ModelVariable))
        .filter((variable): variable is NarrativeVariableInsight => Boolean(variable))
    : [];

  if (!actors.length && !intents.length && !variables.length) {
    return undefined;
  }

  return { actors, intents, variables };
}

export function sanitizeVariable(variable: ModelVariable): NarrativeVariableInsight | undefined {
  if (!variable || typeof variable !== 'object') {
    return undefined;
  }

  const name = isNonEmptyString(variable.name) ? toTemplateName(variable.name) : undefined;
  if (!name) return undefined;

  const description = isNonEmptyString(variable.description) ? String(variable.description) : undefined;
  const origins = Array.isArray(variable.origins)
    ? variable.origins
        .filter(isNonEmptyString)
        .map(origin => origin.trim().toLowerCase())
        .filter((origin): origin is NarrativeVariableOrigin => ALLOWED_ORIGINS.includes(origin as NarrativeVariableOrigin))
    : [];

  return {
    name,
    description,
    origins,
  };
}

export function sanitizeWarnings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const warnings = value.filter(isNonEmptyString).map(entry => entry.trim());
  return warnings.length ? warnings : undefined;
}

export function sanitizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value < 0 || value > 1) return undefined;
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function toTemplateName(text: string): string {
  const normalized = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '_');

  return normalized || 'value';
}

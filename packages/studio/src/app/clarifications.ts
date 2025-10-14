import {
  buildClarificationPrompts,
  type ClarificationPrompt,
} from '../../../language/src/ai/clarifications.js';
import type {
  NarrativeInsights,
  NarrativeVariableInsight,
  NarrativeVariableOrigin,
} from '../../../language/src/storyflow/narrative.js';
import { parse as parseYaml } from 'yaml';

type SimpleScript = {
  flow?: string;
  vars?: Record<string, string>;
  steps?: Array<Record<string, unknown>>;
};

export type ClarificationSummary = {
  prompts: ClarificationPrompt[];
  confidence?: number;
  warnings: string[];
  insights: NarrativeInsights;
};

export function computeClarifications(
  story: string,
  converted: string,
  precomputedInsights?: NarrativeInsights
): ClarificationSummary {
  if (!story.trim()) {
    return emptyClarifications();
  }

  let parsed: SimpleScript | undefined;
  try {
    parsed = converted ? (JSON.parse(converted) as SimpleScript) : undefined;
  } catch (error) {
    console.warn('Failed to parse SimpleScript JSON', error);
    parsed = undefined;
  }

  if (!parsed) {
    parsed = tryParseInlineSimpleScript(story.trim());
  }

  const derivedInsights = deriveInsights(story, parsed);
  const insights = precomputedInsights
    ? mergeInsights(precomputedInsights, derivedInsights)
    : derivedInsights;
  const { confidence, warnings } = evaluateConfidenceAndWarnings(insights);

  const prompts = buildClarificationPrompts({
    story,
    origin: 'heuristic',
    insights,
    confidence,
    warnings,
    provider: 'studio-local',
  });

  return {
    prompts,
    confidence,
    warnings,
    insights,
  };
}

function emptyClarifications(): ClarificationSummary {
  return {
    prompts: [],
    confidence: undefined,
    warnings: [],
    insights: {
      actors: [],
      intents: [],
      variables: [],
    },
  };
}

function tryParseInlineSimpleScript(text: string): SimpleScript | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isSimpleScriptLike(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse inline SimpleScript JSON', error);
    }
  }

  if (/^flow\s*:/i.test(trimmed)) {
    try {
      const parsed = parseYaml(trimmed) as unknown;
      if (isSimpleScriptLike(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse inline SimpleScript YAML', error);
    }
  }

  return undefined;
}

function isSimpleScriptLike(value: unknown): value is SimpleScript {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as SimpleScript;
  if (!candidate.flow && !candidate.steps) {
    return false;
  }
  if (candidate.steps && !Array.isArray(candidate.steps)) {
    return false;
  }
  return true;
}

export type { ClarificationPrompt } from '../../../language/src/ai/clarifications.js';

function deriveInsights(story: string, parsed?: SimpleScript): NarrativeInsights {
  const actors = new Set<string>();
  const intents = new Set<string>();
  const variables = new Map<string, NarrativeVariableAccumulator>();

  const handleLine = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line || /^flow\s*:/i.test(line)) {
      return;
    }

    const actor = extractActorFromAsk(line) ?? extractActorFromManual(line);
    if (actor) {
      actors.add(actor);
    }

    const intent = extractIntent(line);
    if (intent) {
      intents.add(intent);
    }

    for (const variableName of findVariables(line)) {
      upsertVariable(variables, variableName, {
        origin: determineVariableOriginFromLine(line),
        description: undefined,
      });
    }
  };

  const lines = story
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    handleLine(line);
  }

  if (parsed) {
    for (const derivedLine of collectLinesFromSimpleScript(parsed)) {
      handleLine(derivedLine);
    }
  }

  if (parsed?.vars) {
    for (const [name, description] of Object.entries(parsed.vars)) {
      if (typeof description === 'string' && /workflow\s+actor/i.test(description)) {
        actors.add(normalizeActor(name));
      }
      upsertVariable(variables, name, {
        origin: 'input',
        description,
      });
    }
  }

  if (Array.isArray(parsed?.steps)) {
    for (const step of parsed.steps) {
      processParsedStep(step, handleLine);
    }
  }

  return {
    actors: Array.from(actors).sort((a, b) => a.localeCompare(b)),
    intents: Array.from(intents).sort((a, b) => a.localeCompare(b)),
    variables: Array.from(variables.values())
      .map(({ name, description, origins }) => ({
        name,
        description: description ?? humanize(name),
        origins: Array.from(origins).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function mergeInsights(primary: NarrativeInsights, supplemental: NarrativeInsights): NarrativeInsights {
  const actors = new Set<string>();
  for (const actor of primary.actors ?? []) {
    if (actor.trim()) actors.add(actor.toLowerCase());
  }
  for (const actor of supplemental.actors ?? []) {
    if (actor.trim()) actors.add(actor.toLowerCase());
  }

  const intents = new Set<string>();
  for (const intent of primary.intents ?? []) {
    if (intent.trim()) intents.add(intent);
  }
  for (const intent of supplemental.intents ?? []) {
    if (intent.trim()) intents.add(intent);
  }

  const variables = new Map<string, NarrativeVariableAccumulator>();

  const ingestVariables = (source: NarrativeInsights) => {
    for (const variable of source.variables ?? []) {
      const key = variable.name.trim().toLowerCase();
      if (!key) continue;
      let entry = variables.get(key);
      if (!entry) {
        entry = {
          name: key,
          description: variable.description,
          origins: new Set(variable.origins ?? []),
        } satisfies NarrativeVariableAccumulator;
        variables.set(key, entry);
        continue;
      }

      if (variable.description) {
        const existingLength = entry.description?.length ?? Number.POSITIVE_INFINITY;
        if (!entry.description || variable.description.length < existingLength) {
          entry.description = variable.description;
        }
      }

      for (const origin of variable.origins ?? []) {
        entry.origins.add(origin);
      }
    }
  };

  ingestVariables(primary);
  ingestVariables(supplemental);

  const materializedVariables = Array.from(variables.values()).map(variable => ({
    name: variable.name,
    description: variable.description,
    origins: Array.from(variable.origins).sort(),
  }));

  return {
    actors: Array.from(actors)
      .map(actor => actor.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    intents: Array.from(intents).sort((a, b) => a.localeCompare(b)),
    variables: materializedVariables.sort((a, b) => a.name.localeCompare(b.name)),
  } satisfies NarrativeInsights;
}

type VariableAccumulator = {
  name: string;
  description?: string;
  origins: Set<NarrativeVariableOrigin>;
};

function processParsedStep(step: unknown, emitLine: (line: string) => void): void {
  if (step == null) return;

  if (Array.isArray(step)) {
    for (const item of step) {
      processParsedStep(item, emitLine);
    }
    return;
  }

  if (typeof step === 'string') {
    emitLine(step);
    return;
  }

  if (typeof step !== 'object') {
    return;
  }

  const record = step as Record<string, unknown>;

  if (typeof record.ask === 'string') {
    emitLine(`Ask ${record.ask}`);
  }

  if (typeof record.do === 'string') {
    emitLine(`Do: ${record.do}`);
  }

  if (typeof record.send === 'string') {
    emitLine(`Send ${record.send}`);
  }

  if (typeof record.receive === 'string') {
    emitLine(`Receive ${record.receive}`);
  }

  if (typeof record.wait === 'string') {
    emitLine(`Wait ${record.wait}`);
  }

  if (typeof record.stop === 'string' || record.stop === true) {
    emitLine('Stop');
  }

  if ('userTask' in record && typeof record.userTask === 'object' && record.userTask) {
    const userTask = record.userTask as { assignee?: string; description?: string };
    const parts = [userTask.assignee, userTask.description].filter(Boolean);
    emitLine(`Ask ${parts.join(' ')}`.trim());
  }

  if ('manualTask' in record && typeof record.manualTask === 'object' && record.manualTask) {
    const manualTask = record.manualTask as { description?: string };
    if (manualTask.description) {
      emitLine(`Do: ${manualTask.description}`);
    }
  }

  if ('businessRuleTask' in record && typeof record.businessRuleTask === 'object' && record.businessRuleTask) {
    const businessRuleTask = record.businessRuleTask as { description?: string };
    if (businessRuleTask.description) {
      emitLine(`Do: ${businessRuleTask.description}`);
    }
  }

  if ('serviceTask' in record && typeof record.serviceTask === 'object' && record.serviceTask) {
    const serviceTask = record.serviceTask as { description?: string };
    if (serviceTask.description) {
      emitLine(`Do: ${serviceTask.description}`);
    }
  }

  if ('scriptTask' in record && typeof record.scriptTask === 'object' && record.scriptTask) {
    const scriptTask = record.scriptTask as { description?: string };
    if (scriptTask.description) {
      emitLine(`Do: ${scriptTask.description}`);
    }
  }

  if ('messageTask' in record && typeof record.messageTask === 'object' && record.messageTask) {
    const messageTask = record.messageTask as { description?: string };
    if (messageTask.description) {
      emitLine(`Send ${messageTask.description}`);
    }
  }

  if ('waitTask' in record && typeof record.waitTask === 'object' && record.waitTask) {
    const waitTask = record.waitTask as { description?: string };
    if (waitTask.description) {
      emitLine(`Wait ${waitTask.description}`);
    }
  }

  if ('endEvent' in record && typeof record.endEvent === 'object' && record.endEvent) {
    emitLine('Stop');
  }

  if ('if' in record) {
    const condition = record.if;
    if (typeof condition === 'string') {
      emitLine(`If ${normalizeSimpleScriptCondition(condition)}`);
    } else if (condition && typeof condition === 'object') {
      const branch = condition as Record<string, unknown>;
      const condText = branch.cond;
      if (typeof condText === 'string') {
        emitLine(`If ${normalizeSimpleScriptCondition(condText)}`);
      }
      if ('then' in branch) {
        processParsedStep(branch.then, emitLine);
      }
      if ('else' in branch) {
        emitLine('Otherwise');
        processParsedStep(branch.else, emitLine);
      }
    }
  }

  if ('then' in record) {
    processParsedStep(record.then, emitLine);
  }

  if ('else' in record) {
    processParsedStep(record.else, emitLine);
  }

  if ('steps' in record) {
    processParsedStep(record.steps, emitLine);
  }
}

function collectLinesFromSimpleScript(script: SimpleScript): string[] {
  const lines: string[] = [];

  const emit = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  };

  if (Array.isArray(script.steps)) {
    for (const step of script.steps) {
      processParsedStep(step, emit);
    }
  }

  return lines;
}

function normalizeSimpleScriptCondition(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, '{$1}');
}

function evaluateConfidenceAndWarnings(insights: NarrativeInsights): {
  confidence: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let score = 0.35;

  if (!insights.actors.length) {
    warnings.push('No actors identified');
    score -= 0.2;
  } else {
    score += Math.min(0.15, insights.actors.length * 0.05);
  }

  if (!insights.variables.length) {
    warnings.push('No variables extracted');
    score -= 0.15;
  } else {
    score += Math.min(0.12, insights.variables.length * 0.04);
  }

  if (!insights.intents.length) {
    warnings.push('No intent detected');
    score -= 0.05;
  } else {
    score += 0.08;
  }

  const confidence = Math.max(0, Math.min(0.95, score));

  return {
    confidence,
    warnings,
  };
}

function extractActorFromAsk(line: string): string | undefined {
  const match = line.match(/^ask\s+([^:{\[]+?)(?:\s+(?:to|for|about|whether|if)\b|[:{]|$)/i);
  if (!match) return undefined;
  return normalizeActor(match[1]);
}

function extractActorFromManual(line: string): string | undefined {
  const match = line.match(/^do:\s*(assign|notify|escalate)\s+([^,]+?)(?:\s+(?:to|for)\b|$)/i);
  if (!match) return undefined;
  return normalizeActor(match[2]);
}

function normalizeActor(raw: string): string {
  return raw
    .trim()
    .replace(/_/g, ' ')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function extractIntent(line: string): string | undefined {
  if (/^intent\s*:/i.test(line)) {
    return formatIntent(line.replace(/^intent\s*:/i, ''));
  }
  if (/^goal\s*:/i.test(line)) {
    return formatIntent(line.replace(/^goal\s*:/i, ''));
  }
  const ensureMatch = line.match(/ensure\s+([^.!]+)/i);
  if (ensureMatch) {
    return formatIntent(`Ensure ${ensureMatch[1]}`);
  }
  const purposeMatch = line.match(/so that\s+([^.!]+)/i);
  if (purposeMatch) {
    return formatIntent(`Enable ${purposeMatch[1]}`);
  }
  return undefined;
}

function determineVariableOriginFromLine(line: string): NarrativeVariableOrigin {
  if (/^if\b/i.test(line)) {
    return 'condition';
  }
  if (/^ask\b/i.test(line)) {
    return 'input';
  }
  if (/^send\b/i.test(line)) {
    return 'output';
  }
  return 'system';
}

function findVariables(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches
    .map(token => token.slice(1, -1).trim().toLowerCase())
    .filter(Boolean);
}

function upsertVariable(
  variables: Map<string, VariableAccumulator>,
  name: string,
  details: { origin: NarrativeVariableOrigin; description?: string },
): void {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return;

  let entry = variables.get(normalized);
  if (!entry) {
    entry = {
      name: normalized,
      description: details.description,
      origins: new Set<NarrativeVariableOrigin>(),
    };
    variables.set(normalized, entry);
  }

  if (details.description && (!entry.description || entry.description.length > details.description.length)) {
    entry.description = details.description;
  }

  entry.origins.add(details.origin);
}

function humanize(value: string): string {
  return value
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, match => match.toUpperCase());
}

function formatIntent(intent: string): string {
  const trimmed = intent.replace(/[.!]+$/g, '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

type NarrativeVariableAccumulator = {
  name: string;
  description?: string;
  origins: Set<NarrativeVariableOrigin>;
};

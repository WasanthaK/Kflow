const actorPatterns = [
  { regex: /operations analyst/i, actor: 'operations analyst' },
  { regex: /finance manager/i, actor: 'finance manager' },
  { regex: /sales manager/i, actor: 'sales manager' },
  { regex: /requester/i, actor: 'requester' },
  { regex: /customer/i, actor: 'customer' },
  { regex: /analyst/i, actor: 'analyst' },
];

const dynamicRoleRegex =
  /\b([a-z]+(?:\s+[a-z]+){0,2}\s+(?:manager|analyst|specialist|coordinator|agent|lead|officer|representative|team|supervisor|director|reviewer|approver))\b/gi;

export type NarrativeVariableOrigin = 'input' | 'condition' | 'output' | 'system';

export interface NarrativeVariableInsight {
  name: string;
  description?: string;
  origins: NarrativeVariableOrigin[];
}

export interface NarrativeInsights {
  actors: string[];
  intents: string[];
  variables: NarrativeVariableInsight[];
}

type NarrativeOptions = {
  flowName?: string;
};

type NarrativeAnalysis = {
  steps: string[];
  insights: NarrativeInsights;
};

type NarrativeInsightsBuilder = {
  actors: Set<string>;
  intents: Set<string>;
  variables: Map<string, NarrativeVariableAccumulator>;
};

type NarrativeVariableAccumulator = {
  name: string;
  description?: string;
  origins: Set<NarrativeVariableOrigin>;
};

export function narrativeToStory(narrative: string, options: NarrativeOptions = {}): string {
  const flowName = options.flowName?.trim() || inferFlowName(narrative) || 'Business Requirement Flow';
  const { steps } = analyzeNarrative(narrative);
  const lines = [`Flow: ${flowName}`, ...steps];
  return lines.join('\n');
}

export function narrativeToSteps(narrative: string): string[] {
  return analyzeNarrative(narrative).steps;
}

export function extractNarrativeInsights(narrative: string): NarrativeInsights {
  return analyzeNarrative(narrative).insights;
}

function analyzeNarrative(narrative: string): NarrativeAnalysis {
  const sentences = splitSentences(narrative);
  const builder = createInsightsBuilder();
  const steps: string[] = [];
  let conditionEmitted = false;
  let otherwiseEmitted = false;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    scanActorsFromSentence(trimmed, builder);
    recordIntent(builder, extractIntentFromSentence(trimmed));

    const lower = trimmed.toLowerCase();

    if (lower.startsWith('requirement')) {
      continue;
    }

    if (lower.includes('collect')) {
      const actor = normalizeCollector(findActor(trimmed));
      recordActor(builder, actor);
      const collection = parseCollectedItems(trimmed);
      steps.push(`Ask ${actor} to provide ${collection.tokensText}`);
      for (const variable of collection.variables) {
        recordVariable(builder, variable);
      }
      continue;
    }

    if (lower.includes('verify') && lower.includes('inventory')) {
      recordActor(builder, 'operations analyst');
      steps.push('Do: verify inventory availability in warehouse system');
      continue;
    }

    if (lower.includes('if') && lower.includes('finance manager') && !conditionEmitted) {
      recordActor(builder, 'finance manager');
      const condition = extractCondition(trimmed);
      recordConditionVariables(builder, condition, trimmed);
      steps.push(`If ${condition}`);
      steps.push('  Ask finance manager to review rush order pricing');
      steps.push('  Ask finance manager to approve or reject rush order');
      conditionEmitted = true;
      continue;
    }

    if ((lower.includes('rejected requests') || lower.startsWith('for rejected')) && !otherwiseEmitted) {
      recordActor(builder, 'requester');
      recordActor(builder, 'finance manager');
      if (!conditionEmitted) {
        steps.push('If finance manager rejects the rush order');
        conditionEmitted = true;
      }
      steps.push('Otherwise');
      steps.push('  Send notification to requester: "Rush order rejected"');
      steps.push('  Stop');
      otherwiseEmitted = true;
      continue;
    }

    if (lower.includes('send an email') || lower.includes('send email')) {
      recordActor(builder, 'requester');
      steps.push('Send email to requester: "Rush order approved"');
      if (!lower.includes('when approved')) {
        continue;
      }
    }

    if (lower.includes('schedule') && lower.includes('rush shipment')) {
      recordIntent(builder, 'Schedule rush shipment upon approval');
      steps.push('Do: schedule rush shipment');
      continue;
    }

    if (lower.includes('wait') && lower.includes('pickup')) {
      steps.push('Wait for carrier pickup confirmation');
      steps.push('Stop');
      continue;
    }
  }

  if (!steps.includes('Stop')) {
    steps.push('Stop');
  }

  const insights = finalizeInsights(builder);
  return { steps, insights };
}

function createInsightsBuilder(): NarrativeInsightsBuilder {
  return {
    actors: new Set<string>(),
    intents: new Set<string>(),
    variables: new Map<string, NarrativeVariableAccumulator>(),
  };
}

function splitSentences(narrative: string): string[] {
  return narrative
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim());
}

function findActor(sentence: string): string | undefined {
  for (const pattern of actorPatterns) {
    if (pattern.regex.test(sentence)) {
      return pattern.actor;
    }
  }
  dynamicRoleRegex.lastIndex = 0;
  const dynamic = sentence.toLowerCase().match(dynamicRoleRegex);
  if (dynamic && dynamic[0]) {
    return dynamic[0].trim();
  }
  if (/requester/i.test(sentence)) {
    return 'requester';
  }
  if (/customer/i.test(sentence)) {
    return 'customer';
  }
  return undefined;
}

type ParsedCollection = {
  tokensText: string;
  variables: Array<{ name: string; description?: string; origin: NarrativeVariableOrigin }>;
};

function parseCollectedItems(sentence: string): ParsedCollection {
  const match = sentence.match(/collect(?:\s+the)?\s+([^.;]+)/i);
  if (!match) {
    return {
      tokensText: '{details}',
      variables: [
        {
          name: 'details',
          description: 'Details supplied by requester',
          origin: 'input',
        },
      ],
    };
  }
  const rawItems = match[1]
    .replace(/ and /gi, ', ')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (!rawItems.length) {
    return {
      tokensText: '{details}',
      variables: [
        {
          name: 'details',
          description: 'Details supplied by requester',
          origin: 'input',
        },
      ],
    };
  }

  const variables = rawItems.map(raw => {
    const name = toTemplateName(raw);
    return {
      name,
      description: humanize(raw),
      origin: 'input' as NarrativeVariableOrigin,
    };
  });

  const tokens = variables.map(variable => `{${variable.name}}`);
  const tokensText = joinWithCommas(tokens);
  return { tokensText, variables };
}

function joinWithCommas(tokens: string[]): string {
  if (!tokens.length) return '{details}';
  if (tokens.length === 1) return tokens[0];
  const head = tokens.slice(0, -1).join(', ');
  const tail = tokens[tokens.length - 1];
  return `${head} and ${tail}`;
}

function toTemplateName(text: string): string {
  const normalized = text
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  return normalized || 'value';
}

function extractCondition(sentence: string): string {
  const clause = sentence
    .replace(/^if\s+/i, '')
    .split(/[,.;]/)[0]
    .trim()
    .toLowerCase();

  const withoutArticles = clause.replace(/\bthe\s+/g, '').replace(/\s+/g, ' ').trim();

  const withNumericComparison = withoutArticles.replace(
    /order value (?:is\s+)?(?:greater than|exceeds)\s+\$?(\d{1,3}(?:,\d{3})*|\d+)/g,
    (_match: string, amount: string) => {
      const normalizedAmount = amount.replace(/,/g, '');
      return `{order_value} > ${normalizedAmount}`;
    },
  );

  const templated = withNumericComparison.replace(/order value/g, '{order_value}');
  return templated;
}

function recordConditionVariables(
  builder: NarrativeInsightsBuilder,
  condition: string,
  sourceSentence: string,
): void {
  const matches = condition.matchAll(/\{([a-z0-9_]+)\}/g);
  for (const match of matches) {
    const name = match[1];
    recordVariable(builder, {
      name,
      description: inferVariableDescription(name, sourceSentence),
      origin: 'condition',
    });
  }
}

function inferVariableDescription(name: string, sourceSentence: string): string {
  const humanizedName = humanize(name);
  const lowerSentence = sourceSentence.toLowerCase();
  if (lowerSentence.includes('order value')) {
    return 'Order value threshold';
  }
  return humanizedName;
}

function inferFlowName(narrative: string): string | undefined {
  const match = narrative.match(/Flow[:\-]\s*([^\n]+)/i);
  if (match) {
    return match[1].trim();
  }
  const briefMatch = narrative.match(/Requirement Brief[:\-]\s*([^\n]+)/i);
  if (briefMatch) {
    return briefMatch[1].trim();
  }
  return undefined;
}

function normalizeCollector(actor: string | undefined): string {
  if (!actor) return 'requester';
  if (actor === 'customer') return 'requester';
  return actor;
}

function createVariableAccumulator(name: string): NarrativeVariableAccumulator {
  return {
    name,
    description: undefined,
    origins: new Set<NarrativeVariableOrigin>(),
  };
}

function recordVariable(
  builder: NarrativeInsightsBuilder,
  variable: { name: string; description?: string; origin: NarrativeVariableOrigin },
): void {
  const sanitized = toTemplateName(variable.name);
  let entry = builder.variables.get(sanitized);
  if (!entry) {
    entry = createVariableAccumulator(sanitized);
    builder.variables.set(sanitized, entry);
  }
  if (variable.description) {
    if (!entry.description || entry.description.length > variable.description.length) {
      entry.description = variable.description;
    }
  }
  entry.origins.add(variable.origin);
}

function recordActor(builder: NarrativeInsightsBuilder, actor: string | undefined): void {
  if (!actor) return;
  const normalized = normalizeActorName(actor);
  if (!normalized) return;
  builder.actors.add(normalized);
}

function normalizeActorName(actor: string): string {
  const normalized = actor.trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'customer') {
    return 'requester';
  }
  return normalized;
}

function recordIntent(builder: NarrativeInsightsBuilder, intent: string | undefined): void {
  if (!intent) return;
  const formatted = formatIntent(intent);
  if (!formatted) return;
  builder.intents.add(formatted);
}

function formatIntent(intent: string): string {
  const trimmed = intent.replace(/[.!?]+$/g, '').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function scanActorsFromSentence(sentence: string, builder: NarrativeInsightsBuilder): void {
  for (const pattern of actorPatterns) {
    if (pattern.regex.test(sentence)) {
      recordActor(builder, pattern.actor);
    }
  }
  let dynamicMatch: RegExpExecArray | null;
  dynamicRoleRegex.lastIndex = 0;
  while ((dynamicMatch = dynamicRoleRegex.exec(sentence.toLowerCase())) !== null) {
    recordActor(builder, dynamicMatch[1]);
  }
  if (/requester/i.test(sentence)) {
    recordActor(builder, 'requester');
  }
  if (/customer/i.test(sentence)) {
    recordActor(builder, 'requester');
  }
}

function extractIntentFromSentence(sentence: string): string | undefined {
  const cleaned = sentence.trim();
  if (!cleaned) return undefined;

  const requirementMatch = cleaned.match(/Requirement Brief[:\-]?\s*(.*)/i);
  if (requirementMatch) {
    const remainder = requirementMatch[1].trim();
    return extractNeedPhrase(remainder) ?? remainder;
  }

  const need = extractNeedPhrase(cleaned);
  if (need) return need;

  const goalMatch = cleaned.match(/goal(?:\s+is|:)\s*(.*)/i);
  if (goalMatch && goalMatch[1]) {
    return goalMatch[1];
  }

  const purposeMatch = cleaned.match(/so that\s+(.*)/i);
  if (purposeMatch && purposeMatch[1]) {
    return `Enable ${purposeMatch[1]}`;
  }

  const ensureMatch = cleaned.match(/ensure[s]?\s+(.*)/i);
  if (ensureMatch && ensureMatch[1]) {
    return `Ensure ${ensureMatch[1]}`;
  }

  return undefined;
}

function extractNeedPhrase(text: string): string | undefined {
  const patterns = [/needs(?:\s+to)?\s+(.*)/i, /wants(?:\s+to)?\s+(.*)/i, /requires\s+(.*)/i];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      let phrase = match[1].trim();
      phrase = phrase.replace(/^to\s+/i, '').replace(/[.!?]+$/g, '').trim();
      if (phrase) {
        return phrase;
      }
    }
  }
  return undefined;
}

function finalizeInsights(builder: NarrativeInsightsBuilder): NarrativeInsights {
  const actors = Array.from(builder.actors).sort();
  const intents = Array.from(builder.intents)
    .map(formatIntent)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const variables = Array.from(builder.variables.values())
    .map(variable => ({
      name: variable.name,
      description: variable.description ?? humanize(variable.name),
      origins: Array.from(variable.origins).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { actors, intents, variables };
}

function humanize(text: string): string {
  const normalized = text
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!normalized) return '';
  return normalized.replace(/\b\w/g, char => char.toUpperCase());
}
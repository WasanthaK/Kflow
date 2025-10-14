
export type ConversionResult = {
  story: string;
  modified: boolean;
};

export type AiConversionResult = ConversionResult & {
  aiUsed: boolean;
};

export type AiTranslator = (rawText: string) => Promise<string>;

export type AiConversionOptions = {
  maxAttempts?: number;
  retryDelayMs?: number;
  agentTranslator?: AiTranslator;
  agentMaxAttempts?: number;
};

const FLOW_HEADER_REGEX = /^\s*flow\s*:/im;

type BriefConversionOptions = {
  overrideTitle?: string;
};

export function ensureKflowStory(rawText: string): ConversionResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { story: '', modified: false };
  }

  if (FLOW_HEADER_REGEX.test(trimmed)) {
    return { story: normaliseWhitespace(trimmed), modified: false };
  }

  const converted = convertBriefToKflow(trimmed);
  return { story: converted, modified: true };
}

export async function ensureKflowStoryWithAI(
  rawText: string,
  translator?: AiTranslator,
  onAiError?: (error: unknown) => void,
  options: AiConversionOptions = {}
): Promise<AiConversionResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { story: '', modified: false, aiUsed: false };
  }

  if (FLOW_HEADER_REGEX.test(trimmed)) {
    return { story: normaliseWhitespace(trimmed), modified: false, aiUsed: false };
  }

  let aiDerivedTitle: string | undefined;
  const aggregatedErrors: string[] = [];

  const { maxAttempts = translator ? 2 : 0, retryDelayMs = 200, agentTranslator, agentMaxAttempts = agentTranslator ? 1 : 0 } = options;

  const attemptTranslation = async (
    label: string,
    translatorFn: AiTranslator | undefined,
    maxTries: number
  ): Promise<string | undefined> => {
    if (!translatorFn || maxTries <= 0) {
      return undefined;
    }

    for (let attempt = 1; attempt <= maxTries; attempt += 1) {
      try {
        const aiStory = await translatorFn(trimmed);
        const validation = validateAiStory(aiStory);
        aiDerivedTitle = validation.title ?? aiDerivedTitle;

        if (validation.ok) {
          return validation.normalized;
        }

        aggregatedErrors.push(`${label} attempt ${attempt}: ${validation.reason ?? 'Received invalid Kflow output.'}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        aggregatedErrors.push(`${label} attempt ${attempt}: ${message}`);
      }

      if (attempt < maxTries && retryDelayMs > 0) {
        await delay(retryDelayMs);
      }
    }

    return undefined;
  };

  const aiStory = await attemptTranslation('AI translator', translator, maxAttempts);
  if (aiStory) {
    return { story: aiStory, modified: true, aiUsed: true };
  }

  if (!aiStory && agentTranslator) {
    const agentStory = await attemptTranslation('Agent translator', agentTranslator, agentMaxAttempts);
    if (agentStory) {
      return { story: agentStory, modified: true, aiUsed: true };
    }
  }

  if (aggregatedErrors.length && onAiError) {
    onAiError(new Error(aggregatedErrors.join(' | ')));
  }

  const fallback = convertBriefToKflow(trimmed, { overrideTitle: aiDerivedTitle });
  return { story: fallback, modified: true, aiUsed: false };
}

function validateAiStory(candidate: string): { ok: boolean; normalized?: string; reason?: string; title?: string } {
  const normalized = normaliseWhitespace(candidate);
  const title = extractFlowTitle(normalized) ?? extractFlowTitle(candidate);

  if (!FLOW_HEADER_REGEX.test(normalized)) {
    return { ok: false, normalized, reason: 'Missing Flow header.', title };
  }

  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { ok: false, normalized, reason: 'No steps found after Flow header.', title };
  }

  const hasStep = lines.slice(1).some(line => !/^flow\b/i.test(line));
  if (!hasStep) {
    return { ok: false, normalized, reason: 'Flow header present but no actionable steps detected.', title };
  }

  return { ok: true, normalized, title };
}

function convertBriefToKflow(text: string, options: BriefConversionOptions = {}): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return 'Flow: Untitled Brief';
  }

  const [firstSentence, ...rest] = sentences;
  const title = options.overrideTitle?.trim() || buildTitle(firstSentence);
  const steps: string[] = [];

  for (const sentence of rest.length ? rest : sentences.slice(1)) {
    steps.push(...sentenceToSteps(sentence));
  }

  if (!steps.some(step => /^stop\b/i.test(step))) {
    steps.push('Stop');
  }

  return ['Flow: ' + title, '', ...steps].join('\n');
}

function extractFlowTitle(text: string): string | undefined {
  const directMatch = text.match(/flow\s*[:\-]\s*(.+)/i);
  if (directMatch?.[1]) {
    const candidate = directMatch[1].split(/\r?\n/)[0]?.trim();
    if (candidate) {
      return capitaliseFirst(candidate.replace(/[`*#]+/g, '').trim());
    }
  }

  const flowNameMatch = text.match(/flow\s*name\s*[:\-]\s*(.+)/i);
  if (flowNameMatch?.[1]) {
    const candidate = flowNameMatch[1].split(/\r?\n/)[0]?.trim();
    if (candidate) {
      return capitaliseFirst(candidate.replace(/[`*#]+/g, '').trim());
    }
  }

  const titleMatch = text.match(/title\s*[:\-]\s*(.+)/i);
  if (titleMatch?.[1]) {
    const candidate = titleMatch[1].split(/\r?\n/)[0]?.trim();
    if (candidate) {
      return capitaliseFirst(candidate.replace(/[`*#]+/g, '').trim());
    }
  }

  return undefined;
}

function splitSentences(paragraph: string): string[] {
  const cleaned = paragraph
    .replace(/\s+/g, ' ')
    .replace(/\s*[-•]\s+/g, ' ')
    .trim();

  const matches = cleaned.match(/[^.!?]+[.!?]?/g);
  if (!matches) return [cleaned];
  return matches.map(sentence => sentence.trim()).filter(Boolean);
}

function buildTitle(sentence: string): string {
  const withoutPrefix = sentence
    .replace(/^incident brief[:\-]\s*/i, '')
    .replace(/^requirement brief[:\-]\s*/i, '')
    .replace(/^business analyst[:\-]\s*/i, '')
    .trim();

  const words = withoutPrefix.split(/\s+/).filter(Boolean);
  const selected = words.slice(0, 8);
  if (!selected.length) {
    return 'Untitled Brief';
  }

  return selected
    .map(word => word.replace(/[^a-z0-9]+/gi, ''))
    .filter(Boolean)
    .map((word, index) => {
      if (index === 0) return capitalise(word);
      if (/^(and|the|for|with|a|an)$/i.test(word)) {
        return word.toLowerCase();
      }
      return capitalise(word);
    })
    .join(' ');
}

function sentenceToSteps(sentence: string): string[] {
  const trimmed = stripTrailingPunctuation(sentence.trim());
  if (!trimmed) return [];

  const whenMatch = trimmed.match(/^when\s+([^,]+),(.*)$/i);
  if (whenMatch) {
    const [, condition, remainder] = whenMatch;
    return [formatCondition(condition), ...indentSteps(actionsFromClause(remainder))];
  }

  const ifMatch = trimmed.match(/^if\s+([^,]+)(?:,\s*(.*))?$/i);
  if (ifMatch) {
    const [, condition, remainder] = ifMatch;
    const steps = [formatCondition(condition)];
    if (remainder) {
      steps.push(...indentSteps(actionsFromClause(remainder)));
    }
    return steps;
  }

  if (/^otherwise\b/i.test(trimmed)) {
    const remainder = trimmed.replace(/^otherwise\b[,\s]*/i, '');
    const steps = ['Otherwise'];
    if (remainder) {
      steps.push(...indentSteps(actionsFromClause(remainder)));
    }
    return steps;
  }

  if (/^once\s+([^,]+),(.*)$/i.test(trimmed)) {
    const [, condition, remainder] = trimmed.match(/^once\s+([^,]+),(.*)$/i)!;
    return [formatCondition('Once ' + condition), ...indentSteps(actionsFromClause(remainder))];
  }

  return actionsFromClause(trimmed);
}

function formatCondition(condition: string): string {
  const cleaned = condition.trim();
  if (!cleaned) {
    return 'If condition_met';
  }
  if (/^if\b/i.test(cleaned)) {
    return capitaliseFirst(cleaned);
  }
  if (/^once\b/i.test(cleaned)) {
    return 'If ' + capitaliseFirst(cleaned);
  }
  return 'If ' + capitaliseFirst(cleaned);
}

function actionsFromClause(clause: string): string[] {
  return splitActions(clause)
    .map(action => action.trim())
    .filter(Boolean)
    .map(convertActionToStep);
}

function splitActions(clause: string): string[] {
  const sanitized = clause.replace(/\band\b/gi, '|').replace(/\bor\b/gi, '|');
  const segments = sanitized.split('|').map(seg => seg.replace(/^then\s+/i, '').trim());
  if (segments.length > 1) {
    return segments;
  }
  return [clause.trim()];
}

function convertActionToStep(action: string): string {
  const cleaned = stripTrailingPunctuation(action).trim();
  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();

  if (lower.startsWith('ask ')) {
    return 'Ask ' + cleaned.slice(4).trim();
  }

  if (lower.startsWith('send ') || lower.startsWith('notify ') || lower.includes(' notify ')) {
    return 'Send ' + cleaned.replace(/^send\s+/i, '').replace(/^notify\s+/i, '');
  }

  if (lower.startsWith('wait ')) {
    return 'Wait ' + cleaned.slice(5).trim();
  }

  if (lower.startsWith('stop')) {
    return 'Stop';
  }

  if (lower.startsWith('record ') || lower.startsWith('log ') || lower.startsWith('capture ')) {
    return 'Do: ' + ensureVariableWrapping(cleaned);
  }

  if (lower.startsWith('engage ') || lower.startsWith('escalate ') || lower.startsWith('initiate ') || lower.startsWith('open ')) {
    return 'Do: ' + cleaned;
  }

  if (lower.startsWith('schedule ') || lower.startsWith('queue ') || lower.startsWith('request ')) {
    return 'Do: ' + cleaned;
  }

  if (lower.startsWith('convene ') || lower.startsWith('announce ') || lower.startsWith('assign ')) {
    return 'Do: ' + cleaned;
  }

  if (lower.startsWith('continue ') || lower.startsWith('resume ')) {
    return 'Do: ' + cleaned;
  }

  return 'Do: ' + cleaned;
}

function ensureVariableWrapping(action: string): string {
  if (!/,/.test(action) && !/\band\b/i.test(action)) {
    return action;
  }

  const [, verb, rest] = action.match(/^(\w+)\s+(.*)$/i) ?? [];
  if (!verb || !rest) return action;

  const items = rest
    .split(/,|\band\b/gi)
    .map(part => part.replace(/^the\s+/i, '').trim())
    .filter(Boolean)
    .map(token => `{${slugify(token)}}`);

  if (!items.length) return action;
  return `${verb} ${items.join(', ')}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function normaliseWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.!?]+$/g, '').trim();
}

function capitalise(word: string): string {
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function capitaliseFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function indentSteps(steps: string[], depth = 1): string[] {
  if (!steps.length) return steps;
  const prefix = '  '.repeat(Math.max(1, depth));
  return steps.map(step => {
    if (!step) return step;
    if (/^\s/.test(step)) {
      return step;
    }
    return `${prefix}${step}`;
  });
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

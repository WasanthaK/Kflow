import { parse as parseYaml } from 'yaml';
import type { IR } from '../../../language/src/ir/types.js';
import { extractStoryInsights, type StoryInsights } from './storyInsights';

export type SimpleScript = Record<string, unknown>;

export type KStoryFormat = 'story' | 'simplescript' | 'kstory' | 'narrative';

export interface KStoryMetadata extends Record<string, unknown> {
  insights?: StoryInsights;
  originalNarrative?: string;
  sourceFormat?: KStoryFormat;
}

export interface KStory {
  version: 1;
  format: KStoryFormat;
  sourceFilename?: string;
  story: string;
  simpleScript: SimpleScript | null;
  ir?: IR | null;
  bpmnXml?: string | null;
  metadata?: KStoryMetadata;
}

export type NormalizeOptions = {
  filename?: string;
};

export function normalizeStoryAsset(input: string, options: NormalizeOptions = {}): KStory {
  const rawFilename = options.filename;
  const filename = rawFilename?.toLowerCase();
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      version: 1,
      format: 'story',
      sourceFilename: rawFilename,
      story: '',
      simpleScript: null,
      ir: null,
      bpmnXml: null,
      metadata: { sourceFormat: 'story', insights: { actors: [], actions: [], resources: [] } },
    };
  }

  let format: KStoryFormat = 'story';
  let story = '';
  let simpleScript: SimpleScript | null = null;
  let metadata: KStoryMetadata | undefined;

  const attachInsights = (storyText: string, existingMetadata?: KStoryMetadata): KStoryMetadata => {
    const insights = extractStoryInsights(storyText);
    const merged: KStoryMetadata = {
      ...(existingMetadata ?? {}),
      insights,
    };
    if (!merged.sourceFormat) {
      merged.sourceFormat = format;
    }
    return merged;
  };

  if ((filename && filename.endsWith('.kstory')) || looksLikeKStory(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed) as KStory;
      if (parsed && parsed.version === 1 && typeof parsed.story === 'string') {
        format = parsed.format ?? 'kstory';
        story = parsed.story;
        simpleScript = parsed.simpleScript ?? null;
        metadata = attachInsights(story, {
          ...(parsed.metadata ?? {}),
          sourceFormat: parsed.metadata?.sourceFormat ?? parsed.format ?? 'kstory',
        });
        return {
          version: 1,
          format,
          sourceFilename: rawFilename ?? parsed.sourceFilename,
          story,
          simpleScript,
          ir: null,
          bpmnXml: null,
          metadata,
        };
      }
    } catch (error) {
      console.warn('Failed to parse .kstory file; falling back to raw content', error);
    }
  }

  if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
    const parsedSimple = tryParseSimpleScript(trimmed);
    if (parsedSimple) {
      format = 'simplescript';
      story = simpleScriptToStory(parsedSimple);
      simpleScript = parsedSimple;
      metadata = attachInsights(story, { sourceFormat: 'simplescript' });
      return {
        version: 1,
        format,
        sourceFilename: rawFilename,
        story,
        simpleScript,
        ir: null,
        bpmnXml: null,
        metadata,
      };
    }
  }

  if (filename && (filename.endsWith('.json') || filename.endsWith('.story.json'))) {
    const parsedSimple = tryParseJson(trimmed);
    if (parsedSimple) {
      format = 'simplescript';
      story = simpleScriptToStory(parsedSimple);
      simpleScript = parsedSimple;
      metadata = attachInsights(story, { sourceFormat: 'simplescript' });
      return {
        version: 1,
        format,
        sourceFilename: rawFilename,
        story,
        simpleScript,
        ir: null,
        bpmnXml: null,
        metadata,
      };
    }
  }

  const narrativeDetected = detectNarrative(trimmed);
  if (narrativeDetected) {
    const converted = convertNarrativeToStory(trimmed, rawFilename);
    format = 'story';
    story = converted.story;
    metadata = attachInsights(story, {
      originalNarrative: trimmed,
      sourceFormat: 'narrative',
    });
  } else {
    format = 'story';
    story = normalizeStoryText(trimmed, 'story');
    metadata = attachInsights(story, { sourceFormat: 'story' });
  }

  return {
    version: 1,
    format,
    sourceFilename: rawFilename,
    story,
    simpleScript,
    ir: null,
    bpmnXml: null,
    metadata,
  };
}

export function serializeKStory(kstory: KStory): string {
  return JSON.stringify({
    version: 1,
    format: kstory.format,
    sourceFilename: kstory.sourceFilename,
    story: kstory.story,
    simpleScript: kstory.simpleScript,
    ir: kstory.ir ?? undefined,
    bpmnXml: kstory.bpmnXml ?? undefined,
    metadata: kstory.metadata,
  }, null, 2);
}

function looksLikeKStory(text: string): boolean {
  if (!text.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && 'version' in parsed && 'story' in parsed;
  } catch {
    return false;
  }
}

function tryParseSimpleScript(input: string): SimpleScript | null {
  try {
    const doc = parseYaml(input) as unknown;
    if (doc && typeof doc === 'object') {
      return doc as SimpleScript;
    }
    return null;
  } catch (error) {
    console.warn('Failed to parse SimpleScript YAML', error);
    return null;
  }
}

function tryParseJson(input: string): SimpleScript | null {
  try {
    const doc = JSON.parse(input) as unknown;
    if (doc && typeof doc === 'object') {
      return doc as SimpleScript;
    }
    return null;
  } catch (error) {
    console.warn('Failed to parse JSON SimpleScript', error);
    return null;
  }
}

function detectNarrative(text: string): boolean {
  if (/^flow\s*:/i.test(text)) {
    return false;
  }
  return /Requirement Brief:/i.test(text) || /needs a simple approval flow/i.test(text);
}

function normalizeStoryText(text: string, format: KStoryFormat): string {
  if (format === 'story') {
    return text;
  }
  if (format === 'narrative') {
    return `Flow: Untitled\n${text}`;
  }
  return text;
}

type NarrativeConversion = {
  story: string;
};

function convertNarrativeToStory(text: string, filename?: string): NarrativeConversion {
  const cleaned = text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  const lines: string[] = [];
  const fragmentsBuffer: string[] = [];

  let derivedTitle = deriveNarrativeTitle(sentences, filename);

  const pushFragments = (raw: string) => {
    const normalized = raw.replace(/^and\s+/i, '').trim();
    if (!normalized) return;
    const parts = normalized
      .split(/,(?![^()]*\))|\band\b/gi)
      .map(part => part.trim())
      .filter(Boolean);
    parts.forEach(part => fragmentsBuffer.push(part));
  };

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();

    if (lower.startsWith('requirement brief')) {
      const rest = sentence.replace(/requirement brief:/i, '').trim();
      if (rest) {
        lines.push(`Remember: ${capitalizeSentence(rest)}`);
      }
      return;
    }

    if (lower.startsWith('flow:')) {
      derivedTitle = sentence.replace(/^flow:/i, '').trim() || derivedTitle;
      return;
    }

    if (lower.startsWith('when approved')) {
      const rest = sentence.replace(/^When approved,?\s*/i, '');
      pushFragments(rest);
      return;
    }

    if (lower.startsWith('when ')) {
      const rest = capitalizeSentence(sentence.replace(/^When\s+/i, ''));
      lines.push(`Trigger: ${rest}`);
      return;
    }

    if (lower.startsWith('if ')) {
      const condition = sentence.slice(3).trim();
      lines.push(`If ${capitalizeSentence(condition)}`);
      return;
    }

    if (lower.startsWith('for rejected')) {
      if (!lines.includes('Otherwise')) {
        lines.push('Otherwise');
      }
      const rest = sentence.replace(/^For rejected[^,]*,?\s*/i, '');
      pushFragments(rest);
      return;
    }

    if (lower.startsWith('otherwise')) {
      if (!lines.includes('Otherwise')) {
        lines.push('Otherwise');
      }
      const rest = sentence.replace(/^Otherwise,?\s*/i, '');
      pushFragments(rest);
      return;
    }

    const directiveMatch = sentence.match(/^The\s+([a-z\s]+?)\s+(should|must|needs to|will|shall)\s+(.*)/i);
    if (directiveMatch) {
      const actor = titleCase(directiveMatch[1]);
      const action = directiveMatch[3];
      const mapped = mapFragmentToLine(`${actor} ${action}`);
      if (mapped) {
        lines.push(mapped.startsWith('Ask') ? mapped : `Ask ${actor} to ${mapped.replace(/^Do:\s*/i, '').replace(/^Send\s+/i, '').trim()}`);
      }
      return;
    }

    pushFragments(sentence);
  });

  fragmentsBuffer.forEach(fragment => {
    const mapped = mapFragmentToLine(fragment);
    if (mapped) {
      lines.push(mapped);
    }
  });

  const storyLines = [`Flow: ${derivedTitle || 'Untitled Narrative Flow'}`, ...dedupeLines(lines)];
  return {
    story: storyLines.join('\n'),
  };
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function mapFragmentToLine(fragment: string): string | null {
  const trimmed = fragment.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const capitalized = capitalizeSentence(trimmed);

  if (lower === 'stop' || lower.startsWith('stop ')) {
    return 'Stop';
  }

  if (lower.startsWith('send ') || lower.startsWith('notify ')) {
    const payload = capitalized.replace(/^(Send|Notify)\s+/i, '');
    return `Send ${payload}`;
  }

  if (lower.startsWith('wait ')) {
    const payload = capitalized.replace(/^Wait\s+/i, '');
    return `Wait ${payload}`;
  }

  if (lower.startsWith('ask ')) {
    return `Ask ${capitalized.replace(/^Ask\s+/i, '')}`;
  }

  if (lower.startsWith('schedule ')) {
    return `Do: ${capitalized}`;
  }

  if (lower.startsWith('collect ') || lower.startsWith('verify ') || lower.startsWith('review ') || lower.startsWith('approve ') || lower.startsWith('process ') || lower.startsWith('calculate ') || lower.startsWith('document ') || lower.startsWith('capture ') || lower.startsWith('confirm ')) {
    return `Do: ${capitalized}`;
  }

  if (lower.startsWith('engage ') || lower.startsWith('assign ') || lower.startsWith('escalate ')) {
    return `Do: ${capitalized}`;
  }

  return `Do: ${capitalized}`;
}

function deriveNarrativeTitle(sentences: string[], filename?: string): string {
  if (filename) {
    const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    if (base) {
      return titleCase(base);
    }
  }

  const requirementSentence = sentences.find(sentence => /requirement brief:/i.test(sentence));
  if (requirementSentence) {
    const afterColon = requirementSentence.replace(/requirement brief:/i, '').trim();
    if (afterColon) {
      return titleCase(afterColon.replace(/\.$/, ''));
    }
  }

  if (sentences.length > 0) {
    return titleCase(sentences[0].replace(/\.$/, ''));
  }

  return 'Narrative Flow';
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function capitalizeSentence(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function simpleScriptToStory(script: SimpleScript): string {
  const lines: string[] = [];
  const flowName = typeof script.flow === 'string' && script.flow.trim() ? script.flow.trim() : 'Untitled';
  lines.push(`Flow: ${flowName}`);

  if (Array.isArray(script.steps)) {
    emitSteps(script.steps, 0, lines);
  }

  return lines.join('\n');
}

function emitSteps(steps: unknown[], indent: number, lines: string[]): void {
  for (const step of steps) {
    emitStep(step, indent, lines);
  }
}

function emitStep(step: unknown, indent: number, lines: string[]): void {
  const prefix = '  '.repeat(indent);

  if (!step) {
    return;
  }

  if (typeof step === 'string') {
    lines.push(`${prefix}${step}`);
    return;
  }

  if (Array.isArray(step)) {
    emitSteps(step, indent, lines);
    return;
  }

  if (typeof step !== 'object') {
    return;
  }

  const record = step as Record<string, unknown>;

  if (typeof record.ask === 'string') {
    lines.push(`${prefix}Ask ${record.ask}`);
  }

  if (typeof record.do === 'string') {
    lines.push(`${prefix}Do: ${record.do}`);
  }

  if (typeof record.send === 'string') {
    lines.push(`${prefix}Send ${record.send}`);
  }

  if (typeof record.receive === 'string') {
    lines.push(`${prefix}Receive ${record.receive}`);
  }

  if (typeof record.wait === 'string') {
    lines.push(`${prefix}Wait ${record.wait}`);
  }

  if (record.stop === true || typeof record.stop === 'string') {
    lines.push(`${prefix}Stop`);
  }

  if (typeof record.userTask === 'object' && record.userTask) {
    const userTask = record.userTask as { assignee?: string; description?: string };
    const parts = [userTask.assignee, userTask.description].filter(Boolean);
    if (parts.length) {
      lines.push(`${prefix}Ask ${parts.join(' ')}`.trim());
    }
  }

  if (typeof record.manualTask === 'object' && record.manualTask) {
    const manualTask = record.manualTask as { description?: string };
    if (manualTask.description) {
      lines.push(`${prefix}Do: ${manualTask.description}`);
    }
  }

  if (typeof record.businessRuleTask === 'object' && record.businessRuleTask) {
    const businessRuleTask = record.businessRuleTask as { description?: string };
    if (businessRuleTask.description) {
      lines.push(`${prefix}Do: ${businessRuleTask.description}`);
    }
  }

  if (typeof record.serviceTask === 'object' && record.serviceTask) {
    const serviceTask = record.serviceTask as { description?: string };
    if (serviceTask.description) {
      lines.push(`${prefix}Do: ${serviceTask.description}`);
    }
  }

  if (typeof record.scriptTask === 'object' && record.scriptTask) {
    const scriptTask = record.scriptTask as { description?: string };
    if (scriptTask.description) {
      lines.push(`${prefix}Do: ${scriptTask.description}`);
    }
  }

  if (typeof record.messageTask === 'object' && record.messageTask) {
    const messageTask = record.messageTask as { description?: string };
    if (messageTask.description) {
      lines.push(`${prefix}Send ${messageTask.description}`);
    }
  }

  if (typeof record.waitTask === 'object' && record.waitTask) {
    const waitTask = record.waitTask as { description?: string };
    if (waitTask.description) {
      lines.push(`${prefix}Wait ${waitTask.description}`);
    }
  }

  if (typeof record.if === 'string') {
    lines.push(`${prefix}If ${normalizeCondition(record.if)}`);
  } else if (typeof record.if === 'object' && record.if) {
    const branch = record.if as Record<string, unknown>;
    const condition = typeof branch.cond === 'string' ? branch.cond : '';
    if (condition) {
      lines.push(`${prefix}If ${normalizeCondition(condition)}`);
    }
    if (Array.isArray(branch.then)) {
      emitSteps(branch.then, indent + 1, lines);
    } else if (branch.then) {
      emitStep(branch.then, indent + 1, lines);
    }
    if (branch.else) {
      lines.push(`${prefix}Otherwise`);
      if (Array.isArray(branch.else)) {
        emitSteps(branch.else, indent + 1, lines);
      } else {
        emitStep(branch.else, indent + 1, lines);
      }
    }
  }

  if (Array.isArray(record.then)) {
    emitSteps(record.then, indent + 1, lines);
  }

  if (record.then && !Array.isArray(record.then) && typeof record.then === 'object') {
    emitStep(record.then, indent + 1, lines);
  }

  if (record.else) {
    lines.push(`${prefix}Otherwise`);
    if (Array.isArray(record.else)) {
      emitSteps(record.else, indent + 1, lines);
    } else {
      emitStep(record.else, indent + 1, lines);
    }
  }

  if (Array.isArray(record.steps)) {
    emitSteps(record.steps, indent, lines);
  }
}

function normalizeCondition(condition: string): string {
  return condition.replace(/\$\{([^}]+)\}/g, '{$1}');
}

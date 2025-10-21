import type { IR, IRState } from '../ir/types.js';
import { inferFormFromPrompt } from './formInference.js';

// Enhanced StoryFlow to SimpleScript compiler with BPMN compliance
export function storyToSimple(story: string): string {
  return storyToSimpleRuleBased(story);
}

export function storyToSimpleRuleBased(story: string): string {
  const lines = story.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => l.toLowerCase().startsWith('flow:'))?.replace(/^[^:]+:/, '').trim() || 'Untitled';
  
  // Enhanced variable extraction
  const vars: Record<string, string> = {};
  
  // 1. Extract template variables {variable}
  const templateVars = story.match(/{([^}]+)}/g) || [];
  const uniqueTemplateVars = [...new Set(templateVars.map(v => v.slice(1, -1)))];
  uniqueTemplateVars.forEach(varName => {
    vars[varName] = `input variable (${varName})`;
  });
  
  // 2. Extract condition variables from If statements
  const conditions = story.match(/If\s+([^\n]+)/gi) || [];
  conditions.forEach(condition => {
    const conditionText = condition.replace(/^If\s+/i, '').trim();
    if (conditionText.match(/approved|accepted|confirmed/i)) {
      vars['approved'] = 'boolean state from approval decision';
    }
    if (conditionText.match(/rejected|denied|declined/i)) {
      vars['rejected'] = 'boolean state from rejection decision';  
    }
    if (conditionText.match(/available|exists|found/i)) {
      vars['available'] = 'boolean state for availability check';
    }
  });
  
  // 3. Extract actor references and add them as template variables
  const actors = story.match(/\b(manager|employee|user|customer|admin|supervisor|owner|agent|lead)\b/gi) || [];
  const uniqueActors = [...new Set(actors.map(a => a.toLowerCase()))];
  uniqueActors.forEach(actor => {
    if (!vars[actor] && !uniqueTemplateVars.includes(actor)) {
      vars[actor] = `workflow actor`;
    }
  });

  // 4. Extract system references
  const systems = story.match(/\b(HR system|database|API|server|service|application|system|platform)\b/gi) || [];
  const uniqueSystems = [...new Set(systems.map(s => s.toLowerCase().replace(/\s+/g, '_')))];
  uniqueSystems.forEach(system => {
    const systemVar = system.replace(/\s+/g, '_');
    if (!vars[systemVar] && !uniqueTemplateVars.includes(systemVar)) {
      vars[systemVar] = `target system`;
    }
  });

  // 5. Extract action verbs that could be parameterized
  const actions = story.match(/\b(update|create|send|delete|modify|insert|process|execute|run|call)\b/gi) || [];
  const uniqueActions = [...new Set(actions.map(a => a.toLowerCase()))];
  uniqueActions.forEach(action => {
    if (!vars[action] && !uniqueTemplateVars.includes(action)) {
      vars[action] = `workflow action`;
    }
  });
  
  // Helper function to convert references to template variables
  const convertToTemplates = (text: string): string => {
    let converted = text;
    
    // Convert actors
    uniqueActors.forEach(actor => {
      if (!uniqueTemplateVars.includes(actor)) {
        const regex = new RegExp(`\\b${actor}\\b`, 'gi');
        converted = converted.replace(regex, `{${actor}}`);
      }
    });
    
    // Convert systems  
    uniqueSystems.forEach(system => {
      const originalSystem = system.replace(/_/g, ' ');
      if (!uniqueTemplateVars.includes(system)) {
        const regex = new RegExp(`\\b${originalSystem}\\b`, 'gi');
        converted = converted.replace(regex, `{${system}}`);
      }
    });
    
    // Convert actions (only at the beginning of action phrases)
    uniqueActions.forEach(action => {
      if (!uniqueTemplateVars.includes(action)) {
        const regex = new RegExp(`\\b${action}\\b(?=\\s)`, 'gi');
        converted = converted.replace(regex, `{${action}}`);
      }
    });
    
    return converted;
  };

  // Convert lines to steps with template variable conversion and enhanced task types
  const steps = lines
    .filter(l => !/^flow:|^trigger:/i.test(l))
    .map(l => {
      // Handle control flow structures properly
      if (/^if\s+/i.test(l)) {
        return { 
          if: convertToTemplates(l.replace(/^if\s+/i, '').trim())
        };
      }
      if (/^otherwise/i.test(l)) {
        return { 
          otherwise: true
        };
      }
      
      // Enhanced task type detection
      if (/^ask /i.test(l)) {
        return { 
          userTask: {
            description: convertToTemplates(l.slice(4).trim()),
            assignee: extractAssignee(l),
            type: 'human_input'
          }
        };
      }
      
      // Service tasks (automated system operations)
      if (/^do:\s*(create|update|delete|insert|process|execute|call|run|api|database)/i.test(l)) {
        return { 
          serviceTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'system_operation'
          }
        };
      }
      
      // Manual tasks (human work)
      if (/^do:\s*(review|approve|check|verify|inspect|examine|sign|validate)/i.test(l)) {
        return { 
          manualTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'human_work'
          }
        };
      }
      
      // Script tasks (calculations/transformations/data processing)
      if (/^do:\s*(calculate|compute|transform|parse|analyze|format|sum|average|total|count|aggregate|convert|round|truncate|normalize|validate|encrypt|decrypt|hash|encode|decode|sort|filter|map|reduce|merge|split|join|extract|generate|derive|interpolate|extrapolate|reconcile|balance)/i.test(l)) {
        const description = l.replace(/^do:?\s*/i,'');
        const taskSubtype = getScriptTaskSubtype(description);
        return { 
          scriptTask: {
            description: convertToTemplates(description),
            type: 'computation',
            subtype: taskSubtype,
            executable: isExecutableScript(description)
          }
        };
      }
      
      // Business rule tasks
      if (/^do:\s*(evaluate|determine|decide|classify|assess)/i.test(l)) {
        return { 
          businessRuleTask: {
            description: convertToTemplates(l.replace(/^do:?\s*/i,'')),
            type: 'rule_evaluation'
          }
        };
      }
      
      // Generic do task
      if (/^do:/i.test(l) || /^do /i.test(l)) return { do: convertToTemplates(l.replace(/^do:?\s*/i,'')) };
      
      // Message tasks
      if (/^send /i.test(l)) {
        return {
          messageTask: {
            description: convertToTemplates(l.slice(5).trim()),
            type: 'send',
            messageType: extractMessageType(l)
          }
        };
      }
      
      // Wait tasks
      if (/^wait /i.test(l)) {
        return {
          waitTask: {
            description: convertToTemplates(l.slice(5).trim()),
            type: 'timer'
          }
        };
      }
      
      if (/^receive /i.test(l)) return { receive: convertToTemplates(l.slice(8).trim()) };
      if (/^stop/i.test(l)) return { endEvent: { type: 'terminate' } };
      
      return { remember: { note: l } };
    });
    
  // Helper functions for enhanced parsing
  function extractAssignee(line: string): string | undefined {
    const match = line.match(/ask\s+([^{\s]+)/i);
    return match ? match[1] : undefined;
  }
  
  function extractMessageType(line: string): string {
    if (line.includes('email')) return 'email';
    if (line.includes('notification')) return 'notification';
    if (line.includes('sms')) return 'sms';
    if (line.includes('slack')) return 'slack';
    return 'message';
  }

  function getScriptTaskSubtype(description: string): string {
    // Financial calculations
    if (/calculate|compute|sum|average|total|interest|payment|tax|discount|profit|loss|roi|depreciation/i.test(description)) {
      return 'financial_calculation';
    }
    
    // Data transformations
    if (/transform|convert|format|normalize|encode|decode|parse|extract|merge|split|join/i.test(description)) {
      return 'data_transformation';
    }
    
    // Statistical/analytical
    if (/analyze|aggregate|count|average|median|variance|correlation|trend|forecast/i.test(description)) {
      return 'statistical_analysis';
    }
    
    // Validation/verification
    if (/validate|verify|check|reconcile|balance|audit|confirm/i.test(description)) {
      return 'data_validation';
    }
    
    // Security operations
    if (/encrypt|decrypt|hash|sign|authenticate|authorize|token/i.test(description)) {
      return 'security_operation';
    }
    
    // String/text processing
    if (/generate|derive|interpolate|concatenate|substring|replace|regex/i.test(description)) {
      return 'text_processing';
    }
    
    return 'general_computation';
  }

  function isExecutableScript(description: string): boolean {
    // Check if the description contains executable elements
    const executablePatterns = [
      /using\s+(formula|function|algorithm|script|code)/i,
      /with\s+(parameters|arguments|inputs)/i,
      /=\s*[^=]/,  // Assignment or equals
      /\+|\-|\*|\//,  // Math operators
      /\(\s*.*\s*\)/,  // Function calls
      /{[^}]+}\s*[+\-*\/=]/,  // Variable operations
    ];
    
    return executablePatterns.some(pattern => pattern.test(description));
  }

  return JSON.stringify({ flow: title, vars, steps }, null, 2);
}

type StructuredStep =
  | { kind: 'userTask'; prompt: string; assignee?: string }
  | { kind: 'serviceTask'; action: string }
  | { kind: 'sendTask'; channel: string; to: string; message: string }
  | { kind: 'stop'; reason?: string }
  | { kind: 'if'; condition: string; then: StructuredStep[]; otherwise?: StructuredStep[] }
  | { kind: 'event'; event: string; steps: StructuredStep[]; stability?: StabilityRequirement }
  | { kind: 'wait'; label: string; durationMs?: number; until?: string };

type StabilityRequirement = {
  metric: string;
  comparator: '<' | '>';
  thresholdValue: number;
  thresholdUnit: string;
  durationMinutes: number;
  durationMs: number;
  label: string;
};

type ConditionalStep = Extract<StructuredStep, { kind: 'if' }>;

type StoryBlockContext = {
  level: number;
  steps: StructuredStep[];
  conditional?: ConditionalStep;
};

class IdFactory {
  private readonly counts = new Map<string, number>();

  next(prefix: string, hint?: string): string {
    const base = sanitizeIdentifier(hint ?? prefix);
    const key = `${prefix}_${base}`;
    const current = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, current);
    return current === 1 ? key : `${key}_${current}`;
  }
}

export function storyToIr(story: string): IR {
  const simple = JSON.parse(storyToSimple(story));
  const structuredSteps = parseStructuredStory(story);

  const idFactory = new IdFactory();
  const states: IRState[] = [];
  let terminalId: string | undefined;

  const ensureTerminal = (): string => {
    if (!terminalId) {
      terminalId = idFactory.next('Stop', 'terminal');
      states.push({ id: terminalId, kind: 'stop', reason: 'Flow completed' });
    }
    return terminalId;
  };

  const buildSequence = (steps: StructuredStep[], continuation?: string): string | undefined => {
    let cursor = continuation;
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      cursor = emitStep(steps[index], cursor);
    }
    return cursor;
  };

  const emitStep = (step: StructuredStep, continuation?: string): string => {
    switch (step.kind) {
      case 'userTask': {
        const id = idFactory.next('UserTask', step.assignee ?? step.prompt);
        
        // Generate form from prompt if it contains variables
        const form = inferFormFromPrompt(step.prompt, id);
        
        const state: Extract<IRState, { kind: 'userTask' }> = {
          id,
          kind: 'userTask',
          prompt: step.prompt,
          next: continuation,
        };
        
        if (step.assignee) {
          state.assignee = step.assignee;
        }
        
        // Attach form if it has fields
        if (form.fields.length > 0) {
          state.form = form;
        }
        
        states.push(state);
        return id;
      }
      case 'serviceTask': {
        const id = idFactory.next('ServiceTask', step.action);
        const state: Extract<IRState, { kind: 'task' }> = {
          id,
          kind: 'task',
          action: step.action,
          next: continuation,
        };
        states.push(state);
        return id;
      }
      case 'sendTask': {
        const id = idFactory.next('SendTask', `${step.channel}_${step.to}`);
        const state: Extract<IRState, { kind: 'send' }> = {
          id,
          kind: 'send',
          channel: step.channel,
          to: step.to,
          message: step.message,
          next: continuation,
        };
        states.push(state);
        return id;
      }
      case 'stop': {
        const id = idFactory.next('Stop', step.reason ?? 'end');
        const state: Extract<IRState, { kind: 'stop' }> = {
          id,
          kind: 'stop',
          reason: step.reason,
        };
        states.push(state);
        return id;
      }
      case 'wait': {
        const id = idFactory.next('Wait', step.label);
        const state: Extract<IRState, { kind: 'wait' }> = {
          id,
          kind: 'wait',
          next: continuation,
        };
        if (step.durationMs !== undefined) {
          state.delayMs = step.durationMs;
        }
        if (step.until) {
          state.until = step.until;
        }
        if (step.label) {
          state.name = step.label;
        }
        states.push(state);
        return id;
      }
      case 'event': {
        const afterEvent = buildSequence(step.steps, continuation);
        let postEventContinuation = afterEvent;

        if (step.stability) {
          const stability = step.stability;

          const stabilityFailureId = idFactory.next('Stop', `${stability.metric}_stability_not_confirmed`);
          states.push({
            id: stabilityFailureId,
            kind: 'stop',
            reason: `${formatReadableLabel(stability.metric)} stability not confirmed`,
          });

          const monitorId = idFactory.next('ServiceTask', `${stability.metric}_stability_monitor`);
          const monitorAction = `Monitor ${formatReadableLabel(stability.metric)} ${stability.comparator === '<' ? 'under' : 'over'} ${stability.thresholdValue}${stability.thresholdUnit} for ${stability.durationMinutes} minutes`;
          states.push({
            id: monitorId,
            kind: 'task',
            action: monitorAction,
            next: afterEvent,
          });

          const stabilityTimerId = idFactory.next('Wait', `${stability.metric}_${stability.durationMinutes}_minute_window`);
          states.push({
            id: stabilityTimerId,
            kind: 'wait',
            name: `${stability.durationMinutes}-minute stability window`,
            delayMs: stability.durationMs,
            attachedTo: monitorId,
            interrupting: true,
            next: afterEvent,
          });

          const conditionId = idFactory.next('Choice', `${stability.metric}_stability_guard`);
          const conditionText = `${stability.metric} ${stability.comparator} ${stability.thresholdValue}${stability.thresholdUnit}`;
          states.push({
            id: conditionId,
            kind: 'choice',
            branches: [{ cond: conditionText, next: monitorId }],
            otherwise: stabilityFailureId,
          });

          postEventContinuation = conditionId;
        }

        const id = idFactory.next('Receive', step.event);
        const state: Extract<IRState, { kind: 'receive' }> = {
          id,
          kind: 'receive',
          event: step.event,
          next: postEventContinuation,
        };
        states.push(state);
        return id;
      }
      case 'if': {
        const thenEntry = buildSequence(step.then, continuation);
        const elseEntry = step.otherwise?.length ? buildSequence(step.otherwise, continuation) : continuation;
        const fallback = elseEntry ?? continuation ?? ensureTerminal();
        const branchTarget = thenEntry ?? fallback;
        const id = idFactory.next('Choice', step.condition);
        const choiceState: Extract<IRState, { kind: 'choice' }> = {
          id,
          kind: 'choice',
          branches: [{ cond: step.condition, next: branchTarget }],
          otherwise: fallback,
        };
        states.push(choiceState);
        return id;
      }
      default:
        // Exhaustive guard
        throw new Error(`Unsupported structured step: ${(step as StructuredStep).kind}`);
    }
  };

  const start = buildSequence(structuredSteps);
  if (!start) {
    throw new Error('Story did not contain executable steps');
  }

  return {
    name: simple.flow,
    vars: simple.vars,
    states,
    start,
    metadata: { executable: true },
  } satisfies IR;
}

function parseStructuredStory(story: string): StructuredStep[] {
  const root: StoryBlockContext = { level: -1, steps: [] };
  const stack: StoryBlockContext[] = [root];

  const lines = story.split(/\r?\n/);
  for (const rawLine of lines) {
    const indentMatch = rawLine.match(/^\s*/);
    const indentSpaces = indentMatch ? indentMatch[0].length : 0;
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    if (/^flow:/i.test(trimmed) || /^trigger:/i.test(trimmed)) {
      continue;
    }

    const indentLevel = Math.floor(indentSpaces / 2);
    const popped: StoryBlockContext[] = [];
    while (stack.length > 1 && stack[stack.length - 1].level >= indentLevel) {
      popped.unshift(stack.pop()!);
    }

    if (/^otherwise\b/i.test(trimmed)) {
      const conditionalContext = popped.find(ctx => ctx.conditional);
      const conditional = conditionalContext?.conditional;
      if (!conditional) {
        throw new Error('Encountered "Otherwise" without a matching "If"');
      }
      conditional.otherwise = [];
      stack.push({ level: indentLevel, steps: conditional.otherwise });
      continue;
    }

    const parent = stack[stack.length - 1];
    const step = createStructuredStep(trimmed);
    parent.steps.push(step);

    if (step.kind === 'if') {
      stack.push({ level: indentLevel, steps: step.then, conditional: step });
    } else if (step.kind === 'event') {
      stack.push({ level: indentLevel, steps: step.steps });
    }
  }

  return root.steps;
}

function createStructuredStep(line: string): StructuredStep {
  if (/^If\s+/i.test(line)) {
    const condition = line.replace(/^If\s+/i, '').trim();
    const eventMatch = condition.match(/^system receives\s+(.+)\s+event$/i);
    if (eventMatch) {
      const rawEvent = eventMatch[1].trim();
      const stability = parseStabilityRequirement(rawEvent);
      return {
        kind: 'event',
        event: sanitizeIdentifier(rawEvent) || sanitizeIdentifier(condition),
        steps: [],
        stability: stability ?? undefined,
      };
    }
    return {
      kind: 'if',
      condition: normalizeCondition(condition),
      then: [],
    };
  }

  if (/^Ask\s+/i.test(line)) {
    const rest = line.replace(/^Ask\s+/i, '').trim();
    const [assignee] = rest.split(/\s+/);
    return {
      kind: 'userTask',
      assignee: assignee?.replace(/[^A-Za-z0-9_]+/g, '_'),
      prompt: rest,
    };
  }

  if (/^Send\s+/i.test(line)) {
    const sendMatch = line.match(/^Send\s+([^\s]+)\s+to\s+([^:]+?)(?::\s*(.*))?$/i);
    const channel = sendMatch ? sendMatch[1] : 'message';
    const recipient = sendMatch ? sendMatch[2].trim() : 'recipient';
    const content = sendMatch ? (sendMatch[3]?.trim() ?? '') : line.replace(/^Send\s+/i, '').trim();
    return {
      kind: 'sendTask',
      channel: channel.toLowerCase(),
      to: recipient.replace(/[^A-Za-z0-9_]+/g, '_'),
      message: content,
    };
  }

  if (/^Wait\b/i.test(line)) {
    const waitDetails = parseWaitInstruction(line);
    return {
      kind: 'wait',
      ...waitDetails,
    };
  }

  if (/^Do\b/i.test(line)) {
    const action = line.replace(/^Do:?\s*/i, '').trim();
    return {
      kind: 'serviceTask',
      action,
    };
  }

  if (/^Stop\b/i.test(line)) {
    const stopMatch = line.match(/^Stop(?::\s*(.*))?$/i);
    const reason = stopMatch?.[1]?.trim();
    return {
      kind: 'stop',
      reason: reason || undefined,
    };
  }

  throw new Error(`Unsupported Kflow instruction: ${line}`);
}

function parseWaitInstruction(line: string): { label: string; durationMs?: number; until?: string } {
  const body = line.replace(/^Wait\s+/i, '').trim();
  if (!body) {
    throw new Error('Wait instruction is missing details');
  }

  const durationMatch = body.match(/^([0-9]+(?:\.[0-9]+)?)\s*(milliseconds?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)(?:\s+(?:for|to|until)\s+(.*))?$/i);
  if (durationMatch) {
    const [, amountRaw, unitRaw, remainderRaw] = durationMatch;
    const amount = Number.parseFloat(amountRaw);
    const unit = normalizeDurationUnit(unitRaw);
    const delayMs = convertDurationToMilliseconds(amount, unit);

    const remainder = remainderRaw?.trim();
    const readableUnit = formatDurationUnitLabel(unit, amount);
    const baseLabel = `${amount} ${readableUnit}`.trim();
    const label = remainder ? `${baseLabel} for ${remainder}` : baseLabel;

    return {
      label,
      durationMs: delayMs,
      until: remainder ? remainder : undefined,
    };
  }

  const untilMatch = body.match(/^(?:for|until)\s+(.*)$/i);
  if (untilMatch) {
    const until = untilMatch[1].trim();
    return {
      label: `Wait for ${until}`,
      until,
    };
  }

  return {
    label: body,
  };
}

type NormalizedDurationUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';

function normalizeDurationUnit(unitRaw: string): NormalizedDurationUnit {
  const unit = unitRaw.toLowerCase();
  if (unit.startsWith('ms') || unit.startsWith('millisecond')) return 'millisecond';
  if (unit.startsWith('s') || unit.startsWith('sec')) return 'second';
  if (unit.startsWith('h') || unit.startsWith('hr')) return 'hour';
  if (unit.startsWith('d')) return 'day';
  return 'minute';
}

function convertDurationToMilliseconds(amount: number, unit: NormalizedDurationUnit): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const baseMinutes = (() => {
    switch (unit) {
      case 'millisecond':
        return amount / 1000 / 60;
      case 'second':
        return amount / 60;
      case 'minute':
        return amount;
      case 'hour':
        return amount * 60;
      case 'day':
        return amount * 24 * 60;
      default:
        return amount;
    }
  })();

  return Math.round(baseMinutes * 60_000);
}

function formatDurationUnitLabel(unit: NormalizedDurationUnit, amount: number): string {
  const plural = amount === 1 ? '' : 's';
  switch (unit) {
    case 'millisecond':
      return `millisecond${plural}`;
    case 'second':
      return `second${plural}`;
    case 'hour':
      return `hour${plural}`;
    case 'day':
      return `day${plural}`;
    case 'minute':
    default:
      return `minute${plural}`;
  }
}

function normalizeCondition(condition: string): string {
  const clean = condition.trim();
  return clean.replace(/(^|[^<>=!])=(?!=)/g, (_match, prefix: string) => `${prefix}==`);
}

function formatReadableLabel(raw: string): string {
  if (!raw.trim()) return raw;
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseStabilityRequirement(rawEvent: string): StabilityRequirement | undefined {
  const normalized = rawEvent.trim().toLowerCase();
  const match = normalized.match(
    /^(?:stabilized_|stable_)?([a-z0-9]+(?:_[a-z0-9]+)*)_(under|over|below|above)_(\d+)(ms|s|sec|secs|seconds|m|min|minutes)_(\d+)(ms|s|sec|secs|seconds|m|min|minutes)$/i,
  );
  if (!match) {
    return undefined;
  }

  const [, metricSegment, comparatorKeywordRaw, thresholdRaw, thresholdUnitRaw, durationRaw, durationUnitRaw] = match;

  const comparatorKeyword = comparatorKeywordRaw.toLowerCase();
  const comparator: StabilityRequirement['comparator'] = comparatorKeyword === 'over' || comparatorKeyword === 'above' ? '>' : '<';

  const thresholdValue = Number.parseInt(thresholdRaw, 10);
  const thresholdUnit = normalizeUnit(thresholdUnitRaw);

  const durationValue = Number.parseInt(durationRaw, 10);
  const durationUnit = normalizeUnit(durationUnitRaw);

  const durationMinutes = convertToMinutes(durationValue, durationUnit);
  const durationMs = Math.round(durationMinutes * 60_000);

  const metric = metricSegment;
  const label = `${formatReadableLabel(metric)} ${comparator === '<' ? 'under' : 'over'} ${thresholdValue}${thresholdUnit}`;

  return {
    metric,
    comparator,
    thresholdValue,
    thresholdUnit,
    durationMinutes,
    durationMs,
    label,
  };
}

function normalizeUnit(raw: string): string {
  const unit = raw.toLowerCase();
  if (unit.startsWith('ms')) return 'ms';
  if (unit.startsWith('s')) return 's';
  if (unit.startsWith('m')) return 'm';
  return unit;
}

function convertToMinutes(value: number, unit: string): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  switch (unit) {
    case 'ms':
      return value / 1000 / 60;
    case 's':
      return value / 60;
    case 'm':
    default:
      return value;
  }
}

function sanitizeIdentifier(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'step';
}

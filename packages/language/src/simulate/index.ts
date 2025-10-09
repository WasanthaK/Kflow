import { IR, IRState } from '../ir/types.js';

export type SimulationOptions = {
  choices?: Record<string, string>;
  events?: string[];
  autoAdvanceWaits?: boolean;
  maxSteps?: number;
};

export type SimulationLogEntry =
  | { type: 'task'; id: string; action: string }
  | { type: 'userTask'; id: string; prompt: string }
  | { type: 'message'; id: string; channel: string; to: string; message: string }
  | { type: 'receive'; id: string; event: string }
  | { type: 'wait'; id: string; until?: string; delayMs?: number }
  | { type: 'choice'; id: string; selected: string }
  | { type: 'case'; id: string; expression: string; matched: string }
  | { type: 'parallel'; id: string; branches: string[]; join?: string }
  | { type: 'stop'; id: string; reason?: string };

export type SimulationResult = {
  visited: string[];
  log: SimulationLogEntry[];
  messages: { id: string; channel: string; to: string; message: string }[];
  status: 'completed' | 'waiting' | 'stopped';
  waitingFor?: { type: 'receive' | 'wait'; stateId: string };
};

export function simulate(ir: IR, options: SimulationOptions = {}): SimulationResult {
  if (!ir.states.length) {
    return { visited: [], log: [], messages: [], status: 'completed' };
  }

  const stateMap = new Map(ir.states.map(state => [state.id, state] as const));
  if (!stateMap.has(ir.start)) {
    throw new Error(`Unknown start state "${ir.start}"`);
  }

  const events = new Set(options.events ?? []);
  const agenda: string[] = [ir.start];
  const visited: string[] = [];
  const messages: SimulationResult['messages'] = [];
  const log: SimulationLogEntry[] = [];
  const scheduled = new Set(agenda);
  const maxSteps = options.maxSteps ?? 1000;
  let status: SimulationResult['status'] = 'completed';
  let waitingFor: SimulationResult['waitingFor'];

  for (let step = 0; step < maxSteps && agenda.length; step += 1) {
    const stateId = agenda.shift()!;
    scheduled.delete(stateId);
    const state = stateMap.get(stateId);
    if (!state) {
      throw new Error(`Encountered missing state "${stateId}" during simulation`);
    }

    visited.push(stateId);

    switch (state.kind) {
      case 'task':
        log.push({ type: 'task', id: state.id, action: state.action });
        enqueueNext(state.next);
        break;
      case 'userTask':
        log.push({ type: 'userTask', id: state.id, prompt: state.prompt });
        enqueueNext(state.next);
        break;
      case 'send':
        messages.push({ id: state.id, channel: state.channel, to: state.to, message: state.message });
        log.push({ type: 'message', id: state.id, channel: state.channel, to: state.to, message: state.message });
        enqueueNext(state.next);
        break;
      case 'receive':
        if (events.has(state.event)) {
          events.delete(state.event);
          log.push({ type: 'receive', id: state.id, event: state.event });
          enqueueNext(state.next);
        } else {
          status = 'waiting';
          waitingFor = { type: 'receive', stateId: state.id };
          log.push({ type: 'receive', id: state.id, event: state.event });
          agenda.unshift(state.id);
          scheduled.add(state.id);
          breakLoop();
        }
        break;
      case 'wait':
        log.push({ type: 'wait', id: state.id, until: state.until, delayMs: state.delayMs });
        if (options.autoAdvanceWaits) {
          enqueueNext(state.next);
        } else {
          status = 'waiting';
          waitingFor = { type: 'wait', stateId: state.id };
          agenda.unshift(state.id);
          scheduled.add(state.id);
          breakLoop();
        }
        break;
      case 'choice': {
        const chosen = selectChoice(state, options.choices);
        log.push({ type: 'choice', id: state.id, selected: chosen.next });
        enqueueNext(chosen.next);
        break;
      }
      case 'case': {
        const matched = selectCase(state, options.choices);
        log.push({ type: 'case', id: state.id, expression: state.expression, matched: matched.value ?? matched.next });
        enqueueNext(matched.next);
        break;
      }
      case 'parallel':
        log.push({ type: 'parallel', id: state.id, branches: [...state.branches], join: state.join });
        for (const branch of state.branches) {
          enqueueNext(branch);
        }
        enqueueNext(state.join);
        break;
      case 'stop':
        log.push({ type: 'stop', id: state.id, reason: state.reason });
        status = 'stopped';
        agenda.length = 0;
        break;
      default:
        exhaustive(state);
    }

    if (status !== 'completed') {
      break;
    }
  }

  if (agenda.length && status === 'completed') {
    status = 'waiting';
  }

  return { visited, log, messages, status, waitingFor };

  function enqueueNext(next?: string) {
    if (!next) return;
    if (!scheduled.has(next)) {
      agenda.push(next);
      scheduled.add(next);
    }
  }

  function breakLoop() {
    agenda.length = Math.min(agenda.length, 1);
  }
}

function selectChoice(state: Extract<IRState, { kind: 'choice' }>, choices?: Record<string, string>) {
  if (choices) {
    const hinted = choices[state.id];
    if (hinted) {
      const matched = state.branches.find(branch => branch.next === hinted || branch.cond === hinted);
      if (matched) return matched;
      if (state.otherwise) {
        return { cond: 'otherwise', next: state.otherwise };
      }
    }
  }
  const fallback = state.branches[0];
  if (fallback) return fallback;
  if (state.otherwise) return { cond: 'otherwise', next: state.otherwise };
  throw new Error(`Choice state "${state.id}" has no branches`);
}

function selectCase(state: Extract<IRState, { kind: 'case' }>, choices?: Record<string, string>) {
  if (choices) {
    const hinted = choices[state.id];
    if (hinted) {
      const matched = state.cases.find(entry => entry.next === hinted || entry.value === hinted);
      if (matched) {
        return matched;
      }
      if (state.default) {
        return { value: 'default', next: state.default };
      }
    }
  }
  const fallback = state.cases[0];
  if (fallback) return fallback;
  if (state.default) return { value: 'default', next: state.default };
  throw new Error(`Case state "${state.id}" has no cases`);
}

function exhaustive(_: never): never {
  throw new Error('Unhandled IR state kind');
}

import { describe, expect, it } from 'vitest';
import type { IR } from '../ir/types';
import { simulate } from '../simulate';

const ir: IR = {
  name: 'Support Flow',
  start: 'intake',
  states: [
    { id: 'intake', kind: 'task', action: 'Capture ticket', next: 'triage' },
    {
      id: 'triage',
      kind: 'choice',
      branches: [
        { cond: 'urgent', next: 'notifyOnCall' },
        { cond: 'standard', next: 'assignAgent' },
      ],
      otherwise: 'close',
    },
    {
      id: 'notifyOnCall',
      kind: 'send',
      channel: 'sms',
      to: 'on_call_engineer',
      message: 'New urgent ticket',
      next: 'assignAgent',
    },
    {
      id: 'assignAgent',
      kind: 'userTask',
      prompt: 'Assign support agent',
      next: 'awaitCustomer',
    },
    { id: 'awaitCustomer', kind: 'receive', event: 'customer_response', next: 'close' },
    { id: 'close', kind: 'stop', reason: 'Ticket closed' },
  ],
};

describe('simulate', () => {
  it('walks through the flow using provided branch hints', () => {
    const result = simulate(ir, {
      choices: { triage: 'urgent' },
      events: ['customer_response'],
    });

    expect(result.status).toBe('stopped');
    expect(result.visited).toEqual(['intake', 'triage', 'notifyOnCall', 'assignAgent', 'awaitCustomer', 'close']);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ channel: 'sms', to: 'on_call_engineer' });
  });

  it('pauses when waiting for events or timers', () => {
    const waiting = simulate(ir, { choices: { triage: 'standard' } });
    expect(waiting.status).toBe('waiting');
    expect(waiting.waitingFor).toMatchObject({ type: 'receive', stateId: 'awaitCustomer' });
  });

  it('auto advances wait states when configured', () => {
    const waitIr: IR = {
      name: 'Wait Flow',
      start: 'timer',
      states: [
        { id: 'timer', kind: 'wait', delayMs: 5_000, next: 'finish' },
        { id: 'finish', kind: 'stop', reason: 'Done' },
      ],
    };

    const result = simulate(waitIr, { autoAdvanceWaits: true });

    expect(result.status).toBe('stopped');
    expect(result.visited).toEqual(['timer', 'finish']);
    expect(result.log).toEqual([
      { type: 'wait', id: 'timer', delayMs: 5_000, until: undefined },
      { type: 'stop', id: 'finish', reason: 'Done' },
    ]);
  });

  it('schedules parallel branches and join once', () => {
    const parallelIr: IR = {
      name: 'Parallel Flow',
      start: 'kickoff',
      states: [
        { id: 'kickoff', kind: 'task', action: 'Start work', next: 'fanOut' },
        { id: 'fanOut', kind: 'parallel', branches: ['taskA', 'taskB'], join: 'merge' },
        { id: 'taskA', kind: 'task', action: 'Do task A', next: 'merge' },
        { id: 'taskB', kind: 'task', action: 'Do task B', next: 'merge' },
        { id: 'merge', kind: 'task', action: 'Combine results', next: 'wrap' },
        { id: 'wrap', kind: 'stop', reason: 'Done' },
      ],
    };

    const result = simulate(parallelIr);

    expect(result.status).toBe('stopped');
    expect(result.visited).toEqual(['kickoff', 'fanOut', 'taskA', 'taskB', 'merge', 'wrap']);
    const parallelLog = result.log.find(entry => entry.type === 'parallel');
    expect(parallelLog).toMatchObject({ id: 'fanOut', branches: ['taskA', 'taskB'], join: 'merge' });
    const mergeOccurrences = result.visited.filter(id => id === 'merge').length;
    expect(mergeOccurrences).toBe(1);
  });
});

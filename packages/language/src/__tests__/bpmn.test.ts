import { describe, expect, it } from 'vitest';
import { irToBpmnXml } from '../compile/bpmn';
import type { IR } from '../ir/types';

const sampleIr: IR = {
  name: 'Order Processing',
  start: 'startTask',
  states: [
    { id: 'startTask', kind: 'task', action: 'Initialize order context', next: 'approval' },
    {
      id: 'approval',
      kind: 'userTask',
      prompt: 'Manager approves the order',
      next: 'decision',
    },
    {
      id: 'decision',
      kind: 'choice',
      branches: [
        { cond: 'approved', next: 'sendConfirmation' },
      ],
      otherwise: 'rejectOrder',
    },
    {
      id: 'sendConfirmation',
      kind: 'send',
      channel: 'email',
      to: 'customer',
      message: 'Order approved',
      next: 'waitShipping',
    },
    {
      id: 'waitShipping',
      kind: 'wait',
      delayMs: 3600000,
      next: 'ship',
    },
    {
      id: 'ship',
      kind: 'task',
      action: 'Ship goods to customer',
      next: 'stopState',
    },
    {
      id: 'rejectOrder',
      kind: 'send',
      channel: 'email',
      to: 'customer',
      message: 'Order rejected',
      next: 'stopState',
    },
    { id: 'stopState', kind: 'stop', reason: 'Process finished' },
  ],
};

describe('irToBpmnXml', () => {
  it('produces BPMN XML with expected flow nodes and sequence flows', () => {
    const xml = irToBpmnXml(sampleIr);

    expect(xml).toContain('<bpmn:startEvent');
    expect(xml).toContain('Process_Order_Processing');
    expect(xml).toContain('UserTask_approval');
    expect(xml).toContain('<bpmn:sequenceFlow');
    expect(xml).toContain('bpmn:conditionExpression');
    expect(xml).toContain('IntermediateCatchEvent_waitShipping');
    expect(xml.trim().startsWith('<?xml')).toBe(true);
  });

  it('throws when IR has no states', () => {
    expect(() => irToBpmnXml({ name: 'Empty', start: 'none', states: [] })).toThrow();
  });
});

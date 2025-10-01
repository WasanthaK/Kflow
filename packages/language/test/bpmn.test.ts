import { describe, it, expect } from 'vitest';
import { irToBpmnXml } from '../src/compile/bpmn';
import type { IR } from '../src/ir/types';

describe('irToBpmnXml', () => {
  it('renders BPMN XML for diverse IR state kinds', () => {
    const ir: IR = {
      name: 'Demo Flow',
      start: 'serviceTask',
      states: [
        { id: 'serviceTask', kind: 'task', action: 'call billing API', next: 'userApproval' },
        { id: 'userApproval', kind: 'userTask', prompt: 'manager approve request', next: 'decision' },
        {
          id: 'decision',
          kind: 'choice',
          branches: [
            { cond: '{approved}', next: 'sendNotice' },
          ],
          otherwise: 'waitForSignal',
        },
        {
          id: 'sendNotice',
          kind: 'send',
          channel: 'email',
          to: 'customer@example.com',
          message: 'Request approved',
          next: 'parallelTasks',
        },
        {
          id: 'waitForSignal',
          kind: 'wait',
          delayMs: 90_000,
          next: 'parallelTasks',
        },
        {
          id: 'parallelTasks',
          kind: 'parallel',
          branches: ['receiveEvent', 'followUpTask'],
          join: 'wrapUp',
        },
        {
          id: 'receiveEvent',
          kind: 'receive',
          event: 'external_signal',
          next: 'wrapUp',
        },
        {
          id: 'followUpTask',
          kind: 'task',
          action: 'update CRM record',
          next: 'wrapUp',
        },
        {
          id: 'wrapUp',
          kind: 'stop',
          reason: 'completed',
        },
      ],
    };

    const xml = irToBpmnXml(ir);

    expect(xml).toContain('bpmn:process id="Process_Demo_Flow" name="Demo Flow"');
    expect(xml).toContain('<bpmn:startEvent id="StartEvent_serviceTask" name="Start"');
    expect(xml).toContain('<bpmn:serviceTask id="ServiceTask_serviceTask"');
    expect(xml).toContain('<bpmn:userTask id="UserTask_userApproval" name="manager approve request"');
  expect(xml).toContain('<bpmn:exclusiveGateway id="ExclusiveGateway_decision"');
  expect(xml).toContain('sourceRef="ExclusiveGateway_decision" targetRef="SendTask_sendNotice"');
  expect(xml).toContain('<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">{approved}</bpmn:conditionExpression>');
  expect(xml).toContain('sourceRef="ExclusiveGateway_decision" targetRef="IntermediateCatchEvent_waitForSignal" bpmn:isDefault="true"');
    expect(xml).toContain('<bpmn:sendTask id="SendTask_sendNotice" name="Send via email"');
    expect(xml).toContain('<bpmn:documentation>To customer@example.com: Request approved</bpmn:documentation>');
  expect(xml).toContain('<bpmn:intermediateCatchEvent id="IntermediateCatchEvent_waitForSignal" name="Wait PT1M30S"');
    expect(xml).toContain('<bpmn:timeDuration>PT1M30S</bpmn:timeDuration>');
    expect(xml).toContain('<bpmn:parallelGateway id="ParallelGateway_parallelTasks"');
    expect(xml).toContain('<bpmn:receiveTask id="ReceiveTask_receiveEvent" name="Wait for external_signal"');
    expect(xml).toContain('<bpmn:endEvent id="EndEvent_wrapUp" name="completed"');
  });

  it('throws when IR has no states', () => {
    const emptyIr: IR = {
      name: 'Empty',
      start: 'none',
      states: [],
    };

    expect(() => irToBpmnXml(emptyIr)).toThrowError('Cannot render BPMN without IR states');
  });
});

import { describe, it, expect } from 'vitest';
import { irToBpmnXml } from '../src/compile/bpmn';
import { assertValidBpmn } from './utils/bpmnModdle';
import type { IR } from '../src/ir/types';

describe('irToBpmnXml', () => {
  it('renders BPMN XML for diverse IR state kinds', async () => {
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
    expect(xml).toContain('<bpmn:exclusiveGateway id="ExclusiveGateway_decision" default="Flow_');
    expect(xml).not.toContain('bpmn:isDefault');
    expect(xml).toContain('sourceRef="ExclusiveGateway_decision" targetRef="SendTask_sendNotice"');
    expect(xml).toContain('<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[{approved}]]></bpmn:conditionExpression>');
    expect(xml).toContain('<bpmn:sendTask id="SendTask_sendNotice" name="Send via email"');
    expect(xml).toContain('<bpmn:documentation>To customer@example.com: Request approved</bpmn:documentation>');
    expect(xml).toContain('<bpmn:intermediateCatchEvent id="IntermediateCatchEvent_waitForSignal" name="Wait PT1M30S"');
  expect(xml).toContain('<bpmn:timerEventDefinition><bpmn:timeDuration>PT1M30S</bpmn:timeDuration></bpmn:timerEventDefinition>');
    expect(xml).toContain('<bpmn:parallelGateway id="ParallelGateway_parallelTasks"');
    expect(xml).toContain('<bpmn:parallelGateway id="ParallelGateway_parallelTasks_Join"');
  expect(xml).toContain('sourceRef="IntermediateCatchEvent_receiveEvent" targetRef="ParallelGateway_parallelTasks_Join"');
  expect(xml).toContain('sourceRef="ServiceTask_followUpTask" targetRef="ParallelGateway_parallelTasks_Join"');
    expect(xml).toContain('sourceRef="ParallelGateway_parallelTasks_Join" targetRef="EndEvent_wrapUp"');
  expect(xml).toContain('<bpmn:intermediateCatchEvent id="IntermediateCatchEvent_receiveEvent" name="Wait for external_signal"');
  expect(xml).toContain('<bpmn:messageEventDefinition />');
    expect(xml).toContain('<bpmn:endEvent id="EndEvent_wrapUp" name="completed"');
    expect(xml).toContain('<bpmn:terminateEventDefinition />');
    expect(xml).toContain('<bpmn:laneSet id="LaneSet_Demo_Flow"');
    expect(xml).toContain('name="Control Flow"');
    expect(xml).toContain('name="System Automation"');
    expect(xml).toContain('name="External Partners"');
    expect(xml).toContain('bpmndi:BPMNDiagram id="BPMNDiagram_Demo_Flow"');
    expect(xml).toContain('<bpmndi:BPMNShape id="Lane_Control_Flow_di"');
    expect(xml).toContain('<bpmndi:BPMNShape id="StartEvent_serviceTask_di"');
    expect(xml).toContain('isExecutable="false"');

    await assertValidBpmn(xml);
  });

  it('supports case gateways, explicit lane metadata, and executable toggle', async () => {
    const ir: IR = {
      name: 'Lane Demo',
      start: 'collectInput',
      vars: {
        manager: 'workflow actor',
        customer: 'workflow actor',
      },
      metadata: {
        executable: true,
        lanes: [
          { id: 'manager_lane', name: 'Manager', kind: 'human' },
          { id: 'system_lane', name: 'System Automation', kind: 'system' },
        ],
      },
      states: [
        { id: 'collectInput', kind: 'userTask', prompt: 'manager capture order info', assignee: 'manager', next: 'syncCrm', lane: 'manager_lane' },
        { id: 'syncCrm', kind: 'task', action: 'sync CRM record', next: 'decision', lane: 'system_lane' },
        {
          id: 'decision',
          kind: 'case',
          expression: '{status}',
          cases: [
            { value: 'approved', next: 'notify' },
            { value: 'rejected', next: 'wrap' },
          ],
          default: 'waitReply',
        },
        {
          id: 'notify',
          kind: 'send',
          channel: 'email',
          to: 'customer@example.com',
          message: 'Status update',
          next: 'wrap',
        },
        {
          id: 'waitReply',
          kind: 'receive',
          event: 'customer_reply',
          next: 'wrap',
        },
        { id: 'wrap', kind: 'stop', reason: 'done' },
      ],
    };

    const xml = irToBpmnXml(ir);

    expect(xml).toContain('isExecutable="true"');
    expect(xml).toContain('<bpmn:exclusiveGateway id="ExclusiveGateway_decision"');
    expect(xml).toContain('<![CDATA[{status} === "approved"]]');
    expect(xml).toContain('default="Flow_');
    expect(xml).toContain('name="Manager"');
    expect(xml).toContain('<bpmn:flowNodeRef>UserTask_collectInput</bpmn:flowNodeRef>');
    expect(xml).toContain('<bpmndi:BPMNEdge id="Flow_');

    await assertValidBpmn(xml);
  });

  it('throws when IR has no states', () => {
    const emptyIr: IR = {
      name: 'Empty',
      start: 'none',
      states: [],
    };

    expect(() => irToBpmnXml(emptyIr)).toThrowError('Cannot render BPMN without IR states');
  });

  it('throws when wait state is missing both delay and until', () => {
    const ir: IR = {
      name: 'Invalid Wait',
      start: 'waitState',
      states: [
        { id: 'waitState', kind: 'wait', next: 'end' },
        { id: 'end', kind: 'stop' },
      ],
    };

    expect(() => irToBpmnXml(ir)).toThrowError('Wait state "waitState" must specify either "until" or a positive "delayMs"');
  });

  it('throws when parallel state is missing join target', () => {
    const ir: IR = {
      name: 'Invalid Parallel',
      start: 'parallelStart',
      states: [
        {
          id: 'parallelStart',
          kind: 'parallel',
          branches: ['taskA', 'taskB'],
          join: 'missingJoin',
        },
        { id: 'taskA', kind: 'task', action: 'A' },
        { id: 'taskB', kind: 'task', action: 'B' },
      ],
    };

    expect(() => irToBpmnXml(ir)).toThrowError('State "parallelStart" references unknown parallel join target "missingJoin"');
  });
});

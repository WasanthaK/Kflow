import { IR, IRState } from '../ir/types';

type BpmnElement = {
  id: string;
  tag: string;
  name?: string;
  attributes?: Record<string, string>;
  incoming: string[];
  outgoing: string[];
  body?: string[];
};

type SequenceFlow = {
  id: string;
  sourceRef: string;
  targetRef: string;
  conditionExpression?: string;
  isDefault?: boolean;
};

const BPMN_NS = {
  definitions:
    'bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
};

export function irToBpmnXml(ir: IR): string {
  const stateMap = new Map(ir.states.map(state => [state.id, state] as const));
  if (!stateMap.size) {
    throw new Error('Cannot render BPMN without IR states');
  }

  const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9_]+/g, '_');
  const escapeXml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const elementByState = new Map<string, BpmnElement>();
  const elements: BpmnElement[] = [];
  const flows: SequenceFlow[] = [];
  let flowCounter = 0;

  const registerElement = (state: IRState): BpmnElement => {
    const existing = elementByState.get(state.id);
    if (existing) return existing;
    const element = createElementForState(state);
    elementByState.set(state.id, element);
    elements.push(element);
    return element;
  };

  const createElementForState = (state: IRState): BpmnElement => {
    const base = sanitize(state.id || 'state');
    const baseElement: BpmnElement = {
      id: '',
      tag: '',
      incoming: [],
      outgoing: [],
    };

    switch (state.kind) {
      case 'task':
        return {
          ...baseElement,
          id: `ServiceTask_${base}`,
          tag: 'bpmn:serviceTask',
          name: state.action,
          body: state.retry
            ? [
                `<bpmn:documentation>${escapeXml(
                  `Retry up to ${state.retry.max} times${state.retry.backoffMs ? `; backoff ${state.retry.backoffMs}ms` : ''}`,
                )}</bpmn:documentation>`,
              ]
            : undefined,
        };
      case 'userTask':
        return {
          ...baseElement,
          id: `UserTask_${base}`,
          tag: 'bpmn:userTask',
          name: state.prompt,
        };
      case 'send':
        return {
          ...baseElement,
          id: `SendTask_${base}`,
          tag: 'bpmn:sendTask',
          name: `Send via ${state.channel}`,
          body: [
            `<bpmn:documentation>${escapeXml(
              `To ${state.to}: ${state.message}`,
            )}</bpmn:documentation>`,
          ],
        };
      case 'receive':
        return {
          ...baseElement,
          id: `ReceiveTask_${base}`,
          tag: 'bpmn:receiveTask',
          name: `Wait for ${state.event}`,
        };
      case 'choice':
        return {
          ...baseElement,
          id: `ExclusiveGateway_${base}`,
          tag: 'bpmn:exclusiveGateway',
        };
      case 'parallel':
        return {
          ...baseElement,
          id: `ParallelGateway_${base}`,
          tag: 'bpmn:parallelGateway',
        };
      case 'wait':
        return {
          ...baseElement,
          id: `IntermediateCatchEvent_${base}`,
          tag: 'bpmn:intermediateCatchEvent',
          name: state.until ? `Wait until ${state.until}` : state.delayMs ? `Wait ${formatDuration(state.delayMs)}` : 'Wait',
          body: [
            '<bpmn:timerEventDefinition>' +
              (state.until
                ? `<bpmn:timeDate>${escapeXml(state.until)}</bpmn:timeDate>`
                : state.delayMs
                ? `<bpmn:timeDuration>${formatDuration(state.delayMs)}</bpmn:timeDuration>`
                : '') +
              '</bpmn:timerEventDefinition>',
          ],
        };
      case 'stop':
        return {
          ...baseElement,
          id: `EndEvent_${base}`,
          tag: 'bpmn:endEvent',
          name: state.reason ?? 'End',
        };
      default:
        // Exhaustive guard to satisfy TypeScript
        throw new Error(`Unsupported IR state kind: ${(state as IRState).kind}`);
    }
  };

  const ensureStateElement = (stateId: string): BpmnElement => {
    const state = stateMap.get(stateId);
    if (!state) throw new Error(`Unknown IR state referenced: ${stateId}`);
    return registerElement(state);
  };

  const addSequenceFlow = (
    source: BpmnElement,
    targetStateId: string,
    options?: { condition?: string; isDefault?: boolean },
  ) => {
    const target = ensureStateElement(targetStateId);
    const flowId = `Flow_${++flowCounter}`;
    const flow: SequenceFlow = {
      id: flowId,
      sourceRef: source.id,
      targetRef: target.id,
    };
    if (options?.condition) {
      flow.conditionExpression = options.condition;
    }
    if (options?.isDefault) {
      flow.isDefault = true;
    }
    flows.push(flow);
    source.outgoing.push(flowId);
    target.incoming.push(flowId);
  };

  // Prepare BPMN nodes for every state referenced from the start
  for (const state of ir.states) {
    registerElement(state);
  }

  const startElement: BpmnElement = {
    id: `StartEvent_${sanitize(ir.start)}`,
    tag: 'bpmn:startEvent',
    name: 'Start',
    incoming: [],
    outgoing: [],
  };

  const processElements: BpmnElement[] = [startElement, ...elements];

  // Wire start event to the initial state
  addSequenceFlow(startElement, ir.start);

  for (const state of ir.states) {
    const element = ensureStateElement(state.id);
    switch (state.kind) {
      case 'task':
      case 'userTask':
      case 'send':
      case 'receive':
      case 'wait':
        if (state.next) {
          addSequenceFlow(element, state.next);
        }
        break;
      case 'choice':
        state.branches.forEach(branch => {
          addSequenceFlow(element, branch.next, { condition: branch.cond });
        });
        if (state.otherwise) {
          addSequenceFlow(element, state.otherwise, { isDefault: true });
        }
        break;
      case 'parallel':
        state.branches.forEach(branchId => {
          addSequenceFlow(element, branchId);
        });
        break;
      case 'stop':
        // Terminal node, no outgoing flow
        break;
      default:
        throw new Error(`Unsupported IR state kind: ${(state as IRState).kind}`);
    }
  }

  const flowXml = flows
    .map(flow => {
      const attrs = [
        `id="${flow.id}"`,
        `sourceRef="${flow.sourceRef}"`,
        `targetRef="${flow.targetRef}"`,
      ];
      if (flow.isDefault) {
        attrs.push('bpmn:isDefault="true"');
      }
      const conditionXml = flow.conditionExpression
        ? `\n      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(
            flow.conditionExpression,
          )}</bpmn:conditionExpression>\n    `
        : '';
      return `    <bpmn:sequenceFlow ${attrs.join(' ')}>${conditionXml}</bpmn:sequenceFlow>`;
    })
    .join('\n');
  const elementXml = processElements
    .map(element => {
      const attrs: string[] = [`id="${element.id}"`];
      if (element.name) {
        attrs.push(`name="${escapeXml(element.name)}"`);
      }
      if (element.attributes) {
        for (const [key, value] of Object.entries(element.attributes)) {
          attrs.push(`${key}="${escapeXml(value)}"`);
        }
      }
      const incoming = element.incoming.map(flowId => `      <bpmn:incoming>${flowId}</bpmn:incoming>`).join('\n');
      const outgoing = element.outgoing.map(flowId => `      <bpmn:outgoing>${flowId}</bpmn:outgoing>`).join('\n');
      const body = element.body?.map(line => `      ${line}`).join('\n') ?? '';
      const inner = [incoming, outgoing, body].filter(Boolean).join('\n');
      if (inner) {
        return `    <${element.tag} ${attrs.join(' ')}>\n${inner}\n    </${element.tag}>`;
      }
      return `    <${element.tag} ${attrs.join(' ')} />`;
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${BPMN_NS.definitions} id="Definitions_${sanitize(ir.name)}" targetNamespace="https://kflow.dev/bpmn">`,
    `  <bpmn:process id="Process_${sanitize(ir.name)}" name="${escapeXml(ir.name)}" isExecutable="false">`,
    elementXml,
    flowXml,
    '  </bpmn:process>',
    '</bpmn:definitions>',
  ].join('\n');

  return xml;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'PT0S';
  const totalSeconds = Math.round(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const parts: string[] = ['PT'];
  if (hours) parts.push(`${hours}H`);
  if (minutes) parts.push(`${minutes}M`);
  parts.push(`${seconds}S`);
  return parts.join('');
}

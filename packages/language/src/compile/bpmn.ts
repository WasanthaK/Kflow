
import { IR, IRState } from '../ir/types.js';

// --- IR Validation Helper ---

type BpmnElement = {
  id: string;
  tag: string;
  name?: string;
  attributes?: Record<string, string>;
  incoming: string[];
  outgoing: string[];
  body?: string[];
  defaultFlowId?: string;
};

type SequenceFlow = {
  id: string;
  sourceRef: string;
  targetRef: string;
  conditionExpression?: string;
};

type LaneRecord = {
  id: string;
  name: string;
  index: number;
  kind: 'human' | 'external' | 'system' | 'control';
  flowNodeRefs: string[];
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Waypoint = {
  x: number;
  y: number;
};

const BPMN_NS = {
  definitions:
    'bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI"',
};


export function irToBpmnXml(ir: IR): string {
  const stateMap = new Map(ir.states.map(state => [state.id, state] as const));
  if (!stateMap.size) {
    throw new Error('Cannot render BPMN without IR states');
  }
  validateIr(ir, stateMap);

  const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9_]+/g, '_');
  const escapeXml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const actorHints = new Map<string, string>();
  for (const [key, value] of Object.entries(ir.vars ?? {})) {
    if (typeof value === 'string' && value.toLowerCase().includes('workflow actor')) {
      actorHints.set(key.toLowerCase(), formatLaneLabel(key));
    }
  }

  const laneRecords: LaneRecord[] = [];
  const laneLookup = new Map<string, LaneRecord>();
  const laneAliases = new Map<string, LaneRecord>();
  const elementLaneById = new Map<string, LaneRecord>();

  const ensureLane = (name: string, kind: LaneRecord['kind'] = 'system'): LaneRecord => {
    const displayName = formatLaneLabel(name) || 'System Automation';
    const lookupKey = displayName.toLowerCase();
    let record = laneLookup.get(lookupKey);
    if (!record) {
      record = {
        id: `Lane_${sanitize(displayName) || 'Default'}`,
        name: displayName,
        index: laneRecords.length,
        kind,
        flowNodeRefs: [],
      };
      laneLookup.set(lookupKey, record);
      laneRecords.push(record);
    }
    return record;
  };

  const registerLaneAlias = (alias: string | undefined, lane: LaneRecord) => {
    if (!alias) return;
    laneAliases.set(alias.toLowerCase(), lane);
  };

  const assignElementToLane = (elementId: string, lane: LaneRecord) => {
    if (!lane.flowNodeRefs.includes(elementId)) {
      lane.flowNodeRefs.push(elementId);
    }
    elementLaneById.set(elementId, lane);
  };

  const resolveLaneForState = (state: IRState): LaneRecord => {
    if (state.lane) {
      const fromAlias = laneAliases.get(state.lane.toLowerCase());
      if (fromAlias) {
        return fromAlias;
      }
      return ensureLane(state.lane);
    }

    switch (state.kind) {
      case 'userTask': {
        const prompt = (state.prompt ?? '').toLowerCase();
        for (const [actorKey, actorName] of actorHints) {
          if (prompt.includes(actorKey)) {
            return ensureLane(actorName, 'human');
          }
        }
        if (state.assignee) {
          const assigneeKey = state.assignee.toLowerCase();
          const actorName = actorHints.get(assigneeKey) ?? formatLaneLabel(state.assignee);
          return ensureLane(actorName, 'human');
        }
        return ensureLane('Human Tasks', 'human');
      }
      case 'send':
      case 'receive':
        return ensureLane('External Partners', 'external');
      case 'case':
      case 'choice':
      case 'parallel':
        return ensureLane('Control Flow', 'control');
      case 'wait':
        return ensureLane('Timers', 'system');
      case 'stop':
      case 'task':
      default:
        return ensureLane('System Automation', 'system');
    }
  };

  const configuredLanes = ir.metadata?.lanes ?? [];
  for (const laneHint of configuredLanes) {
    const lane = ensureLane(laneHint.name ?? laneHint.id, laneHint.kind ?? 'system');
    registerLaneAlias(laneHint.id, lane);
  }

  const elementByState = new Map<string, BpmnElement>();
  const elementStateById = new Map<string, string>();
  const elements: BpmnElement[] = [];
  const flows: SequenceFlow[] = [];
  let flowCounter = 0;
  const parallelJoinByParallelId = new Map<string, BpmnElement>();
  const joinGatewayByTargetState = new Map<string, BpmnElement>();

  const registerElement = (state: IRState): BpmnElement => {
    const existing = elementByState.get(state.id);
    if (existing) return existing;
    const element = createElementForState(state);
    elementByState.set(state.id, element);
    elements.push(element);
  elementStateById.set(element.id, state.id);

  const lane = resolveLaneForState(state);
  assignElementToLane(element.id, lane);

    if (state.kind === 'parallel') {
      const base = sanitize(state.id || 'parallel');
      const joinElement: BpmnElement = {
        id: `ParallelGateway_${base}_Join`,
        tag: 'bpmn:parallelGateway',
        name: `${state.id} Join`,
        incoming: [],
        outgoing: [],
      };
      elements.push(joinElement);
      parallelJoinByParallelId.set(state.id, joinElement);
      joinGatewayByTargetState.set(state.join, joinElement);
      assignElementToLane(joinElement.id, lane);
    }
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
          id: `IntermediateCatchEvent_${base}`,
          tag: 'bpmn:intermediateCatchEvent',
          name: `Wait for ${state.event}`,
          body: ['<bpmn:messageEventDefinition />'],
        };
      case 'choice':
        return {
          ...baseElement,
          id: `ExclusiveGateway_${base}`,
          tag: 'bpmn:exclusiveGateway',
        };
      case 'case':
        return {
          ...baseElement,
          id: `ExclusiveGateway_${base}`,
          tag: 'bpmn:exclusiveGateway',
          name: state.expression ? `Case ${state.expression}` : undefined,
        };
      case 'parallel':
        return {
          ...baseElement,
          id: `ParallelGateway_${base}`,
          tag: 'bpmn:parallelGateway',
        };
      case 'wait':
        const timerBody = state.until
          ? `<bpmn:timeDate>${escapeXml(state.until)}</bpmn:timeDate>`
          : `<bpmn:timeDuration>${formatDuration(state.delayMs!)}</bpmn:timeDuration>`;
        return {
          ...baseElement,
          id: `IntermediateCatchEvent_${base}`,
          tag: 'bpmn:intermediateCatchEvent',
          name: state.until ? `Wait until ${state.until}` : state.delayMs ? `Wait ${formatDuration(state.delayMs)}` : 'Wait',
          body: [`<bpmn:timerEventDefinition>${timerBody}</bpmn:timerEventDefinition>`],
        };
      case 'stop':
        return {
          ...baseElement,
          id: `EndEvent_${base}`,
          tag: 'bpmn:endEvent',
          name: state.reason ?? 'End',
          body: ['<bpmn:terminateEventDefinition />'],
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
    options?: { condition?: string; isDefault?: boolean; bypassJoinRedirect?: boolean },
  ) => {
    let target: BpmnElement | undefined;
    if (!options?.bypassJoinRedirect) {
      const joinGateway = joinGatewayByTargetState.get(targetStateId);
      if (joinGateway) {
        target = joinGateway;
      }
    }

    if (!target) {
      target = ensureStateElement(targetStateId);
    }

    const flowId = `Flow_${++flowCounter}`;
    const flow: SequenceFlow = {
      id: flowId,
      sourceRef: source.id,
      targetRef: target.id,
    };
    if (options?.condition) {
      flow.conditionExpression = options.condition;
    }
    flows.push(flow);
    source.outgoing.push(flowId);
    target.incoming.push(flowId);

    if (options?.isDefault) {
      source.defaultFlowId = flowId;
    }
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

  const startLane = ensureLane('Control Flow', 'control');
  assignElementToLane(startElement.id, startLane);

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
      case 'case':
        state.cases.forEach(entry => {
          addSequenceFlow(element, entry.next, { condition: formatCaseCondition(state.expression, entry.value) });
        });
        if (state.default) {
          addSequenceFlow(element, state.default, { isDefault: true });
        }
        break;
      case 'parallel':
        state.branches.forEach(branchId => {
          addSequenceFlow(element, branchId);
        });
        {
          const joinElement = parallelJoinByParallelId.get(state.id);
          if (!joinElement) {
            throw new Error(`Parallel state "${state.id}" is missing a join gateway registration`);
          }
          addSequenceFlow(joinElement, state.join, { bypassJoinRedirect: true });
        }
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
      const conditionXml = flow.conditionExpression
        ? `\n      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[${flow.conditionExpression}]]></bpmn:conditionExpression>\n    `
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
      if (element.defaultFlowId) {
        attrs.push(`default="${element.defaultFlowId}"`);
      }
      const incoming = element.incoming.map(flowId => `      <bpmn:incoming>${flowId}</bpmn:incoming>`).join('\n');
      const outgoing = element.outgoing.map(flowId => `      <bpmn:outgoing>${flowId}</bpmn:outgoing>`).join('\n');
      const body = element.body?.map(line => `      ${line}`).join('\n') ?? '';
      const inner = [incoming, outgoing, body].filter(Boolean).join('\n');
      if (inner) {
        return `    <${element.tag} ${attrs.join(' ')}>` + `\n${inner}\n    </${element.tag}>`;
      }
      return `    <${element.tag} ${attrs.join(' ')} />`;
    })
    .join('\n');

  const activeLanes = laneRecords.filter(lane => lane.flowNodeRefs.length).sort((a, b) => a.index - b.index);

  const laneSetXml = activeLanes.length
    ? [
        `    <bpmn:laneSet id="LaneSet_${sanitize(ir.name)}">`,
        activeLanes
          .map(lane => {
            const refs = lane.flowNodeRefs.map(ref => `        <bpmn:flowNodeRef>${ref}</bpmn:flowNodeRef>`).join('\n');
            const section = [`      <bpmn:lane id="${lane.id}" name="${escapeXml(lane.name)}">`];
            if (refs) {
              section.push(refs);
            }
            section.push('      </bpmn:lane>');
            return section.join('\n');
          })
          .join('\n'),
        '    </bpmn:laneSet>',
      ].join('\n')
    : '';

  const LANE_WIDTH = 320;
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 60;
  const LANE_PADDING_TOP = 60;
  const NODE_VERTICAL_GAP = 120;
  const NODE_HORIZONTAL_OFFSET = 90;

  const elementBounds = new Map<string, Bounds>();
  processElements.forEach((element, index) => {
    const lane = elementLaneById.get(element.id) ?? startLane;
    const laneIndex = lane.index;
    const x = laneIndex * LANE_WIDTH + NODE_HORIZONTAL_OFFSET;
    const y = LANE_PADDING_TOP + index * NODE_VERTICAL_GAP;
    elementBounds.set(element.id, { x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  let maxBottom = 0;
  for (const bounds of elementBounds.values()) {
    maxBottom = Math.max(maxBottom, bounds.y + bounds.height);
  }
  const laneHeight = Math.max(maxBottom + LANE_PADDING_TOP, 200);

  const roundCoord = (value: number) => Math.round(value * 100) / 100;

  const laneShapesXml = activeLanes
    .map(lane => {
      const x = lane.index * LANE_WIDTH;
      return [
        `      <bpmndi:BPMNShape id="${lane.id}_di" bpmnElement="${lane.id}" isHorizontal="true">`,
        `        <dc:Bounds x="${roundCoord(x)}" y="0" width="${roundCoord(LANE_WIDTH)}" height="${roundCoord(laneHeight)}" />`,
        '      </bpmndi:BPMNShape>',
      ].join('\n');
    })
    .join('\n');

  const nodeShapesXml = processElements
    .map(element => {
      const bounds = elementBounds.get(element.id);
      if (!bounds) return '';
      return [
        `      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">`,
        `        <dc:Bounds x="${roundCoord(bounds.x)}" y="${roundCoord(bounds.y)}" width="${roundCoord(bounds.width)}" height="${roundCoord(bounds.height)}" />`,
        '      </bpmndi:BPMNShape>',
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');

  const edgeXml = flows
    .map(flow => {
      const sourceBounds = elementBounds.get(flow.sourceRef);
      const targetBounds = elementBounds.get(flow.targetRef);
      if (!sourceBounds || !targetBounds) {
        return '';
      }
      const points = computeWaypoints(sourceBounds, targetBounds);
      const waypointXml = points
        .map(point => `        <di:waypoint x="${roundCoord(point.x)}" y="${roundCoord(point.y)}" />`)
        .join('\n');
      return `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">\n${waypointXml}\n      </bpmndi:BPMNEdge>`;
    })
    .filter(Boolean)
    .join('\n');

  const diagramSections = [laneShapesXml, nodeShapesXml, edgeXml].filter(Boolean);
  const diagramXml = diagramSections.length
    ? [
        `  <bpmndi:BPMNDiagram id="BPMNDiagram_${sanitize(ir.name)}">`,
        `    <bpmndi:BPMNPlane id="BPMNPlane_${sanitize(ir.name)}" bpmnElement="Process_${sanitize(ir.name)}">`,
        diagramSections.join('\n'),
        '    </bpmndi:BPMNPlane>',
        '  </bpmndi:BPMNDiagram>',
      ].join('\n')
    : '';

  const isExecutable = ir.metadata?.executable ? 'true' : 'false';
  const processSections = [laneSetXml, elementXml, flowXml].filter(Boolean).join('\n');

  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${BPMN_NS.definitions} id="Definitions_${sanitize(ir.name)}" targetNamespace="https://kflow.dev/bpmn">`,
    `  <bpmn:process id="Process_${sanitize(ir.name)}" name="${escapeXml(ir.name)}" isExecutable="${isExecutable}">`,
    processSections,
    '  </bpmn:process>',
  ];

  if (diagramXml) {
    xmlParts.push(diagramXml);
  }

  xmlParts.push('</bpmn:definitions>');

  return xmlParts.join('\n');
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

function validateIr(ir: IR, stateMap: Map<string, IRState>) {
  if (!stateMap.has(ir.start)) {
    throw new Error(`Unknown start state "${ir.start}"`);
  }

  const assertStateExists = (sourceId: string, targetId: string | undefined, context: string) => {
    if (!targetId) return;
    if (!stateMap.has(targetId)) {
      throw new Error(`State "${sourceId}" references unknown ${context} "${targetId}"`);
    }
  };

  for (const state of ir.states) {
    switch (state.kind) {
      case 'task':
      case 'userTask':
      case 'send':
      case 'receive':
        assertStateExists(state.id, state.next, 'next state');
        break;
      case 'wait':
        if (!state.until && !(typeof state.delayMs === 'number' && state.delayMs > 0)) {
          throw new Error(`Wait state "${state.id}" must specify either "until" or a positive "delayMs"`);
        }
        assertStateExists(state.id, state.next, 'next state');
        break;
      case 'choice':
        if (!state.branches.length && !state.otherwise) {
          throw new Error(`Choice state "${state.id}" must declare at least one branch or an "otherwise" target`);
        }
        for (const branch of state.branches) {
          assertStateExists(state.id, branch.next, 'branch target');
        }
        if (state.otherwise) {
          assertStateExists(state.id, state.otherwise, 'otherwise target');
        }
        break;
      case 'case':
        if (!state.expression.trim()) {
          throw new Error(`Case state "${state.id}" must define an expression`);
        }
        if (!state.cases.length && !state.default) {
          throw new Error(`Case state "${state.id}" must declare at least one case or a default target`);
        }
        for (const entry of state.cases) {
          assertStateExists(state.id, entry.next, 'case target');
        }
        if (state.default) {
          assertStateExists(state.id, state.default, 'case default target');
        }
        break;
      case 'parallel':
        if (!state.branches.length) {
          throw new Error(`Parallel state "${state.id}" must declare at least one branch`);
        }
        for (const branch of state.branches) {
          assertStateExists(state.id, branch, 'parallel branch target');
        }
        assertStateExists(state.id, state.join, 'parallel join target');
        break;
      case 'stop':
        break;
      default:
        throw new Error(`Unsupported IR state kind in validation: ${(state as IRState).kind}`);
    }
  }
}

function formatLaneLabel(raw: string | undefined): string {
  if (!raw) return '';
  const normalized = raw.replace(/[_-]+/g, ' ').trim();
  if (!normalized) return '';
  return normalized
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatCaseCondition(expression: string, rawValue: string): string {
  const expr = expression.trim();
  const value = rawValue.trim();
  if (!value) {
    return expr;
  }
  if (/^(['"]).*\1$/.test(value) || /^-?\d+(?:\.\d+)?$/.test(value)) {
    return `${expr} === ${value}`;
  }
  const escaped = value.replace(/"/g, '\\"');
  return `${expr} === "${escaped}"`;
}

function computeWaypoints(source: Bounds, target: Bounds): Waypoint[] {
  const start: Waypoint = {
    x: source.x + source.width,
    y: source.y + source.height / 2,
  };
  const end: Waypoint = {
    x: target.x,
    y: target.y + target.height / 2,
  };
  if (Math.abs(end.x - start.x) < 40) {
    return [start, end];
  }
  const midX = (start.x + end.x) / 2;
  return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
}

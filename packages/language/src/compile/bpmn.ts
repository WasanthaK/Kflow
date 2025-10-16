
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

// Graph layout types
type GraphNode = {
  id: string;
  element: BpmnElement;
  layer: number;
  positionInLayer: number;
  lane: LaneRecord;
};

type WaitState = Extract<IRState, { kind: 'wait' }>;

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

  const messageDefs = new Map<string, { id: string; name: string }>();

  const ensureMessage = (raw: string): string => {
    const label = raw || 'event';
    const id = `Message_${sanitize(label) || 'Event'}`;
    if (!messageDefs.has(id)) {
      messageDefs.set(id, { id, name: formatLaneLabel(label) || label });
    }
    return id;
  };

  // Track lane order by first appearance in IR states for predictable DI layout
  const laneRecords: LaneRecord[] = [];
  const laneLookup = new Map<string, LaneRecord>();
  const laneAliases = new Map<string, LaneRecord>();
  const elementLaneById = new Map<string, LaneRecord>();
  const laneOrder: string[] = [];

  const ensureLane = (name: string, kind: LaneRecord['kind'] = 'system'): LaneRecord => {
    const displayName = formatLaneLabel(name) || 'System Automation';
    const lookupKey = displayName.toLowerCase();
    let record = laneLookup.get(lookupKey);
    if (!record) {
      record = {
        id: `Lane_${sanitize(displayName) || 'Default'}`,
        name: displayName,
        index: laneRecords.length, // will be updated after all lanes are collected
        kind,
        flowNodeRefs: [],
      };
      laneLookup.set(lookupKey, record);
      laneRecords.push(record);
      // Track first appearance order for DI
      if (!laneOrder.includes(lookupKey)) laneOrder.push(lookupKey);
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
      case 'wait': {
        const waitState = state as WaitState;
        const waitKind = classifyWaitEvent(waitState);
        if (waitKind === 'message') {
          return ensureLane('External Partners', 'external');
        }
        return ensureLane('Timers', 'system');
      }
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

  const startState = stateMap.get(ir.start);
  if (!startState) {
    throw new Error(`Unknown start state "${ir.start}"`);
  }

  const registerElement = (state: IRState): BpmnElement => {
    const existing = elementByState.get(state.id);
    if (existing) return existing;
    const element = createElementForState(state);
    elementByState.set(state.id, element);
    elements.push(element);
  elementStateById.set(element.id, state.id);

  let lane = resolveLaneForState(state);
    if (state.kind === 'wait' && state.attachedTo) {
      const attachedState = stateMap.get(state.attachedTo);
      if (attachedState) {
        lane = resolveLaneForState(attachedState);
      }
    }
  assignElementToLane(element.id, lane);

    if (state.kind === 'wait' && state.attachedTo) {
      const attachedElement = ensureStateElement(state.attachedTo);
      element.attributes = {
        ...(element.attributes ?? {}),
        attachedToRef: attachedElement.id,
        cancelActivity: state.interrupting === false ? 'false' : 'true',
      };
      const attachedLane = elementLaneById.get(attachedElement.id);
      if (attachedLane) {
        assignElementToLane(element.id, attachedLane);
      }
    }

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
        {
          const messageId = ensureMessage(state.id ?? state.message ?? state.channel);
        return {
          ...baseElement,
          id: `SendTask_${base}`,
          tag: 'bpmn:sendTask',
          name: `Send via ${state.channel}`,
            attributes: { messageRef: messageId },
          body: [
            `<bpmn:documentation>${escapeXml(
              `To ${state.to}: ${state.message}`,
            )}</bpmn:documentation>`,
          ],
        };
        }
      case 'receive':
        {
          const messageId = ensureMessage(state.event);
          if (state.id === ir.start) {
            return {
              ...baseElement,
              id: `StartEvent_${base}`,
              tag: 'bpmn:startEvent',
              name: `Start: ${formatLaneLabel(state.event) || state.event}`,
              body: [`<bpmn:messageEventDefinition messageRef="${messageId}" />`],
            };
          }
        return {
          ...baseElement,
          id: `IntermediateCatchEvent_${base}`,
          tag: 'bpmn:intermediateCatchEvent',
          name: `Wait for ${state.event}`,
            body: [`<bpmn:messageEventDefinition messageRef="${messageId}" />`],
        };
        }
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
      case 'wait': {
        const waitState = state as WaitState;
        const waitKind = classifyWaitEvent(waitState);
        const waitName =
          waitState.name ??
          (waitKind === 'timerDuration'
            ? `Wait ${formatDuration(waitState.delayMs ?? 0)}`
            : waitState.until
            ? `Wait for ${waitState.until}`
            : 'Wait');

        const eventDefinition = (() => {
          switch (waitKind) {
            case 'timerDuration': {
              const durationMs = Math.max(0, waitState.delayMs ?? 0);
              return `<bpmn:timerEventDefinition><bpmn:timeDuration>${formatDuration(durationMs)}</bpmn:timeDuration></bpmn:timerEventDefinition>`;
            }
            case 'timerDate': {
              const until = waitState.until?.trim() ?? '';
              return `<bpmn:timerEventDefinition><bpmn:timeDate>${escapeXml(until)}</bpmn:timeDate></bpmn:timerEventDefinition>`;
            }
            case 'message':
            default: {
              const label = waitState.until?.trim() || waitState.name || waitState.id;
              const messageId = ensureMessage(label);
              return `<bpmn:messageEventDefinition messageRef="${messageId}" />`;
            }
          }
        })();

        if (waitState.attachedTo) {
          return {
            ...baseElement,
            id: `BoundaryEvent_${base}`,
            tag: 'bpmn:boundaryEvent',
            name: waitName,
            attributes: {
              attachedToRef: waitState.attachedTo,
              cancelActivity: waitState.interrupting === false ? 'false' : 'true',
            },
            body: [eventDefinition],
          };
        }
        return {
          ...baseElement,
          id: `IntermediateCatchEvent_${base}`,
          tag: 'bpmn:intermediateCatchEvent',
          name: waitName,
          body: [eventDefinition],
        };
      }
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
    const normalizedCondition = normalizeConditionExpression(options?.condition);
    if (normalizedCondition) {
      flow.conditionExpression = normalizedCondition;
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

  const startStateElement = elementByState.get(ir.start) ?? registerElement(startState);

  let startElement: BpmnElement | undefined;
  const processElements: BpmnElement[] = [];

  if (startState.kind === 'receive') {
    processElements.push(startStateElement);
  } else {
    startElement = {
      id: `StartEvent_${sanitize(ir.start)}`,
      tag: 'bpmn:startEvent',
      name: 'Start',
      incoming: [],
      outgoing: [],
    };
    const startLane = ensureLane('Control Flow', 'control');
    assignElementToLane(startElement.id, startLane);
    processElements.push(startElement);

    // Wire start event to the initial state
    addSequenceFlow(startElement, ir.start);
  }

  for (const element of elements) {
    if (!processElements.includes(element)) {
      processElements.push(element);
    }
  }

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

  // After all elements are assigned, re-index lanes by first appearance in IR states for DI order
  let activeLanes = laneRecords.filter(lane => lane.flowNodeRefs.length);
  if (laneOrder.length) {
    activeLanes = activeLanes.slice().sort((a, b) => laneOrder.indexOf(a.name.toLowerCase()) - laneOrder.indexOf(b.name.toLowerCase()));
    // Update index for DI
    activeLanes.forEach((lane, idx) => (lane.index = idx));
  }

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

  // === LAYERED GRAPH LAYOUT ALGORITHM ===
  
  /**
   * Assigns each node to a layer using a topological sort approach.
   * Nodes with no predecessors go to layer 0, and each node is placed
   * at the maximum layer of its predecessors + 1.
   */
  const assignLayers = (elements: BpmnElement[], flows: SequenceFlow[]): Map<string, number> => {
    const layers = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    
    // Build adjacency list and in-degree count
    elements.forEach(el => {
      inDegree.set(el.id, 0);
      outgoing.set(el.id, []);
    });
    
    flows.forEach(flow => {
      inDegree.set(flow.targetRef, (inDegree.get(flow.targetRef) || 0) + 1);
      const targets = outgoing.get(flow.sourceRef) || [];
      targets.push(flow.targetRef);
      outgoing.set(flow.sourceRef, targets);
    });
    
    // Find all nodes with no incoming edges (start nodes)
    const queue: string[] = [];
    elements.forEach(el => {
      if (inDegree.get(el.id) === 0) {
        layers.set(el.id, 0);
        queue.push(el.id);
      }
    });
    
    // Process nodes layer by layer
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentLayer = layers.get(nodeId) || 0;
      
      const targets = outgoing.get(nodeId) || [];
      targets.forEach(targetId => {
        const currentTargetLayer = layers.get(targetId);
        const newLayer = currentLayer + 1;
        
        // Place target at max layer of all predecessors + 1
        if (currentTargetLayer === undefined || newLayer > currentTargetLayer) {
          layers.set(targetId, newLayer);
        }
        
        // Decrease in-degree and add to queue if all predecessors processed
        const degree = inDegree.get(targetId)! - 1;
        inDegree.set(targetId, degree);
        if (degree === 0) {
          queue.push(targetId);
        }
      });
    }
    
    // Handle any remaining nodes (cycles or disconnected)
    elements.forEach(el => {
      if (!layers.has(el.id)) {
        layers.set(el.id, 0);
      }
    });
    
    return layers;
  };

  /**
   * Orders nodes within each layer to minimize edge crossings.
   * Uses barycenter heuristic: position based on average position of neighbors.
   */
  const orderNodesInLayers = (
    layerMap: Map<string, number>,
    elements: BpmnElement[],
    flows: SequenceFlow[]
  ): Map<string, number> => {
    const positions = new Map<string, number>();
    const maxLayer = Math.max(...Array.from(layerMap.values()));
    
    // Group nodes by layer
    const layerNodes = new Map<number, string[]>();
    for (let i = 0; i <= maxLayer; i++) {
      layerNodes.set(i, []);
    }
    elements.forEach(el => {
      const layer = layerMap.get(el.id) || 0;
      layerNodes.get(layer)!.push(el.id);
    });
    
    // Build adjacency
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    elements.forEach(el => {
      incoming.set(el.id, []);
      outgoing.set(el.id, []);
    });
    flows.forEach(flow => {
      incoming.get(flow.targetRef)!.push(flow.sourceRef);
      outgoing.get(flow.sourceRef)!.push(flow.targetRef);
    });
    
    // Initial ordering: just use current order
    for (let layer = 0; layer <= maxLayer; layer++) {
      const nodes = layerNodes.get(layer)!;
      nodes.forEach((nodeId, index) => {
        positions.set(nodeId, index);
      });
    }
    
    // Iteratively improve ordering using barycenter heuristic
    for (let iteration = 0; iteration < 4; iteration++) {
      // Forward pass: order based on predecessors
      for (let layer = 1; layer <= maxLayer; layer++) {
        const nodes = layerNodes.get(layer)!;
        const barycenters: [string, number][] = nodes.map(nodeId => {
          const preds = incoming.get(nodeId)!;
          if (preds.length === 0) return [nodeId, positions.get(nodeId) || 0];
          const avgPos = preds.reduce((sum, predId) => sum + (positions.get(predId) || 0), 0) / preds.length;
          return [nodeId, avgPos];
        });
        
        barycenters.sort((a, b) => a[1] - b[1]);
        barycenters.forEach(([nodeId], index) => {
          positions.set(nodeId, index);
        });
      }
      
      // Backward pass: order based on successors
      for (let layer = maxLayer - 1; layer >= 0; layer--) {
        const nodes = layerNodes.get(layer)!;
        const barycenters: [string, number][] = nodes.map(nodeId => {
          const succs = outgoing.get(nodeId)!;
          if (succs.length === 0) return [nodeId, positions.get(nodeId) || 0];
          const avgPos = succs.reduce((sum, succId) => sum + (positions.get(succId) || 0), 0) / succs.length;
          return [nodeId, avgPos];
        });
        
        barycenters.sort((a, b) => a[1] - b[1]);
        barycenters.forEach(([nodeId], index) => {
          positions.set(nodeId, index);
        });
      }
    }
    
    return positions;
  };

  const LANE_WIDTH = 320;
  const LANE_PADDING_TOP = 80;
  const NODE_VERTICAL_GAP = 180; // Increased for better element separation
  const NODE_HORIZONTAL_GAP = 100; // Adequate horizontal spacing

  const TASK_DIMENSIONS = { width: 180, height: 90 } as const;
  const EVENT_DIMENSIONS = { width: 42, height: 42 } as const;
  const GATEWAY_DIMENSIONS = { width: 70, height: 70 } as const;
  const BOUNDARY_DIMENSIONS = { width: 36, height: 36 } as const;

  const getElementDimensions = (element: BpmnElement): { width: number; height: number } => {
    const tag = element.tag.toLowerCase();
    if (tag === 'bpmn:startevent' || tag === 'bpmn:endevent') {
      return EVENT_DIMENSIONS;
    }
    if (tag === 'bpmn:intermediatecatchevent') {
      return { width: 48, height: 48 };
    }
    if (tag === 'bpmn:boundaryevent') {
      return BOUNDARY_DIMENSIONS;
    }
    if (tag === 'bpmn:exclusivegateway' || tag === 'bpmn:parallelgateway') {
      return GATEWAY_DIMENSIONS;
    }
    if (tag === 'bpmn:sendtask' || tag === 'bpmn:receivetask' || tag === 'bpmn:usertask' || tag === 'bpmn:servicetask') {
      return TASK_DIMENSIONS;
    }
    return TASK_DIMENSIONS;
  };

  const fallbackLane = elementLaneById.get(startStateElement.id) ?? ensureLane('Control Flow', 'control');

  // === APPLY LAYERED GRAPH LAYOUT ===
  const layerAssignments = assignLayers(processElements, flows);
  const positionAssignments = orderNodesInLayers(layerAssignments, processElements, flows);
  
  const elementBounds = new Map<string, Bounds>();
  
  // Group elements by lane and layer for positioning
  const laneLayerGroups = new Map<string, Map<number, string[]>>();
  processElements.forEach(element => {
    const lane = elementLaneById.get(element.id) ?? fallbackLane;
    const layer = layerAssignments.get(element.id) || 0;
    
    if (!laneLayerGroups.has(lane.id)) {
      laneLayerGroups.set(lane.id, new Map());
    }
    const layerGroups = laneLayerGroups.get(lane.id)!;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(element.id);
  });
  
  // Swimlane-aware positioning algorithm
  // Group elements by layer first to understand vertical organization
  const elementsByLayer = new Map<number, string[]>();
  processElements.forEach(element => {
    const layer = layerAssignments.get(element.id) || 0;
    if (!elementsByLayer.has(layer)) {
      elementsByLayer.set(layer, []);
    }
    elementsByLayer.get(layer)!.push(element.id);
  });

  // Track Y positions used in each lane to handle vertical stacking within lanes
  const laneYTracker = new Map<string, number[]>();
  activeLanes.forEach(lane => {
    laneYTracker.set(lane.id, []);
  });

  // Position elements layer by layer (top to bottom flow)
  processElements.forEach((element) => {
    const lane = elementLaneById.get(element.id) ?? fallbackLane;
    const laneIndex = lane.index;
    const layer = layerAssignments.get(element.id) || 0;
    
    const { width, height } = getElementDimensions(element);
    
    // Calculate base Y position for this layer
    const firstLayerPadding = layer === 0 ? 20 : 0;
    const baseLayerY = LANE_PADDING_TOP + firstLayerPadding + layer * (TASK_DIMENSIONS.height + NODE_VERTICAL_GAP);
    
    // Check if there are already elements in this lane at this layer's Y position
    const usedYPositions = laneYTracker.get(lane.id) || [];
    let y = baseLayerY;
    
    // Find the next available Y position in this lane (avoid overlaps)
    const minGap = 20; // Minimum gap between vertically stacked elements
    for (const usedY of usedYPositions) {
      if (Math.abs(y - usedY) < height + minGap) {
        // Too close to an existing element, push down
        y = Math.max(y, usedY + TASK_DIMENSIONS.height + minGap);
      }
    }
    
    // Record this Y position as used in this lane
    usedYPositions.push(y);
    usedYPositions.sort((a, b) => a - b);
    laneYTracker.set(lane.id, usedYPositions);
    
    // Calculate X position: center in lane
    const laneStart = laneIndex * LANE_WIDTH;
    const laneCenter = laneStart + LANE_WIDTH / 2;
    
    // Check how many elements are at this same Y coordinate in this lane
    const layerNodes = laneLayerGroups.get(lane.id)?.get(layer) || [element.id];
    const currentIndexInLayerLane = layerNodes.indexOf(element.id);
    
    // For swimlane layouts, prefer centering single elements
    // Only use horizontal distribution if there are 2-3 elements at same level
    let x: number;
    if (layerNodes.length === 1 || currentIndexInLayerLane === -1) {
      // Single element at this layer in this lane: center it
      x = laneCenter - width / 2;
    } else if (layerNodes.length === 2) {
      // Two elements: slight offset left/right from center
      const offset = width / 3;
      x = currentIndexInLayerLane === 0 ? laneCenter - offset - width / 2 : laneCenter + offset - width / 2;
    } else {
      // 3+ elements: they should have been in different layers ideally
      // Fallback: slight horizontal offset or accept vertical stacking
      const offset = (currentIndexInLayerLane % 3) * 30 - 30; // -30, 0, +30
      x = laneCenter + offset - width / 2;
    }
    
    // Ensure within lane bounds
    const minX = laneStart + 10;
    const maxX = laneStart + LANE_WIDTH - width - 10;
    x = Math.max(minX, Math.min(x, maxX));
    
    elementBounds.set(element.id, { x, y, width, height });
  });

  // Post-process: Final overlap detection and resolution
  const nodesByLane = new Map<string, Array<{ id: string; bounds: Bounds }>>();
  processElements.forEach(element => {
    const lane = elementLaneById.get(element.id) ?? fallbackLane;
    const bounds = elementBounds.get(element.id);
    if (!bounds) return;
    
    if (!nodesByLane.has(lane.id)) {
      nodesByLane.set(lane.id, []);
    }
    nodesByLane.get(lane.id)!.push({ id: element.id, bounds });
  });
  
  // Final pass: ensure no overlaps within each lane
  nodesByLane.forEach((nodes) => {
    // Sort by Y position for sequential overlap checking
    nodes.sort((a, b) => a.bounds.y - b.bounds.y);
    
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1].bounds;
      const curr = nodes[i].bounds;
      const minVerticalGap = 80; // Increased from 60 for better readability and routing space
      
      // Check for vertical overlap or too-close spacing
      const prevBottom = prev.y + prev.height;
      if (curr.y < prevBottom + minVerticalGap) {
        // Adjust current node down
        const newY = prevBottom + minVerticalGap;
        curr.y = newY;
        elementBounds.set(nodes[i].id, curr);
      }
    }
  });

  for (const element of processElements) {
    if (element.tag === 'bpmn:boundaryEvent') {
      const attachedId = element.attributes?.attachedToRef;
      const attachedBounds = attachedId ? elementBounds.get(attachedId) : undefined;
      if (attachedBounds) {
        elementBounds.set(element.id, {
          x: attachedBounds.x + attachedBounds.width - BOUNDARY_DIMENSIONS.width / 2,
          y: attachedBounds.y + attachedBounds.height - BOUNDARY_DIMENSIONS.height / 2,
          width: BOUNDARY_DIMENSIONS.width,
          height: BOUNDARY_DIMENSIONS.height,
        });
      }
    }
  }

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

  // Track multiple outgoing flows from each element to assign different exit ports
  const outgoingFlowsBySource = new Map<string, SequenceFlow[]>();
  const incomingFlowsByTarget = new Map<string, SequenceFlow[]>();
  
  flows.forEach(flow => {
    if (!outgoingFlowsBySource.has(flow.sourceRef)) {
      outgoingFlowsBySource.set(flow.sourceRef, []);
    }
    outgoingFlowsBySource.get(flow.sourceRef)!.push(flow);
    
    if (!incomingFlowsByTarget.has(flow.targetRef)) {
      incomingFlowsByTarget.set(flow.targetRef, []);
    }
    incomingFlowsByTarget.get(flow.targetRef)!.push(flow);
  });

  const edgeXml = flows
    .map(flow => {
      const sourceBounds = elementBounds.get(flow.sourceRef);
      const targetBounds = elementBounds.get(flow.targetRef);
      if (!sourceBounds || !targetBounds) {
        return '';
      }
      
      // Determine port offset for multiple connections from same source
      const sourceFlows = outgoingFlowsBySource.get(flow.sourceRef) || [];
      const flowIndex = sourceFlows.indexOf(flow);
      const totalSourceFlows = sourceFlows.length;
      
      const targetFlows = incomingFlowsByTarget.get(flow.targetRef) || [];
      const targetFlowIndex = targetFlows.indexOf(flow);
      const totalTargetFlows = targetFlows.length;
      
      const points = computeWaypointsWithPorts(
        sourceBounds, 
        targetBounds, 
        flowIndex, 
        totalSourceFlows,
        targetFlowIndex,
        totalTargetFlows,
        flow.conditionExpression // For gateway branches
      );
      
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

  const messagesXml = messageDefs.size
    ? Array.from(messageDefs.values())
        .map(message => `  <bpmn:message id="${message.id}" name="${escapeXml(message.name)}" />`)
        .join('\n')
    : '';

  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${BPMN_NS.definitions} id="Definitions_${sanitize(ir.name)}" targetNamespace="https://kflow.dev/bpmn">`,
    `  <bpmn:process id="Process_${sanitize(ir.name)}" name="${escapeXml(ir.name)}" isExecutable="${isExecutable}">`,
    processSections,
    '  </bpmn:process>',
  ];

  if (messagesXml) {
    xmlParts.push(messagesXml);
  }

  if (diagramXml) {
    xmlParts.push(diagramXml);
  }

  xmlParts.push('</bpmn:definitions>');

  return xmlParts.join('\n');
}

type WaitEventKind = 'timerDuration' | 'timerDate' | 'message';

function classifyWaitEvent(state: WaitState): WaitEventKind {
  if (isPositiveNumber(state.delayMs)) {
    return 'timerDuration';
  }

  const until = state.until?.trim();
  if (until && isIsoLikeDate(until)) {
    return 'timerDate';
  }

  return 'message';
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isIsoLikeDate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(trimmed)) {
    return false;
  }

  const normalized = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp);
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
        if (state.attachedTo) {
          assertStateExists(state.id, state.attachedTo, 'attachedTo');
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
  const normalized = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
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
    return `${expr} == ${value}`;
  }
  const escaped = value.replace(/"/g, '\\"');
  return `${expr} == "${escaped}"`;
}

function normalizeConditionExpression(raw?: string): string | undefined {
  if (!raw) return undefined;
  let text = raw.trim();
  if (!text) return undefined;
  if (/^\$\{.*\}$/.test(text)) {
    return text;
  }
  text = text.replace(/\{([^}]+)\}/g, (_, expr: string) => expr.trim());
  text = text.replace(/===/g, '==');
  return '${' + text + '}';
}

type DockDirection = 'left' | 'right' | 'top' | 'bottom';

function center(bounds: Bounds): Waypoint {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function dock(bounds: Bounds, reference: Bounds): { point: Waypoint; direction: DockDirection } {
  const c1 = center(bounds);
  const c2 = center(reference);
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    if (dx >= 0) {
      return {
        point: { x: bounds.x + bounds.width, y: clamp(c2.y, bounds.y, bounds.y + bounds.height) },
        direction: 'right',
      };
    }
    return {
      point: { x: bounds.x, y: clamp(c2.y, bounds.y, bounds.y + bounds.height) },
      direction: 'left',
    };
  }

  if (dy >= 0) {
    return {
      point: { x: clamp(c2.x, bounds.x, bounds.x + bounds.width), y: bounds.y + bounds.height },
      direction: 'bottom',
    };
  }

  return {
    point: { x: clamp(c2.x, bounds.x, bounds.x + bounds.width), y: bounds.y },
    direction: 'top',
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Enhanced waypoint calculation with port-aware routing to prevent overlapping connectors
 */
function computeWaypointsWithPorts(
  source: Bounds, 
  target: Bounds,
  flowIndex: number,
  totalFlowsFromSource: number,
  targetFlowIndex: number,
  totalFlowsToTarget: number,
  conditionExpression?: string
): Waypoint[] {
  const sourceCenter = center(source);
  const targetCenter = center(target);
  const waypoints: Waypoint[] = [];
  
  // Determine flow direction
  const isBackward = target.y < source.y + source.height / 2;
  const horizontalOffset = Math.abs(sourceCenter.x - targetCenter.x);
  const verticalOffset = Math.abs(sourceCenter.y - targetCenter.y);
  
  // Calculate port offset for multiple connections
  // This prevents overlapping at connection points
  const getPortOffset = (index: number, total: number, maxWidth: number): number => {
    if (total === 1) return 0;
    if (total === 2) {
      // For gateways with true/false branches, create MORE distinct separation
      // Use wider offset (40% instead of 25%) for clearer visual distinction
      return index === 0 ? -maxWidth * 0.4 : maxWidth * 0.4;
    }
    // For more than 2, distribute with wider spacing
    const spacing = maxWidth * 0.8 / (total + 1);
    return (index + 1) * spacing - maxWidth * 0.4;
  };
  
  // Choose connection points based on relative positions and port offsets
  let sourcePoint: Waypoint;
  let targetPoint: Waypoint;
  
  if (isBackward) {
    // Backward flow: exit from top
    const sourcePortOffset = getPortOffset(flowIndex, totalFlowsFromSource, source.width * 0.8);
    sourcePoint = { 
      x: sourceCenter.x + sourcePortOffset, 
      y: source.y 
    };
    
    const targetPortOffset = getPortOffset(targetFlowIndex, totalFlowsToTarget, target.width * 0.8);
    targetPoint = { 
      x: targetCenter.x + targetPortOffset, 
      y: target.y + target.height 
    };
  } else {
    // Forward flow: exit from bottom
    const sourcePortOffset = getPortOffset(flowIndex, totalFlowsFromSource, source.width * 0.8);
    sourcePoint = { 
      x: sourceCenter.x + sourcePortOffset, 
      y: source.y + source.height 
    };
    
    const targetPortOffset = getPortOffset(targetFlowIndex, totalFlowsToTarget, target.width * 0.8);
    targetPoint = { 
      x: targetCenter.x + targetPortOffset, 
      y: target.y 
    };
  }
  
  waypoints.push(sourcePoint);
  
  // Add initial vertical segment to separate multiple outgoing flows
  // CRITICAL: This is where branches diverge - make it more aggressive
  if (totalFlowsFromSource > 1) {
    // Increase base separation and stagger more aggressively
    const baseSeparation = 35; // Increased from 25
    const staggerAmount = 12; // Increased from 8
    const separationDistance = baseSeparation + (flowIndex * staggerAmount);
    
    const separationY = isBackward ? 
      sourcePoint.y - separationDistance : 
      sourcePoint.y + separationDistance;
    
    waypoints.push({ x: sourcePoint.x, y: separationY });
    
    // For 2 branches (typical gateway), add horizontal offset early
    if (totalFlowsFromSource === 2) {
      const horizontalOffset = flowIndex === 0 ? -15 : 15; // Move left or right
      waypoints.push({ x: sourcePoint.x + horizontalOffset, y: separationY });
    }
  }
  
  // Create routing based on layout characteristics
  if (horizontalOffset < 10) {
    // Nearly vertical alignment: direct connection with minimal waypoints
    if (verticalOffset > 40) {
      const midY = (sourcePoint.y + targetPoint.y) / 2;
      waypoints.push({ x: sourcePoint.x, y: midY });
    }
  } else if (horizontalOffset > 100) {
    // Significant horizontal offset: use L-shaped routing with separation
    const gapY = Math.abs(targetPoint.y - sourcePoint.y);
    
    if (gapY > 80) {
      // Clean L-shaped route
      const midY = sourcePoint.y + (targetPoint.y - sourcePoint.y) * 0.6;
      
      // Add horizontal offset for multiple flows to prevent overlapping
      const horizontalSeparation = totalFlowsFromSource > 1 ? flowIndex * 15 : 0;
      
      waypoints.push({ x: sourcePoint.x, y: midY });
      
      // Add intermediate point if there's significant horizontal movement
      if (horizontalOffset > 200) {
        const midX = sourcePoint.x + (targetPoint.x - sourcePoint.x) * 0.5;
        waypoints.push({ x: midX, y: midY });
        waypoints.push({ x: midX, y: midY + (targetPoint.y - midY) * 0.5 });
        waypoints.push({ x: targetPoint.x, y: midY + (targetPoint.y - midY) * 0.5 });
      } else {
        waypoints.push({ x: targetPoint.x, y: midY });
      }
    } else {
      // Limited vertical space: create stepped route
      const stepOut = isBackward ? -40 : 40;
      waypoints.push({ x: sourcePoint.x, y: sourcePoint.y + stepOut });
      
      const midY = (sourcePoint.y + stepOut + targetPoint.y) / 2;
      waypoints.push({ x: sourcePoint.x, y: midY });
      waypoints.push({ x: targetPoint.x, y: midY });
      
      if (!isBackward) {
        waypoints.push({ x: targetPoint.x, y: targetPoint.y - 20 });
      }
    }
  } else {
    // Moderate horizontal offset: L-route with ENHANCED port awareness
    // Increase stagger amount for clearer visual separation
    const staggerMultiplier = 15; // Increased from 10
    const routingY = isBackward ? 
      Math.min(sourcePoint.y, targetPoint.y) - 30 - (flowIndex * staggerMultiplier) : 
      sourcePoint.y + (targetPoint.y - sourcePoint.y) / 2 + (flowIndex * staggerMultiplier);
    
    waypoints.push({ x: sourcePoint.x, y: routingY });
    waypoints.push({ x: targetPoint.x, y: routingY });
  }
  
  // Add final approach segment for multiple incoming flows
  // This ensures connectors don't overlap when entering the same target
  if (totalFlowsToTarget > 1) {
    const baseApproach = 25; // Increased from 20
    const approachStagger = 8; // Increased from 5
    const approachDistance = baseApproach + (targetFlowIndex * approachStagger);
    const approachY = isBackward ?
      targetPoint.y + approachDistance :
      targetPoint.y - approachDistance;
    waypoints.push({ x: targetPoint.x, y: approachY });
  }
  
  waypoints.push(targetPoint);
  
  // Remove consecutive duplicates while preserving routing geometry
  const filtered: Waypoint[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const current = waypoints[i];
    const prev = filtered[filtered.length - 1];
    
    if (!prev || prev.x !== current.x || prev.y !== current.y) {
      filtered.push(current);
    }
  }
  
  return filtered;
}

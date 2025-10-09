# BPMN Integration Guide

The BPMN compiler in `@kflow/language` now ships the previously optional backlog items from the compliance plan. The exporter delivers structured lanes, diagram interchange (DI) stubs, case/switch branching, and a toggle for `isExecutable`. This guide documents the behaviour, the heuristics behind each feature, and the knobs you can use to customise the output.

## Lane generation

Lanes are emitted automatically under `<bpmn:laneSet>` with the following precedence:

1. **Explicit metadata** – `ir.metadata?.lanes` pre-registers lane ids, display names, and preferred kinds (`human`, `system`, `external`, `control`).
2. **Per-state overrides** – any `IRState` can set `lane: string`. When the value matches a metadata id, that lane is reused; otherwise the name is normalised into Title Case and created on demand.
3. **Actor heuristics** – if no explicit lane is supplied, user tasks scan the prompt/assignee for variables whose description includes `workflow actor`. This covers StoryFlow-generated actors such as manager, customer, or supervisor.
4. **Fallback lanes** – control-flow nodes (start events, gateways, joins) land in `Control Flow`; automated steps default to `System Automation`; message waits go to `External Partners`; timers collect in `Timers`.

Every BPMN element contributes a `<bpmn:flowNodeRef>` entry so modelling tools highlight which nodes belong to each lane. Lane ids are sanitised (`Lane_Control_Flow`), while display names preserve whitespace and casing.

```ts
const ir = {
   metadata: {
      lanes: [
         { id: 'manager_lane', name: 'Manager', kind: 'human' },
         { id: 'system_lane', name: 'System Automation', kind: 'system' },
      ],
   },
   states: [
      { id: 'collect', kind: 'userTask', prompt: 'manager capture order info', lane: 'manager_lane' },
      { id: 'sync', kind: 'task', action: 'sync CRM', lane: 'system_lane' },
   ],
};
```

## BPMN DI stubs

The exporter writes a minimal `bpmndi:BPMNDiagram` section so viewers render the file without manual layout:

- **Lane shapes** – each lane receives a horizontal `bpmndi:BPMNShape` with evenly spaced widths.
- **Node shapes** – every flow node gains a rectangular `BPMNShape` aligned within its lane. Positions are deterministic (`x = laneIndex * 320 + 90`, `y = 60 + index * 120`).
- **Sequence edges** – `bpmndi:BPMNEdge` entries use simple orthogonal routing. If source/target lanes differ, the edge includes intermediate waypoints to avoid steep diagonals.

These DI stubs are intentionally opinionated: they provide a clean baseline that users can refine in Camunda Modeler or bpmn.io, while keeping the XML schema-valid out-of-the-box.

## Case / Switch branching

The IR introduces a new `case` state:

```ts
{
   id: 'decision',
   kind: 'case',
   expression: '{status}',
   cases: [
      { value: 'approved', next: 'notify' },
      { value: 'rejected', next: 'wrap' },
   ],
   default: 'awaitReply',
}
```

- Each case produces an exclusive gateway with `<bpmn:conditionExpression><![CDATA[{status} === "approved"]]></bpmn:conditionExpression>`.
- `default` becomes the gateway’s `default` attribute, mirroring `choice` semantics.
- The simulator recognises the new state kind using the same `choices` hint map.

## Executable toggle

Set `ir.metadata?.executable` to mark the BPMN process as executable:

```ts
const ir = {
   metadata: { executable: true },
   // ...
};
```

When omitted, `isExecutable="false"` preserves the documentation-first default.

## Validation & quick checks

1. Run `pnpm --filter @kflow/language test` – Vitest exercises the lane, DI, and case gateways and parses the XML with `bpmn-moddle`.
2. Export a story with `npx kflow-export-bpmn examples/advanced-order-processing.story` and load it in Camunda Modeler. Lanes, basic layout, and terminate end events should match expectations.

## Troubleshooting tips

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Lane name appears twice | Two metadata entries map to the same display name | Consolidate the `metadata.lanes` array so each display name is unique |
| Flow node missing from a lane | State never resolved to a lane | Provide `state.lane` or add an actor variable so heuristics can infer the assignment |
| Gateway lacks `default` | `case.default` empty | Ensure the `case` state defines `default` when you need a fall-through branch |
| DI positioning feels cramped | Complex flows exceed default lane width | Tweak coordinates downstream – the stubs are deliberately conservative |

Refer back to `docs/bpmn-compliance-plan.md` for the full remediation history and future expansion ideas.
*** End Patch
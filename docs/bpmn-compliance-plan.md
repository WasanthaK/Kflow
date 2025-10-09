# BPMN Compliance Implementation Guide

This guide translates the BPMN remediation analysis into concrete engineering work. It complements `docs/readme-enhancement-plan.md` and should be treated as the source of truth for the remaining compliance backlog.

## Goals

- Export BPMN 2.0 XML that passes schema validation and loads cleanly in standard tools (Camunda Modeler, bpmn.io).
- Keep the DSL → IR → BPMN mapping aligned with the language dictionary and user manual.
- Provide regression coverage so future language features (e.g., AI-generated flows) inherit compliant BPMN behavior by default.

## Scope

### In scope
- Compiler changes within `@kflow/language` that affect IR validation and BPMN export.
- Automated test coverage (unit + schema parsing) to prevent regressions.
- Documentation updates tied to the compliance changes.

### Out of scope (tracked as follow-ups)
- BPMN DI diagram generation.
- Swimlanes/laneset rendering for actors.
- Studio UI updates beyond reflecting exported BPMN.

## Workstreams

### 1. Pre-export validation
- File: `packages/language/src/compile/bpmn.ts` (or new helper under `compile/validators.ts`).
- Add a graph sanity check before rendering:
  - Ensure every `next`, branch target, and `parallel.join` points to a known state.
  - Verify wait states specify either `delayMs` or `until` and throw otherwise.
  - Confirm `choice` nodes have at least one branch and warn when both `branches` and `otherwise` are missing.
- Surface descriptive errors referencing the offending state id/kind for faster debugging.
- **Status:** ✔️ Implemented (IR validation now runs before BPMN export).

### 2. Default-branch handling
- Update gateway serialization so `exclusiveGateway` elements carry `default="Flow_X"` attributes instead of placing `bpmn:isDefault` on sequence flows.
- Escape condition expressions inside `<![CDATA[ ]]>` and ensure we use `xsi:type="bpmn:tFormalExpression"` with proper namespace prefixes.
- Update existing tests (`packages/language/test/bpmn.test.ts`) to assert gateway-level defaults.
- **Status:** ✔️ Completed – exporter already sets gateway defaults; tests now assert absence of `bpmn:isDefault` and BPMN validation runs via moddle.

### 3. Parallel join support
- For each `parallel` IR state, emit:
  - A split gateway (existing behavior).
  - A join gateway (new) with incoming flows from each branch’s terminal state and an outgoing flow to `state.join`.
- Detect missing `join` targets and raise a validation error.
- Adjust simulator tests if needed to keep semantics aligned.
- **Status:** ✔️ Completed – join gateways are generated, branch flows target the join, and tests assert the wiring.

### 4. Terminate end events
- Extend `IRState` or infer from `stop` to differentiate terminate vs. standard end events (dictionary currently promises termination).
- Emit `<bpmn:terminateEventDefinition/>` inside the end event when termination is intended.
- Add regression tests covering both end-event flavors.
- **Status:** ✔️ Completed – `stop` states emit terminate end events and tests assert the terminate definition is present.

### 5. Timer & receive event hardening
- Guarantee `<bpmn:timerEventDefinition>` always contains exactly one of `<bpmn:timeDate>` or `<bpmn:timeDuration>`.
- Escape timer expressions and validate ISO-8601 format for durations generated via `formatDuration`.
- Ensure receive states serialize to `bpmn:intermediateCatchEvent` with a `<bpmn:messageEventDefinition/>` when appropriate.
- **Status:** ✔️ Completed – timers always output `timeDate`/`timeDuration` content and receive states emit message catch events; covered by tests.

### 6. Automated BPMN validation
- Add a test helper (e.g., `packages/language/test/helpers/bpmnValidate.ts`) that loads the generated XML using `bpmn-moddle` or a similar schema validator.
- Wire the helper into `bpmn.test.ts` to fail fast on schema violations.
- Document the validation command in `BPMN_INTEGRATION.md`.
- **Status:** ✔️ Completed – `assertValidBpmn` uses `bpmn-moddle` in tests to enforce schema compliance.

### 7. Documentation alignment
- Update:
  - `docs/BPMN_INTEGRATION.md` with the new validation workflow and compliance checklist.
  - `docs/kflow-language-dictionary.md` to mention terminate vs. normal end events if we add configuration knobs.
  - `docs/kflow-user-manual.md` BPMN export section once defaults/joins are fixed.
  - Primary README callouts when the workstreams land.
- Link this guide from `docs/readme-enhancement-plan.md`.
- **Status:** ✔️ Completed – documentation refreshed (integration guide, dictionary, user manual, README checklist) and plans cross-referenced.

### 8. Optional future enhancements (now delivered)
- ✅ **Lane generation** – lanes derive from metadata, per-state hints, and actor heuristics; exporter writes `<bpmn:laneSet>` with complete `flowNodeRef` coverage.
- ✅ **BPMN DI stubs** – every process emits `bpmndi:BPMNDiagram` entries with lane, node, and edge shapes for immediate rendering in Camunda Modeler or bpmn.io.
- ✅ **`Case` / `Switch` syntax** – new IR state kind maps to exclusive gateways with condition expressions and simulator support.
- ✅ **Executable toggle** – `ir.metadata.executable` controls the `isExecutable` flag on the process element.
- ✅ **Documentation** – integration guide, language dictionary, user manual, and README updated with the new behaviour.

## Execution Checklist

| Task | Owner | Status |
| --- | --- | --- |
| Validation helper for IR graph | | ✅ Completed – pre-export checks now enforce state references, wait timers, and choice branches |
| Gateway default rewrite | | ✅ Completed – gateway `default` attributes verified and covered by tests |
| Parallel join serialization | | ✅ Completed – join gateway wiring and validation covered by tests |
| Terminate end-event support | | ✅ Completed – terminate end events emitted and covered by tests |
| Timer enforcement | | ✅ Completed – timer/message event output hardened and verified by tests |
| BPMN schema validation helper + tests | | ✅ Completed – moddle-backed validation integrated into test suite |
| Documentation updates (integration guide, dictionary, manual, README) | | ✅ Completed – docs refreshed with compliance details |
| Lane generation + DI stubs | | ✅ Completed – automated lanes with DI stubs ship in the exporter |
| Case/Switch state support | | ✅ Completed – case gateways backed by tests and simulator support |
| Executable flag toggle | | ✅ Completed – `ir.metadata.executable` surfaced and documented |

## Verification Steps

1. `pnpm --filter @kflow/language test bpmn.test.ts` (should include moddle-based validation).
2. Manual import of example BPMN into Camunda Modeler or bpmn.io for smoke testing.
3. Optional: run the CLI `kflow-export-bpmn` against `examples/advanced-order-processing.story` once fixes land to confirm real-world scenarios export cleanly.

## Communication

- Announce progress via PR notes referencing this guide.
- Update the checklist table as tasks complete.
- When all items are ✅, close out the corresponding entry in `docs/readme-enhancement-plan.md`.

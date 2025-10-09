# README Alignment Status

The main README promises BPMN 2.0 exports, AI-ready tooling, and in-memory simulation. This checklist captures what has been delivered and the next incremental follow-ups.

## ✅ Delivered

- [x] **BPMN XML export**
   - `irToBpmnXml` now renders all current IR state kinds (tasks, user tasks, messaging, waits, branching, termination).
   - Added regression coverage in `test/bpmn.test.ts` and `src/__tests__/bpmn.test.ts` to assert structure, condition expressions, and defaults.

- [x] **In-memory simulator**
   - `simulate` executes the IR graph deterministically, supporting choices, waits, parallel fan-out, messaging, and stop states.
   - Extended tests in `src/__tests__/simulate.test.ts` cover wait auto-advancement, parallel scheduling, and event pauses.

- [x] **Quality gates**
   - Vitest suites run through `pnpm --filter @kflow/language exec vitest run`, keeping the README’s QA claims accurate.
- [x] **BPMN export tooling surfaced to users**
   - `kflow-export-bpmn` CLI now documented in the user manual with end-to-end usage notes, matching README promises.
- [x] **Simulator usage guide published**
   - User manual includes a dedicated section on `simulate`, branch hints, event queues, and wait handling.

## 🔄 Upcoming Enhancements

- [x] Expand documentation with worked examples that show the BPMN XML output alongside the original Kflow prose (`docs/bpmn-worked-example.md`).
- [x] Tighten BPMN compliance: default-branch wiring, parallel joins, terminate end events, timers, and message catches all land with regression coverage (see `docs/bpmn-compliance-plan.md`).
- [x] Add automated BPMN validation (moddle parse or schema check) to the CI story so README claims stay truthful.
- [x] Document the BPMN compliance remediation plan in `BPMN_INTEGRATION.md` and surface a quick-start checklist in the README.
- [x] Introduce `Case`/`Switch` syntax plus lane/DI/executable enhancements, and reflect the capabilities in the README + manuals.

Contributors can pick up any unchecked item to keep the README aligned with shipped capabilities.

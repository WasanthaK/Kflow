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

## 🔄 Upcoming Enhancements

- [ ] Expand documentation with worked examples that show the BPMN XML output alongside the original Kflow prose.
- [ ] Add CLI command or studio action to export BPMN XML directly from authored flows.
- [ ] Publish simulator usage guide in the user manual, including guidance for providing choice hints and events.

Contributors can pick up any unchecked item to keep the README aligned with shipped capabilities.

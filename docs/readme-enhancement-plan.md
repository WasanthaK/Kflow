# README Alignment Plan

The main README describes BPMN 2.0 exports, AI-ready tooling, and an in-memory simulation story. To make the codebase better match those claims we will:

1. **Implement BPMN XML export**
   - Replace the current stubbed `irToBpmnXml` implementation with logic that converts the intermediate representation into a BPMN 2.0 compliant XML document.
   - Cover all currently modelled IR state kinds (tasks, user tasks, messaging, waits, branching, and termination) and ensure outgoing sequence flows line up with the README promise of “BPMN-compliant workflow diagrams.”
   - Provide unit tests that assert the resulting XML contains expected structural elements so future changes do not regress the export.

2. **Provide an in-memory simulator**
   - Expand the `simulate` helper so that it can execute an IR graph using deterministic rules, matching the README’s mention of real-time validation and simulation capabilities.
   - Support user, service, messaging, wait, branching, and stop states while surfacing runtime information such as visited states and produced messages.
   - Add tests that exercise the simulator over a representative IR with branching paths.

3. **Quality gates**
   - Introduce Vitest-based unit coverage for both enhancements and wire them into the workspace `test` command so the README’s “Quality Assurance” section remains accurate.

Executing this plan will make the language package demonstrably capable of generating BPMN output and simulating flows as described in the README.

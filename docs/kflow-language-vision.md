# Kflow Language Enhancement Vision

This document outlines where the language stands today, identifies missing capabilities (including case-based routing), and proposes a roadmap for iterative growth.

## 1. Current Capabilities Snapshot

The StoryFlow compiler recognizes a concise set of constructs:

- Flow declaration plus linear steps.
- Action keywords (`Ask`, `Do:`, `Send`, `Wait`, `Receive`, `Stop`) mapped to typed tasks.
- Conditional branching limited to `If` / `Otherwise` structures.
- Automatic extraction of template variables, actors, systems, and action verbs.
- Intermediate representation (IR) states comprising task, user task, send, receive, choice, parallel, wait, and stop nodes.
- Deterministic simulation that walks the IR graph, supports choice hints, parallel fan-out, waits, receives, and termination.

These features deliver usable approval, fulfillment, and support workflows, but more advanced orchestration patterns remain unimplemented.

## 2. Missing Language Building Blocks

The following high-impact features are absent today. The count highlights the breadth of the gap.

1. **Case-based routing (Switch/Case gateway)** – There is no syntax for enumerating named cases; branching is restricted to binary `If` and optional `Otherwise` statements, making multi-outcome routing verbose.
2. **Loop constructs** – StoryFlow lacks `While`, `For`, or repeating task syntax, and the IR has no loop state, preventing iterative processes such as retries, reminders, or batch processing.
3. **Event-based gateways** – Beyond a simple `Receive` wait, the language has no gateway that chooses a path based on which event arrives first, limiting responsiveness to competing signals.
4. **Sub-process and call activity support** – The IR does not include sub-process nodes, so authors cannot encapsulate reusable flows or call child workflows.
5. **Boundary error/timeout handling** – Although individual waits can time out, there is no structured syntax for attaching error or timeout handlers to tasks.
6. **Multi-instance (for-each) behavior** – Tasks cannot run concurrently for a collection of items, restricting scenarios like notifying each regional manager or processing every invoice in a batch.

> **Total missing core features identified: 6.**

These gaps explain why case-based routing felt absent: it is part of a broader set of orchestration primitives that are yet to be modeled.

## 3. Enhancement Roadmap

The roadmap prioritizes foundational control-flow features before layering advanced tooling.

### Phase 1 – Branching & Iteration

- Introduce `Case` syntax that compiles to a multi-branch `choice` IR node with named paths.
- Add `Loop`/`While` syntax and extend the IR with loop states or back-edges so the simulator can track iterations.
- Provide indentation-aware validation to prevent malformed branches when these new keywords appear.

### Phase 2 – Event Awareness

- Extend the IR with `eventGateway` nodes that accept multiple `Receive` definitions and race them.
- Support explicit timeout handlers, e.g., `On timeout` blocks under waits or user tasks.
- Surface event metadata in the simulator (`waitingFor` should return every pending event option).

### Phase 3 – Modularity & Reuse

- Model sub-process tasks (`Call Flow`, `Inline Flow`) that reference other Kflow files.
- Allow parameter passing into sub-processes and collect return variables on completion.
- Add multi-instance markers, such as `For each {item}` sections that spawn parallel branches.

### Phase 4 – Error & Compensation Management

- Introduce `On error` and `On cancel` handlers for tasks and sub-processes.
- Extend the IR and BPMN exporter to emit boundary events and compensation flows.
- Update simulation to propagate failure states and trigger compensating actions.

## 4. Documentation & Tooling Alignment

- Update the dictionary and manual whenever a new keyword ships to keep authors informed.
- Expand automated tests to cover branching permutations, loops, and event races.
- Provide editor diagnostics that flag unsupported constructs until their runtime support is merged.

By addressing the six missing building blocks above, Kflow can evolve from linear approval flows into a comprehensive orchestration language capable of modeling complex, event-driven business processes.

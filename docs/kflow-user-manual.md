# Kflow User Manual

This guide walks you through authoring, validating, and simulating workflows with the Kflow language toolkit.

## 1. Prerequisites

- **Runtime**: Node.js 18 or later.
- **Package manager**: `pnpm` (recommended) or `npm`.
- **Workspace setup**:
  ```bash
  pnpm install
  pnpm -w -r build
  ```
  The build command compiles every package, including `@kflow/language` and the visual studio.

## 2. Authoring a Flow

1. **Start with a declaration**
   ```kflow
   Flow: Expense Reimbursement
   ```
2. **Describe human steps with `Ask`**
   ```kflow
   Ask employee to submit {receipt}
   ```
   The compiler treats the first word after `Ask` as the assignee and marks the task as human input.
3. **Automate work with `Do:`**
   - System operations: `Do: process reimbursement in finance system`
   - Manual reviews: `Do: review receipt for policy compliance`
   - Calculations: `Do: calculate reimbursement total`
   Specialized verbs choose the appropriate BPMN task type automatically.
4. **Communicate with `Send`**
   ```kflow
   Send notification to finance: "Reimbursement ready"
   ```
   Common channels such as email, SMS, and Slack are auto-detected.
5. **Wait for external activity**
   - `Wait 24 hours for manager approval`
   - `Receive payment_confirmation`
6. **Terminate with `Stop`** when the flow finishes.

### Indentation Rules

Use two spaces to nest steps under a condition:

```kflow
If {amount} > 1000
  Ask manager to approve
  If approved
    Do: process expedited reimbursement
Otherwise
  Do: process automatically
```

Nested `If` blocks create multi-level branching structures. Every `If` can have a single `Otherwise` block.

## 3. Working with Variables

- Wrap parameters in `{curly_braces}` to mark them as template variables.
- Actors like “manager” or “customer” and system names such as “HR system” are detected automatically and converted into template variables.
- Conditional phrases like “If approved” register boolean flags so downstream tooling can track decision outcomes.

These behaviors come from the StoryFlow compiler’s variable extraction pass.

## 4. Converting Stories to SimpleScript

Use the `storyToSimple` helper to translate StoryFlow prose into the SimpleScript JSON structure:

```ts
import { storyToSimple } from '@kflow/language';

const simple = storyToSimple(`
Flow: Expense Reimbursement
Ask employee to submit {receipt}
Do: validate receipt details
If {amount} > 1000
  Ask manager to approve
Otherwise
  Do: process automatically
Stop
`);

console.log(simple);
```

`storyToSimple` splits the story into steps, converts recognized actions into typed tasks, and returns a formatted JSON string that includes template variables, task metadata, and branch structure.

## 5. Simulating a Flow

Import the `simulate` function to execute the compiled intermediate representation (IR):

```ts
import { simulate, IR } from '@kflow/language';

const ir: IR = {
  name: 'Expense Reimbursement',
  start: 'start',
  states: [
    { id: 'start', kind: 'userTask', prompt: 'employee submit {receipt}', next: 'validate' },
    { id: 'validate', kind: 'task', action: 'validate receipt details', next: 'decision' },
    {
      id: 'decision',
      kind: 'choice',
      branches: [
        { cond: '{amount} > 1000', next: 'managerApproval' }
      ],
      otherwise: 'autoProcess'
    },
    { id: 'managerApproval', kind: 'userTask', prompt: 'manager approve', next: 'stop' },
    { id: 'autoProcess', kind: 'task', action: 'process automatically', next: 'stop' },
    { id: 'stop', kind: 'stop' }
  ]
};

const result = simulate(ir, {
  choices: { decision: 'autoProcess' },
  autoAdvanceWaits: true
});

console.log(result.status); // 'completed'
console.log(result.log);
```

Simulation returns:

- `visited`: ordered list of state IDs.
- `log`: typed entries describing tasks, waits, messages, and decisions.
- `messages`: outbound communications emitted via `Send` states.
- `status`: `completed`, `waiting`, or `stopped` when a `Stop` state is reached.
- `waitingFor`: details about the state that paused execution (receive or wait).

## 6. Studio Integration

Run the studio for a visual editing experience:

```bash
pnpm --filter studio dev
```

Open `http://localhost:5173` in your browser to edit StoryFlow text side-by-side with the generated BPMN graph.

## 7. Best Practices

- Keep sentences action-oriented and present tense.
- Prefer explicit system names (e.g., “finance system”) so the compiler can template them.
- Use `Send` for every external communication to keep audit trails intact.
- End every branch with either `Stop` or a step that rejoins the main flow.
- Avoid mixing unrelated concerns inside a single flow; favor modular flows that can later become sub-processes.

With this manual and the accompanying dictionary, teams can author consistent workflows while the compiler handles structure, metadata, and simulation.

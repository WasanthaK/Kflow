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

## 5. Drafting from Narrative Briefs

Use the `generateStoryFromNarrative` helper to bootstrap StoryFlow code from plain business prose. Provide your own LLM adapter for AI-first extraction, or rely on the built-in heuristic fallback when no model is available.

```ts
import {
  assessNarrativeEscalation,
  buildClarificationPrompts,
  generateStoryFromNarrative,
  resolveNarrativeLLMFromEnv,
  storyToSimple,
} from '@kflow/language';

const narrative = `Requirement Brief: The sales manager needs a simple approval flow for rush orders.
When a rush order request arrives, collect the customer name, requested items, and promised ship date.
The operations analyst should verify inventory availability in the warehouse system.
If stock is available and the order value is greater than $5,000, the finance manager must review the pricing and either approve or reject.
For rejected requests, notify the requester with the reason and stop.
When approved, send an email confirmation to the requester, schedule a rush shipment, and wait for the carrier pickup confirmation before closing the request.`;

const llm = resolveNarrativeLLMFromEnv();

const result = await generateStoryFromNarrative({
  narrative,
  flowName: 'Rush Order Handling',
  llm,
});

const { story, insights, confidence, warnings, provider } = result;
const simple = storyToSimple(story);
const escalation = assessNarrativeEscalation(result);
const clarifications = buildClarificationPrompts(result);

console.log({ provider, confidence, warnings, insights, clarifications, escalation });
```

Set the following environment variables to enable AI-powered narrative extraction:

| Variable | Purpose | Default |
| --- | --- | --- |
| `KFLOW_AI_PROVIDER` | Provider selector (`openai`, `azure-openai`). | `openai` |
| `OPENAI_API_KEY` | Required for OpenAI (and used as fallback for Azure if specific key missing). | _none_ |
| `OPENAI_MODEL` | Override the deployed OpenAI model. | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Optional custom endpoint for OpenAI-compatible services. | OpenAI public API |
| `AZURE_OPENAI_API_KEY` | Required for Azure OpenAI. | _none_ |
| `AZURE_OPENAI_ENDPOINT` | Azure resource endpoint (`https://your-resource.openai.azure.com`). | _none_ |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment/model name. | _none_ |
| `AZURE_OPENAI_API_VERSION` | API version query parameter. | `2024-05-01-preview` |

This produces a StoryFlow script beginning with `Ask requester…`, `Do: verify inventory…`, and a conditional approval branch, giving analysts a structured starting point while preserving the original narrative in version control. The returned `insights` object lists detected actors, intents, and dynamic variables so downstream tools can reason about ownership and data needs. `resolveNarrativeLLMFromEnv()` auto-detects OpenAI or Azure OpenAI credentials (falling back to heuristics when none are present), while `assessNarrativeEscalation()` lets you trigger human review when confidence is low or critical signals are missing.

`buildClarificationPrompts()` consumes the same result payload and surfaces targeted follow-up questions (missing actors, vague variables, low confidence) so analysts can capture clarifications directly in Studio or CLI flows.

## 6. Exporting to BPMN

Use the CLI helper to convert an IR JSON file into BPMN 2.0 XML:

```bash
pnpm --filter @kflow/language build
npx kflow-export-bpmn ./examples/expense-ir.json ./examples/expense.bpmn
```

If you already have the IR object in memory, you can call the helper directly:

```ts
import { irToBpmnXml, sampleExpenseReimbursementIr } from '@kflow/language';

const xml = irToBpmnXml(sampleExpenseReimbursementIr);
console.log(xml);
```

## 7. Simulating a Flow

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

### Simulation Options

Pass a second argument to fine-tune execution:

| Option | Type | Purpose |
| --- | --- | --- |
| `choices` | `Record<string, string>` | Provide branch hints. Map the choice state ID to either the target state ID or the condition string you want selected. |
| `events` | `string[]` | Pre-seed external events. When the simulator encounters a matching `receive` state, the event is consumed automatically. |
| `autoAdvanceWaits` | `boolean` | `true` lets timers continue instantly (useful for tests). `false` pauses execution and populates `waitingFor`. |
| `maxSteps` | `number` | Safety guard to prevent infinite loops. Defaults to 1,000. |

Example with both branch hints and auto-advancing waits:

```ts
const outcome = simulate(ir, {
  choices: { decision: 'autoProcess' },
  events: ['payment_confirmation'],
  autoAdvanceWaits: true,
});

console.table(outcome.visited);
```

When `autoAdvanceWaits` is not enabled, the simulator returns `{ status: 'waiting', waitingFor: { type: 'wait' | 'receive', stateId } }`. Call `simulate` again with additional `events` or after toggling `autoAdvanceWaits` to continue.

### Logging and Inspection

The `log` array mirrors the execution trace with structured entries for each state kind:

- `task` / `userTask`: `action` or `prompt`
- `message`: `channel`, `to`, and message body
- `wait`: pause metadata such as `delayMs`
- `choice`: the branch that was selected
- `parallel`: fanned-out branches and optional join state
- `stop`: termination reason

For debugging, feed the log into your favorite formatter or snapshot it in tests to assert deterministic behavior.

## 8. Studio Integration

Run the studio for a visual editing experience:

```bash
pnpm --filter studio dev
```

Open `http://localhost:5173` in your browser to edit StoryFlow text side-by-side with the generated BPMN graph.

### Loading example narratives

- Use the **Load from examples…** dropdown in the editor toolbar to pull any brief from the `examples/` directory (e.g., `support-escalation-brief.txt`) directly into the workspace.
- The newly added support escalation and BA requirement briefs showcase the AI-first extractor—load them, press **Convert**, and inspect the generated SimpleScript plus confidence diagnostics.
- The existing **Upload Story** button still accepts local files when you want to test external narratives.

## 9. Best Practices

- Keep sentences action-oriented and present tense.
- Prefer explicit system names (e.g., “finance system”) so the compiler can template them.
- Use `Send` for every external communication to keep audit trails intact.
- End every branch with either `Stop` or a step that rejoins the main flow.
- Avoid mixing unrelated concerns inside a single flow; favor modular flows that can later become sub-processes.

With this manual and the accompanying dictionary, teams can author consistent workflows while the compiler handles structure, metadata, and simulation.

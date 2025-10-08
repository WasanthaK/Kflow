# Kflow Language Dictionary

This dictionary catalogs the domain vocabulary, syntax keywords, and semantic concepts that appear in Kflow stories. Use it as a quick reference while writing or reviewing workflows.

## Core Structural Terms

| Term | Definition | Example |
| --- | --- | --- |
| **Flow** | Declares the workflow name and establishes the context for all subsequent steps. | `Flow: Employee Onboarding`
| **Step** | Any executable or descriptive line after the flow declaration. Steps are parsed in order and may introduce branching. | `Do: validate employee record`
| **Branch** | A conditional path that is entered when its condition is satisfied. Branches are created with `If`/`Otherwise`. | See the conditional example below.
| **Indentation** | Two-space indentation indicates the parent-child relationship between branch blocks. | `If condition` followed by two-space indented steps.
| **Template Variable** | Placeholder surrounded by `{}`. Variables are extracted and categorized during compilation. | `{manager}` or `{payment_amount}`

## Action Keywords

| Keyword | Meaning in the compiler | Default BPMN mapping |
| --- | --- | --- |
| `Ask` | Creates a user task that prompts a human actor for input or approval. The first word after `Ask` becomes the assignee. | User Task (`human_input`)
| `Do:` (system verbs) | When followed by verbs such as `create`, `update`, `delete`, `process`, `execute`, or `call`, produces an automated service task. | Service Task (`system_operation`)
| `Do:` (manual verbs) | When followed by verbs such as `review`, `approve`, `check`, `verify`, or `inspect`, becomes a manual task assigned to a human. | Manual Task (`human_work`)
| `Do:` (analytical verbs) | When followed by verbs such as `calculate`, `transform`, `analyze`, or `aggregate`, emits a script task. Subtypes like financial calculation or data transformation are inferred from the wording. | Script Task (`computation`)
| `Do:` (rules verbs) | When followed by verbs such as `evaluate`, `determine`, or `classify`, maps to a business rule task. | Business Rule Task (`rule_evaluation`)
| `Do:` (generic) | Any other `Do` statement is preserved as a generic task for downstream tooling. | Task (unspecified)
| `Send` | Creates a message task. The compiler detects common channels (email, notification, SMS, Slack) to label the message type. | Message Task (`send`)
| `Receive` | Marks a waiting state that resumes when a matching external event name is supplied to the simulator. | Intermediate Message Catch Event (`message`)
| `Wait` | Introduces an explicit timer wait. Simulation can either pause or auto-advance depending on configuration. | Intermediate Timer Catch Event (`timer`)
| `Stop` | Signals the end of the workflow. | Terminate End Event
| `Remember` | Any line that does not match the patterns above becomes a note stored in the compilation result. | `Remember to sync with finance`

## Control Flow Keywords

| Keyword | Purpose |
| --- | --- |
| `If` | Starts a conditional branch. The expression following `If` becomes the branch condition. |
| `Otherwise` | Defines the alternate path when the preceding `If` condition is not met. Only one `Otherwise` is supported per `If` block. |
| `Case` / `Switch` | Evaluates an expression against multiple values. Each matching value jumps to a named step; an optional default path handles fall-through. |
| Nested `If` | `If` statements can appear inside an indented block to model nested conditions. |

## Variable and Entity Detection

The StoryFlow compiler extracts and normalizes variables automatically:

- **Template variables**: Every `{variable}` placeholder is stored with a default description such as `input variable (variable)`.
- **Boolean flags**: Conditions mentioning words like `approved`, `rejected`, or `available` automatically register those states as boolean variables.
- **Actors**: Common role names (manager, employee, customer, admin, supervisor, owner, agent, lead) are converted to `{actor}` placeholders and recorded as workflow actors.
- **Systems**: References to platforms such as “HR system”, “database”, “API”, or “service” are turned into snake_case placeholders like `{hr_system}` and marked as target systems.
- **Action verbs**: Repeated verbs such as `create`, `send`, `process`, or `execute` become reusable `{action}` variables for downstream templating.

## Messaging Metadata

When you send communications, Kflow labels them for analytics:

- Lines that include “email” are tagged as `email` messages.
- Lines with “notification” become `notification` messages.
- Lines mentioning “sms” or “Slack” are classified appropriately.
- All other `Send` statements default to the generic `message` type.

## Script Task Subtypes

Analytical `Do:` statements are further categorized:

- **Financial calculations** detect words like `interest`, `tax`, `discount`, or `payment`.
- **Data transformations** look for verbs such as `transform`, `convert`, `normalize`, `parse`, or `merge`.
- **Statistical analysis** recognizes `analyze`, `aggregate`, `count`, `median`, or `forecast`.
- **Data validation** catches `validate`, `verify`, `check`, `reconcile`, or `audit`.
- **Security operations** respond to `encrypt`, `decrypt`, `hash`, `authenticate`, or `authorize`.
- **Text processing** picks up `generate`, `concatenate`, `substring`, or `regex`.
- Any other analytical wording is labeled as `general_computation`.

## Simulation Semantics

The simulator walks the compiled IR graph with deterministic rules:

- `Ask`, `Do`, `Send`, and `Receive` states push entries to the simulation log and enqueue the next state.
- `Wait` either pauses execution (default) or advances automatically when `autoAdvanceWaits` is enabled.
- `Choice` nodes select a branch based on provided hints or fall back to the first branch.
- `Case` nodes mirror `Choice` but match against explicit values; simulator uses the same hint map.
- `Parallel` nodes enqueue every branch plus a join target.
- `Stop` ends the run and marks the simulation status as `stopped`.

Use this dictionary alongside the user manual to keep terminology consistent across authoring, compilation, and simulation.

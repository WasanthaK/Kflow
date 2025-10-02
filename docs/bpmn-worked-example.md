# Worked BPMN Example

This example walks through the full lifecycle of authoring a StoryFlow brief, compiling it to the intermediate representation (IR), and exporting BPMN 2.0 XML.

## 1. Author the Story

```kflow
Flow: Invoice Exception Handling

Ask accounts payable specialist to record {invoice_number} and {vendor_name}
Do: check invoice in ERP system
If discrepancy_detected
  Ask finance lead to review discrepancy details
  Send email to vendor: "Invoice requires clarification"
  Stop
Otherwise
  Do: schedule payment run
  Send notification to requester: "Invoice approved"
  Stop
```

## 2. Compile to IR

Use the `storyToSimple` helper (or the Studio convert button) to compile the StoryFlow into an IR JSON payload. The relevant portion looks like this:

```json
{
  "flow": "Invoice Exception Handling",
  "vars": {
    "invoice_number": "input variable (invoice_number)",
    "vendor_name": "input variable (vendor_name)",
    "discrepancy_detected": "boolean state from rejection decision"
  },
  "steps": [
    { "userTask": { "description": "accounts payable specialist record {invoice_number} and {vendor_name}", "assignee": "accounts", "type": "human_input" } },
    { "serviceTask": { "description": "check invoice in ERP system", "type": "system_operation" } },
    { "if": "discrepancy_detected" },
    { "userTask": { "description": "finance lead review discrepancy details", "type": "human_input" } },
    { "messageTask": { "description": "email to vendor: \"Invoice requires clarification\"", "type": "send", "messageType": "email" } },
    { "endEvent": { "type": "terminate" } },
    { "otherwise": true },
    { "serviceTask": { "description": "schedule payment run", "type": "system_operation" } },
    { "messageTask": { "description": "notification to requester: \"Invoice approved\"", "type": "send", "messageType": "message" } },
    { "endEvent": { "type": "terminate" } }
  ]
}
```

> Tip: The Studio "Enhanced SimpleScript Output" panel already shows this structure. Save it to `./examples/invoice-ir.json` for the next step.

## 3. Export BPMN XML

```bash
pnpm --filter @kflow/language build
npx kflow-export-bpmn ./examples/invoice-ir.json ./examples/invoice-exception-handling.bpmn
```

The exporter produces BPMN that includes:

- A `userTask` for the accounts payable specialist
- A `serviceTask` for the ERP check
- An exclusive gateway (`exclusiveGateway`) with two outgoing sequence flows
- A `userTask` and `endEvent` in the discrepancy branch
- A `serviceTask`, `messageTask`, and `endEvent` in the approval branch

Snippet from the generated XML:

```xml
<bpmn:exclusiveGateway id="Gateway_1" name="discrepancy_detected">
  <bpmn:outgoing>Flow_Discrepancy</bpmn:outgoing>
  <bpmn:outgoing>Flow_Ok</bpmn:outgoing>
</bpmn:exclusiveGateway>
<bpmn:sequenceFlow id="Flow_Discrepancy" sourceRef="Gateway_1" targetRef="Task_FinanceReview">
  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression"><![CDATA[discrepancy_detected]]></bpmn:conditionExpression>
</bpmn:sequenceFlow>
```

Import the `.bpmn` file into any BPMN-compatible tool (Camunda Modeler, ProcessMaker, etc.) to visualize the flow.

## 4. Link Back to Docs

- `README.md` now references this worked example in the "BPMN Export" section.
- `docs/readme-enhancement-plan.md` marks this todo as complete.

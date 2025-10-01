# BPMN Export Walkthrough

This note demonstrates how a short Kflow story compiles into BPMN 2.0 XML using the `irToBpmnXml` helper. It provides a ready-made sample you can tweak or reuse when verifying the exporter locally.

## 1. Author a Story

```kflow
Flow: Expense Reimbursement

Ask employee to submit {receipt}
Do: validate receipt details

If {amount} > 1000
  Ask manager to approve reimbursement
Otherwise
  Do: process automatically

Send email to employee: "Reimbursement processed"
Stop
```

## 2. Compile to IR

When the story is parsed, the relevant intermediate representation looks like this (simplified for clarity):

```ts
const ir = {
  name: 'Expense Reimbursement',
  start: 'submit',
  states: [
    { id: 'submit', kind: 'userTask', prompt: 'employee submit {receipt}', next: 'validate' },
    { id: 'validate', kind: 'task', action: 'validate receipt details', next: 'decision' },
    {
      id: 'decision',
      kind: 'choice',
      branches: [{ cond: '{amount} > 1000', next: 'managerApproval' }],
      otherwise: 'autoProcess',
    },
    { id: 'managerApproval', kind: 'userTask', prompt: 'manager approve reimbursement', next: 'notify' },
    { id: 'autoProcess', kind: 'task', action: 'process automatically', next: 'notify' },
    { id: 'notify', kind: 'send', channel: 'email', to: 'employee', message: 'Reimbursement processed', next: 'stop' },
    { id: 'stop', kind: 'stop', reason: 'complete' },
  ],
};
```

## 3. Generate BPMN XML

Running the exporter on the IR yields the XML snippet below. The exclusive gateway, default branch, message task, and termination event all appear exactly as promised in the README:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_Expense_Reimbursement" targetNamespace="https://kflow.dev/bpmn">
  <bpmn:process id="Process_Expense_Reimbursement" name="Expense Reimbursement" isExecutable="false">
    <bpmn:startEvent id="StartEvent_submit" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_submit" name="employee submit {receipt}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="ServiceTask_validate" name="validate receipt details">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="ExclusiveGateway_decision">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="UserTask_managerApproval" name="manager approve reimbursement">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="ServiceTask_autoProcess" name="process automatically">
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_7</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:sendTask id="SendTask_notify" name="Send via email">
      <bpmn:incoming>Flow_6</bpmn:incoming>
      <bpmn:incoming>Flow_7</bpmn:incoming>
      <bpmn:outgoing>Flow_8</bpmn:outgoing>
      <bpmn:documentation>To employee: Reimbursement processed</bpmn:documentation>
    </bpmn:sendTask>
    <bpmn:endEvent id="EndEvent_stop" name="complete">
      <bpmn:incoming>Flow_8</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_submit" targetRef="UserTask_submit" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_submit" targetRef="ServiceTask_validate" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="ServiceTask_validate" targetRef="ExclusiveGateway_decision" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="ExclusiveGateway_decision" targetRef="UserTask_managerApproval">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">{amount} &gt; 1000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_5" sourceRef="ExclusiveGateway_decision" targetRef="ServiceTask_autoProcess" bpmn:isDefault="true" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="UserTask_managerApproval" targetRef="SendTask_notify" />
    <bpmn:sequenceFlow id="Flow_7" sourceRef="ServiceTask_autoProcess" targetRef="SendTask_notify" />
    <bpmn:sequenceFlow id="Flow_8" sourceRef="SendTask_notify" targetRef="EndEvent_stop" />
  </bpmn:process>
</bpmn:definitions>
```

## 4. Reproduce Locally

### CLI (recommended)

```bash
pnpm --filter @kflow/language build
npx kflow-export-bpmn ./path/to/expense-ir.json ./expense.bpmn
```

If you omit the second argument, the BPMN XML is printed to stdout so you can pipe it elsewhere:

```bash
npx kflow-export-bpmn ./path/to/expense-ir.json > expense.bpmn
```

### Programmatic

```bash
pnpm --filter @kflow/language build
node --input-type=module -e "import('./packages/language/dist/cli/export-bpmn.js').then(({ exportBpmn }) => { const xml = exportBpmn({ inputPath: './path/to/expense-ir.json' }); console.log(xml); });"
```

Both approaches use the same `irToBpmnXml` implementation that powers the tests and studio experience.

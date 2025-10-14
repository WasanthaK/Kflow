import { describe, expect, it } from 'vitest';
import { validateBpmnXml } from './bpmnValidation';

const VALID_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;

const INVALID_BPMN = `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process></bpmn:definitions>`;

describe('validateBpmnXml', () => {
  it('flags empty XML', async () => {
    const result = await validateBpmnXml('   ');
    expect(result.errors).toContain('Empty BPMN XML content.');
  });

  it('parses valid BPMN XML without errors', async () => {
    const result = await validateBpmnXml(VALID_BPMN);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for invalid BPMN XML', async () => {
    const result = await validateBpmnXml(INVALID_BPMN);
    expect(result.errors.some(message => message.includes('BPMN validation error'))).toBe(true);
  });
});

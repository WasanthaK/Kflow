/// <reference path="../types/bpmn-moddle.d.ts" />
import BpmnModdle from 'bpmn-moddle';

const moddle = new BpmnModdle();

export async function assertValidBpmn(xml: string): Promise<void> {
  try {
    const { warnings } = await moddle.fromXML(xml, 'bpmn:Definitions');
    if (warnings && warnings.length > 0) {
      throw new Error(warnings.map(w => (typeof w === 'string' ? w : JSON.stringify(w))).join('\n'));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`BPMN schema validation failed: ${message}`);
  }
}

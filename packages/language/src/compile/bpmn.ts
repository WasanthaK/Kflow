import { IR } from '../ir/types';
export function irToBpmnXml(ir: IR): string {
  // TODO: use bpmn-moddle to construct definitions/process/DI safely
  // Return a minimal, engine-neutral BPMN 2.0 XML
  return `<?xml version="1.0" encoding="UTF-8"?>\n<definitions ...>\n  <!-- build from IR -->\n</definitions>`;
}

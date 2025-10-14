export type BpmnValidationResult = {
  errors: string[];
  warnings: string[];
};

const SHARED_OPTIONS = { lax: false } as const;

export async function validateBpmnXml(xml: string): Promise<BpmnValidationResult> {
  if (!xml.trim()) {
    return { errors: ['Empty BPMN XML content.'], warnings: [] };
  }

  const { default: BpmnModdle } = (await import('bpmn-moddle')) as { default: new () => any };
  const moddle = new BpmnModdle();
  try {
    const { warnings } = await moddle.fromXML(xml, 'bpmn:Definitions', SHARED_OPTIONS);
    const warningMessages = (warnings ?? [])
      .map((warning: { message?: string }) => warning?.message ?? '')
      .filter((message: string): message is string => Boolean(message))
      .map((message: string) => `BPMN warning: ${message}`);

    return {
      errors: [],
      warnings: warningMessages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      errors: [`BPMN validation error: ${message}`],
      warnings: [],
    };
  }
}

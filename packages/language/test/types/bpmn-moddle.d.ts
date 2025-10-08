declare module 'bpmn-moddle' {
	export interface FromXmlResult {
		rootElement: unknown;
		warnings: unknown[];
		references: unknown[];
	}

	export default class BpmnModdle {
		constructor(options?: unknown);
		fromXML(xml: string, typeName?: string, options?: unknown): Promise<FromXmlResult>;
	}
}

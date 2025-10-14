declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class NavigatedViewer {
    constructor(options?: any);
    importXML(xml: string): Promise<void>;
    destroy(): void;
    get<T = any>(service: string): T;
  }
}

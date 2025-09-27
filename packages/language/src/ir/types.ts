export type IR = {
  name: string;
  vars?: Record<string, unknown>;
  states: IRState[];
  start: string;
};

export type IRState =
  | { id: string; kind: 'task'; action: string; retry?: Retry; timeout?: number; next?: string }
  | { id: string; kind: 'userTask'; prompt: string; next?: string }
  | { id: string; kind: 'send'; channel: string; to: string; message: string; next?: string }
  | { id: string; kind: 'receive'; event: string; next?: string }
  | { id: string; kind: 'choice'; branches: { cond: string; next: string }[]; otherwise?: string }
  | { id: string; kind: 'parallel'; branches: string[]; join: string }
  | { id: string; kind: 'wait'; until?: string; delayMs?: number; next?: string }
  | { id: string; kind: 'stop'; reason?: string };

export type Retry = { max: number; backoffMs?: number; jitter?: boolean };

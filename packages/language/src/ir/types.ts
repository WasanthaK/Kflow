export type IR = {
  name: string;
  vars?: Record<string, unknown>;
  states: IRState[];
  start: string;
  metadata?: IRMetadata;
};

export type IRMetadata = {
  executable?: boolean;
  lanes?: IRLaneHint[];
  pools?: IRPoolHint[];
};

type BaseState = {
  id: string;
  lane?: string;
  pool?: string;
};

export type ChoiceBranch = { cond: string; next: string };
export type CaseBranch = { value: string; next: string };

export type IRState =
  | (BaseState & { kind: 'task'; action: string; retry?: Retry; timeout?: number; next?: string })
  | (BaseState & { kind: 'userTask'; prompt: string; assignee?: string; next?: string })
  | (BaseState & { kind: 'send'; channel: string; to: string; message: string; next?: string })
  | (BaseState & { kind: 'receive'; event: string; next?: string })
  | (BaseState & { kind: 'choice'; branches: ChoiceBranch[]; otherwise?: string })
  | (BaseState & { kind: 'case'; expression: string; cases: CaseBranch[]; default?: string })
  | (BaseState & { kind: 'parallel'; branches: string[]; join: string })
  | (BaseState & {
      kind: 'wait';
      name?: string;
      until?: string;
      delayMs?: number;
      attachedTo?: string;
      interrupting?: boolean;
      next?: string;
    })
  | (BaseState & { kind: 'stop'; reason?: string });

export type Retry = { max: number; backoffMs?: number; jitter?: boolean };

export type IRLaneHint = {
  id: string;
  name: string;
  kind?: 'human' | 'external' | 'system' | 'control';
};

export type IRPoolHint = {
  id: string;
  name: string;
  type?: 'company' | 'system' | 'partner';
};

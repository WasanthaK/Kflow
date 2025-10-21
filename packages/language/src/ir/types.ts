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
  | (BaseState & { kind: 'userTask'; prompt: string; assignee?: string; form?: FormDefinition; next?: string })
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

// ============================================================================
// FORM TYPES - Dynamic Form Designer
// ============================================================================

/**
 * Basic field types supported by the form designer
 */
export type FormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'user'
  | 'usergroup'
  | 'role'
  | 'richtext'
  | 'markdown'
  | 'repeatable';

/**
 * Validation rule types
 */
export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'pattern'; regex: string; message?: string }
  | { type: 'custom'; validator: string; message?: string };

/**
 * Select field option
 */
export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Form field validation configuration
 */
export type FormValidation = {
  rules: ValidationRule[];
  validateOn?: 'blur' | 'change' | 'submit';
};

/**
 * User source configuration for user/usergroup fields
 */
export type UserSourceConfig = {
  type: 'azureAD' | 'okta' | 'ldap' | 'custom';
  endpoint?: string;
  filters?: {
    role?: string[];
    department?: string[];
    groups?: string[];
  };
};

/**
 * Rich text editor configuration
 */
export type RichTextConfig = {
  toolbar?: ('bold' | 'italic' | 'underline' | 'link' | 'image' | 'list' | 'heading' | 'code')[];
  mentions?: {
    enabled: boolean;
    userSource?: UserSourceConfig;
  };
  maxLength?: number;
};

/**
 * Repeatable section configuration
 */
export type RepeatableConfig = {
  layout: 'stacked' | 'table' | 'cards';
  minItems?: number;
  maxItems?: number;
  fields: FormField[];
  addButtonLabel?: string;
  removeButtonLabel?: string;
};

/**
 * Individual form field definition
 */
export type FormField = {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: FormValidation;
  
  // Type-specific configurations
  options?: SelectOption[]; // for select, multiselect, radio
  userSource?: UserSourceConfig; // for user, usergroup, role
  richTextConfig?: RichTextConfig; // for richtext, markdown
  repeatableConfig?: RepeatableConfig; // for repeatable
  
  // UI hints
  width?: 'full' | 'half' | 'third' | 'quarter';
  order?: number;
};

/**
 * Complete form definition
 */
export type FormDefinition = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
  version?: string;
};

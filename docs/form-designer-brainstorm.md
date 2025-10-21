# 🎨 Dynamic Form Designer - Architecture Brainstorm

**Date**: October 14, 2025  
**Project**: Kflow  
**Feature**: Dynamic Form Designer Integration

---

## 📑 Table of Contents

### Core Architecture
- [🎯 Vision Statement](#-vision-statement)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [📐 Design Principles](#-design-principles)
- [🔧 Technical Design](#-technical-design)

### Type System & IR
- [Extended IR Type System](#1-extended-ir-type-system)
  - FormField types (text, number, user, usergroup, richtext, repeatable)
  - FormDefinition with audit/comments config
  - FormSection with visibility controls
  - Validation & conditional rules

### Section Visibility
- [📋 Section Visibility Use Cases](#-section-visibility-use-cases)
  - Manager approval sections
  - Multi-role workflows
  - Progressive disclosure

### Form Inference
- [🧠 Form Inference from StoryFlow](#-form-inference-from-storyflow)
  - Automatic field detection
  - User/usergroup field inference
  - Rich text detection
  - Repeatable section detection

### StoryFlow Integration
- [📝 StoryFlow Syntax Extensions](#-storyflow-syntax-extensions)
  - Inline form definitions
  - Dynamic forwarding syntax
  - Section visibility syntax

### React Components
- [🖼️ React Component Architecture](#️-react-component-architecture)
  - FormBuilder (visual designer)
  - FormRenderer (runtime display)
  - Field components library

### BPMN Integration
- [🔄 BPMN Integration Strategy](#-bpmn-integration-strategy)
  - Bi-directional sync
  - Extension elements
  - Runtime engine integration

### Implementation
- [🚀 Implementation Roadmap](#-implementation-roadmap) (10-week plan)
- [🔮 Advanced Features](#-advanced-features)
- [🛡️ Security Considerations](#️-security-considerations)

### Examples
- [📚 Complete Examples](#-complete-examples)
  - Vacation approval workflow
  - Expense reimbursement
  - Multi-stage hiring process

---

## 🎯 Vision Statement

**Add a visual form builder that automatically generates data collection forms for `Ask` (userTask) steps in workflows, with bi-directional sync between form definitions and StoryFlow/BPMN.**

### Why This Makes Sense
- ✅ Workflows are **data-driven** - most `Ask` steps need structured input
- ✅ Business users need **visual form building** without coding
- ✅ Forms can be **embedded** in BPMN user tasks at runtime
- ✅ Natural extension of Kflow's **human-first** design philosophy

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Kflow Studio UI                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Story Editor │  │ Form Designer │  │  BPMN Diagram   │   │
│  │   (Monaco)   │◄─┤  (Drag-Drop) │─►│   (bpmn-js)     │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│         │                  │                    │            │
└─────────┼──────────────────┼────────────────────┼────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
    ┌─────────────────────────────────────────────────────┐
    │              @kflow/language Compiler                │
    │  ┌──────────┐    ┌───────────┐    ┌──────────┐     │
    │  │ StoryFlow│───►│    IR     │───►│   BPMN   │     │
    │  │  Parser  │    │ (+ Forms) │    │  + Forms │     │
    │  └──────────┘    └───────────┘    └──────────┘     │
    └─────────────────────────────────────────────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
    ┌─────────────────────────────────────────────────────┐
    │              Form Runtime Engine                     │
    │  • Validation  • Conditional Logic  • Multi-step     │
    └─────────────────────────────────────────────────────┘
```

---

## 📐 Design Principles

1. **Forms ARE Part of the Workflow** - Not separate entities
2. **StoryFlow-First** - Forms inferred from `Ask` statements
3. **Visual Override** - Designer lets you enhance auto-generated forms
4. **BPMN Compatible** - Forms embedded in BPMN user tasks
5. **Runtime Agnostic** - Forms exported to JSON Schema + UI Schema

---

## 🔧 Technical Design

### 1. Extended IR Type System

```typescript
// packages/language/src/ir/types.ts

export type FormField = {
  id: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'file' 
    | 'user' | 'usergroup' | 'role'  // 🔥 Dynamic forwarding types
    | 'richtext' | 'markdown'  // 🔥 Rich text capabilities
    | 'repeatable';  // 🔥 NEW: Repeatable section (field array)
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRule[];
  conditional?: ConditionalRule;
  defaultValue?: unknown;
  options?: SelectOption[];  // For select/radio/multiselect
  userSource?: UserSourceConfig;  // For user/usergroup fields
  richTextConfig?: RichTextConfig;  // For richtext/markdown fields
  repeatableConfig?: RepeatableConfig;  // 🔥 NEW: For repeatable sections
  metadata?: Record<string, unknown>;
};

// 🔥 NEW: Repeatable Section Configuration
export type RepeatableConfig = {
  fields: FormField[];  // Fields that repeat for each item
  minItems?: number;  // Minimum number of items (default: 0)
  maxItems?: number;  // Maximum number of items (default: unlimited)
  defaultItems?: number;  // Number of items to show initially (default: 1)
  addButtonText?: string;  // Custom text for "Add" button (default: "Add Item")
  removeButtonText?: string;  // Custom text for "Remove" button (default: "Remove")
  itemLabel?: string | ((index: number) => string);  // Label for each item (e.g., "Family Member {index}")
  collapsible?: boolean;  // Can items be collapsed?
  defaultCollapsed?: boolean;  // Are items collapsed by default?
  confirmDelete?: boolean;  // Show confirmation before deleting?
  reorderable?: boolean;  // Allow drag-and-drop reordering?
  showItemNumbers?: boolean;  // Show item index (1, 2, 3...)
  layout?: 'stacked' | 'table' | 'cards';  // How to display items
  tableColumns?: RepeatableTableColumn[];  // For table layout
};

export type RepeatableTableColumn = {
  fieldId: string;  // Which field to show in this column
  width?: string;  // Column width (e.g., "200px", "30%")
  align?: 'left' | 'center' | 'right';
};

// 🔥 NEW: Rich text editor configuration
export type RichTextConfig = {
  mode: 'wysiwyg' | 'markdown' | 'hybrid';  // Editor mode
  toolbar?: RichTextToolbar;  // Toolbar configuration
  maxLength?: number;  // Character limit
  allowedFormats?: RichTextFormat[];  // Restrict formatting options
  mentionsEnabled?: boolean;  // Enable @mentions for users
  mentionSource?: UserSourceConfig;  // User source for @mentions
  attachmentsEnabled?: boolean;  // Allow inline file attachments
  templatesEnabled?: boolean;  // Enable text templates
  autoSave?: boolean;  // Auto-save drafts
  spellCheck?: boolean;  // Enable spell checking
};

export type RichTextToolbar = {
  show?: boolean;
  position?: 'top' | 'bottom' | 'floating';
  items?: RichTextToolbarItem[];
};

export type RichTextToolbarItem =
  | 'bold' | 'italic' | 'underline' | 'strikethrough'
  | 'heading' | 'heading1' | 'heading2' | 'heading3'
  | 'bulletList' | 'orderedList' | 'blockquote'
  | 'link' | 'image' | 'table'
  | 'code' | 'codeBlock'
  | 'alignLeft' | 'alignCenter' | 'alignRight'
  | 'undo' | 'redo'
  | 'mention' | 'emoji'
  | 'fullscreen';

export type RichTextFormat = 
  | 'bold' | 'italic' | 'underline' | 'strikethrough'
  | 'heading' | 'list' | 'link' | 'image'
  | 'code' | 'table' | 'blockquote';

// 🔥 NEW: User/Group field configuration
export type UserSourceConfig = {
  type: 'api' | 'static' | 'ldap' | 'azure-ad' | 'okta';
  endpoint?: string;  // For API-based lookups
  filter?: Record<string, unknown>;  // Filter users by department, role, etc.
  searchable?: boolean;  // Enable user search
  multiSelect?: boolean;  // Allow multiple user selection
  includeGroups?: boolean;  // Show groups in addition to users
  roleFilter?: string[];  // Only show users with specific roles
};

export type ValidationRule = {
  type: 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: string | number;
  message?: string;
};

export type ConditionalRule = {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: unknown;
};

export type SelectOption = {
  label: string;
  value: string | number;
};

export type FormDefinition = {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  layout?: FormLayout;
  submitLabel?: string;
  cancelLabel?: string;
  
  // 🔥 NEW: Audit Trail & Comments (Oct 2025)
  // See form-audit-and-comments.md for complete implementation
  auditConfig?: FormAuditConfig;
  commentsEnabled?: boolean;
  commentsConfig?: FormCommentsConfig;
};

// 🔥 NEW: Audit Trail Configuration
export interface FormAuditConfig {
  enabled: boolean;  // Enable automatic audit logging
  trackFieldChanges?: boolean;  // Log individual field edits (default: true)
  trackSectionAccess?: boolean;  // Log section views (default: false)
  trackSubmissions?: boolean;  // Log form submissions (default: true)
  trackApprovals?: boolean;  // Log approve/reject/return actions (default: true)
  retentionDays?: number;  // How long to keep audit logs (default: 365)
  visibleTo?: AuditVisibility;  // Who can see audit logs
}

export interface AuditVisibility {
  mode: 'everyone' | 'admins-only' | 'conditional';
  roles?: string[];  // Roles that can view audit trail
  includeRequester?: boolean;  // Can requester see audit?
}

// 🔥 NEW: Comments System Configuration
export interface FormCommentsConfig {
  enabled: boolean;
  location: 'section' | 'form' | 'both';  // Where comments appear
  allowAttachments?: boolean;  // Can attach files to comments
  allowRichText?: boolean;  // Enable rich text (see rich-text-capabilities.md)
  mentionsEnabled?: boolean;  // Enable @mentions
  requireCommentOn?: CommentRequirement[];  // Require comment for certain actions
  visibilityRules?: CommentVisibilityRule[];  // Who sees what comments
}

export interface CommentRequirement {
  action: 'reject' | 'return' | 'approve-with-conditions' | 'custom';
  message?: string;  // Prompt text (e.g., "Please explain why returning")
}

export interface CommentVisibilityRule {
  commentType: 'all' | 'approval-only' | 'internal' | 'external';
  visibleTo: {
    type: 'everyone' | 'role' | 'department' | 'specific-users';
    value?: string | string[];
  };
}

export type FormLayout = {
  type: 'single-column' | 'two-column' | 'grid' | 'wizard';
  sections?: FormSection[];
};

// 🔥 NEW: Enhanced Form Section with Visibility Controls
export type FormSection = {
  id: string;  // Unique section identifier
  title: string;
  description?: string;
  fieldIds: string[];  // Fields in this section (reference FormField.id)
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  order?: number;  // Display order
  visibility?: SectionVisibility;  // Who can see/edit this section (see section-visibility-guide.md)
  
  // 🔥 NEW: Section-specific audit and comments (Oct 2025)
  showAuditTrail?: boolean;  // Show audit trail in this section
  showComments?: boolean;  // Show comments in this section
  requireCommentOnChange?: boolean;  // Require comment when section edited
};

// 🔥 NEW: Section Visibility Rules
export type SectionVisibility = {
  mode: 'everyone' | 'conditional';  // Default: everyone can see
  rules?: VisibilityRule[];  // Applied when mode is 'conditional'
};

export type VisibilityRule = {
  // WHO: User/group this rule applies to
  subject: {
    type: 'user' | 'usergroup' | 'role' | 'department' | 'current-user' | 'form-field';
    value?: string | string[];  // User ID, group ID, role name, etc.
    fieldRef?: string;  // Reference to user/usergroup field (when type='form-field')
    source?: UserSourceConfig;  // How to resolve users/groups
  };
  
  // WHAT: Permission level for this user/group
  permission: 'hidden' | 'visible-readonly' | 'visible-editable';
  
  // WHEN: Optional condition (e.g., only show if status='approved')
  condition?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
    value?: any;
  };
  
  // Priority: Higher priority rules override lower ones (default: 0)
  priority?: number;
};
```

---

## 📋 Section Visibility Use Cases

### Use Case 1: Manager Approval Section

**Scenario**: Employee fills out expense report. Manager section only visible to managers.

```typescript
const expenseForm: FormDefinition = {
  id: 'expense_request',
  title: 'Expense Reimbursement Request',
  fields: [],  // Fields organized in sections below
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'employee_info',
        title: 'Employee Information',
        fieldIds: ['employee_name', 'employee_id', 'department', 'date'],
        visibility: {
          mode: 'everyone'  // Everyone can see this section
        }
      },
      {
        id: 'expense_details',
        title: 'Expense Details',
        fieldIds: ['expense_type', 'amount', 'receipt', 'description'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'current-user', value: 'requester' },
              permission: 'visible-editable'  // Requester can edit
            },
            {
              subject: { type: 'role', value: 'manager' },
              permission: 'visible-readonly'  // Managers can only view
            }
          ]
        }
      },
      {
        id: 'manager_approval',
        title: 'Manager Approval',
        fieldIds: ['approval_status', 'manager_comments', 'approved_amount'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'current-user', value: 'requester' },
              permission: 'hidden'  // Employee cannot see this section
            },
            {
              subject: { type: 'role', value: 'manager' },
              permission: 'visible-editable',  // Manager can edit
              priority: 10
            },
            {
              subject: { type: 'role', value: 'finance' },
              permission: 'visible-readonly',  // Finance can view after approval
              condition: {
                fieldId: 'approval_status',
                operator: 'equals',
                value: 'approved'
              }
            }
          ]
        }
      },
      {
        id: 'finance_processing',
        title: 'Finance Processing',
        fieldIds: ['payment_method', 'transaction_id', 'payment_date'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'department', value: 'finance' },
              permission: 'visible-editable'
            },
            {
              // Everyone else can see after payment is processed
              subject: { type: 'current-user', value: 'requester' },
              permission: 'visible-readonly',
              condition: {
                fieldId: 'payment_date',
                operator: 'exists'
              }
            }
          ]
        }
      },
      {
        id: 'audit_trail',
        title: 'Audit Trail',
        fieldIds: ['created_at', 'updated_at', 'workflow_history'],
        collapsible: true,
        defaultCollapsed: true,
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: ['admin', 'auditor'] },
              permission: 'visible-readonly'  // Admins/auditors can view
            }
          ]
        }
      }
    ]
  }
};
```

**Result**:
- **Employee** sees: Employee Info (edit), Expense Details (edit)
- **Manager** sees: Employee Info (view), Expense Details (view), Manager Approval (edit)
- **Finance** sees: All sections (Manager Approval readonly, Finance Processing edit)
- **Auditor** sees: Everything in readonly mode

---

### Use Case 2: Dynamic Section Based on Form Field

**Scenario**: Show "International Travel" section only if trip type is international.

```typescript
const travelRequestForm: FormDefinition = {
  id: 'travel_request',
  title: 'Travel Request Form',
  fields: [],
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'basic_info',
        title: 'Travel Information',
        fieldIds: ['destination', 'trip_type', 'start_date', 'end_date'],
        visibility: { mode: 'everyone' }
      },
      {
        id: 'international_section',
        title: 'International Travel Requirements',
        fieldIds: ['passport_number', 'visa_required', 'emergency_contact'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'current-user' },
              permission: 'visible-editable',
              condition: {
                fieldId: 'trip_type',
                operator: 'equals',
                value: 'international'
              }
            }
          ]
        }
      },
      {
        id: 'approval_section',
        title: 'Approval',
        fieldIds: ['approver', 'budget_code'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              // Show to person selected in 'approver' field
              subject: { 
                type: 'form-field',
                fieldRef: 'approver'  // Reference to user field
              },
              permission: 'visible-editable'
            }
          ]
        }
      }
    ]
  }
};
```

---

### Use Case 3: Progressive Disclosure (Multi-Stage Form)

**Scenario**: Hiring process where different sections appear at different stages.

```typescript
const hiringForm: FormDefinition = {
  id: 'candidate_evaluation',
  title: 'Candidate Evaluation Form',
  fields: [],
  layout: {
    type: 'wizard',
    sections: [
      {
        id: 'candidate_info',
        title: 'Candidate Information',
        fieldIds: ['name', 'email', 'resume', 'linkedin'],
        visibility: { mode: 'everyone' }
      },
      {
        id: 'screening_notes',
        title: 'Initial Screening',
        fieldIds: ['screening_score', 'screening_notes', 'proceed_to_interview'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'recruiter' },
              permission: 'visible-editable'
            },
            {
              subject: { type: 'role', value: 'hiring_manager' },
              permission: 'visible-readonly'
            }
          ]
        }
      },
      {
        id: 'technical_interview',
        title: 'Technical Interview Feedback',
        fieldIds: ['technical_score', 'coding_assessment', 'interviewer_notes'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'usergroup', value: 'interviewers' },
              permission: 'visible-editable',
              condition: {
                fieldId: 'proceed_to_interview',
                operator: 'equals',
                value: 'yes'
              }
            }
          ]
        }
      },
      {
        id: 'final_decision',
        title: 'Final Decision',
        fieldIds: ['offer_decision', 'salary_offer', 'start_date'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'hiring_manager' },
              permission: 'visible-editable',
              condition: {
                fieldId: 'technical_score',
                operator: 'exists'
              }
            }
          ]
        }
      },
      {
        id: 'compensation_details',
        title: 'Compensation Package',
        fieldIds: ['base_salary', 'equity', 'bonus', 'benefits'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'department', value: 'hr' },
              permission: 'visible-editable'
            },
            {
              subject: { type: 'role', value: 'hiring_manager' },
              permission: 'visible-readonly'
            },
            {
              // Hide from everyone else
              subject: { type: 'current-user' },
              permission: 'hidden'
            }
          ]
        }
      }
    ]
  }
};
```

---

### Use Case 4: Team Collaboration with Mentions

**Scenario**: Project proposal where different teams contribute to different sections.

```typescript
const projectProposalForm: FormDefinition = {
  id: 'project_proposal',
  title: 'New Project Proposal',
  fields: [],
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'project_overview',
        title: 'Project Overview',
        fieldIds: ['project_name', 'owner', 'description', 'goals'],
        visibility: { mode: 'everyone' }
      },
      {
        id: 'technical_requirements',
        title: 'Technical Requirements',
        description: 'Engineering team to complete',
        fieldIds: ['tech_stack', 'architecture_diagram', 'technical_risks'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'department', value: 'engineering' },
              permission: 'visible-editable'
            },
            {
              // Everyone else can view
              subject: { type: 'current-user' },
              permission: 'visible-readonly',
              condition: {
                fieldId: 'tech_stack',
                operator: 'exists'
              }
            }
          ]
        }
      },
      {
        id: 'budget_section',
        title: 'Budget & Resources',
        fieldIds: ['estimated_cost', 'headcount', 'timeline', 'dependencies'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              // Owner can edit
              subject: { type: 'form-field', fieldRef: 'owner' },
              permission: 'visible-editable'
            },
            {
              subject: { type: 'department', value: 'finance' },
              permission: 'visible-editable'
            },
            {
              subject: { type: 'role', value: 'executive' },
              permission: 'visible-readonly'
            }
          ]
        }
      },
      {
        id: 'executive_review',
        title: 'Executive Review',
        fieldIds: ['business_impact', 'strategic_alignment', 'decision'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'executive' },
              permission: 'visible-editable',
              condition: {
                // Only show when budget section is complete
                fieldId: 'estimated_cost',
                operator: 'exists'
              }
            }
          ]
        }
      }
    ]
  }
};
```

---

```typescript

// EXTENDED IRState for userTask
export type IRState =
  | (BaseState & { 
      kind: 'task'; 
      action: string; 
      retry?: Retry; 
      timeout?: number; 
      next?: string 
    })
  | (BaseState & { 
      kind: 'userTask'; 
      prompt: string; 
      assignee?: string; 
      form?: FormDefinition;  // 🔥 NEW: Embedded form
      next?: string 
    })
  // ... other states
```

### 2. Form Inference from StoryFlow

```typescript
// packages/language/src/storyflow/formInference.ts

export function inferFormFromUserTask(prompt: string): FormDefinition {
  /**
   * Parse "Ask customer for {order_details} and {payment_method}"
   * Generate form with 2 fields
   */
  
  const variables = extractVariables(prompt); // Extract {var} patterns
  const fields: FormField[] = variables.map(varName => {
    return {
      id: sanitize(varName),
      type: inferFieldType(varName, prompt),
      label: formatLabel(varName),
      required: true,
      placeholder: generatePlaceholder(varName),
    };
  });
  
  return {
    id: generateFormId(prompt),
    title: extractTitle(prompt) || 'User Input',
    fields,
    layout: { type: 'single-column' },
    submitLabel: 'Submit',
  };
}

function inferFieldType(varName: string, context: string): FormField['type'] {
  const lower = varName.toLowerCase();
  
  // 🔥 NEW: User/role/group inference for dynamic forwarding
  if (lower.includes('assignee') || lower.includes('assigned_to')) return 'user';
  if (lower.includes('approver') || lower.includes('reviewer')) return 'user';
  if (lower.includes('manager') || lower.includes('supervisor')) return 'user';
  if (lower.includes('team') || lower.includes('group') || lower.includes('department')) return 'usergroup';
  if (lower.includes('role')) return 'role';
  
  // 🔥 NEW: Rich text inference
  if (lower.includes('content') || lower.includes('body')) return 'richtext';
  if (lower.includes('message') && context.match(/detailed|formatted|rich/i)) return 'richtext';
  if (lower.includes('document') || lower.includes('article')) return 'richtext';
  if (lower.includes('announcement') || lower.includes('notification_body')) return 'richtext';
  if (lower.includes('requirements') || lower.includes('specifications')) return 'richtext';
  if (lower.includes('feedback') && context.match(/detailed|comprehensive/i)) return 'richtext';
  
  // Smart inference based on variable names
  if (lower.includes('email')) return 'email';
  if (lower.includes('phone')) return 'text'; // Could add 'tel' type
  if (lower.includes('date') || lower.includes('when')) return 'date';
  if (lower.includes('amount') || lower.includes('total') || lower.includes('price')) return 'number';
  if (lower.includes('notes') || lower.includes('description') || lower.includes('comment')) return 'textarea';
  if (lower.includes('approved') || lower.includes('accepted')) return 'checkbox';
  if (lower.includes('status') || lower.includes('category')) return 'select';
  
  // Context analysis for dynamic forwarding
  if (context.match(/forward to|assign to|route to|send to/i)) return 'user';
  if (context.match(/notify team|alert group/i)) return 'usergroup';
  if (context.match(/choose|select|pick/i)) return 'select';
  if (context.match(/detailed|formatted|rich content|with formatting/i)) return 'richtext';
  
  return 'text'; // Default
}
```

### 3. StoryFlow Syntax Extensions

**Option A: Inline Form Definitions** (Simple)
```kflow
Flow: Vacation Request

Ask employee for {vacation_start_date}, {vacation_end_date}, and {reason}
  - vacation_start_date: date, required, "When does your vacation start?"
  - vacation_end_date: date, required, "When does it end?"
  - reason: textarea, optional, "Additional notes"

Do: check remaining vacation balance
If balance_sufficient
  Ask manager to approve vacation request
  Stop
Otherwise
  Send rejection email: "Insufficient vacation balance"
  Stop
```

**Option B: Separate Form Blocks** (Advanced)
```kflow
Flow: Loan Application

Form: LoanApplicationForm
  Title: "Apply for a Loan"
  Fields:
    - loan_amount: number
      Label: "Desired loan amount"
      Min: 1000
      Max: 100000
      Required: true
    - loan_purpose: select
      Label: "Purpose of loan"
      Options: ["Home", "Car", "Business", "Education"]
      Required: true
    - income: number
      Label: "Annual income"
      Required: true
    - employment_status: radio
      Options: ["Employed", "Self-Employed", "Unemployed"]
  Layout: two-column

Ask customer to complete LoanApplicationForm
Do: perform credit check using {income} and {loan_amount}
If credit_score > 700
  Ask loan officer to review application
  Stop
Otherwise
  Send rejection email
  Stop
```

**Option C: External Form References** (Enterprise)
```kflow
Flow: Employee Onboarding

Ask HR to complete form: forms/employee-onboarding.json
Do: create user account with {employee_email}
Ask IT to provision laptop
Wait for background check completion
Send welcome email
Stop
```

### 4. Form Designer Component

```typescript
// packages/studio/src/components/FormDesigner.tsx

import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { FormDefinition, FormField } from '@kflow/language/ir/types';

interface FormDesignerProps {
  userTaskId: string;
  initialForm?: FormDefinition;
  onSave: (form: FormDefinition) => void;
  onCancel: () => void;
}

export const FormDesigner: React.FC<FormDesignerProps> = ({
  userTaskId,
  initialForm,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState<FormDefinition>(
    initialForm ?? createEmptyForm(userTaskId)
  );
  
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  return (
    <div className="form-designer">
      <div className="form-designer-header">
        <h2>Design Form: {form.title}</h2>
        <div className="actions">
          <button onClick={() => onSave(form)}>Save Form</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
      
      <div className="form-designer-body">
        {/* Left Panel: Field Palette */}
        <div className="field-palette">
          <h3>Field Types</h3>
          <FieldPalette onAddField={(type) => addField(form, type)} />
        </div>
        
        {/* Center: Canvas with Drag & Drop */}
        <div className="form-canvas">
          <h3>Form Preview</h3>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.fields.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {form.fields.map(field => (
                <SortableField
                  key={field.id}
                  field={field}
                  isSelected={selectedFieldId === field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  onDelete={() => deleteField(field.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          {form.fields.length === 0 && (
            <div className="empty-state">
              <p>Drag field types here to start building your form</p>
            </div>
          )}
        </div>
        
        {/* Right Panel: Field Properties */}
        <div className="field-properties">
          <h3>Field Properties</h3>
          {selectedFieldId ? (
            <FieldPropertiesEditor
              field={form.fields.find(f => f.id === selectedFieldId)!}
              onChange={(updated) => updateField(selectedFieldId, updated)}
            />
          ) : (
            <div className="empty-state">
              <p>Select a field to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Field Palette Component
const FieldPalette: React.FC<{ onAddField: (type: FormField['type']) => void }> = ({
  onAddField,
}) => {
  const fieldTypes: Array<{ type: FormField['type']; icon: string; label: string }> = [
    { type: 'text', icon: '📝', label: 'Text Input' },
    { type: 'richtext', icon: '📰', label: 'Rich Text Editor' },  // 🔥 NEW
    { type: 'textarea', icon: '📄', label: 'Plain Text Area' },
    { type: 'number', icon: '🔢', label: 'Number' },
    { type: 'email', icon: '📧', label: 'Email' },
    { type: 'date', icon: '📅', label: 'Date' },
    { type: 'select', icon: '📋', label: 'Dropdown' },
    { type: 'multiselect', icon: '☑️', label: 'Multi-Select' },
    { type: 'checkbox', icon: '✅', label: 'Checkbox' },
    { type: 'radio', icon: '🔘', label: 'Radio Buttons' },
    { type: 'user', icon: '👤', label: 'User Picker' },  // 🔥 NEW
    { type: 'usergroup', icon: '�', label: 'User Group' },  // 🔥 NEW
    { type: 'file', icon: '📎', label: 'File Upload' },
  ];
  
  return (
    <div className="field-palette-list">
      {fieldTypes.map(({ type, icon, label }) => (
        <button
          key={type}
          className="field-type-button"
          onClick={() => onAddField(type)}
        >
          <span className="icon">{icon}</span>
          <span className="label">{label}</span>
        </button>
      ))}
    </div>
  );
};
```

### 5. BPMN Integration

```typescript
// packages/language/src/compile/bpmn.ts

// In createElementForState function:
case 'userTask': {
  const element = {
    ...baseElement,
    id: `UserTask_${base}`,
    tag: 'bpmn:userTask',
    name: state.prompt || 'User Input',
  };
  
  // 🔥 NEW: Add form reference as extension element
  if (state.form) {
    element.body = [
      `<bpmn:extensionElements>`,
      `  <kflow:formData>`,
      `    <kflow:formDefinition>${escapeXml(JSON.stringify(state.form))}</kflow:formDefinition>`,
      `  </kflow:formData>`,
      `</bpmn:extensionElements>`,
    ];
  }
  
  return element;
}
```

**BPMN XML Output:**
```xml
<bpmn:userTask id="UserTask_AskCustomer" name="Ask customer for order details">
  <bpmn:extensionElements>
    <kflow:formData>
      <kflow:formDefinition>{
        "id": "order_details_form",
        "title": "Order Information",
        "fields": [
          {
            "id": "order_details",
            "type": "textarea",
            "label": "Order Details",
            "required": true
          },
          {
            "id": "payment_method",
            "type": "select",
            "label": "Payment Method",
            "options": [
              {"label": "Credit Card", "value": "cc"},
              {"label": "PayPal", "value": "paypal"}
            ],
            "required": true
          }
        ]
      }</kflow:formDefinition>
    </kflow:formData>
  </bpmn:extensionElements>
</bpmn:userTask>
```

### 6. Form Runtime Engine

```typescript
// packages/studio/src/components/FormRenderer.tsx

import React from 'react';
import type { FormDefinition } from '@kflow/language/ir/types';

interface FormRendererProps {
  form: FormDefinition;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  form,
  onSubmit,
  onCancel,
  initialData = {},
}) => {
  const [formData, setFormData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }
    
    if (field.validation) {
      for (const rule of field.validation) {
        switch (rule.type) {
          case 'min':
            if (typeof value === 'number' && value < (rule.value as number)) {
              return rule.message ?? `Minimum value is ${rule.value}`;
            }
            break;
          case 'max':
            if (typeof value === 'number' && value > (rule.value as number)) {
              return rule.message ?? `Maximum value is ${rule.value}`;
            }
            break;
          case 'pattern':
            if (typeof value === 'string' && !new RegExp(rule.value as string).test(value)) {
              return rule.message ?? `Invalid format`;
            }
            break;
          case 'email':
            if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return rule.message ?? `Invalid email address`;
            }
            break;
        }
      }
    }
    
    return null;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      if (!shouldShowField(field, formData)) continue; // Skip conditional fields
      
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
  };
  
  const shouldShowField = (field: FormField, data: Record<string, unknown>): boolean => {
    if (!field.conditional) return true;
    
    const { field: condField, operator, value } = field.conditional;
    const condValue = data[condField];
    
    switch (operator) {
      case 'equals':
        return condValue === value;
      case 'notEquals':
        return condValue !== value;
      case 'contains':
        return String(condValue).includes(String(value));
      case 'greaterThan':
        return Number(condValue) > Number(value);
      case 'lessThan':
        return Number(condValue) < Number(value);
      default:
        return true;
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="kflow-form">
      <h2>{form.title}</h2>
      {form.description && <p className="form-description">{form.description}</p>}
      
      {form.fields.map(field => {
        if (!shouldShowField(field, formData)) return null;
        
        return (
          <div key={field.id} className="form-field">
            <label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            
            <FieldInput
              field={field}
              value={formData[field.id]}
              onChange={(value) => {
                setFormData({ ...formData, [field.id]: value });
                setErrors({ ...errors, [field.id]: '' });
              }}
            />
            
            {errors[field.id] && (
              <span className="error-message">{errors[field.id]}</span>
            )}
          </div>
        );
      })}
      
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {form.submitLabel || 'Submit'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            {form.cancelLabel || 'Cancel'}
          </button>
        )}
      </div>
    </form>
  );
};
```

---

## 🎨 UI/UX Flow

### Workflow Designer Experience

```
1. User writes StoryFlow:
   "Ask customer for {order_details} and {payment_method}"

2. Kflow auto-generates basic form:
   ┌─────────────────────────────────┐
   │  Order Details Form             │
   ├─────────────────────────────────┤
   │  Order Details: [text input]    │
   │  Payment Method: [text input]   │
   │  [Submit]                       │
   └─────────────────────────────────┘

3. User clicks "Customize Form" button

4. Form Designer opens:
   ┌──────────────────────────────────────────────────────┐
   │  [Field Types]  │  [Canvas]        │  [Properties]   │
   │  📝 Text        │  Order Details   │  Field Type:    │
   │  🔢 Number      │  [text input]    │  📝 Text Input  │
   │  📧 Email       │                  │                 │
   │  📅 Date        │  Payment Method  │  Label:         │
   │  📋 Dropdown    │  [text input]    │  [Order...   ]  │
   │  ...            │                  │                 │
   │                 │  [Add Field +]   │  Required: ☑️   │
   └──────────────────────────────────────────────────────┘

5. User drags "Dropdown" to replace Payment Method field

6. User configures dropdown options in Properties panel:
   - Credit Card
   - PayPal
   - Bank Transfer

7. User clicks "Save Form"

8. StoryFlow is updated with form metadata
   (stored in IR as form definition)

9. BPMN diagram shows userTask with form icon 📋
```

---

## 🔌 Integration Points

### 1. Studio Main UI

```typescript
// packages/studio/src/app/main.tsx

const [isFormDesignerOpen, setIsFormDesignerOpen] = useState(false);
const [selectedUserTaskId, setSelectedUserTaskId] = useState<string | null>(null);

// When user clicks "Edit Form" button on a userTask in BPMN diagram
const handleEditFormClick = (userTaskId: string) => {
  setSelectedUserTaskId(userTaskId);
  setIsFormDesignerOpen(true);
};

// Form Designer Modal
{isFormDesignerOpen && selectedUserTaskId && (
  <Modal onClose={() => setIsFormDesignerOpen(false)}>
    <FormDesigner
      userTaskId={selectedUserTaskId}
      initialForm={getUserTaskForm(artifacts.ir, selectedUserTaskId)}
      onSave={(form) => {
        updateUserTaskForm(selectedUserTaskId, form);
        recompileWorkflow();
        setIsFormDesignerOpen(false);
      }}
      onCancel={() => setIsFormDesignerOpen(false)}
    />
  </Modal>
)}
```

### 2. BPMN Diagram Interaction

```typescript
// packages/studio/src/components/BpmnDiagram.tsx

// Add context menu to userTask elements
const addContextMenuHandlers = (modeler: any) => {
  const eventBus = modeler.get('eventBus');
  
  eventBus.on('element.contextmenu', (event: any) => {
    if (event.element.type === 'bpmn:UserTask') {
      showContextMenu(event.originalEvent, [
        {
          label: 'Edit Form',
          icon: '📋',
          onClick: () => onEditForm(event.element.businessObject.id),
        },
        {
          label: 'Preview Form',
          icon: '👁️',
          onClick: () => onPreviewForm(event.element.businessObject.id),
        },
      ]);
    }
  });
};
```

---

## 📊 Data Flow

```
┌──────────────────────────────────────────────────────────┐
│  User Action: "Ask customer for {order_details}"         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  StoryFlow Parser extracts variables                     │
│  Result: ["order_details", "payment_method"]             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  Form Inference generates basic FormDefinition           │
│  {                                                        │
│    fields: [                                              │
│      { id: "order_details", type: "text", ... },         │
│      { id: "payment_method", type: "text", ... }         │
│    ]                                                      │
│  }                                                        │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  User opens Form Designer and customizes                 │
│  - Changes payment_method to 'select' type               │
│  - Adds options: ["Credit Card", "PayPal"]               │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  Updated FormDefinition saved to IR                      │
│  userTask state now includes 'form' property             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  BPMN Compiler embeds form in extensionElements          │
│  <kflow:formData>{ form JSON }</kflow:formData>          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  At runtime, FormRenderer reads form from BPMN           │
│  Renders interactive form for end-users                  │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Form Builder Libraries (Choose One)

**Option 1: React Hook Form + Custom UI** ⭐ Recommended
- Pros: Full control, lightweight, excellent validation
- Cons: More custom code needed
```bash
pnpm add react-hook-form zod
```

**Option 2: Formik + Material-UI**
- Pros: Mature, large ecosystem
- Cons: Heavier bundle size

**Option 3: react-jsonschema-form**
- Pros: JSON Schema native, auto-generation
- Cons: Less flexible customization

**Option 4: Survey.js (Commercial)**
- Pros: Feature-rich, professional UI
- Cons: License cost, vendor lock-in

### Drag & Drop

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why @dnd-kit?**
- ✅ Modern, accessible
- ✅ Tree-shakeable
- ✅ TypeScript first
- ✅ 10x smaller than react-dnd

### Validation

```bash
pnpm add zod
```

**Schema-based validation with TypeScript inference:**
```typescript
import { z } from 'zod';

const formSchema = z.object({
  order_details: z.string().min(10, 'Provide more details'),
  payment_method: z.enum(['cc', 'paypal', 'bank']),
  amount: z.number().min(1).max(100000),
});

type FormData = z.infer<typeof formSchema>;
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Extend IR types with FormDefinition
- [ ] Add form inference from userTask prompts
- [ ] Create basic FormRenderer component
- [ ] Update BPMN compiler to include forms in extensionElements
- [ ] Write unit tests for form inference

**Deliverable**: Basic auto-generated forms working

### Phase 2: Designer UI (Week 3-4)
- [ ] Build FormDesigner component with drag-drop
- [ ] Create field palette with all input types
- [ ] Implement field properties editor
- [ ] Add save/cancel/preview functionality
- [ ] Integrate designer into Studio main UI

**Deliverable**: Visual form builder operational

### Phase 3: Advanced Features (Week 5-6)
- [ ] Conditional field visibility
- [ ] Multi-step/wizard forms
- [ ] Custom validation rules
- [ ] Field dependency logic
- [ ] Form sections/grouping
- [ ] File upload support

**Deliverable**: Production-ready form system

### Phase 4: BPMN Integration (Week 7-8)
- [ ] Context menu on userTask elements
- [ ] Form preview in BPMN diagram
- [ ] Form icon badges on userTasks
- [ ] Import/export forms with BPMN
- [ ] Camunda/Flowable compatibility layer

**Deliverable**: Full BPMN workflow integration

### Phase 5: Runtime & Polish (Week 9-10)
- [ ] Form submission handling
- [ ] Validation error messages
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Localization (i18n)

**Deliverable**: Enterprise-grade form system

---

## 💡 Advanced Features (Future)

### 1. AI-First Form Generation ⭐ CORE FEATURE

**Philosophy**: Forms should be generated by AI, not manually built. The designer is for refinement, not creation.

```typescript
// packages/language/src/ai/formGeneration.ts

import type { FormDefinition } from '../ir/types.js';
import type { OpenAI } from 'openai';

export interface FormGenerationOptions {
  userTaskPrompt: string;
  workflowContext: string;
  existingVariables?: Record<string, string>;
  organizationSchema?: OrganizationSchema;  // 🔥 For user/group lookups
}

export interface OrganizationSchema {
  userSource: 'azure-ad' | 'okta' | 'ldap' | 'api';
  userAttributes: string[];  // ['email', 'department', 'role']
  groupAttributes: string[];  // ['name', 'description', 'members']
  roleHierarchy: Record<string, string[]>;  // Manager -> [Team Lead, Developer]
}

export async function generateFormWithAI(
  options: FormGenerationOptions,
  openai: OpenAI
): Promise<FormDefinition> {
  const systemPrompt = `You are an expert form designer for workflow automation systems.

CRITICAL RULES:
1. **AI-First Design**: Generate comprehensive, production-ready forms
2. **User Fields**: When task mentions "assign", "forward", "route", "approver", use type "user" or "usergroup"
3. **Dynamic Forwarding**: User fields enable dynamic task routing based on form input
4. **Smart Inference**: Detect field types from context (email, date, amount, etc.)
5. **Validation**: Add appropriate validation rules for each field type
6. **UX Best Practices**: Group related fields, add helpful placeholders, use conditionals

OUTPUT FORMAT: Valid JSON matching FormDefinition schema
{
  "id": "unique_form_id",
  "title": "Human-friendly form title",
  "description": "What this form collects",
  "fields": [
    {
      "id": "field_id",
      "type": "text|number|email|date|select|user|usergroup|...",
      "label": "Clear label",
      "placeholder": "Helpful hint",
      "required": true/false,
      "validation": [...],
      "userSource": { ... }  // For user/usergroup fields
    }
  ],
  "layout": {
    "type": "single-column|two-column|wizard",
    "sections": [...]
  }
}`;

  const userPrompt = `
Generate a form for this workflow task:
"${options.userTaskPrompt}"

Workflow Context:
${options.workflowContext}

${options.existingVariables ? `
Existing Variables (use these as hints):
${JSON.stringify(options.existingVariables, null, 2)}
` : ''}

${options.organizationSchema ? `
Organization Schema (for user/group fields):
- User Source: ${options.organizationSchema.userSource}
- User Attributes: ${options.organizationSchema.userAttributes.join(', ')}
- Groups Available: ${options.organizationSchema.groupAttributes.join(', ')}
- Roles: ${Object.keys(options.organizationSchema.roleHierarchy).join(', ')}
` : ''}

IMPORTANT:
- If task mentions "assign to", "forward to", "approver", create a "user" field
- If task mentions "team", "group", "department", create a "usergroup" field
- Add smart validation (e.g., min/max for numbers, pattern for emails)
- Use conditional fields when appropriate
- Make the form production-ready, not a prototype
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const formJson = response.choices[0].message.content;
  if (!formJson) {
    throw new Error('AI returned empty response');
  }

  const form = JSON.parse(formJson) as FormDefinition;
  
  // Validate and enrich form
  return validateAndEnrichForm(form, options);
}

function validateAndEnrichForm(
  form: FormDefinition,
  options: FormGenerationOptions
): FormDefinition {
  // Add user source config to user/usergroup fields
  const enrichedFields = form.fields.map(field => {
    if (field.type === 'user' || field.type === 'usergroup') {
      return {
        ...field,
        userSource: field.userSource ?? {
          type: options.organizationSchema?.userSource ?? 'api',
          searchable: true,
          filter: field.type === 'user' 
            ? { active: true }
            : { type: 'team' },
        },
      };
    }
    return field;
  });

  return {
    ...form,
    fields: enrichedFields,
  };
}

// 🔥 Example usage in StoryFlow compiler
export async function enhanceUserTaskWithAI(
  userTask: IRState & { kind: 'userTask' },
  workflowIR: IR,
  openai: OpenAI
): Promise<IRState> {
  const form = await generateFormWithAI({
    userTaskPrompt: userTask.prompt,
    workflowContext: workflowIR.name,
    existingVariables: workflowIR.vars as Record<string, string>,
    organizationSchema: workflowIR.metadata?.organizationSchema,
  }, openai);

  return {
    ...userTask,
    form,
  };
}
```

**Example Prompt → AI Generation:**

```kflow
Ask manager to approve expense and forward to finance team if > $1000
```

**AI Generates:**
```json
{
  "id": "expense_approval_form",
  "title": "Expense Approval Request",
  "description": "Review and approve employee expense claim",
  "fields": [
    {
      "id": "expense_amount",
      "type": "number",
      "label": "Expense Amount ($)",
      "required": true,
      "validation": [
        { "type": "min", "value": 0, "message": "Amount must be positive" }
      ]
    },
    {
      "id": "expense_category",
      "type": "select",
      "label": "Expense Category",
      "required": true,
      "options": [
        { "label": "Travel", "value": "travel" },
        { "label": "Equipment", "value": "equipment" },
        { "label": "Meals", "value": "meals" },
        { "label": "Other", "value": "other" }
      ]
    },
    {
      "id": "approver",
      "type": "user",
      "label": "Approving Manager",
      "required": true,
      "userSource": {
        "type": "azure-ad",
        "filter": { "role": "manager", "department": "same_as_employee" },
        "searchable": true
      }
    },
    {
      "id": "forward_to_finance",
      "type": "usergroup",
      "label": "Forward to Finance Team",
      "required": false,
      "conditional": {
        "field": "expense_amount",
        "operator": "greaterThan",
        "value": 1000
      },
      "userSource": {
        "type": "azure-ad",
        "filter": { "department": "finance" },
        "includeGroups": true
      }
    },
    {
      "id": "notes",
      "type": "textarea",
      "label": "Approval Notes",
      "placeholder": "Add any comments about this expense...",
      "required": false
    }
  ],
  "layout": {
    "type": "single-column"
  }
}
```

**Key Features:**
- ✅ **User field** for dynamic manager assignment
- ✅ **Usergroup field** for finance team forwarding
- ✅ **Conditional logic** (shows finance field only if > $1000)
- ✅ **Smart validation** (positive numbers, required fields)
- ✅ **Organization-aware** (filters by role and department)
```

### 2. Form Templates Library
```typescript
const formTemplates = {
  'contact-form': { title: 'Contact Form', fields: [...] },
  'loan-application': { title: 'Loan Application', fields: [...] },
  'employee-onboarding': { title: 'Employee Onboarding', fields: [...] },
  'customer-feedback': { title: 'Customer Feedback', fields: [...] },
};
```

### 3. Calculated Fields
```typescript
{
  id: 'total_price',
  type: 'number',
  label: 'Total Price',
  readonly: true,
  calculation: {
    formula: '{{quantity}} * {{unit_price}} * (1 + {{tax_rate}})',
    dependencies: ['quantity', 'unit_price', 'tax_rate'],
  }
}
```

### 4. External Data Sources
```typescript
{
  id: 'country',
  type: 'select',
  label: 'Country',
  dataSource: {
    type: 'api',
    url: 'https://api.example.com/countries',
    valueField: 'code',
    labelField: 'name',
  }
}
```

### 5. Form Versioning
```typescript
type FormVersion = {
  version: number;
  createdAt: Date;
  createdBy: string;
  form: FormDefinition;
  changelog: string;
};
```

### 6. Form Analytics
```typescript
type FormAnalytics = {
  formId: string;
  submissions: number;
  completionRate: number;
  avgCompletionTime: number;
  fieldDropoffRates: Record<string, number>;
  validationErrors: Record<string, number>;
};
```

---

## 🔐 Security Considerations

1. **Input Sanitization**
   - All form data must be sanitized before processing
   - Use DOMPurify for rich text fields

2. **File Upload Security**
   - Validate file types and sizes
   - Scan for malware
   - Store in secure blob storage

3. **CSRF Protection**
   - Generate unique form tokens
   - Validate on submission

4. **Rate Limiting**
   - Prevent form submission spam
   - Implement CAPTCHA for public forms

---

## 📦 Package Structure

```
packages/
├── language/
│   └── src/
│       ├── forms/
│       │   ├── inference.ts       # Auto-generate forms from userTask
│       │   ├── validation.ts      # Schema validation with Zod
│       │   ├── templates.ts       # Pre-built form templates
│       │   └── types.ts           # Form type definitions
│       └── ir/
│           └── types.ts           # Extended IR with FormDefinition
│
├── studio/
│   └── src/
│       └── components/
│           ├── FormDesigner/
│           │   ├── FormDesigner.tsx
│           │   ├── FieldPalette.tsx
│           │   ├── FormCanvas.tsx
│           │   ├── FieldPropertiesEditor.tsx
│           │   └── formDesigner.css
│           │
│           ├── FormRenderer/
│           │   ├── FormRenderer.tsx
│           │   ├── FieldInput.tsx
│           │   ├── ValidationMessage.tsx
│           │   └── formRenderer.css
│           │
│           └── FormPreview/
│               └── FormPreview.tsx
```

---

## 🎯 Success Metrics

- ✅ Form generation success rate: >95%
- ✅ Designer load time: <2 seconds
- ✅ Form rendering time: <100ms
- ✅ Mobile responsiveness: 100% touch-friendly
- ✅ Accessibility score: WCAG 2.1 AA compliant
- ✅ User satisfaction: 4.5+ stars

---

## 🤔 Open Questions & Decisions Needed

1. **StoryFlow Syntax**: Which approach? (Inline, Blocks, or External)
2. **Form Storage**: Embed in BPMN XML or separate .json files?
3. **Designer Library**: Custom or use Survey.js/Formik?
4. **Runtime Engine**: Client-side only or backend API?
5. **Export Format**: JSON Schema, OpenAPI forms, or custom?
6. **Pricing Model**: Free tier limits? Pro features?

---

## 📚 References & Inspiration

- **BPMN 2.0 Specification**: User Task Form Properties
- **Camunda Forms**: https://docs.camunda.io/docs/components/modeler/forms/
- **JSON Schema**: https://json-schema.org/
- **React Hook Form**: https://react-hook-form.com/
- **Survey.js**: https://surveyjs.io/
- **Formio**: https://form.io/

---

## 🎬 Next Steps

1. **Review & Feedback**: Team discusses this brainstorm
2. **Prototype**: Build minimal viable form designer in 1 week
3. **User Testing**: Validate UX with 5-10 beta users
4. **Roadmap**: Add to official Kflow roadmap
5. **Documentation**: Create user guide and API docs

---

*Brainstormed by GitHub Copilot*  
*Date: October 14, 2025*  
*Ready for team review and implementation planning* 🚀

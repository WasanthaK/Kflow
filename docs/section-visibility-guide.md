# 🔐 Section Visibility & Permissions Guide

**Project**: Kflow Dynamic Form Designer  
**Feature**: Section-level visibility controls  
**Date**: October 14, 2025

---

## 📑 Table of Contents

### Foundation
- [🎯 Overview](#-overview) - Why section visibility matters
- [🏗️ Architecture](#️-architecture) - Type definitions
- [📊 Permission Levels Explained](#-permission-levels-explained)
  - Hidden
  - Visible (Read-only)
  - Visible (Editable)

### Subject Types
- [🎭 Subject Types](#-subject-types)
  - Specific User
  - User Group
  - Role
  - Department
  - Current User
  - Form Field Reference

### Conditions & Rules
- [⚡ Conditional Visibility](#-conditional-visibility) - Dynamic based on form data
- [🎯 Priority & Conflict Resolution](#-priority--conflict-resolution)
- [🔄 Dynamic Form Field References](#-dynamic-form-field-references)

### Real-World Examples
- [💡 Example 1: Expense Approval](#-example-1-expense-approval-workflow) - 3-stage workflow
- [💡 Example 2: Hiring Process](#-example-2-hiring-process) - Multi-role collaboration
- [💡 Example 3: Project Proposal](#-example-3-project-proposal-with-budget-thresholds) - Budget thresholds

### Implementation
- [🧮 Evaluation Algorithm](#-evaluation-algorithm) - evaluateSectionVisibility()
- [🖥️ Server-Side Implementation](#️-server-side-implementation) - Security enforcement
- [🎨 Client-Side Rendering](#-client-side-rendering) - React components
- [🤖 AI Integration](#-ai-integration) - Automatic generation

### Advanced Topics
- [🔒 Security Best Practices](#-security-best-practices)
- [🧪 Testing Strategy](#-testing-strategy)
- [📊 Performance Optimization](#-performance-optimization)
- [💡 Integration with Audit Trails](#-integration-with-audit-trails)
- [🎯 Next Steps](#-next-steps) - Implementation roadmap
- [🔗 Related Documentation](#-related-documentation)

---

## 🎯 Overview

**Section visibility** enables different users/groups to see different parts of a form with varying permission levels:
- **Hidden**: Section doesn't appear at all
- **Visible (Read-only)**: User can see but not edit
- **Visible (Editable)**: User can view and modify

### Why This Matters

Traditional forms are "one-size-fits-all" - everyone sees everything. Section visibility enables:

1. **Progressive Disclosure**: Show sections as workflow progresses
2. **Role-Based Access**: Different sections for different roles
3. **Privacy**: Hide sensitive data from unauthorized users
4. **Collaboration**: Multiple teams work on same form safely
5. **Audit Compliance**: Separate read/write permissions

---

## 🏗️ Architecture

### Type Definitions

```typescript
export type FormSection = {
  id: string;
  title: string;
  description?: string;
  fieldIds: string[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  order?: number;
  visibility?: SectionVisibility;  // 🔥 NEW
};

export type SectionVisibility = {
  mode: 'everyone' | 'conditional';
  rules?: VisibilityRule[];
};

export type VisibilityRule = {
  // WHO this rule applies to
  subject: {
    type: 'user' | 'usergroup' | 'role' | 'department' | 'current-user' | 'form-field';
    value?: string | string[];
    fieldRef?: string;  // When type='form-field'
    source?: UserSourceConfig;
  };
  
  // WHAT they can do
  permission: 'hidden' | 'visible-readonly' | 'visible-editable';
  
  // WHEN the rule applies
  condition?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
    value?: any;
  };
  
  priority?: number;  // Higher priority = evaluated first
};
```

---

## 📊 Permission Levels Explained

### 1. Hidden
Section completely invisible to user.

```typescript
{
  subject: { type: 'role', value: 'employee' },
  permission: 'hidden'
}
```

**Result**: Section doesn't render, no data sent to client.

### 2. Visible (Read-only)
User sees section but all fields are disabled.

```typescript
{
  subject: { type: 'role', value: 'auditor' },
  permission: 'visible-readonly'
}
```

**Result**: 
```html
<input disabled value="Approved" />
<textarea disabled>Manager notes...</textarea>
```

### 3. Visible (Editable)
User can view and modify fields.

```typescript
{
  subject: { type: 'role', value: 'manager' },
  permission: 'visible-editable'
}
```

**Result**: Full interactive form fields.

---

## 🎭 Subject Types

### 1. Specific User

```typescript
{
  subject: {
    type: 'user',
    value: 'john.smith@company.com',
    source: { type: 'azure-ad' }
  },
  permission: 'visible-editable'
}
```

**Use case**: Assign specific person to edit a section.

### 2. User Group

```typescript
{
  subject: {
    type: 'usergroup',
    value: 'finance-team',
    source: { type: 'azure-ad' }
  },
  permission: 'visible-editable'
}
```

**Use case**: All finance team members can edit budget section.

### 3. Role

```typescript
{
  subject: {
    type: 'role',
    value: ['manager', 'director', 'vp']
  },
  permission: 'visible-editable'
}
```

**Use case**: Anyone with management role can approve.

### 4. Department

```typescript
{
  subject: {
    type: 'department',
    value: 'engineering'
  },
  permission: 'visible-editable'
}
```

**Use case**: Engineering department completes technical section.

### 5. Current User

```typescript
{
  subject: {
    type: 'current-user',
    value: 'requester'  // The person who started the workflow
  },
  permission: 'visible-editable'
}
```

**Use case**: Form requester can edit their own information.

### 6. Form Field Reference (Dynamic!)

```typescript
{
  subject: {
    type: 'form-field',
    fieldRef: 'selected_approver'  // User field in the form
  },
  permission: 'visible-editable'
}
```

**Use case**: Person selected in "approver" field gets access to approval section. This enables **dynamic routing**!

---

## ⚙️ Conditional Visibility

### Show Section Only When Condition Met

```typescript
{
  id: 'international_travel_section',
  title: 'International Travel Details',
  fieldIds: ['passport', 'visa'],
  visibility: {
    mode: 'conditional',
    rules: [
      {
        subject: { type: 'current-user' },
        permission: 'visible-editable',
        condition: {
          fieldId: 'travel_type',
          operator: 'equals',
          value: 'international'
        }
      }
    ]
  }
}
```

**Result**: Section only appears when `travel_type === 'international'`.

### Available Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Field value equals | `status === 'approved'` |
| `not_equals` | Field value not equals | `status !== 'rejected'` |
| `contains` | String/array contains | `tags.includes('urgent')` |
| `not_contains` | String/array doesn't contain | `!tags.includes('draft')` |
| `exists` | Field has value | `approval_date != null` |
| `not_exists` | Field is empty | `payment_date == null` |

---

## 🎯 Real-World Examples

### Example 1: Expense Approval Workflow

```typescript
const expenseForm: FormDefinition = {
  id: 'expense_claim',
  title: 'Expense Reimbursement',
  fields: [
    { id: 'employee_name', type: 'text', label: 'Name' },
    { id: 'amount', type: 'number', label: 'Amount' },
    { id: 'receipt', type: 'file', label: 'Receipt' },
    { id: 'approval_status', type: 'select', label: 'Status', options: [...] },
    { id: 'manager_notes', type: 'textarea', label: 'Manager Notes' },
    { id: 'payment_date', type: 'date', label: 'Payment Date' },
  ],
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'employee_section',
        title: 'Expense Details',
        fieldIds: ['employee_name', 'amount', 'receipt'],
        visibility: { mode: 'everyone' }
      },
      {
        id: 'approval_section',
        title: 'Manager Approval',
        fieldIds: ['approval_status', 'manager_notes'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              // Employee cannot see this section
              subject: { type: 'current-user', value: 'requester' },
              permission: 'hidden'
            },
            {
              // Manager can edit
              subject: { type: 'role', value: 'manager' },
              permission: 'visible-editable',
              priority: 10
            }
          ]
        }
      },
      {
        id: 'payment_section',
        title: 'Payment Processing',
        fieldIds: ['payment_date'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              // Finance edits
              subject: { type: 'department', value: 'finance' },
              permission: 'visible-editable'
            },
            {
              // Employee sees after payment
              subject: { type: 'current-user', value: 'requester' },
              permission: 'visible-readonly',
              condition: {
                fieldId: 'payment_date',
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

**User Experience**:

```
┌─────────────────────────────────────────────────────────┐
│ EMPLOYEE VIEW (Initial)                                 │
├─────────────────────────────────────────────────────────┤
│ ✅ Expense Details (editable)                           │
│    Name: [John Doe                ]                     │
│    Amount: [$150.00              ]                      │
│    Receipt: [Upload...            ]                     │
│                                                         │
│ ⛔ Manager Approval (HIDDEN)                            │
│ ⛔ Payment Processing (HIDDEN)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MANAGER VIEW                                            │
├─────────────────────────────────────────────────────────┤
│ 🔒 Expense Details (read-only)                          │
│    Name: John Doe                                       │
│    Amount: $150.00                                      │
│    Receipt: receipt.pdf                                 │
│                                                         │
│ ✅ Manager Approval (editable)                          │
│    Status: [Approved ▼]                                 │
│    Notes: [Approved for Q4 budget]                      │
│                                                         │
│ ⛔ Payment Processing (HIDDEN)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FINANCE VIEW                                            │
├─────────────────────────────────────────────────────────┤
│ 🔒 Expense Details (read-only)                          │
│ 🔒 Manager Approval (read-only)                         │
│    Status: Approved                                     │
│    Notes: Approved for Q4 budget                        │
│                                                         │
│ ✅ Payment Processing (editable)                        │
│    Payment Date: [2025-10-20]                           │
└─────────────────────────────────────────────────────────┘
```

---

### Example 2: Dynamic Approver Selection

```typescript
const purchaseOrderForm: FormDefinition = {
  id: 'purchase_order',
  title: 'Purchase Order Request',
  fields: [
    { id: 'item', type: 'text', label: 'Item' },
    { id: 'cost', type: 'number', label: 'Cost' },
    { 
      id: 'approver', 
      type: 'user', 
      label: 'Select Approver',
      userSource: { type: 'azure-ad', roleFilter: ['manager', 'director'] }
    },
    { id: 'approval_decision', type: 'select', label: 'Decision' },
  ],
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'request_section',
        title: 'Purchase Request',
        fieldIds: ['item', 'cost', 'approver'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'current-user', value: 'requester' },
              permission: 'visible-editable'
            }
          ]
        }
      },
      {
        id: 'approval_section',
        title: 'Approval Decision',
        fieldIds: ['approval_decision'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              // 🔥 Dynamic: Person selected in 'approver' field can edit
              subject: { 
                type: 'form-field',
                fieldRef: 'approver'
              },
              permission: 'visible-editable'
            },
            {
              // Requester can view after decision
              subject: { type: 'current-user', value: 'requester' },
              permission: 'visible-readonly',
              condition: {
                fieldId: 'approval_decision',
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

**Flow**:
1. Employee creates request, selects manager Sarah as approver
2. Task routes to Sarah → Sarah sees approval section (editable)
3. After Sarah approves → Employee sees approval section (read-only)

---

### Example 3: Conditional Section Based on Amount

```typescript
const invoiceForm: FormDefinition = {
  id: 'invoice_approval',
  title: 'Invoice Approval',
  fields: [
    { id: 'vendor', type: 'text', label: 'Vendor' },
    { id: 'amount', type: 'number', label: 'Amount' },
    { id: 'manager_approval', type: 'select', label: 'Manager Approval' },
    { id: 'director_approval', type: 'select', label: 'Director Approval' },
  ],
  layout: {
    type: 'single-column',
    sections: [
      {
        id: 'invoice_details',
        title: 'Invoice Details',
        fieldIds: ['vendor', 'amount'],
        visibility: { mode: 'everyone' }
      },
      {
        id: 'manager_section',
        title: 'Manager Approval (Required for $1K-$10K)',
        fieldIds: ['manager_approval'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'manager' },
              permission: 'visible-editable',
              // This would require enhanced condition support
              // For now, handle in business logic
            }
          ]
        }
      },
      {
        id: 'director_section',
        title: 'Director Approval (Required for $10K+)',
        fieldIds: ['director_approval'],
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'director' },
              permission: 'visible-editable',
              condition: {
                fieldId: 'manager_approval',
                operator: 'equals',
                value: 'approved'
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

## 💻 Implementation

### 1. Section Visibility Evaluator

```typescript
// packages/studio/src/utils/sectionVisibility.ts

import { FormSection, VisibilityRule } from '@kflow/language/ir/types';

export interface EvaluationContext {
  currentUser: {
    id: string;
    email: string;
    roles: string[];
    department: string;
    groups: string[];
  };
  formData: Record<string, any>;
  requesterId?: string;  // User who started the workflow
}

export type SectionPermission = 'hidden' | 'readonly' | 'editable';

export function evaluateSectionVisibility(
  section: FormSection,
  context: EvaluationContext
): SectionPermission {
  // Default: everyone can edit
  if (!section.visibility || section.visibility.mode === 'everyone') {
    return 'editable';
  }

  const rules = section.visibility.rules ?? [];
  if (rules.length === 0) {
    return 'hidden';  // If conditional but no rules, hide
  }

  // Sort by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => 
    (b.priority ?? 0) - (a.priority ?? 0)
  );

  // Evaluate rules in priority order
  for (const rule of sortedRules) {
    if (doesRuleApply(rule, context)) {
      // Convert permission type to result
      switch (rule.permission) {
        case 'hidden':
          return 'hidden';
        case 'visible-readonly':
          return 'readonly';
        case 'visible-editable':
          return 'editable';
      }
    }
  }

  // No matching rule = hidden by default
  return 'hidden';
}

function doesRuleApply(
  rule: VisibilityRule,
  context: EvaluationContext
): boolean {
  // 1. Check if user matches subject
  if (!userMatchesSubject(rule.subject, context)) {
    return false;
  }

  // 2. Check optional condition
  if (rule.condition) {
    return evaluateCondition(rule.condition, context.formData);
  }

  return true;
}

function userMatchesSubject(
  subject: VisibilityRule['subject'],
  context: EvaluationContext
): boolean {
  const { currentUser, requesterId, formData } = context;

  switch (subject.type) {
    case 'user':
      const userIds = Array.isArray(subject.value) ? subject.value : [subject.value];
      return userIds.includes(currentUser.id) || userIds.includes(currentUser.email);

    case 'usergroup':
      const groupIds = Array.isArray(subject.value) ? subject.value : [subject.value];
      return groupIds.some(groupId => currentUser.groups.includes(groupId));

    case 'role':
      const roles = Array.isArray(subject.value) ? subject.value : [subject.value];
      return roles.some(role => currentUser.roles.includes(role));

    case 'department':
      return currentUser.department === subject.value;

    case 'current-user':
      // Special: 'requester' means the person who started workflow
      if (subject.value === 'requester') {
        return currentUser.id === requesterId;
      }
      return true;  // Current user always matches self

    case 'form-field':
      // Dynamic: Check if current user is selected in a user field
      if (!subject.fieldRef) return false;
      const fieldValue = formData[subject.fieldRef];
      
      if (Array.isArray(fieldValue)) {
        // Multi-select user field
        return fieldValue.some(val => 
          val === currentUser.id || val === currentUser.email
        );
      }
      
      return fieldValue === currentUser.id || fieldValue === currentUser.email;

    default:
      return false;
  }
}

function evaluateCondition(
  condition: VisibilityRule['condition'],
  formData: Record<string, any>
): boolean {
  if (!condition) return true;

  const fieldValue = formData[condition.fieldId];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    
    case 'not_equals':
      return fieldValue !== condition.value;
    
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(String(condition.value));
      }
      return false;
    
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value);
      }
      if (typeof fieldValue === 'string') {
        return !fieldValue.includes(String(condition.value));
      }
      return true;
    
    case 'exists':
      return fieldValue != null && fieldValue !== '' && fieldValue !== [];
    
    case 'not_exists':
      return fieldValue == null || fieldValue === '' || fieldValue.length === 0;
    
    default:
      return false;
  }
}
```

### 2. Enhanced Form Renderer

```typescript
// packages/studio/src/components/FormRenderer.tsx

import React, { useMemo } from 'react';
import { FormDefinition } from '@kflow/language/ir/types';
import { 
  evaluateSectionVisibility, 
  EvaluationContext, 
  SectionPermission 
} from '../utils/sectionVisibility';

interface FormRendererProps {
  form: FormDefinition;
  onSubmit: (data: Record<string, any>) => void;
  currentUser: EvaluationContext['currentUser'];
  requesterId?: string;
  initialData?: Record<string, any>;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  form,
  onSubmit,
  currentUser,
  requesterId,
  initialData = {},
}) => {
  const [formData, setFormData] = React.useState(initialData);

  // Evaluate section permissions whenever formData or user changes
  const sectionPermissions = useMemo(() => {
    const context: EvaluationContext = {
      currentUser,
      requesterId,
      formData,
    };

    const permissions = new Map<string, SectionPermission>();
    
    form.layout?.sections?.forEach(section => {
      permissions.set(
        section.id,
        evaluateSectionVisibility(section, context)
      );
    });

    return permissions;
  }, [form, currentUser, requesterId, formData]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only submit data from visible sections
    const visibleData: Record<string, any> = {};
    
    form.layout?.sections?.forEach(section => {
      const permission = sectionPermissions.get(section.id);
      if (permission !== 'hidden') {
        section.fieldIds.forEach(fieldId => {
          if (formData[fieldId] !== undefined) {
            visibleData[fieldId] = formData[fieldId];
          }
        });
      }
    });

    onSubmit(visibleData);
  };

  return (
    <form onSubmit={handleSubmit} className="kflow-form">
      <h2>{form.title}</h2>
      {form.description && <p>{form.description}</p>}

      {form.layout?.sections?.map(section => {
        const permission = sectionPermissions.get(section.id);
        
        // Don't render hidden sections at all
        if (permission === 'hidden') {
          return null;
        }

        const isReadonly = permission === 'readonly';

        return (
          <div key={section.id} className="form-section">
            <h3>{section.title}</h3>
            {section.description && <p>{section.description}</p>}
            
            {isReadonly && (
              <div className="readonly-badge">🔒 Read-only</div>
            )}

            <div className="section-fields">
              {section.fieldIds.map(fieldId => {
                const field = form.fields.find(f => f.id === fieldId);
                if (!field) return null;

                return (
                  <FieldRenderer
                    key={fieldId}
                    field={field}
                    value={formData[fieldId]}
                    onChange={(value) => handleFieldChange(fieldId, value)}
                    disabled={isReadonly}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="form-actions">
        <button type="submit">
          {form.submitLabel ?? 'Submit'}
        </button>
      </div>
    </form>
  );
};
```

### 3. Styling

```css
/* packages/studio/src/components/FormRenderer.css */

.form-section {
  margin-bottom: 32px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.form-section h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #1e293b;
}

.form-section p {
  margin: 0 0 16px 0;
  color: #64748b;
  font-size: 0.875rem;
}

.readonly-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Read-only styling */
.form-section:has(.readonly-badge) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.form-section:has(.readonly-badge) input,
.form-section:has(.readonly-badge) textarea,
.form-section:has(.readonly-badge) select {
  background: #e2e8f0;
  cursor: not-allowed;
  opacity: 0.7;
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// packages/language/src/__tests__/section-visibility.test.ts

import { describe, it, expect } from 'vitest';
import { 
  evaluateSectionVisibility, 
  EvaluationContext 
} from '../utils/sectionVisibility';

describe('Section Visibility', () => {
  const baseContext: EvaluationContext = {
    currentUser: {
      id: 'user123',
      email: 'john@company.com',
      roles: ['employee'],
      department: 'engineering',
      groups: ['team-a'],
    },
    formData: {},
    requesterId: 'user123',
  };

  it('should return editable for everyone mode', () => {
    const section = {
      id: 'test',
      title: 'Test',
      fieldIds: [],
      visibility: { mode: 'everyone' as const },
    };

    expect(evaluateSectionVisibility(section, baseContext)).toBe('editable');
  });

  it('should hide section when user does not match subject', () => {
    const section = {
      id: 'test',
      title: 'Test',
      fieldIds: [],
      visibility: {
        mode: 'conditional' as const,
        rules: [
          {
            subject: { type: 'role' as const, value: 'manager' },
            permission: 'visible-editable' as const,
          },
        ],
      },
    };

    expect(evaluateSectionVisibility(section, baseContext)).toBe('hidden');
  });

  it('should respect priority order', () => {
    const section = {
      id: 'test',
      title: 'Test',
      fieldIds: [],
      visibility: {
        mode: 'conditional' as const,
        rules: [
          {
            subject: { type: 'role' as const, value: 'employee' },
            permission: 'visible-readonly' as const,
            priority: 1,
          },
          {
            subject: { type: 'role' as const, value: 'employee' },
            permission: 'visible-editable' as const,
            priority: 10,  // Higher priority wins
          },
        ],
      },
    };

    expect(evaluateSectionVisibility(section, baseContext)).toBe('editable');
  });

  it('should evaluate field condition', () => {
    const section = {
      id: 'test',
      title: 'Test',
      fieldIds: [],
      visibility: {
        mode: 'conditional' as const,
        rules: [
          {
            subject: { type: 'current-user' as const },
            permission: 'visible-editable' as const,
            condition: {
              fieldId: 'status',
              operator: 'equals' as const,
              value: 'approved',
            },
          },
        ],
      },
    };

    const contextWithData = {
      ...baseContext,
      formData: { status: 'approved' },
    };

    expect(evaluateSectionVisibility(section, contextWithData)).toBe('editable');
  });

  it('should match form-field subject type', () => {
    const section = {
      id: 'test',
      title: 'Test',
      fieldIds: [],
      visibility: {
        mode: 'conditional' as const,
        rules: [
          {
            subject: { 
              type: 'form-field' as const,
              fieldRef: 'selected_user'
            },
            permission: 'visible-editable' as const,
          },
        ],
      },
    };

    const contextWithData = {
      ...baseContext,
      formData: { selected_user: 'user123' },
    };

    expect(evaluateSectionVisibility(section, contextWithData)).toBe('editable');
  });
});
```

---

## 🚀 AI Generation

Update AI system prompt to generate sections with visibility:

```typescript
const SECTION_AWARE_SYSTEM_PROMPT = `You are an expert form designer.

When generating forms, organize fields into sections with appropriate visibility rules.

SECTION GUIDELINES:
1. Group related fields into logical sections
2. Identify which roles/users should access each section
3. Set appropriate permissions (hidden, readonly, editable)
4. Add conditions for progressive disclosure

VISIBILITY PATTERNS:
- Employee info: everyone can see
- Approval sections: hidden from requester, editable by approver
- Admin sections: only admins can see
- Audit sections: readonly for most, editable for auditors
- Dynamic sections: use form-field type for dynamic routing

EXAMPLE OUTPUT:
{
  "id": "expense_form",
  "title": "Expense Reimbursement",
  "fields": [...],
  "layout": {
    "type": "single-column",
    "sections": [
      {
        "id": "employee_section",
        "title": "Employee Information",
        "fieldIds": ["name", "amount"],
        "visibility": { "mode": "everyone" }
      },
      {
        "id": "approval_section",
        "title": "Manager Approval",
        "fieldIds": ["approval_status"],
        "visibility": {
          "mode": "conditional",
          "rules": [
            {
              "subject": { "type": "role", "value": "manager" },
              "permission": "visible-editable"
            }
          ]
        }
      }
    ]
  }
}
`;
```

---

## 📊 Security Considerations

### 1. Server-Side Validation

**CRITICAL**: Never trust client-side visibility checks!

```typescript
// Server-side validation
export function validateFormSubmission(
  formData: Record<string, any>,
  form: FormDefinition,
  user: User
): ValidationResult {
  const context: EvaluationContext = {
    currentUser: user,
    formData,
  };

  // Check each field
  for (const [fieldId, value] of Object.entries(formData)) {
    // Find which section this field belongs to
    const section = form.layout?.sections?.find(s => 
      s.fieldIds.includes(fieldId)
    );

    if (section) {
      const permission = evaluateSectionVisibility(section, context);
      
      // User cannot submit data for hidden sections
      if (permission === 'hidden') {
        return {
          valid: false,
          error: `Unauthorized access to field ${fieldId}`,
        };
      }
      
      // User cannot modify readonly sections
      if (permission === 'readonly') {
        const originalValue = getOriginalValue(fieldId);
        if (value !== originalValue) {
          return {
            valid: false,
            error: `Cannot modify readonly field ${fieldId}`,
          };
        }
      }
    }
  }

  return { valid: true };
}
```

### 2. Data Filtering

Only send visible data to client:

```typescript
export function filterFormDataForUser(
  form: FormDefinition,
  formData: Record<string, any>,
  user: User
): Record<string, any> {
  const context: EvaluationContext = {
    currentUser: user,
    formData,
  };

  const filteredData: Record<string, any> = {};

  form.layout?.sections?.forEach(section => {
    const permission = evaluateSectionVisibility(section, context);
    
    if (permission !== 'hidden') {
      section.fieldIds.forEach(fieldId => {
        if (formData[fieldId] !== undefined) {
          filteredData[fieldId] = formData[fieldId];
        }
      });
    }
  });

  return filteredData;
}
```

---

## 📈 Performance Optimization

### Memoization

```typescript
import { useMemo } from 'react';

// Memoize evaluation context
const context = useMemo(() => ({
  currentUser,
  requesterId,
  formData,
}), [currentUser, requesterId, formData]);

// Memoize permission calculations
const permissions = useMemo(() => {
  return evaluateAllSectionPermissions(form, context);
}, [form, context]);
```

### Lazy Section Loading

```typescript
const LazySection = React.lazy(() => import('./SectionRenderer'));

{permission !== 'hidden' && (
  <Suspense fallback={<SectionSkeleton />}>
    <LazySection section={section} permission={permission} />
  </Suspense>
)}
```

---

## 🎯 Next Steps

1. **Implement Core Logic** (Week 1)
   - Section visibility evaluator
   - Form renderer integration
   - Server-side validation

2. **UI Enhancements** (Week 2)
   - Visual indicators for readonly sections
   - Permission badges
   - Collapsible sections

3. **AI Integration** (Week 2-3)
   - Update system prompts
   - Train on examples
   - Test generation

4. **Testing & Security** (Week 3-4)
   - Unit tests
   - Integration tests
   - Security audit
   - Performance testing

---

## 🔗 Related Documentation

- **[form-audit-and-comments.md](./form-audit-and-comments.md)** - Section-specific audit trails and comments that respect visibility permissions
- **[rich-text-capabilities.md](./rich-text-capabilities.md)** - Rich text fields can have section-level visibility controls
- **[repeatable-sections-guide.md](./repeatable-sections-guide.md)** - Repeatable sections can have their own visibility rules
- **[form-designer-brainstorm.md](./form-designer-brainstorm.md)** - Complete IR type system including SectionVisibility

---

## 💡 Integration with Audit Trails

Section visibility controls who can see audit trails and post comments ([form-audit-and-comments.md](./form-audit-and-comments.md)):

```typescript
{
  id: 'approval_section',
  title: 'Manager Approval',
  showAuditTrail: true,  // Show history
  showComments: true,    // Allow comments
  visibility: {
    mode: 'conditional',
    rules: [
      {
        subject: { type: 'role', value: 'manager' },
        permission: 'visible-editable'  // Can edit and comment
      },
      {
        subject: { type: 'role', value: 'auditor' },
        permission: 'visible-readonly'  // Can view history, no comments
      },
      {
        subject: { type: 'role', value: 'employee' },
        permission: 'hidden'  // No access to approval section
      }
    ]
  }
}
```

**Key Considerations**:
- Audit trails only visible if section is visible
- Comment posting requires `visible-editable` permission
- Server-side filters prevent data leakage

---

*Section visibility: Because not everyone should see everything! 🔐*

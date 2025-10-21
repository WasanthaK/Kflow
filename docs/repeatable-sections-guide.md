# 🔄 Repeatable Sections Guide

**Project**: Kflow Dynamic Form Designer  
**Feature**: Dynamic Repeatable Sections (Field Arrays)  
**Date**: October 14, 2025

---

## 📑 Table of Contents

### Foundation
- [🎯 Overview](#-overview) - What are repeatable sections?
- [🏗️ Type Definition](#️-type-definition) - RepeatableConfig schema
- [🎨 Layout Options](#-layout-options)
  - Stacked layout (complex items)
  - Table layout (simple items)
  - Cards layout (visual items)

### Real-World Examples
- [📋 Example 1: Visa Application](#-example-1-visa-application-family-members) - Family members (stacked)
- [🧾 Example 2: Invoice](#-example-2-invoice-line-items) - Line items with calculations (table)
- [💰 Example 3: Expense Report](#-example-3-expense-report-with-receipts) - Multiple expenses (stacked)
- [👥 Example 4: Project Team](#-example-4-project-team-with-reordering) - Drag-and-drop members (cards)

### Implementation
- [💻 React Implementation](#-react-implementation)
  - RepeatableField component
  - RepeatableItem component
  - Add/remove/reorder logic
- [🎨 CSS Styling](#-css-styling) - Complete styles for all layouts
- [🤖 AI Generation](#-ai-generation) - Detection patterns

### Advanced Features
- [🧮 Advanced Features](#-advanced-features)
  - Calculated fields
  - Conditional fields within items
  - Nested repeatable sections
- [📊 Data Structure](#-data-structure) - Submitted JSON format
- [🚀 Implementation Roadmap](#-implementation-roadmap) - 4-week plan

---

## 🎯 Overview

**Repeatable sections** enable users to add/remove dynamic rows of structured data within a form. Think:
- 📋 Invoice line items
- 👨‍👩‍👧‍👦 Family members in visa application
- 💰 Multiple expenses in expense report
- 👥 Team members in project proposal
- 📦 Order items in purchase order

### Why This Matters

Without repeatable sections:
- ❌ Forms limited to fixed number of items
- ❌ Need separate forms for each scenario (1 member, 2 members, etc.)
- ❌ Poor UX with excessive fields

With repeatable sections:
- ✅ Users add exactly what they need
- ✅ One form handles any quantity
- ✅ Clean, intuitive interface
- ✅ Data structured as arrays

---

## 🏗️ Type Definition

```typescript
export type FormField = {
  id: string;
  type: 'text' | 'number' | 'date' | 'select' | 'user' | 'repeatable';  // Added 'repeatable'
  label: string;
  // ... other properties
  repeatableConfig?: RepeatableConfig;  // For repeatable type
};

export type RepeatableConfig = {
  // Schema: What fields repeat?
  fields: FormField[];  // Array of field definitions
  
  // Constraints
  minItems?: number;  // Min items required (default: 0)
  maxItems?: number;  // Max items allowed (default: unlimited)
  defaultItems?: number;  // Initial items to show (default: 1)
  
  // Customization
  addButtonText?: string;  // "Add Another" text
  removeButtonText?: string;  // "Remove" text
  itemLabel?: string | ((index: number) => string);  // "Item {index}" or custom
  
  // UI Options
  collapsible?: boolean;  // Can collapse/expand items?
  defaultCollapsed?: boolean;  // Start collapsed?
  confirmDelete?: boolean;  // Confirm before removing?
  reorderable?: boolean;  // Drag-and-drop reorder?
  showItemNumbers?: boolean;  // Show "1, 2, 3..."
  
  // Layout
  layout?: 'stacked' | 'table' | 'cards';  // Display style
  tableColumns?: RepeatableTableColumn[];  // For table layout
};

export type RepeatableTableColumn = {
  fieldId: string;
  width?: string;  // "200px" or "30%"
  align?: 'left' | 'center' | 'right';
};
```

---

## 🎨 Layout Options

### 1. Stacked Layout (Default)

Each item displayed as a card, stacked vertically.

**Best for**: Complex items with many fields (5+ fields per item)

```typescript
{
  id: 'family_members',
  type: 'repeatable',
  label: 'Family Members',
  repeatableConfig: {
    layout: 'stacked',
    fields: [
      { id: 'name', type: 'text', label: 'Full Name' },
      { id: 'dob', type: 'date', label: 'Date of Birth' },
      { id: 'relationship', type: 'select', label: 'Relationship', options: [...] },
      { id: 'passport', type: 'text', label: 'Passport Number' },
      { id: 'photo', type: 'file', label: 'Photo' }
    ],
    itemLabel: (index) => `Family Member ${index + 1}`,
    collapsible: true,
    addButtonText: 'Add Family Member'
  }
}
```

**Renders as**:
```
┌─────────────────────────────────────────────────────┐
│ Family Members                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 👤 Family Member 1               [−][🗑️]     │   │
│ ├─────────────────────────────────────────────┤   │
│ │ Full Name: [John Smith              ]       │   │
│ │ Date of Birth: [1990-05-15]                 │   │
│ │ Relationship: [Spouse ▼]                    │   │
│ │ Passport: [AB1234567        ]               │   │
│ │ Photo: [📎 passport.jpg] [Upload]           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 👤 Family Member 2               [−][🗑️]     │   │
│ ├─────────────────────────────────────────────┤   │
│ │ Full Name: [Sarah Smith             ]       │   │
│ │ Date of Birth: [2015-08-22]                 │   │
│ │ Relationship: [Child ▼]                     │   │
│ │ Passport: [CD9876543        ]               │   │
│ │ Photo: [Upload...        ]                  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [+ Add Family Member]                               │
└─────────────────────────────────────────────────────┘
```

---

### 2. Table Layout

Compact tabular display for simple items.

**Best for**: Simple items with 2-5 fields, read-heavy scenarios

```typescript
{
  id: 'invoice_items',
  type: 'repeatable',
  label: 'Invoice Line Items',
  repeatableConfig: {
    layout: 'table',
    fields: [
      { id: 'description', type: 'text', label: 'Description' },
      { id: 'quantity', type: 'number', label: 'Qty' },
      { id: 'unit_price', type: 'number', label: 'Unit Price' },
      { id: 'amount', type: 'number', label: 'Amount', readOnly: true }  // Calculated
    ],
    tableColumns: [
      { fieldId: 'description', width: '40%' },
      { fieldId: 'quantity', width: '15%', align: 'center' },
      { fieldId: 'unit_price', width: '20%', align: 'right' },
      { fieldId: 'amount', width: '20%', align: 'right' }
    ],
    addButtonText: 'Add Line Item',
    showItemNumbers: true
  }
}
```

**Renders as**:
```
┌───────────────────────────────────────────────────────────────┐
│ Invoice Line Items                                            │
├───┬────────────────────┬────────┬────────────┬───────────┬───┤
│ # │ Description        │  Qty   │ Unit Price │   Amount  │   │
├───┼────────────────────┼────────┼────────────┼───────────┼───┤
│ 1 │ [Consulting Svc  ] │ [10  ] │ [$150.00 ] │ $1,500.00 │🗑️ │
│ 2 │ [Software License] │ [5   ] │ [$99.00  ] │   $495.00 │🗑️ │
│ 3 │ [Travel Expenses ] │ [1   ] │ [$350.00 ] │   $350.00 │🗑️ │
├───┴────────────────────┴────────┴────────────┴───────────┴───┤
│                                          Total: $2,345.00     │
│ [+ Add Line Item]                                             │
└───────────────────────────────────────────────────────────────┘
```

---

### 3. Cards Layout

Visual card-based display with thumbnails.

**Best for**: Items with images, visual hierarchy

```typescript
{
  id: 'team_members',
  type: 'repeatable',
  label: 'Project Team',
  repeatableConfig: {
    layout: 'cards',
    fields: [
      { id: 'member', type: 'user', label: 'Team Member' },
      { id: 'role', type: 'select', label: 'Role', options: [...] },
      { id: 'allocation', type: 'number', label: 'Allocation %' }
    ],
    itemLabel: (index) => `Member ${index + 1}`,
    reorderable: true,
    addButtonText: 'Add Team Member'
  }
}
```

**Renders as**:
```
┌─────────────────────────────────────────────────────────────┐
│ Project Team                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│ │ 👤          │  │ 👤          │  │ 👤          │        │
│ │ John Smith  │  │ Sarah Lee   │  │ Mike Chen   │        │
│ │             │  │             │  │             │        │
│ │ Lead Dev    │  │ Designer    │  │ Backend Dev │        │
│ │ 100%        │  │ 50%         │  │ 75%         │        │
│ │             │  │             │  │             │        │
│ │    [Edit]   │  │    [Edit]   │  │    [Edit]   │        │
│ │   [Remove]  │  │   [Remove]  │  │   [Remove]  │        │
│ └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│                      [+ Add Team Member]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Real-World Examples

### Example 1: Visa Application (Family Members)

```typescript
const visaApplicationForm: FormDefinition = {
  id: 'visa_application',
  title: 'Visa Application Form',
  fields: [
    // Primary applicant fields
    { id: 'applicant_name', type: 'text', label: 'Full Name', required: true },
    { id: 'passport_number', type: 'text', label: 'Passport Number', required: true },
    { id: 'nationality', type: 'select', label: 'Nationality', options: [...] },
    
    // 🔥 Repeatable family members
    {
      id: 'family_members',
      type: 'repeatable',
      label: 'Family Members (if traveling together)',
      repeatableConfig: {
        layout: 'stacked',
        fields: [
          { id: 'full_name', type: 'text', label: 'Full Name', required: true },
          { id: 'dob', type: 'date', label: 'Date of Birth', required: true },
          { 
            id: 'relationship', 
            type: 'select', 
            label: 'Relationship to Applicant',
            required: true,
            options: [
              { label: 'Spouse', value: 'spouse' },
              { label: 'Child', value: 'child' },
              { label: 'Parent', value: 'parent' },
              { label: 'Sibling', value: 'sibling' }
            ]
          },
          { id: 'passport_number', type: 'text', label: 'Passport Number', required: true },
          { id: 'nationality', type: 'select', label: 'Nationality', options: [...] },
          { 
            id: 'passport_photo', 
            type: 'file', 
            label: 'Passport Photo',
            validation: [
              { type: 'fileType', value: ['image/jpeg', 'image/png'] },
              { type: 'fileSize', value: 5 * 1024 * 1024 }  // 5MB
            ]
          }
        ],
        minItems: 0,
        maxItems: 10,
        defaultItems: 0,
        itemLabel: (index) => `Family Member ${index + 1}`,
        addButtonText: 'Add Family Member',
        removeButtonText: 'Remove',
        collapsible: true,
        defaultCollapsed: false,
        confirmDelete: true,
        showItemNumbers: true
      }
    }
  ]
};
```

**Data Structure** (submitted as):
```json
{
  "applicant_name": "John Smith",
  "passport_number": "AB123456",
  "nationality": "USA",
  "family_members": [
    {
      "full_name": "Jane Smith",
      "dob": "1992-03-15",
      "relationship": "spouse",
      "passport_number": "AB123457",
      "nationality": "USA",
      "passport_photo": "file-id-123"
    },
    {
      "full_name": "Tommy Smith",
      "dob": "2015-07-20",
      "relationship": "child",
      "passport_number": "AB123458",
      "nationality": "USA",
      "passport_photo": "file-id-124"
    }
  ]
}
```

---

### Example 2: Invoice (Line Items with Calculations)

```typescript
const invoiceForm: FormDefinition = {
  id: 'create_invoice',
  title: 'Create Invoice',
  fields: [
    { id: 'client_name', type: 'text', label: 'Client Name', required: true },
    { id: 'invoice_date', type: 'date', label: 'Invoice Date', required: true },
    { id: 'due_date', type: 'date', label: 'Due Date', required: true },
    
    // 🔥 Repeatable line items
    {
      id: 'line_items',
      type: 'repeatable',
      label: 'Line Items',
      required: true,
      repeatableConfig: {
        layout: 'table',
        fields: [
          { 
            id: 'description', 
            type: 'text', 
            label: 'Description',
            placeholder: 'e.g., Consulting services',
            required: true
          },
          { 
            id: 'quantity', 
            type: 'number', 
            label: 'Quantity',
            defaultValue: 1,
            required: true,
            validation: [{ type: 'min', value: 1 }]
          },
          { 
            id: 'unit_price', 
            type: 'number', 
            label: 'Unit Price',
            required: true,
            validation: [{ type: 'min', value: 0 }]
          },
          { 
            id: 'amount', 
            type: 'number', 
            label: 'Amount',
            readOnly: true,
            computed: 'quantity * unit_price'  // Calculated field
          }
        ],
        tableColumns: [
          { fieldId: 'description', width: '40%', align: 'left' },
          { fieldId: 'quantity', width: '15%', align: 'center' },
          { fieldId: 'unit_price', width: '20%', align: 'right' },
          { fieldId: 'amount', width: '20%', align: 'right' }
        ],
        minItems: 1,
        maxItems: 50,
        defaultItems: 1,
        addButtonText: 'Add Line Item',
        showItemNumbers: true,
        reorderable: false
      }
    },
    
    // Calculated totals
    { 
      id: 'subtotal', 
      type: 'number', 
      label: 'Subtotal',
      readOnly: true,
      computed: 'SUM(line_items.amount)'
    },
    { 
      id: 'tax_rate', 
      type: 'number', 
      label: 'Tax Rate (%)',
      defaultValue: 0
    },
    { 
      id: 'tax_amount', 
      type: 'number', 
      label: 'Tax Amount',
      readOnly: true,
      computed: 'subtotal * (tax_rate / 100)'
    },
    { 
      id: 'total', 
      type: 'number', 
      label: 'Total',
      readOnly: true,
      computed: 'subtotal + tax_amount'
    }
  ]
};
```

---

### Example 3: Expense Report (Multiple Expenses)

```typescript
const expenseReportForm: FormDefinition = {
  id: 'expense_report',
  title: 'Monthly Expense Report',
  fields: [
    { id: 'employee_name', type: 'text', label: 'Employee Name' },
    { id: 'department', type: 'select', label: 'Department', options: [...] },
    { id: 'month', type: 'date', label: 'Report Month' },
    
    // 🔥 Repeatable expenses
    {
      id: 'expenses',
      type: 'repeatable',
      label: 'Expenses',
      required: true,
      repeatableConfig: {
        layout: 'stacked',
        fields: [
          { 
            id: 'expense_date', 
            type: 'date', 
            label: 'Date',
            required: true
          },
          { 
            id: 'category', 
            type: 'select', 
            label: 'Category',
            required: true,
            options: [
              { label: 'Travel', value: 'travel' },
              { label: 'Meals', value: 'meals' },
              { label: 'Office Supplies', value: 'supplies' },
              { label: 'Software', value: 'software' },
              { label: 'Other', value: 'other' }
            ]
          },
          { 
            id: 'merchant', 
            type: 'text', 
            label: 'Merchant/Vendor',
            required: true
          },
          { 
            id: 'amount', 
            type: 'number', 
            label: 'Amount',
            required: true,
            validation: [{ type: 'min', value: 0.01 }]
          },
          { 
            id: 'description', 
            type: 'textarea', 
            label: 'Description',
            placeholder: 'What was this expense for?',
            required: true
          },
          { 
            id: 'receipt', 
            type: 'file', 
            label: 'Receipt',
            required: true,
            validation: [
              { type: 'fileType', value: ['image/*', 'application/pdf'] }
            ]
          }
        ],
        minItems: 1,
        maxItems: 100,
        defaultItems: 1,
        itemLabel: (index) => `Expense #${index + 1}`,
        addButtonText: 'Add Another Expense',
        collapsible: true,
        defaultCollapsed: false,
        confirmDelete: true,
        showItemNumbers: true
      }
    },
    
    { 
      id: 'total_amount', 
      type: 'number', 
      label: 'Total Amount',
      readOnly: true,
      computed: 'SUM(expenses.amount)'
    }
  ]
};
```

---

### Example 4: Project Team (Drag-and-Drop Reordering)

```typescript
const projectProposalForm: FormDefinition = {
  id: 'project_proposal',
  title: 'New Project Proposal',
  fields: [
    { id: 'project_name', type: 'text', label: 'Project Name', required: true },
    { id: 'description', type: 'richtext', label: 'Description' },
    
    // 🔥 Repeatable team members with reordering
    {
      id: 'team_members',
      type: 'repeatable',
      label: 'Project Team',
      repeatableConfig: {
        layout: 'cards',
        fields: [
          { 
            id: 'member', 
            type: 'user', 
            label: 'Team Member',
            required: true,
            userSource: { type: 'azure-ad', searchable: true }
          },
          { 
            id: 'role', 
            type: 'select', 
            label: 'Role',
            required: true,
            options: [
              { label: 'Project Manager', value: 'pm' },
              { label: 'Tech Lead', value: 'tech_lead' },
              { label: 'Developer', value: 'developer' },
              { label: 'Designer', value: 'designer' },
              { label: 'QA Engineer', value: 'qa' }
            ]
          },
          { 
            id: 'allocation', 
            type: 'number', 
            label: 'Allocation (%)',
            required: true,
            validation: [
              { type: 'min', value: 0 },
              { type: 'max', value: 100 }
            ]
          },
          { 
            id: 'start_date', 
            type: 'date', 
            label: 'Start Date'
          }
        ],
        minItems: 1,
        maxItems: 20,
        defaultItems: 1,
        itemLabel: (index) => `Team Member ${index + 1}`,
        addButtonText: 'Add Team Member',
        collapsible: false,
        reorderable: true,  // 🔥 Enable drag-and-drop
        confirmDelete: true
      }
    }
  ]
};
```

---

## 💻 Implementation

### 1. React Component

```typescript
// packages/studio/src/components/RepeatableField.tsx

import React, { useState } from 'react';
import { FormField, RepeatableConfig } from '@kflow/language/ir/types';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FieldRenderer } from './FieldRenderer';

interface RepeatableFieldProps {
  field: FormField & { type: 'repeatable' };
  value: any[];  // Array of items
  onChange: (value: any[]) => void;
  disabled?: boolean;
}

export const RepeatableField: React.FC<RepeatableFieldProps> = ({
  field,
  value = [],
  onChange,
  disabled,
}) => {
  const config = field.repeatableConfig!;
  const [items, setItems] = useState<any[]>(
    value.length > 0 
      ? value 
      : Array(config.defaultItems ?? 1).fill(null).map(() => ({}))
  );

  // Drag-and-drop sensors
  const sensors = useSensors(useSensor(PointerSensor));

  const handleAddItem = () => {
    if (config.maxItems && items.length >= config.maxItems) {
      alert(`Maximum ${config.maxItems} items allowed`);
      return;
    }

    const newItems = [...items, {}];
    setItems(newItems);
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (config.minItems && items.length <= config.minItems) {
      alert(`Minimum ${config.minItems} items required`);
      return;
    }

    if (config.confirmDelete) {
      if (!confirm('Are you sure you want to remove this item?')) {
        return;
      }
    }

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(newItems);
  };

  const handleItemChange = (index: number, fieldId: string, fieldValue: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [fieldId]: fieldValue };
    setItems(newItems);
    onChange(newItems);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((_, i) => i === active.id);
      const newIndex = items.findIndex((_, i) => i === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onChange(newItems);
    }
  };

  const getItemLabel = (index: number): string => {
    if (typeof config.itemLabel === 'function') {
      return config.itemLabel(index);
    }
    return config.itemLabel ?? `Item ${index + 1}`;
  };

  // Render based on layout
  if (config.layout === 'table') {
    return (
      <div className="repeatable-field repeatable-table">
        <label>{field.label}</label>
        
        <table>
          <thead>
            <tr>
              {config.showItemNumbers && <th>#</th>}
              {config.fields.map(f => (
                <th key={f.id}>{f.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                {config.showItemNumbers && <td>{index + 1}</td>}
                {config.fields.map(subField => (
                  <td key={subField.id}>
                    <FieldRenderer
                      field={subField}
                      value={item[subField.id]}
                      onChange={(value) => handleItemChange(index, subField.id, value)}
                      disabled={disabled}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={disabled || (config.minItems && items.length <= config.minItems)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!config.maxItems || items.length < config.maxItems) && (
          <button
            type="button"
            onClick={handleAddItem}
            disabled={disabled}
            className="add-item-button"
          >
            ➕ {config.addButtonText ?? 'Add Item'}
          </button>
        )}
      </div>
    );
  }

  // Stacked or Cards layout
  const content = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((_, i) => i)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <RepeatableItem
            key={index}
            index={index}
            item={item}
            label={getItemLabel(index)}
            fields={config.fields}
            collapsible={config.collapsible}
            defaultCollapsed={config.defaultCollapsed}
            reorderable={config.reorderable}
            onRemove={() => handleRemoveItem(index)}
            onChange={(fieldId, value) => handleItemChange(index, fieldId, value)}
            disabled={disabled}
            canRemove={!config.minItems || items.length > config.minItems}
          />
        ))}
      </SortableContext>
    </DndContext>
  );

  return (
    <div className={`repeatable-field repeatable-${config.layout ?? 'stacked'}`}>
      <label>{field.label}</label>
      
      {content}

      {(!config.maxItems || items.length < config.maxItems) && (
        <button
          type="button"
          onClick={handleAddItem}
          disabled={disabled}
          className="add-item-button"
        >
          ➕ {config.addButtonText ?? 'Add Item'}
        </button>
      )}
    </div>
  );
};

// Individual repeatable item component
interface RepeatableItemProps {
  index: number;
  item: any;
  label: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  reorderable?: boolean;
  onRemove: () => void;
  onChange: (fieldId: string, value: any) => void;
  disabled?: boolean;
  canRemove: boolean;
}

const RepeatableItem: React.FC<RepeatableItemProps> = ({
  index,
  item,
  label,
  fields,
  collapsible,
  defaultCollapsed,
  reorderable,
  onRemove,
  onChange,
  disabled,
  canRemove,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  return (
    <div className="repeatable-item">
      <div className="repeatable-item-header">
        {reorderable && <span className="drag-handle">⋮⋮</span>}
        
        <span className="item-label">{label}</span>
        
        <div className="item-actions">
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button"
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
          
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || !canRemove}
            className="remove-button"
          >
            🗑️
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="repeatable-item-fields">
          {fields.map(field => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={item[field.id]}
              onChange={(value) => onChange(field.id, value)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 2. Styling

```css
/* packages/studio/src/components/RepeatableField.css */

.repeatable-field {
  margin-bottom: 24px;
}

.repeatable-field > label {
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1e293b;
}

/* Stacked Layout */
.repeatable-stacked .repeatable-item {
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.repeatable-item-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 8px 8px 0 0;
}

.drag-handle {
  cursor: grab;
  color: #94a3b8;
  margin-right: 8px;
  font-size: 18px;
}

.drag-handle:active {
  cursor: grabbing;
}

.item-label {
  flex: 1;
  font-weight: 500;
  color: #475569;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.collapse-button,
.remove-button {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
  border-radius: 4px;
}

.collapse-button:hover,
.remove-button:hover {
  background: #e2e8f0;
}

.remove-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.repeatable-item-fields {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Table Layout */
.repeatable-table table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.repeatable-table th {
  background: #f8fafc;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
}

.repeatable-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.repeatable-table tbody tr:last-child td {
  border-bottom: none;
}

.repeatable-table tbody tr:hover {
  background: #f8fafc;
}

/* Cards Layout */
.repeatable-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.repeatable-cards .repeatable-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}

/* Add Button */
.add-item-button {
  margin-top: 12px;
  padding: 10px 20px;
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.add-item-button:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.add-item-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 🤖 AI Generation

Update AI system prompt to detect repeatable sections:

```typescript
const REPEATABLE_AWARE_SYSTEM_PROMPT = `You are an expert form designer.

REPEATABLE SECTION DETECTION:
Detect when user mentions:
- "multiple", "several", "list of", "add more"
- "family members", "line items", "expenses", "team members"
- "each", "per item", "for each"
- Quantities that vary: "invoice items", "participants", "dependents"

When detected, use type: 'repeatable' with appropriate config.

LAYOUT SELECTION:
- Use 'table' for: invoices, orders, simple lists (2-5 fields)
- Use 'stacked' for: complex items (5+ fields), items with files
- Use 'cards' for: visual items, team members, products

EXAMPLE INPUT: "Create expense report with multiple expenses"

EXAMPLE OUTPUT:
{
  "fields": [
    {
      "id": "expenses",
      "type": "repeatable",
      "label": "Expenses",
      "repeatableConfig": {
        "layout": "stacked",
        "fields": [
          { "id": "date", "type": "date", "label": "Date" },
          { "id": "category", "type": "select", "label": "Category" },
          { "id": "amount", "type": "number", "label": "Amount" },
          { "id": "receipt", "type": "file", "label": "Receipt" }
        ],
        "minItems": 1,
        "addButtonText": "Add Expense",
        "itemLabel": (i) => \`Expense #\${i + 1}\`
      }
    }
  ]
}
`;
```

---

## 🎯 Advanced Features

### 1. Calculated Fields

```typescript
{
  id: 'line_items',
  type: 'repeatable',
  repeatableConfig: {
    fields: [
      { id: 'quantity', type: 'number' },
      { id: 'unit_price', type: 'number' },
      { 
        id: 'total', 
        type: 'number',
        computed: 'quantity * unit_price',  // Auto-calculate
        readOnly: true
      }
    ]
  }
}
```

### 2. Conditional Fields Within Items

```typescript
{
  id: 'attendees',
  type: 'repeatable',
  repeatableConfig: {
    fields: [
      { id: 'name', type: 'text' },
      { id: 'dietary', type: 'select', options: ['None', 'Vegetarian', 'Vegan', 'Other'] },
      { 
        id: 'dietary_notes',
        type: 'textarea',
        conditional: {
          field: 'dietary',
          operator: 'equals',
          value: 'Other'
        }
      }
    ]
  }
}
```

### 3. Nested Repeatable Sections

```typescript
{
  id: 'projects',
  type: 'repeatable',
  repeatableConfig: {
    fields: [
      { id: 'project_name', type: 'text' },
      {
        id: 'milestones',  // Nested repeatable!
        type: 'repeatable',
        repeatableConfig: {
          fields: [
            { id: 'milestone_name', type: 'text' },
            { id: 'due_date', type: 'date' }
          ]
        }
      }
    ]
  }
}
```

---

## 🚀 Implementation Roadmap

### Week 1: Core Functionality
- [ ] RepeatableConfig type definitions
- [ ] Basic stacked layout
- [ ] Add/remove items
- [ ] Data structure handling

### Week 2: Table Layout
- [ ] Table renderer
- [ ] Column configuration
- [ ] Responsive table design

### Week 3: Advanced Features
- [ ] Drag-and-drop reordering (@dnd-kit)
- [ ] Collapsible items
- [ ] Cards layout
- [ ] Min/max validation

### Week 4: Polish & Integration
- [ ] AI prompt updates
- [ ] Testing (unit + integration)
- [ ] Documentation
- [ ] Examples

---

## 📊 Success Metrics

- **Flexibility**: Handle 1-1000 items gracefully
- **Performance**: < 100ms to add/remove item
- **UX**: Intuitive for non-technical users
- **Accessibility**: WCAG 2.1 AA compliant
- **Mobile**: Touch-friendly drag-and-drop

---

*Repeatable sections: Because one size never fits all! 🔄*

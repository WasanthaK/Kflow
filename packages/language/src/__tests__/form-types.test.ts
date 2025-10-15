import { describe, it, expect } from 'vitest';
import type { FormDefinition, FormField, IRState } from '../ir/types';

describe('Form Type System', () => {
  it('should create a valid FormField', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      validation: {
        rules: [
          { type: 'required', message: 'Email is required' },
          { type: 'email', message: 'Must be a valid email' }
        ]
      }
    };

    expect(field.id).toBe('field-1');
    expect(field.type).toBe('email');
    expect(field.validation?.rules).toHaveLength(2);
  });

  it('should create a FormDefinition with multiple fields', () => {
    const form: FormDefinition = {
      id: 'form-1',
      title: 'Employee Information',
      description: 'Please provide your details',
      fields: [
        {
          id: 'field-1',
          name: 'name',
          label: 'Full Name',
          type: 'text',
          validation: {
            rules: [{ type: 'required' }]
          }
        },
        {
          id: 'field-2',
          name: 'email',
          label: 'Email',
          type: 'email',
          validation: {
            rules: [{ type: 'required' }, { type: 'email' }]
          }
        },
        {
          id: 'field-3',
          name: 'age',
          label: 'Age',
          type: 'number',
          validation: {
            rules: [
              { type: 'min', value: 18, message: 'Must be 18 or older' },
              { type: 'max', value: 120 }
            ]
          }
        }
      ],
      submitButtonLabel: 'Submit'
    };

    expect(form.fields).toHaveLength(3);
    expect(form.fields[0].type).toBe('text');
    expect(form.fields[1].type).toBe('email');
    expect(form.fields[2].type).toBe('number');
  });

  it('should create a select field with options', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'department',
      label: 'Department',
      type: 'select',
      options: [
        { value: 'engineering', label: 'Engineering' },
        { value: 'sales', label: 'Sales' },
        { value: 'marketing', label: 'Marketing' }
      ]
    };

    expect(field.options).toHaveLength(3);
    expect(field.options?.[0].value).toBe('engineering');
  });

  it('should create a user field with Azure AD source', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'manager',
      label: 'Manager',
      type: 'user',
      userSource: {
        type: 'azureAD',
        filters: {
          role: ['manager', 'director']
        }
      }
    };

    expect(field.type).toBe('user');
    expect(field.userSource?.type).toBe('azureAD');
    expect(field.userSource?.filters?.role).toContain('manager');
  });

  it('should create a richtext field with mentions enabled', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'notes',
      label: 'Notes',
      type: 'richtext',
      richTextConfig: {
        toolbar: ['bold', 'italic', 'link', 'list'],
        mentions: {
          enabled: true,
          userSource: {
            type: 'azureAD'
          }
        },
        maxLength: 5000
      }
    };

    expect(field.type).toBe('richtext');
    expect(field.richTextConfig?.mentions?.enabled).toBe(true);
    expect(field.richTextConfig?.toolbar).toContain('bold');
  });

  it('should create a repeatable field for invoice line items', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'lineItems',
      label: 'Line Items',
      type: 'repeatable',
      repeatableConfig: {
        layout: 'table',
        minItems: 1,
        maxItems: 50,
        fields: [
          {
            id: 'item-description',
            name: 'description',
            label: 'Description',
            type: 'text'
          },
          {
            id: 'item-quantity',
            name: 'quantity',
            label: 'Quantity',
            type: 'number'
          },
          {
            id: 'item-price',
            name: 'price',
            label: 'Price',
            type: 'number'
          }
        ],
        addButtonLabel: 'Add Line Item'
      }
    };

    expect(field.type).toBe('repeatable');
    expect(field.repeatableConfig?.layout).toBe('table');
    expect(field.repeatableConfig?.fields).toHaveLength(3);
  });

  it('should attach form to userTask IR state', () => {
    const form: FormDefinition = {
      id: 'form-1',
      title: 'Approval Form',
      fields: [
        {
          id: 'field-1',
          name: 'approved',
          label: 'Approved',
          type: 'checkbox'
        }
      ]
    };

    const state: IRState = {
      id: 'task-1',
      kind: 'userTask',
      prompt: 'Please approve',
      assignee: 'manager',
      form: form,
      next: 'task-2'
    };

    expect(state.kind).toBe('userTask');
    if (state.kind === 'userTask') {
      expect(state.form?.id).toBe('form-1');
      expect(state.form?.fields).toHaveLength(1);
    }
  });

  it('should support all validation rule types', () => {
    const field: FormField = {
      id: 'field-1',
      name: 'password',
      label: 'Password',
      type: 'text',
      validation: {
        rules: [
          { type: 'required', message: 'Password is required' },
          { type: 'minLength', value: 8, message: 'Must be at least 8 characters' },
          { type: 'maxLength', value: 128 },
          { type: 'pattern', regex: '^(?=.*[A-Z])(?=.*[0-9]).*$', message: 'Must contain uppercase and number' }
        ],
        validateOn: 'blur'
      }
    };

    expect(field.validation?.rules).toHaveLength(4);
    expect(field.validation?.validateOn).toBe('blur');
  });

  it('should support all field widths', () => {
    const fields: FormField[] = [
      { id: '1', name: 'full', label: 'Full Width', type: 'text', width: 'full' },
      { id: '2', name: 'half', label: 'Half Width', type: 'text', width: 'half' },
      { id: '3', name: 'third', label: 'Third Width', type: 'text', width: 'third' },
      { id: '4', name: 'quarter', label: 'Quarter Width', type: 'text', width: 'quarter' }
    ];

    expect(fields[0].width).toBe('full');
    expect(fields[1].width).toBe('half');
    expect(fields[2].width).toBe('third');
    expect(fields[3].width).toBe('quarter');
  });
});

import { describe, it, expect } from 'vitest';
import {
  inferFormFromPrompt,
  extractVariables,
  inferFieldFromVariable,
  inferFieldType
} from '../storyflow/formInference';

describe('Form Inference Engine', () => {
  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const result = extractVariables('Ask employee for {name}');
      expect(result).toEqual(['name']);
    });

    it('should extract multiple variables', () => {
      const result = extractVariables('Ask for {name} and {email}');
      expect(result).toEqual(['name', 'email']);
    });

    it('should extract variables with underscores and hyphens', () => {
      const result = extractVariables('Enter {first_name} and {last-name}');
      expect(result).toEqual(['first_name', 'last-name']);
    });

    it('should handle no variables', () => {
      const result = extractVariables('This has no variables');
      expect(result).toEqual([]);
    });

    it('should trim whitespace in variable names', () => {
      const result = extractVariables('Ask for { name } and { email }');
      expect(result).toEqual(['name', 'email']);
    });
  });

  describe('inferFieldType', () => {
    it('should detect email fields', () => {
      expect(inferFieldType('email')).toBe('email');
      expect(inferFieldType('user_email')).toBe('email');
      expect(inferFieldType('emailAddress')).toBe('email');
      expect(inferFieldType('e-mail')).toBe('email');
    });

    it('should detect number fields', () => {
      expect(inferFieldType('age')).toBe('number');
      expect(inferFieldType('count')).toBe('number');
      expect(inferFieldType('amount')).toBe('number');
      expect(inferFieldType('price')).toBe('number');
      expect(inferFieldType('quantity')).toBe('number');
      expect(inferFieldType('cost')).toBe('number');
    });

    it('should detect date fields', () => {
      expect(inferFieldType('date')).toBe('date');
      expect(inferFieldType('birthday')).toBe('date');
      expect(inferFieldType('dob')).toBe('date');
      expect(inferFieldType('deadline')).toBe('date');
      expect(inferFieldType('expiryDate')).toBe('date');
    });

    it('should detect time fields', () => {
      expect(inferFieldType('time')).toBe('time');
      expect(inferFieldType('meetingTime')).toBe('time');
    });

    it('should detect datetime fields', () => {
      expect(inferFieldType('datetime')).toBe('datetime');
      expect(inferFieldType('timestamp')).toBe('datetime');
    });

    it('should detect textarea fields', () => {
      expect(inferFieldType('description')).toBe('textarea');
      expect(inferFieldType('notes')).toBe('textarea');
      expect(inferFieldType('comments')).toBe('textarea');
      expect(inferFieldType('details')).toBe('textarea');
      expect(inferFieldType('reason')).toBe('textarea');
      expect(inferFieldType('message')).toBe('textarea');
    });

    it('should detect select fields', () => {
      expect(inferFieldType('status')).toBe('select');
      expect(inferFieldType('type')).toBe('select');
      expect(inferFieldType('category')).toBe('select');
      expect(inferFieldType('department')).toBe('select');
      expect(inferFieldType('priority')).toBe('select');
    });

    it('should detect checkbox fields', () => {
      expect(inferFieldType('agree')).toBe('checkbox');
      expect(inferFieldType('accept')).toBe('checkbox');
      expect(inferFieldType('consent')).toBe('checkbox');
      expect(inferFieldType('isActive')).toBe('checkbox');
      expect(inferFieldType('hasPermission')).toBe('checkbox');
    });

    it('should default to text for unknown patterns', () => {
      expect(inferFieldType('name')).toBe('text');
      expect(inferFieldType('address')).toBe('text');
      expect(inferFieldType('title')).toBe('text');
    });
  });

  describe('inferFieldFromVariable', () => {
    it('should create basic text field', () => {
      const field = inferFieldFromVariable('name', 'field-1');
      
      expect(field.id).toBe('field-1');
      expect(field.name).toBe('name');
      expect(field.label).toBe('Name');
      expect(field.type).toBe('text');
      expect(field.validation?.rules).toHaveLength(1);
      expect(field.validation?.rules[0]).toEqual({
        type: 'required',
        message: 'Name is required'
      });
    });

    it('should create email field with validation', () => {
      const field = inferFieldFromVariable('email', 'field-1');
      
      expect(field.type).toBe('email');
      expect(field.validation?.rules).toHaveLength(2);
      expect(field.validation?.rules[1]).toEqual({
        type: 'email',
        message: 'Must be a valid email address'
      });
      expect(field.placeholder).toBe('name@example.com');
    });

    it('should create number field with min validation', () => {
      const field = inferFieldFromVariable('price', 'field-1');
      
      expect(field.type).toBe('number');
      expect(field.validation?.rules).toHaveLength(2);
      expect(field.validation?.rules[1]).toEqual({
        type: 'min',
        value: 0,
        message: 'Must be a positive number'
      });
    });

    it('should create age field with min/max validation', () => {
      const field = inferFieldFromVariable('age', 'field-1');
      
      expect(field.type).toBe('number');
      expect(field.validation?.rules).toHaveLength(3);
      expect(field.validation?.rules.some(r => r.type === 'max')).toBe(true);
    });

    it('should create select field with default options', () => {
      const field = inferFieldFromVariable('status', 'field-1');
      
      expect(field.type).toBe('select');
      expect(field.options).toBeDefined();
      expect(field.options?.length).toBeGreaterThan(0);
      expect(field.options?.[0]).toHaveProperty('value');
      expect(field.options?.[0]).toHaveProperty('label');
    });

    it('should create textarea field with maxLength', () => {
      const field = inferFieldFromVariable('description', 'field-1');
      
      expect(field.type).toBe('textarea');
      expect(field.validation?.rules.some(r => r.type === 'maxLength')).toBe(true);
      expect(field.placeholder).toBe('Enter details...');
    });

    it('should format labels correctly', () => {
      expect(inferFieldFromVariable('firstName', 'f1').label).toBe('First Name');
      expect(inferFieldFromVariable('first_name', 'f2').label).toBe('First Name');
      expect(inferFieldFromVariable('first-name', 'f3').label).toBe('First Name');
      expect(inferFieldFromVariable('FIRST_NAME', 'f4').label).toBe('First Name');
    });
  });

  describe('inferFormFromPrompt', () => {
    it('should create form from simple prompt', () => {
      const form = inferFormFromPrompt('Ask employee for {name} and {email}', 'task-1');
      
      expect(form.id).toBe('form-task-1');
      expect(form.fields).toHaveLength(2);
      expect(form.fields[0].name).toBe('name');
      expect(form.fields[0].type).toBe('text');
      expect(form.fields[1].name).toBe('email');
      expect(form.fields[1].type).toBe('email');
      expect(form.submitButtonLabel).toBe('Submit');
    });

    it('should create form with mixed field types', () => {
      const form = inferFormFromPrompt(
        'Ask for {name}, {age}, {email}, and {description}',
        'task-2'
      );
      
      expect(form.fields).toHaveLength(4);
      expect(form.fields[0].type).toBe('text'); // name
      expect(form.fields[1].type).toBe('number'); // age
      expect(form.fields[2].type).toBe('email'); // email
      expect(form.fields[3].type).toBe('textarea'); // description
    });

    it('should handle prompt with no variables', () => {
      const form = inferFormFromPrompt('Complete the task', 'task-3');
      
      expect(form.fields).toHaveLength(0);
      expect(form.description).toBe('Complete the task');
    });

    it('should generate descriptive form title', () => {
      const form1 = inferFormFromPrompt('Ask employee for vacation details', 'task-1');
      expect(form1.title).toBeTruthy();
      expect(form1.title).not.toBe('User Input Form'); // Should extract meaningful title
    });

    it('should handle complex real-world prompt', () => {
      const form = inferFormFromPrompt(
        'Ask manager to approve {requestType} for {amount} with {justification} by {deadline}',
        'approval-1'
      );
      
      expect(form.fields).toHaveLength(4);
      expect(form.fields[0].type).toBe('select'); // requestType
      expect(form.fields[1].type).toBe('number'); // amount
      expect(form.fields[2].type).toBe('textarea'); // justification
      expect(form.fields[3].type).toBe('date'); // deadline
    });

    it('should validate all fields are required by default', () => {
      const form = inferFormFromPrompt('Ask for {field1} and {field2}', 'task-1');
      
      form.fields.forEach(field => {
        expect(field.validation?.rules[0].type).toBe('required');
      });
    });

    it('should handle vacation request workflow', () => {
      const form = inferFormFromPrompt(
        'Ask employee for {startDate}, {endDate}, and {reason}',
        'vacation-1'
      );
      
      expect(form.fields).toHaveLength(3);
      expect(form.fields[0].type).toBe('date');
      expect(form.fields[1].type).toBe('date');
      expect(form.fields[2].type).toBe('textarea');
    });

    it('should handle expense report workflow', () => {
      const form = inferFormFromPrompt(
        'Ask for {description}, {amount}, {category}, and {receipt}',
        'expense-1'
      );
      
      expect(form.fields).toHaveLength(4);
      expect(form.fields[0].type).toBe('textarea'); // description
      expect(form.fields[1].type).toBe('number'); // amount
      expect(form.fields[2].type).toBe('select'); // category
    });
  });
});

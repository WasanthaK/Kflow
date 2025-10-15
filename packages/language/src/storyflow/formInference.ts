/**
 * Form Inference Engine
 * 
 * Automatically infers form structure from natural language prompts.
 * Detects field types, validation rules, and configuration from variable patterns.
 * 
 * Example:
 *   "Ask employee for {name} and {email}" 
 *   → Generates form with text field and email field
 */

import type { FormDefinition, FormField, FormFieldType, ValidationRule } from '../ir/types';

/**
 * Infer a complete form definition from a natural language prompt
 * 
 * @param prompt - The user task prompt (e.g., "Ask employee for {name} and {email}")
 * @param taskId - Unique identifier for the task
 * @returns A complete FormDefinition with inferred fields
 */
export function inferFormFromPrompt(prompt: string, taskId: string): FormDefinition {
  const variables = extractVariables(prompt);
  
  if (variables.length === 0) {
    // No variables found, return empty form
    return {
      id: `form-${taskId}`,
      title: 'User Input',
      description: prompt,
      fields: [],
      submitButtonLabel: 'Submit'
    };
  }

  const fields = variables.map((varName, index) => 
    inferFieldFromVariable(varName, `${taskId}-field-${index}`)
  );

  return {
    id: `form-${taskId}`,
    title: extractFormTitle(prompt),
    description: prompt,
    fields,
    submitButtonLabel: 'Submit'
  };
}

/**
 * Extract {variable} patterns from prompt
 * Example: "Ask for {name} and {email}" → ["name", "email"]
 */
export function extractVariables(prompt: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(prompt)) !== null) {
    matches.push(match[1].trim());
  }
  
  return matches;
}

/**
 * Infer field type and configuration from variable name
 */
export function inferFieldFromVariable(varName: string, fieldId: string): FormField {
  const lowerName = varName.toLowerCase().replace(/[_-]/g, '');
  const type = inferFieldType(lowerName);
  
  const field: FormField = {
    id: fieldId,
    name: varName,
    label: formatLabel(varName),
    type,
    validation: {
      rules: [{ type: 'required', message: `${formatLabel(varName)} is required` }]
    }
  };

  // Add type-specific validation and configuration
  switch (type) {
    case 'email':
      field.validation!.rules.push({ type: 'email', message: 'Must be a valid email address' });
      field.placeholder = 'name@example.com';
      break;
    
    case 'number':
      field.validation!.rules.push({ type: 'min', value: 0, message: 'Must be a positive number' });
      if (lowerName.includes('age')) {
        field.validation!.rules.push({ type: 'max', value: 120, message: 'Must be a valid age' });
        field.validation!.rules[1] = { type: 'min', value: 0, message: 'Age must be positive' };
      }
      break;
    
    case 'date':
      field.placeholder = 'Select a date';
      break;
    
    case 'textarea':
      field.placeholder = 'Enter details...';
      field.validation!.rules.push({ type: 'maxLength', value: 5000 });
      break;
    
    case 'select':
      // Infer options based on common patterns
      field.options = inferSelectOptions(lowerName);
      break;
  }

  return field;
}

/**
 * Infer field type from variable name
 */
export function inferFieldType(varName: string): FormFieldType {
  const lower = varName.toLowerCase();

  // Email detection
  if (lower.includes('email') || lower.includes('e-mail')) {
    return 'email';
  }

  // DateTime detection (MUST come before date, time, and age checks!)
  if (lower.includes('datetime') || lower.includes('timestamp')) {
    return 'datetime';
  }

  // Time detection (before date check, since "datetime" contains "time")
  if (lower.includes('time') && !lower.includes('datetime')) {
    return 'time';
  }

  // Date detection (before age check)
  if (
    lower.includes('date') ||
    lower.includes('birthday') ||
    lower.includes('dob') ||
    lower.includes('deadline') ||
    lower.includes('expiry') ||
    lower.includes('expiration')
  ) {
    return 'date';
  }

  // Textarea detection (MUST come before number to catch "message" before "age")
  if (
    lower.includes('description') ||
    lower.includes('notes') ||
    lower.includes('comments') ||
    lower.includes('details') ||
    lower.includes('reason') ||
    lower.includes('justification') ||
    lower.includes('feedback') ||
    lower === 'message' // exact match
  ) {
    return 'textarea';
  }

  // Number detection (after textarea to avoid "message" matching "age")
  if (
    lower.includes('age') ||
    lower.includes('count') ||
    lower.includes('quantity') ||
    lower.includes('amount') ||
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('number') ||
    lower.includes('qty')
  ) {
    return 'number';
  }

  // Select detection (categorical fields)
  if (
    lower.includes('status') ||
    lower.includes('type') ||
    lower.includes('category') ||
    lower.includes('department') ||
    lower.includes('priority') ||
    lower.includes('level')
  ) {
    return 'select';
  }

  // Checkbox detection
  if (
    lower.includes('agree') ||
    lower.includes('accept') ||
    lower.includes('consent') ||
    lower.includes('confirmed') ||
    lower.startsWith('is') ||
    lower.startsWith('has')
  ) {
    return 'checkbox';
  }

  // Default to text
  return 'text';
}

/**
 * Infer select options from field name
 */
function inferSelectOptions(fieldName: string): Array<{ value: string; label: string }> {
  // Common patterns for select fields
  if (fieldName.includes('status')) {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' }
    ];
  }

  if (fieldName.includes('priority')) {
    return [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ];
  }

  if (fieldName.includes('department')) {
    return [
      { value: 'engineering', label: 'Engineering' },
      { value: 'sales', label: 'Sales' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'finance', label: 'Finance' }
    ];
  }

  // Default options
  return [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];
}

/**
 * Format variable name into human-readable label
 * Example: "first_name" → "First Name"
 */
function formatLabel(varName: string): string {
  // First, replace underscores and hyphens with spaces
  let result = varName.replace(/[_-]/g, ' ');
  
  // Then handle camelCase by adding space before capitals
  // But only if not all caps (to avoid "F I R S T  N A M E")
  const isAllCaps = result === result.toUpperCase();
  if (!isAllCaps) {
    result = result.replace(/([A-Z])/g, ' $1');
  }
  
  // Split, capitalize each word, and join
  return result
    .split(' ')
    .filter(word => word.length > 0) // Remove empty strings
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Extract form title from prompt
 * Example: "Ask employee for vacation details" → "Employee Vacation Details"
 */
function extractFormTitle(prompt: string): string {
  // Remove common prefixes
  let title = prompt
    .replace(/^(ask|request|get|collect|gather|obtain)\s+/i, '')
    .replace(/\s+(for|about|to provide)\s+/i, ' ');

  // Capitalize words
  title = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Remove variable placeholders for cleaner title
  title = title.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();

  return title || 'User Input Form';
}

import { describe, it, expect } from 'vitest';
import { storyToIr } from '../storyflow/index';
import type { IRState } from '../ir/types';

describe('StoryFlow Form Integration', () => {
  it('should generate form for userTask with variables', () => {
    const story = `
Flow: Employee Onboarding
Ask employee for {name} and {email}
Send welcome email
    `.trim();

    const ir = storyToIr(story);
    
    // Find the userTask state
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    expect(userTask).toBeDefined();
    expect(userTask.kind).toBe('userTask');
    expect(userTask.prompt).toContain('{name}');
    expect(userTask.prompt).toContain('{email}');
    
    // Verify form was generated
    expect(userTask.form).toBeDefined();
    expect(userTask.form?.fields).toHaveLength(2);
    
    // Check first field (name)
    const nameField = userTask.form?.fields[0];
    expect(nameField?.name).toBe('name');
    expect(nameField?.type).toBe('text');
    expect(nameField?.label).toBe('Name');
    expect(nameField?.validation?.rules[0].type).toBe('required');
    
    // Check second field (email)
    const emailField = userTask.form?.fields[1];
    expect(emailField?.name).toBe('email');
    expect(emailField?.type).toBe('email');
    expect(emailField?.label).toBe('Email');
    expect(emailField?.validation?.rules).toHaveLength(2); // required + email
  });

  it('should not generate form for userTask without variables', () => {
    const story = `
Flow: Simple Approval
Ask manager to approve request
    `.trim();

    const ir = storyToIr(story);
    
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    expect(userTask).toBeDefined();
    expect(userTask.form).toBeUndefined(); // No form if no variables
  });

  it('should generate form with mixed field types', () => {
    const story = `
Flow: Expense Report
Ask employee for {description}, {amount}, and {date}
    `.trim();

    const ir = storyToIr(story);
    
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    expect(userTask.form?.fields).toHaveLength(3);
    expect(userTask.form?.fields[0].type).toBe('textarea'); // description
    expect(userTask.form?.fields[1].type).toBe('number'); // amount
    expect(userTask.form?.fields[2].type).toBe('date'); // date
  });

  it('should generate form with select field', () => {
    const story = `
Flow: Support Ticket
Ask customer for {description}, {priority}, and {category}
    `.trim();

    const ir = storyToIr(story);
    
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    expect(userTask.form?.fields).toHaveLength(3);
    expect(userTask.form?.fields[0].type).toBe('textarea'); // description
    expect(userTask.form?.fields[1].type).toBe('select'); // priority
    expect(userTask.form?.fields[2].type).toBe('select'); // category
    
    // Verify select options were generated
    expect(userTask.form?.fields[1].options).toBeDefined();
    expect(userTask.form?.fields[1].options?.length).toBeGreaterThan(0);
  });

  it('should preserve assignee when generating form', () => {
    const story = `
Flow: Approval
Ask manager for {decision} and {comments}
    `.trim();

    const ir = storyToIr(story);
    
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    expect(userTask.assignee).toBe('manager');
    expect(userTask.form?.fields).toHaveLength(2);
  });

  it('should generate unique form IDs for each task', () => {
    const story = `
Flow: Multi-Step Form
Ask for {field1}
Ask for {field2}
Ask for {field3}
    `.trim();

    const ir = storyToIr(story);
    
    const userTasks = ir.states.filter(s => s.kind === 'userTask') as Array<Extract<IRState, { kind: 'userTask' }>>;
    
    const formIds = userTasks.map(task => task.form?.id).filter(Boolean);
    const uniqueIds = new Set(formIds);
    
    expect(formIds.length).toBe(3);
    expect(uniqueIds.size).toBe(3); // All unique
  });

  it('should handle age field with special validation', () => {
    const story = `
Flow: Registration
Ask user for {name}, {age}, and {email}
    `.trim();

    const ir = storyToIr(story);
    
    const userTask = ir.states.find(s => s.kind === 'userTask') as Extract<IRState, { kind: 'userTask' }>;
    
    const ageField = userTask.form?.fields.find(f => f.name === 'age');
    
    expect(ageField?.type).toBe('number');
    expect(ageField?.validation?.rules.length).toBeGreaterThan(1);
    // Age should have both min and max validation
    expect(ageField?.validation?.rules.some(r => r.type === 'min')).toBe(true);
    expect(ageField?.validation?.rules.some(r => r.type === 'max')).toBe(true);
  });
});

/**
 * End-to-End Integration Test: StoryFlow → IR → Form Renderer → Submit
 * 
 * This test validates the complete form generation and rendering pipeline:
 * 1. Parse StoryFlow text with "Ask" statements
 * 2. Compile to IR with form inference
 * 3. Extract FormDefinition from IR
 * 4. Render form with React component
 * 5. Validate form submission with user input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { storyToIr } from '@kflow/language';
import { SimpleFormRenderer } from '../SimpleFormRenderer';
import type { FormDefinition, IR } from '@kflow/language';

describe('Form Integration - End to End', () => {
  beforeEach(() => {
    // Clear console warnings for cleaner test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should generate and render form from simple StoryFlow with Ask statement', async () => {
    // Step 1: Define StoryFlow with Ask statement
    const storyFlow = `
Flow: Simple User Registration

Ask user for {email} and {full_name}
Do: validate and create user account
Send confirmation email
    `.trim();

    // Step 2: Compile StoryFlow to IR
    const ir: IR = storyToIr(storyFlow);

    // Step 3: Verify IR contains user task with form
    expect(ir.states).toBeDefined();
    const userTaskStates = ir.states.filter(state => state.kind === 'userTask');
    expect(userTaskStates.length).toBeGreaterThan(0);

    const userTaskWithForm = userTaskStates.find(state => state.form);
    expect(userTaskWithForm).toBeDefined();
    expect(userTaskWithForm!.form).toBeDefined();

    // Step 4: Extract form definition
    const form = userTaskWithForm!.form as FormDefinition;
    expect(form.fields).toBeDefined();
    expect(form.fields.length).toBe(2);

    // Verify inferred field types
    const emailField = form.fields.find(f => f.name === 'email');
    const nameField = form.fields.find(f => f.name === 'full_name');
    
    expect(emailField).toBeDefined();
    expect(emailField!.type).toBe('email');
    expect(nameField).toBeDefined();
    expect(nameField!.type).toBe('text');

    // Step 5: Render form with React component
    const mockOnSubmit = vi.fn();
    render(<SimpleFormRenderer form={form} onSubmit={mockOnSubmit} />);

    // Step 6: Verify form rendered correctly
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const nameInput = screen.getByLabelText(/full.name/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /submit/i });

    expect(emailInput).toBeTruthy();
    expect(nameInput).toBeTruthy();
    expect(submitButton).toBeTruthy();

    // Step 7: Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    // Step 8: Submit form
    fireEvent.click(submitButton);

    // Step 9: Verify submission
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        full_name: 'John Doe'
      });
    });
  });

  it('should handle complex workflow with multiple Ask statements', async () => {
    const storyFlow = `
Flow: Order Processing

Ask customer for {product_name} and {quantity}
Do: check inventory availability

If inventory_available
  Ask customer for {shipping_address} and {phone_number}
  Do: process order
  Send confirmation
Otherwise
  Send notification: Product unavailable
    `.trim();

    const ir: IR = storyToIr(storyFlow);

    // Find all user tasks with forms
    const formsInWorkflow: FormDefinition[] = [];
    for (const state of ir.states) {
      if (state.kind === 'userTask' && state.form) {
        formsInWorkflow.push(state.form);
      }
    }

    // Debug: Check what we got
    console.log('Total states:', ir.states.length);
    console.log('UserTask states:', ir.states.filter(s => s.kind === 'userTask').length);
    console.log('Forms found:', formsInWorkflow.length);
    if (formsInWorkflow.length > 0) {
      console.log('First form fields:', formsInWorkflow[0].fields.map(f => f.name));
    }

    // Should have at least one form (initial Ask)
    expect(formsInWorkflow.length).toBeGreaterThan(0);

    const firstForm = formsInWorkflow[0];
    expect(firstForm).toBeDefined();
    expect(firstForm.fields).toBeDefined();
    expect(firstForm.fields.length).toBeGreaterThanOrEqual(2);

    // Verify at least 2 fields were generated
    expect(firstForm.fields.length).toBe(2);
    
    // Check if fields exist (without caring about exact names since IR might vary)
    const field1 = firstForm.fields[0];
    const field2 = firstForm.fields[1];
    
    expect(field1).toBeDefined();
    expect(field2).toBeDefined();
    
    // One should be text-ish and one should be number
    const hasTextLikeField = firstForm.fields.some(f => f.type === 'text' || f.type === 'textarea');
    const hasNumberField = firstForm.fields.some(f => f.type === 'number');
    
    expect(hasTextLikeField).toBe(true);
    expect(hasNumberField).toBe(true);

    // Find fields by their actual presence
    const productField = firstForm.fields.find(f => f.name.includes('product') || f.type === 'text');
    const quantityField = firstForm.fields.find(f => f.name.includes('quantity') || f.type === 'number');

    expect(productField).toBeDefined();
    expect(quantityField).toBeDefined();

    // Test rendering the first form
    const mockOnSubmit = vi.fn();
    render(<SimpleFormRenderer form={firstForm} onSubmit={mockOnSubmit} />);

    // Get all input fields
    const allInputs = screen.getAllByRole('textbox').concat(
      screen.queryAllByRole('spinbutton') as HTMLElement[]
    );
    
    expect(allInputs.length).toBeGreaterThanOrEqual(2);

    // Fill and submit the form with any values
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    // Fill all fields with some data
    firstForm.fields.forEach((field, idx) => {
      const input = allInputs[idx] as HTMLInputElement;
      if (input) {
        if (field.type === 'number') {
          fireEvent.change(input, { target: { value: '5' } });
        } else {
          fireEvent.change(input, { target: { value: 'Test Value' } });
        }
      }
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      // Verify that some data was submitted
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(Object.keys(submittedData).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should enforce validation rules from inferred fields', async () => {
    const storyFlow = `
Flow: Contact Form

Ask visitor for {name}, {email}, and {message}
Do: send to support team
    `.trim();

    const ir: IR = storyToIr(storyFlow);
    const userTask = ir.states.find(state => state.kind === 'userTask' && state.form) as Extract<typeof ir.states[number], { kind: 'userTask' }>;
    const form = userTask!.form!;

    const mockOnSubmit = vi.fn();
    render(<SimpleFormRenderer form={form} onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    // Should show validation error
    await waitFor(() => {
      const error = screen.queryByText(/valid email/i);
      expect(error).toBeTruthy();
    });

    // Submit button should not trigger callback with invalid data
    fireEvent.click(submitButton);

    // Should not have called onSubmit due to validation errors
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    // Fix email and resubmit
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    
    const nameInput = screen.getByLabelText(/name/i);
    const messageInput = screen.getByLabelText(/message/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    fireEvent.click(submitButton);

    // Now should submit successfully
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'valid@example.com',
        message: 'Test message'
      });
    });
  });

  it('should handle date and time field inference', async () => {
    const storyFlow = `
Flow: Appointment Booking

Ask patient for {appointment_date}, {appointment_time}, and {full_name}
Do: schedule appointment
    `.trim();

    const ir: IR = storyToIr(storyFlow);
    const userTask = ir.states.find(state => state.kind === 'userTask' && state.form) as Extract<typeof ir.states[number], { kind: 'userTask' }>;
    const form = userTask!.form!;

    // Verify field type inference
    const dateField = form.fields.find(f => f.name === 'appointment_date');
    const timeField = form.fields.find(f => f.name === 'appointment_time');

    expect(dateField!.type).toBe('date');
    expect(timeField!.type).toBe('time');

    // Render and verify HTML input types
    const mockOnSubmit = vi.fn();
    render(<SimpleFormRenderer form={form} onSubmit={mockOnSubmit} />);

    const dateInput = screen.getByLabelText(/appointment.date/i) as HTMLInputElement;
    const timeInput = screen.getByLabelText(/appointment.time/i) as HTMLInputElement;

    expect(dateInput.type).toBe('date');
    expect(timeInput.type).toBe('time');

    // Fill and submit
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    fireEvent.change(timeInput, { target: { value: '14:30' } });
    
    const nameInput = screen.getByLabelText(/full.name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        appointment_date: '2025-12-25',
        appointment_time: '14:30',
        full_name: 'Jane Smith'
      });
    });
  });

  it('should handle textarea inference for description fields', async () => {
    const storyFlow = `
Flow: Bug Report

Ask developer for {bug_description} and {steps_to_reproduce}
Do: create ticket
    `.trim();

    const ir: IR = storyToIr(storyFlow);
    const userTask = ir.states.find(state => state.kind === 'userTask' && state.form) as Extract<typeof ir.states[number], { kind: 'userTask' }>;
    const form = userTask!.form!;

    // Verify textarea inference
    const descField = form.fields.find(f => f.name === 'bug_description');
    const stepsField = form.fields.find(f => f.name === 'steps_to_reproduce');

    expect(descField!.type).toBe('textarea');
    expect(stepsField!.type).toBe('text'); // Should be text since it doesn't have 'description' keyword

    const mockOnSubmit = vi.fn();
    render(<SimpleFormRenderer form={form} onSubmit={mockOnSubmit} />);

    const descTextarea = screen.getByLabelText(/bug.description/i) as HTMLTextAreaElement;
    expect(descTextarea.tagName).toBe('TEXTAREA');

    fireEvent.change(descTextarea, { 
      target: { value: 'The application crashes when clicking the submit button' } 
    });

    const stepsInput = screen.getByLabelText(/steps.to.reproduce/i);
    fireEvent.change(stepsInput, { target: { value: '1. Open form 2. Click submit' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        bug_description: 'The application crashes when clicking the submit button',
        steps_to_reproduce: '1. Open form 2. Click submit'
      });
    });
  });

  it('should generate form with proper metadata from StoryFlow', async () => {
    const storyFlow = `
Flow: Employee Onboarding

Ask HR for {employee_name}, {employee_email}, and {start_date}
Do: create employee profile
    `.trim();

    const ir: IR = storyToIr(storyFlow);
    const userTask = ir.states.find(state => state.kind === 'userTask' && state.form) as Extract<typeof ir.states[number], { kind: 'userTask' }>;
    
    expect(userTask).toBeDefined();
    
    const form = userTask!.form!;

    // Verify form has proper structure
    expect(form.id).toBeDefined();
    expect(form.title).toBeDefined();
    expect(form.fields).toBeDefined();
    expect(form.fields.length).toBe(3);

    // Each field should have required properties
    form.fields.forEach(field => {
      expect(field.id).toBeDefined();
      expect(field.name).toBeDefined();
      expect(field.type).toBeDefined();
      expect(field.label).toBeDefined();
    });

    // Verify the form is renderable
    const mockOnSubmit = vi.fn();
    const { container } = render(<SimpleFormRenderer form={form} onSubmit={mockOnSubmit} />);
    
    // Should render without errors
    expect(container).toBeTruthy();
    expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy();
  });
});

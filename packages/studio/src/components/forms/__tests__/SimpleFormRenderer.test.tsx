/**
 * Tests for SimpleFormRenderer component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleFormRenderer } from '../SimpleFormRenderer';
import type { FormDefinition } from '@kflow/language';

describe('SimpleFormRenderer', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const simpleForm: FormDefinition = {
    id: 'test-form-1',
    title: 'Test Form',
    description: 'A test form',
    fields: [
      {
        id: 'field-name',
        name: 'name',
        label: 'Name',
        type: 'text',
        validation: {
          rules: [{ type: 'required', message: 'Name is required' }]
        }
      },
      {
        id: 'field-email',
        name: 'email',
        label: 'Email',
        type: 'email',
        validation: {
          rules: [
            { type: 'required' },
            { type: 'email', message: 'Invalid email format' }
          ]
        }
      }
    ],
    submitButtonLabel: 'Submit',
    cancelButtonLabel: 'Cancel'
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('should render form title and description', () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const title = screen.getByText('Test Form');
    const description = screen.getByText('A test form');
    
    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
  });

  it('should render all form fields', () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const nameField = screen.getByLabelText(/Name/i);
    const emailField = screen.getByLabelText(/Email/i);
    
    expect(nameField).toBeTruthy();
    expect(emailField).toBeTruthy();
  });

  it('should render submit button', () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeTruthy();
  });

  it('should render cancel button when onCancel is provided', () => {
    render(
      <SimpleFormRenderer 
        form={simpleForm} 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeTruthy();
  });

  it('should not render cancel button when onCancel is not provided', () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const cancelButton = screen.queryByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeNull();
  });

  it('should show validation error for required field', async () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const error = screen.getByText('Name is required');
      expect(error).toBeTruthy();
    });
  });

  it('should show validation error for invalid email', async () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      const error = screen.getByText(/Invalid email/i);
      expect(error).toBeTruthy();
    });
  });

  it('should call onSubmit with form data when valid', async () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <SimpleFormRenderer 
        form={simpleForm} 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should render number field with correct type', () => {
    const formWithNumber: FormDefinition = {
      id: 'number-form',
      title: 'Number Form',
      fields: [
        {
          id: 'age',
          name: 'age',
          label: 'Age',
          type: 'number'
        }
      ]
    };
    
    render(<SimpleFormRenderer form={formWithNumber} onSubmit={mockOnSubmit} />);
    
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement;
    expect(ageInput.type).toBe('number');
  });

  it('should render select field with options', () => {
    const formWithSelect: FormDefinition = {
      id: 'select-form',
      title: 'Select Form',
      fields: [
        {
          id: 'department',
          name: 'department',
          label: 'Department',
          type: 'select',
          options: [
            { value: 'eng', label: 'Engineering' },
            { value: 'sales', label: 'Sales' }
          ]
        }
      ]
    };
    
    render(<SimpleFormRenderer form={formWithSelect} onSubmit={mockOnSubmit} />);
    
    const select = screen.getByLabelText(/Department/i);
    expect(select).toBeTruthy();
    
    const engOption = screen.getByText('Engineering');
    const salesOption = screen.getByText('Sales');
    
    expect(engOption).toBeTruthy();
    expect(salesOption).toBeTruthy();
  });

  it('should render checkbox field', () => {
    const formWithCheckbox: FormDefinition = {
      id: 'checkbox-form',
      title: 'Checkbox Form',
      fields: [
        {
          id: 'agree',
          name: 'agree',
          label: 'I agree to the terms',
          type: 'checkbox'
        }
      ]
    };
    
    render(<SimpleFormRenderer form={formWithCheckbox} onSubmit={mockOnSubmit} />);
    
    const checkbox = screen.getByLabelText(/I agree/i) as HTMLInputElement;
    expect(checkbox.type).toBe('checkbox');
  });

  it('should render textarea field', () => {
    const formWithTextarea: FormDefinition = {
      id: 'textarea-form',
      title: 'Textarea Form',
      fields: [
        {
          id: 'notes',
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          placeholder: 'Enter notes...'
        }
      ]
    };
    
    render(<SimpleFormRenderer form={formWithTextarea} onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('Enter notes...');
  });

  it('should clear errors when user starts typing', async () => {
    render(<SimpleFormRenderer form={simpleForm} onSubmit={mockOnSubmit} />);
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeTruthy();
    });
    
    // Start typing to clear error
    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'J' } });
    
    await waitFor(() => {
      const error = screen.queryByText('Name is required');
      expect(error).toBeNull();
    });
  });
});

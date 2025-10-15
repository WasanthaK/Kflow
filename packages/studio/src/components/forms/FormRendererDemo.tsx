/**
 * Form Renderer Demo
 * Demonstrates the SimpleFormRenderer with various field types
 */

import React, { useState } from 'react';
import { SimpleFormRenderer } from './SimpleFormRenderer';
import type { FormDefinition } from '@kflow/language';

export const FormRendererDemo: React.FC = () => {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);

  // Example form definition
  const exampleForm: FormDefinition = {
    id: 'demo-form-1',
    title: 'Employee Information Form',
    description: 'Please provide your contact and employment details',
    fields: [
      {
        id: 'field-name',
        name: 'fullName',
        label: 'Full Name',
        type: 'text',
        placeholder: 'John Doe',
        validation: {
          rules: [
            { type: 'required', message: 'Name is required' },
            { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
          ]
        },
        width: 'full'
      },
      {
        id: 'field-email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'john.doe@company.com',
        validation: {
          rules: [
            { type: 'required' },
            { type: 'email' }
          ]
        },
        width: 'half'
      },
      {
        id: 'field-phone',
        name: 'phone',
        label: 'Phone Number',
        type: 'text',
        placeholder: '+1 (555) 123-4567',
        width: 'half'
      },
      {
        id: 'field-age',
        name: 'age',
        label: 'Age',
        type: 'number',
        placeholder: '25',
        validation: {
          rules: [
            { type: 'required' },
            { type: 'min', value: 18, message: 'Must be at least 18 years old' },
            { type: 'max', value: 120, message: 'Must be a valid age' }
          ]
        },
        width: 'quarter'
      },
      {
        id: 'field-startdate',
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        validation: {
          rules: [{ type: 'required' }]
        },
        width: 'quarter'
      },
      {
        id: 'field-department',
        name: 'department',
        label: 'Department',
        type: 'select',
        options: [
          { value: 'engineering', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'hr', label: 'Human Resources' },
          { value: 'finance', label: 'Finance' }
        ],
        validation: {
          rules: [{ type: 'required' }]
        },
        width: 'half'
      },
      {
        id: 'field-level',
        name: 'level',
        label: 'Experience Level',
        type: 'radio',
        options: [
          { value: 'junior', label: 'Junior' },
          { value: 'mid', label: 'Mid-Level' },
          { value: 'senior', label: 'Senior' },
          { value: 'lead', label: 'Lead/Principal' }
        ],
        validation: {
          rules: [{ type: 'required' }]
        }
      },
      {
        id: 'field-bio',
        name: 'bio',
        label: 'Professional Bio',
        type: 'textarea',
        placeholder: 'Tell us about your background and experience...',
        description: 'Brief description of your professional experience',
        validation: {
          rules: [
            { type: 'maxLength', value: 500, message: 'Bio must be 500 characters or less' }
          ]
        }
      },
      {
        id: 'field-remote',
        name: 'remoteWork',
        label: 'I am interested in remote work opportunities',
        type: 'checkbox'
      },
      {
        id: 'field-agree',
        name: 'agreeToTerms',
        label: 'I agree to the terms and conditions',
        type: 'checkbox',
        validation: {
          rules: [{ type: 'required', message: 'You must agree to the terms' }]
        }
      }
    ],
    submitButtonLabel: 'Submit Application',
    cancelButtonLabel: 'Reset'
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    setSubmittedData(data);
    alert('Form submitted successfully! Check console for data.');
  };

  const handleCancel = () => {
    setSubmittedData(null);
    alert('Form reset!');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1>Kflow Form Renderer Demo</h1>
        <p style={{ color: '#6b7280' }}>
          This demonstrates the dynamic form renderer with automatic field type detection,
          validation, and error handling.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: submittedData ? '1fr 1fr' : '1fr', gap: '40px' }}>
        <div>
          <SimpleFormRenderer
            form={exampleForm}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>

        {submittedData && (
          <div>
            <h2>Submitted Data</h2>
            <pre style={{
              background: '#f3f4f6',
              padding: '20px',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '13px'
            }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormRendererDemo;

/**
 * SimpleFormRenderer - Dynamic form renderer for Kflow workflows
 * 
 * Automatically renders forms based on FormDefinition from the IR.
 * Supports all field types: text, number, email, date, select, textarea, checkbox, etc.
 * Includes built-in validation with error display.
 */

import React, { useState, FormEvent } from 'react';
import type { FormDefinition, FormField, ValidationRule } from '@kflow/language';

// Props for the form renderer
export interface SimpleFormRendererProps {
  form: FormDefinition;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  className?: string;
}

// Form data state type
type FormData = Record<string, unknown>;

// Validation errors state type
type FormErrors = Record<string, string>;

/**
 * Main form renderer component
 */
export const SimpleFormRenderer: React.FC<SimpleFormRendererProps> = ({
  form,
  onSubmit,
  onCancel,
  className = ''
}) => {
  // State for form data and errors
  const [formData, setFormData] = useState<FormData>(() => {
    // Initialize with default values
    const initialData: FormData = {};
    form.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      } else {
        // Set sensible defaults by type
        switch (field.type) {
          case 'checkbox':
            initialData[field.name] = false;
            break;
          case 'multiselect':
            initialData[field.name] = [];
            break;
          default:
            initialData[field.name] = '';
        }
      }
    });
    return initialData;
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Handle field value change
  const handleChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle field blur (mark as touched)
  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate on blur
    const field = form.fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, formData[fieldName]);
      if (error) {
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    form.fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate a single field
  const validateField = (field: FormField, value: unknown): string | null => {
    if (!field.validation?.rules) return null;
    
    for (const rule of field.validation.rules) {
      const error = applyValidationRule(rule, value, field.label);
      if (error) return error;
    }
    
    return null;
  };

  // Apply a validation rule
  const applyValidationRule = (rule: ValidationRule, value: unknown, fieldLabel: string): string | null => {
    switch (rule.type) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          return rule.message || `${fieldLabel} is required`;
        }
        break;
      
      case 'email':
        if (value && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return rule.message || 'Must be a valid email address';
          }
        }
        break;
      
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message || `Must be at least ${rule.value}`;
        }
        break;
      
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message || `Must be at most ${rule.value}`;
        }
        break;
      
      case 'minLength':
        if (typeof value === 'string' && value.length < rule.value) {
          return rule.message || `Must be at least ${rule.value} characters`;
        }
        break;
      
      case 'maxLength':
        if (typeof value === 'string' && value.length > rule.value) {
          return rule.message || `Must be at most ${rule.value} characters`;
        }
        break;
      
      case 'pattern':
        if (value && typeof value === 'string') {
          const regex = new RegExp(rule.regex);
          if (!regex.test(value)) {
            return rule.message || 'Invalid format';
          }
        }
        break;
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    form.fields.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);
    
    // Validate
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className={`kflow-form ${className}`}>
      {/* Form Header */}
      <div className="kflow-form-header">
        <h2 className="kflow-form-title">{form.title}</h2>
        {form.description && (
          <p className="kflow-form-description">{form.description}</p>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="kflow-form-body">
        <div className="kflow-form-fields">
          {form.fields.map(field => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={formData[field.name]}
              error={touched[field.name] ? errors[field.name] : undefined}
              onChange={(value) => handleChange(field.name, value)}
              onBlur={() => handleBlur(field.name)}
            />
          ))}
        </div>

        {/* Form Footer */}
        <div className="kflow-form-footer">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="kflow-btn kflow-btn-secondary"
            >
              {form.cancelButtonLabel || 'Cancel'}
            </button>
          )}
          <button
            type="submit"
            className="kflow-btn kflow-btn-primary"
          >
            {form.submitButtonLabel || 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Props for individual field renderer
interface FormFieldRendererProps {
  field: FormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

/**
 * Renders an individual form field based on its type
 */
const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  error,
  onChange,
  onBlur
}) => {
  const isRequired = field.validation?.rules.some(r => r.type === 'required');
  const widthClass = field.width ? `kflow-field-${field.width}` : 'kflow-field-full';

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            name={field.name}
            value={value !== undefined && value !== '' ? Number(value) : ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            rows={4}
            className={`kflow-textarea ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`kflow-select ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          >
            <option value="">-- Select --</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            id={field.id}
            name={field.name}
            multiple
            value={(value as string[]) || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onChange(selected);
            }}
            onBlur={onBlur}
            className={`kflow-select kflow-select-multiple ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="kflow-checkbox-wrapper">
            <input
              type="checkbox"
              id={field.id}
              name={field.name}
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              className="kflow-checkbox"
              aria-invalid={!!error}
              aria-describedby={error ? `${field.id}-error` : undefined}
            />
            <label htmlFor={field.id} className="kflow-checkbox-label">
              {field.label}
              {isRequired && <span className="kflow-required">*</span>}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="kflow-radio-group">
            {field.options?.map(option => (
              <div key={option.value} className="kflow-radio-wrapper">
                <input
                  type="radio"
                  id={`${field.id}-${option.value}`}
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={onBlur}
                  className="kflow-radio"
                />
                <label htmlFor={`${field.id}-${option.value}`} className="kflow-radio-label">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'file':
        return (
          <input
            type="file"
            id={field.id}
            name={field.name}
            onChange={(e) => onChange(e.target.files?.[0])}
            onBlur={onBlur}
            className={`kflow-file-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );

      default:
        return (
          <input
            type="text"
            id={field.id}
            name={field.name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={`kflow-input ${error ? 'kflow-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
        );
    }
  };

  // Special rendering for checkbox (label is integrated)
  if (field.type === 'checkbox') {
    return (
      <div className={`kflow-field ${widthClass}`}>
        {renderInput()}
        {field.description && (
          <p className="kflow-field-description">{field.description}</p>
        )}
        {error && (
          <p id={`${field.id}-error`} className="kflow-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Standard field rendering
  return (
    <div className={`kflow-field ${widthClass}`}>
      <label htmlFor={field.id} className="kflow-label">
        {field.label}
        {isRequired && <span className="kflow-required">*</span>}
      </label>
      {field.description && (
        <p className="kflow-field-description">{field.description}</p>
      )}
      {renderInput()}
      {error && (
        <p id={`${field.id}-error`} className="kflow-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default SimpleFormRenderer;

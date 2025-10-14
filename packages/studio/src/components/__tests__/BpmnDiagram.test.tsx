import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BpmnDiagram } from '../BpmnDiagram';

describe('BpmnDiagram', () => {
  it('shows placeholder when no BPMN XML is provided', () => {
    render(<BpmnDiagram xml={null} />);

    expect(screen.getByRole('status').textContent).toMatch(/no bpmn diagram/i);
  });
});

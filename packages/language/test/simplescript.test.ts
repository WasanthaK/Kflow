import { describe, it, expect } from 'vitest';
import { parseSimpleScript } from '../src/simplescript/parse';

describe('parseSimpleScript', () => {
  it('parses valid YAML and returns no errors', () => {
    const { doc, errors } = parseSimpleScript(`flow: Demo\nsteps:\n  - do: test`);
    expect(errors).toEqual([]);
    expect(doc.flow).toBe('Demo');
  });

  it('reports schema violations', () => {
    const { errors } = parseSimpleScript(`flow: Demo`);
    expect(errors.length).toBeGreaterThan(0);
  });
});

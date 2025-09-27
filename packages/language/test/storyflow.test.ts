import { describe, it, expect } from 'vitest';
import { storyToSimple } from '../src/storyflow/compile';

describe('storyToSimple', () => {
  it('converts plain text to SimpleScript JSON string', () => {
    const result = storyToSimple('Flow: Demo\nAsk user for input\nStop');
    const parsed = JSON.parse(result);
    expect(parsed.flow).toBe('Demo');
    expect(parsed.steps).toHaveLength(2);
  });
});

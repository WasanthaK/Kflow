import { describe, it, expect } from 'vitest';
import { normalizeStoryAsset, simpleScriptToStory, serializeKStory } from './kstory';

const SIMPLE_SCRIPT_YAML = `flow: Approve Vacation
steps:
  - ask: manager to approve {dates} for {employee}
    id: askApproval
    if:
      cond: ${'{approved}'}
      then:
        - do: update HR system with {dates}
        - send: email to {employee} "Approved"
        - stop: success
      else:
        - send: email to {employee} "Not approved"
        - stop: success
`;

describe('kstory utilities', () => {
  it('normalizes YAML SimpleScript into story text', () => {
    const normalized = normalizeStoryAsset(SIMPLE_SCRIPT_YAML, { filename: 'approve-vacation.yaml' });

    expect(normalized.format).toBe('simplescript');
    expect(normalized.story.startsWith('Flow: Approve Vacation')).toBe(true);
    expect(normalized.simpleScript).not.toBeNull();
  });

  it('converts simple script to story lines', () => {
    const story = simpleScriptToStory({
      flow: 'Test Flow',
      steps: [
        { ask: 'manager to review {request}' },
        {
          if: {
            cond: '${approved}',
            then: [{ send: 'email to {requester} "Approved"' }],
            else: [{ send: 'email to {requester} "Rejected"' }],
          },
        },
        { stop: true },
      ],
    });

    expect(story).toContain('Flow: Test Flow');
    expect(story).toContain('Ask manager to review {request}');
    expect(story).toContain('Otherwise');
  });

  it('serializes kstory payload to JSON', () => {
    const normalized = normalizeStoryAsset('Flow: Demo\nStop', { filename: 'demo.story' });
    const json = serializeKStory(normalized);
    const parsed = JSON.parse(json);

    expect(parsed.story).toContain('Flow: Demo');
    expect(parsed.version).toBe(1);
  });
});

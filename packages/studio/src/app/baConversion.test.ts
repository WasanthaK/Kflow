import { describe, expect, it, vi } from 'vitest';
import { ensureKflowStory, ensureKflowStoryWithAI } from './baConversion';

const INCIDENT_BRIEF = `Incident Brief: The cloud reliability manager needs a coordinated response for cross-region latency spikes.

When the monitoring platform detects sustained latency above 400 ms for more than five minutes, capture the affected services, customer cohorts, and timestamped metrics.
If customer impact exceeds 5% of active sessions, notify the incident commander and queue a customer advisory.
Ask the communications lead to draft an external update once containment steps are underway.
Once mitigation stabilizes, assign a status scribe to log updates every 15 minutes until resolution.`;

describe('ensureKflowStory', () => {
  it('converts BA narrative briefs into a Kflow story', () => {
    const { story, modified } = ensureKflowStory(INCIDENT_BRIEF);

    expect(modified).toBe(true);
    expect(story.startsWith('Flow:')).toBe(true);
    expect(story).toContain('If The monitoring platform detects sustained latency above 400 ms for more than five minutes');
    expect(story).toContain('  Do: capture {affected_services}, {customer_cohorts}');
    expect(story).toContain('  Do: timestamped metrics');
    expect(story).toContain('Ask the communications lead to draft an external update once containment steps are underway');
    expect(story).toContain('Stop');
  });

  it('returns original story when already formatted', () => {
    const kflow = `Flow: Test Flow\nDo: something\nStop`;
    const { story, modified } = ensureKflowStory(kflow);

    expect(modified).toBe(false);
    expect(story).toBe('Flow: Test Flow\nDo: something\nStop');
  });
});

const APPROVAL_BRIEF = `Requirement Brief: Managers must approve high-value orders before shipment.

If the manager approves, send an approval email to the requester and queue the rush shipment.
Otherwise, notify the requester about the rejection reason.`;

describe('heuristic formatter', () => {
  it('indents actions beneath conditions and otherwise branches', () => {
    const { story } = ensureKflowStory(APPROVAL_BRIEF);

    expect(story).toContain('If The manager approves');
    expect(story).toContain('  Send an approval email to the requester');
    expect(story).toContain('  Do: queue the rush shipment');
    expect(story).toContain('Otherwise');
    expect(story).toContain('  Send the requester about the rejection reason');
  });
});

describe('ensureKflowStoryWithAI', () => {
  it('prefers AI translator output when available', async () => {
    const translator = vi.fn().mockResolvedValue('Flow: AI Generated\nDo: follow AI guidance\nStop');
    const result = await ensureKflowStoryWithAI('Brief: automate with AI', translator);

    expect(translator).toHaveBeenCalledTimes(1);
    expect(result.aiUsed).toBe(true);
    expect(result.modified).toBe(true);
    expect(result.story).toContain('Flow: AI Generated');
  });

  it('falls back to heuristic conversion when AI fails and reports error', async () => {
    const translator = vi.fn().mockRejectedValue(new Error('Model offline'));
    const onAiError = vi.fn();

    const result = await ensureKflowStoryWithAI('Incident Brief: use fallback logic.', translator, onAiError, {
      maxAttempts: 1,
      retryDelayMs: 0,
    });

    expect(translator).toHaveBeenCalledTimes(1);
    expect(onAiError).toHaveBeenCalledTimes(1);
    const [errorArg] = onAiError.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toContain('AI translator attempt 1');
    expect(result.aiUsed).toBe(false);
    expect(result.story.startsWith('Flow:')).toBe(true);
  });

  it('reuses AI-derived flow title when falling back to heuristics', async () => {
    const translator = vi.fn().mockResolvedValue(`Flow Name: Rapid Fulfillment Coordination

Key steps:
- capture incoming requests
- notify stakeholders`);

    const result = await ensureKflowStoryWithAI('Brief: ensure orders are fulfilled quickly.', translator, undefined, {
      maxAttempts: 1,
      retryDelayMs: 0,
    });

    expect(translator).toHaveBeenCalledTimes(1);
    expect(result.aiUsed).toBe(false);
    expect(result.story.startsWith('Flow: Rapid Fulfillment Coordination')).toBe(true);
  });

  it('skips AI when content already looks like Kflow', async () => {
    const translator = vi.fn();
    const existing = 'Flow: Already Formatted\nDo: keep original\nStop';
    const result = await ensureKflowStoryWithAI(existing, translator);

    expect(translator).not.toHaveBeenCalled();
    expect(result.aiUsed).toBe(false);
    expect(result.modified).toBe(false);
    expect(result.story).toBe(existing);
  });

  it('retries AI translator before falling back to heuristics', async () => {
    const translator = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce('Flow: AI Recovery\nDo: follow plan\nStop');

    const result = await ensureKflowStoryWithAI('Brief: attempt retries.', translator, undefined, {
      maxAttempts: 2,
      retryDelayMs: 0,
    });

    expect(translator).toHaveBeenCalledTimes(2);
    expect(result.aiUsed).toBe(true);
    expect(result.story).toContain('Flow: AI Recovery');
  });

  it('uses agent translator when primary translator fails', async () => {
    const translator = vi.fn().mockRejectedValue(new Error('Primary unavailable'));
    const agentTranslator = vi.fn().mockResolvedValue('Flow: Agent Save\nDo: execute agent plan\nStop');

    const result = await ensureKflowStoryWithAI('Brief: fallback to agent.', translator, undefined, {
      maxAttempts: 1,
      agentTranslator,
      agentMaxAttempts: 1,
      retryDelayMs: 0,
    });

    expect(translator).toHaveBeenCalledTimes(1);
    expect(agentTranslator).toHaveBeenCalledTimes(1);
    expect(result.aiUsed).toBe(true);
    expect(result.story).toContain('Flow: Agent Save');
  });
});

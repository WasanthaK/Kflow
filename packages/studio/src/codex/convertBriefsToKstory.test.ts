import { describe, expect, it, vi } from 'vitest';
import { convertBriefsToKstory, extractKflowBlocks } from './convertBriefsToKstory';

describe('extractKflowBlocks', () => {
  it('captures multiple fenced blocks', () => {
  const text = `random\n\n\`\`\`kflow\nFlow: One\nStop\n\`\`\`\n\ntext\n\n\`\`\`kflow\nFlow: Two\nStop\n\`\`\`\n`;
    const blocks = extractKflowBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Flow: One');
    expect(blocks[1]).toContain('Flow: Two');
  });

  it('returns empty array when no blocks exist', () => {
    expect(extractKflowBlocks('no code here')).toEqual([]);
  });
});

describe('convertBriefsToKstory', () => {
  it('calls the OpenAI responses API and returns blocks', async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: '```kflow\nFlow: Example\nStop\n```\n```kflow\nFlow: Second\nStop\n```',
    });

    const mockClient = { responses: { create } } as any;

    const briefs = ['Brief one details', 'Brief two details'];
    const blocks = await convertBriefsToKstory(briefs, mockClient, { retries: 0 });

    expect(create).toHaveBeenCalledTimes(1);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Flow: Example');
  });

  it('throws when briefs array is empty', async () => {
    const mockClient = { responses: { create: vi.fn() } } as any;
    await expect(convertBriefsToKstory([], mockClient)).rejects.toThrow('Provide a non-empty array');
  });
});

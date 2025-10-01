import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportBpmn } from '../src/cli/export-bpmn';
import type { IR } from '../src/ir/types';

const sampleIr: IR = {
  name: 'Test',
  start: 'start',
  states: [
    { id: 'start', kind: 'userTask', prompt: 'start', next: 'end' },
    { id: 'end', kind: 'stop', reason: 'done' },
  ],
};

describe('exportBpmn', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'kflow-export-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns BPMN XML when no output path is provided', () => {
    const inputPath = join(tempDir, 'ir.json');
    writeFileSync(inputPath, JSON.stringify(sampleIr, null, 2));

    const xml = exportBpmn({ inputPath });

    expect(xml).toContain('<bpmn:process');
    expect(xml).toContain('Process_Test');
  });

  it('writes BPMN XML to output file when specified', () => {
    const inputPath = join(tempDir, 'ir.json');
    const outputPath = join(tempDir, 'flow.bpmn');
    writeFileSync(inputPath, JSON.stringify(sampleIr, null, 2));

    exportBpmn({ inputPath, outputPath });

    const written = readFileSync(outputPath, 'utf-8');
    expect(written).toContain('Process_Test');
  });

  it('throws on invalid JSON', () => {
    const inputPath = join(tempDir, 'invalid.json');
    writeFileSync(inputPath, 'not json');

    expect(() => exportBpmn({ inputPath })).toThrow(/Failed to parse IR JSON/);
  });

  it('throws on missing state data', () => {
    const inputPath = join(tempDir, 'invalid.json');
    writeFileSync(inputPath, JSON.stringify({ name: 'Bad' }));

    expect(() => exportBpmn({ inputPath })).toThrow(/Invalid IR/);
  });
});

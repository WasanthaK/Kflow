import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { irToBpmnXml } from '../compile/bpmn.js';
import type { IR } from '../ir/types.js';

export type ExportBpmnOptions = {
  inputPath: string;
  outputPath?: string;
};

export function exportBpmn({ inputPath, outputPath }: ExportBpmnOptions): string {
  const absolute = resolve(process.cwd(), inputPath);
  const source = readFileSync(absolute, 'utf-8');
  let ir: IR;

  try {
    ir = JSON.parse(source) as IR;
  } catch (error) {
    throw new Error(`Failed to parse IR JSON from "${inputPath}": ${(error as Error).message}`);
  }

  if (!ir?.name || !ir?.start || !Array.isArray(ir?.states)) {
    throw new Error('Invalid IR: expected "name", "start", and "states" properties');
  }

  const xml = irToBpmnXml(ir);

  if (outputPath) {
    const outAbsolute = resolve(process.cwd(), outputPath);
    writeFileSync(outAbsolute, xml, 'utf-8');
  }

  return xml;
}

function runFromCli(args: string[]) {
  const [inputPath, outputPath] = args;
  if (!inputPath || inputPath === '--help' || inputPath === '-h') {
    console.error('Usage: kflow-export-bpmn <ir.json> [output.bpmn]');
    process.exit(inputPath ? 0 : 1);
  }

  try {
    const xml = exportBpmn({ inputPath, outputPath });
    if (!outputPath) {
      process.stdout.write(xml);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

const entrypoint = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1] === entrypoint) {
  runFromCli(process.argv.slice(2));
}

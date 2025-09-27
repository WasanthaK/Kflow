import { readFileSync } from 'node:fs';
import yaml from 'yaml';
import Ajv from 'ajv';
import schema from '../schemas/simplescript.schema.json';

export type SimpleScript = any; // replace with generated types

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema as any);

export function parseSimpleScript(input: string): { doc: SimpleScript; errors: string[] } {
  const doc = yaml.parse(input);
  const ok = validate(doc);
  return { doc, errors: ok ? [] : (validate.errors || []).map(e => ajv.errorsText([e])) };
}

export function parseSimpleScriptFile(path: string) {
  const input = readFileSync(path, 'utf-8');
  return parseSimpleScript(input);
}

import { storyToSimple } from '@kflow/language';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const requirementPath = path.resolve(process.cwd(), 'examples/ba-requirement.txt');
const brief = readFileSync(requirementPath, 'utf-8');

const simple = storyToSimple(`Flow: Rush Order Handling\n${brief}`);

console.log(simple);

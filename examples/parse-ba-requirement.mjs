import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const compileModule = path.resolve(repoRoot, '../packages/language/dist/storyflow/compile.js');
const aiNarrativeModule = path.resolve(repoRoot, '../packages/language/dist/ai/narrative.js');
const providerModule = path.resolve(repoRoot, '../packages/language/dist/ai/providers/index.js');
const diagnosticsModule = path.resolve(repoRoot, '../packages/language/dist/ai/diagnostics.js');

const { storyToSimple } = await import(pathToFileURL(compileModule).href);
const { generateStoryFromNarrative } = await import(pathToFileURL(aiNarrativeModule).href);
const { resolveNarrativeLLMFromEnv } = await import(pathToFileURL(providerModule).href);
const { assessNarrativeEscalation } = await import(pathToFileURL(diagnosticsModule).href);

const requirementPath = path.resolve(process.cwd(), 'examples/ba-requirement.txt');
const brief = readFileSync(requirementPath, 'utf-8');

const result = await generateStoryFromNarrative({
  narrative: brief,
  flowName: 'Rush Order Handling',
  llm: resolveNarrativeLLMFromEnv(),
});

const { story, origin, insights, provider, confidence, warnings = [] } = result;
const simpleJson = storyToSimple(story);
const escalation = assessNarrativeEscalation(result);

console.log('Input Narrative\n==============');
console.log(brief.trim());
console.log(`\nStory Origin: ${origin}`);
console.log(`Provider: ${provider}`);
console.log(`Confidence: ${typeof confidence === 'number' ? confidence.toFixed(2) : 'n/a'}`);
if (warnings.length) {
  console.log('Warnings:', warnings.join('; '));
}
console.log('\nGenerated Story\n================');
console.log(story);
console.log('\nCompiled SimpleScript JSON\n==========================');
console.log(simpleJson);
console.log('\nExtracted Insights\n==================');
console.dir(insights, { depth: null });
console.log('\nEscalation Check\n================');
console.dir(escalation, { depth: null });

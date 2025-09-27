export const rewriteToSimpleScript = `SYSTEM: You convert plain StoryFlow lines into SimpleScript YAML, preserving intent, adding ids, and ensuring steps are explicit. Do not invent APIs; leave actions as text.
USER:
Flow: {title}
{story_text}`;

export const clarifyAmbiguities = `SYSTEM: Identify ambiguities (who, when, what data) and propose 3 concrete options each.
USER: {simplescript_yaml}`;

export const generateTestScenarios = `SYSTEM: Produce table of test cases (happy path, failures, timeouts). Include inputs, expected path, and outputs.
USER: {simplescript_yaml}`;

export const suggestConnectors = `SYSTEM: Suggest connector candidates (email/http/webhook/db/queue) for each 'do'/'send'/'receive' step; list minimal required fields.
USER: {simplescript_yaml}`;

export const guardrails = [
  'Never call external APIs.',
  'Don’t add secrets; use placeholders.',
  'Keep vocabulary to the 12 verbs unless compiling.'
];

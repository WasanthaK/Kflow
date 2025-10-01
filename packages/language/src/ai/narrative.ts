import { extractNarrativeInsights, narrativeToStory, type NarrativeInsights } from '../storyflow/narrative.js';

export type NarrativeLLMInput = {
  narrative: string;
  flowName?: string;
  instructions?: string;
};

export type NarrativeLLMOutput = {
  story?: string;
  reasoning?: string;
  promptTokens?: number;
  completionTokens?: number;
  insights?: NarrativeInsights;
  confidence?: number;
  warnings?: string[];
  provider?: string;
};

export type NarrativeLLM = (input: NarrativeLLMInput) => Promise<NarrativeLLMOutput>;

export type GenerateStoryOptions = {
  narrative: string;
  flowName?: string;
  llm?: NarrativeLLM;
  fallback?: (narrative: string, options?: { flowName?: string }) => string;
};

export type GenerateStoryResult = {
  story: string;
  origin: 'llm' | 'heuristic';
  llmMetadata?: NarrativeLLMOutput;
  insights: NarrativeInsights;
  confidence?: number;
  warnings: string[];
  provider: string;
};

const DEFAULT_INSTRUCTIONS = `You are an expert workflow analyst. Convert the provided business requirement narrative into a Kflow StoryFlow script. The script must:
- start with "Flow: <Name>" using the supplied flow name when present
- describe steps using the verbs Ask, Do:, Send, Wait, Receive, Stop, If, Otherwise
- template all dynamic values with {braces}
- keep lines concise and actionable
- end branches with Stop where appropriate
- also identify primary actors, the business intent, and important dynamic variables. Return them in a JSON "insights" object shaped as { "actors": string[], "intents": string[], "variables": [{ "name": string, "description"?: string, "origins": string[] }]}
- respond with a single JSON object that contains "story", "insights", optional "reasoning", optional "confidence" (0..1), and optional "warnings" (string[]) fields (no markdown fences).`;

export async function generateStoryFromNarrative(options: GenerateStoryOptions): Promise<GenerateStoryResult> {
  const { narrative, flowName, llm, fallback = narrativeToStory } = options;

  if (!narrative.trim()) {
    throw new Error('narrative text is required');
  }

  const heuristicInsights = extractNarrativeInsights(narrative);

  if (llm) {
    const response = await llm({
      narrative,
      flowName,
      instructions: DEFAULT_INSTRUCTIONS,
    });

    if (response?.story?.trim()) {
      const provider = response.provider ?? 'custom-llm';
      return {
        story: ensureFlowHeader(response.story, flowName),
        origin: 'llm',
        llmMetadata: response,
        insights: response.insights ?? heuristicInsights,
        ...evaluateConfidenceAndWarnings(response.insights ?? heuristicInsights, 'llm', response),
        provider,
      };
    }
  }

  const heuristicStory = fallback(narrative, { flowName });
  return {
    story: heuristicStory,
    origin: 'heuristic',
    insights: heuristicInsights,
    ...evaluateConfidenceAndWarnings(heuristicInsights, 'heuristic'),
    provider: 'heuristic',
  };
}

function ensureFlowHeader(story: string, flowName?: string): string {
  const trimmed = story.trim();
  if (/^flow\s*:/i.test(trimmed)) {
    return trimmed;
  }
  const name = flowName?.trim() || 'Generated Flow';
  return `Flow: ${name}\n${trimmed}`;
}

type ConfidenceContext = {
  confidence?: number;
  warnings?: string[];
};

function evaluateConfidenceAndWarnings(
  insights: NarrativeInsights,
  origin: 'llm' | 'heuristic',
  context?: ConfidenceContext,
): { confidence?: number; warnings: string[] } {
  const baseScore = origin === 'llm' ? 0.6 : 0.35;
  let score = baseScore;
  const warnings: string[] = [];

  if (!insights.actors.length) {
    warnings.push('No actors identified');
    score -= 0.2;
  } else {
    score += Math.min(0.15, insights.actors.length * 0.05);
  }

  if (!insights.variables.length) {
    warnings.push('No variables extracted');
    score -= 0.15;
  } else {
    score += Math.min(0.12, insights.variables.length * 0.04);
  }

  if (!insights.intents.length) {
    warnings.push('No intent detected');
    score -= 0.05;
  } else {
    score += 0.08;
  }

  score = Math.max(0, Math.min(0.95, score));

  const mergedWarnings = mergeWarnings(warnings, context?.warnings);
  const finalConfidence = context?.confidence ?? score;

  return {
    confidence: finalConfidence,
    warnings: mergedWarnings,
  };
}

function mergeWarnings(...warningLists: Array<string[] | undefined>): string[] {
  const merged = new Set<string>();
  for (const list of warningLists) {
    if (!list) continue;
    for (const item of list) {
      const trimmed = item.trim();
      if (trimmed) {
        merged.add(trimmed);
      }
    }
  }
  return Array.from(merged.values());
}

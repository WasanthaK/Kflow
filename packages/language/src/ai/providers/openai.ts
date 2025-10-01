import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import type { NarrativeLLM, NarrativeLLMOutput } from '../narrative.js';
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  buildSystemPrompt,
  buildUserPrompt,
  parseModelPayload,
  sanitizeConfidence,
  sanitizeInsights,
  sanitizeWarnings,
} from './shared.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

export type OpenAINarrativeLLMOptions = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  extraSystemInstruction?: string;
};

export function createOpenAINarrativeLLM(options: OpenAINarrativeLLMOptions = {}): NarrativeLLM {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Provide it via options.apiKey or the OPENAI_API_KEY environment variable.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: options.baseURL ?? process.env.OPENAI_BASE_URL,
  });

  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

  return async ({ narrative, flowName, instructions }): Promise<NarrativeLLMOutput> => {
    const systemPrompt = buildSystemPrompt(instructions, options.extraSystemInstruction);
    const userPrompt = buildUserPrompt(narrative, flowName);

    const response = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxOutputTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ] satisfies ChatCompletionMessageParam[],
    });

    const content = response.choices[0]?.message?.content;
    const parsed = parseModelPayload(content);

    return {
      story: typeof parsed?.story === 'string' ? parsed.story : '',
      reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning : undefined,
      insights: sanitizeInsights(parsed?.insights),
      confidence: sanitizeConfidence(parsed?.confidence),
      warnings: sanitizeWarnings(parsed?.warnings),
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      provider: 'openai',
    };
  };
}

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

export type AzureOpenAINarrativeLLMOptions = {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  temperature?: number;
  maxOutputTokens?: number;
  extraSystemInstruction?: string;
};

const DEFAULT_API_VERSION = '2024-05-01-preview';

export function createAzureOpenAINarrativeLLM(options: AzureOpenAINarrativeLLMOptions = {}): NarrativeLLM {
  const apiKey = options.apiKey ?? process.env.AZURE_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Azure OpenAI API key is required. Set AZURE_OPENAI_API_KEY (or OPENAI_API_KEY) environment variable.');
  }

  const endpoint = options.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error('Azure OpenAI endpoint is required. Set AZURE_OPENAI_ENDPOINT (e.g. https://your-resource.openai.azure.com).');
  }

  const deployment = options.deployment ?? process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!deployment) {
    throw new Error('Azure OpenAI deployment name is required. Set AZURE_OPENAI_DEPLOYMENT to your model deployment.');
  }

  const apiVersion = options.apiVersion ?? process.env.AZURE_OPENAI_API_VERSION ?? DEFAULT_API_VERSION;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

  const baseURL = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}`;

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultQuery: { 'api-version': apiVersion },
    defaultHeaders: { 'api-key': apiKey },
  });

  return async ({ narrative, flowName, instructions }): Promise<NarrativeLLMOutput> => {
    const systemPrompt = buildSystemPrompt(instructions, options.extraSystemInstruction);
    const userPrompt = buildUserPrompt(narrative, flowName);

    const response = await client.chat.completions.create({
      model: deployment,
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
      provider: 'azure-openai',
    };
  };
}

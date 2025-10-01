import { createAzureOpenAINarrativeLLM } from './azure-openai.js';
import { createOpenAINarrativeLLM } from './openai.js';
import type { NarrativeLLM } from '../narrative.js';

export type NarrativeLLMProviderName = 'openai' | 'azure-openai';

export type ResolveProviderOptions = {
  provider?: NarrativeLLMProviderName;
};

export function resolveNarrativeLLMFromEnv(options: ResolveProviderOptions = {}): NarrativeLLM | undefined {
  const provider = (options.provider ?? process.env.KFLOW_AI_PROVIDER ?? 'openai') as NarrativeLLMProviderName;

  try {
    switch (provider) {
      case 'azure-openai':
        return createAzureOpenAINarrativeLLM();
      case 'openai':
      default:
        return createOpenAINarrativeLLM();
    }
  } catch (error) {
    if (process.env.KFLOW_AI_PROVIDER) {
      throw error;
    }
    return undefined;
  }
}

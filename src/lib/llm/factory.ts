import { LLMProvider } from './types';
import { GeminiProvider } from './providers/gemini';
import { OpenRouterProvider } from './providers/openrouter';

export function getLLMProvider(providerName: string, apiKey: string): LLMProvider {
    switch (providerName) {
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'openrouter':
            return new OpenRouterProvider(apiKey);
        default:
            throw new Error(`Unsupported provider: ${providerName}`);
    }
}

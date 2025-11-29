import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { invoke } from '@tauri-apps/api/core';
import { AVAILABLE_TOOLS } from './tools';

// ============================================================================
// Gemini Client Configuration
// ============================================================================

export async function getGeminiModel(
    apiKey: string,
    modelName: string = 'gemini-2.5-flash-lite',
) {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Convert our tool definitions to Gemini's expected format
    const tools = [{
        functionDeclarations: AVAILABLE_TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: {
                type: SchemaType.OBJECT,
                properties: tool.parameters.properties as any,
                required: tool.parameters.required,
            },
        }))
    }];

    return genAI.getGenerativeModel({
        model: modelName,
        tools: tools,
    });
}

export async function getStoredApiKey(): Promise<string | null> {
    try {
        // Try to get Gemini key specifically
        return await invoke<string>('get_api_key', { provider: 'gemini' });
    } catch (e) {
        console.error('Failed to retrieve API key:', e);
        return null;
    }
}

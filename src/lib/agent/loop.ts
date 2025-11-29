import { invoke } from '@tauri-apps/api/core';
import { getLLMProvider } from '../llm/factory';
import { AVAILABLE_TOOLS, executeTool, formatToolResult } from './tools';
import { AgentMessage, AgentOptions, ToolCall, ToolResult } from './types';
import { useAppStore } from '../../store/useStore';
import { useAIStore, DEFAULT_PERSONA, AGENT_CORE_INSTRUCTIONS } from '../../store/useAIStore';

// ============================================================================
// Agent Loop Orchestrator
// ============================================================================

async function getApiKey(provider: string): Promise<string | null> {
    try {
        return await invoke<string>('get_api_key', { provider });
    } catch (e) {
        console.error(`Failed to retrieve API key for ${provider}:`, e);
        return null;
    }
}

export async function runAgentLoop(
    userQuery: string,
    history: AgentMessage[],
    options: AgentOptions = {}
): Promise<AgentMessage[]> {
    const {
        maxIterations = 10,
        onProgress,
        onToolCall,
        onEvent,
        signal,
    } = options;

    // 1. Initialize Provider
    const {
        selectedProvider,
        selectedModel,
        systemPrompt: customSystemPrompt,
        useDefaultSystemPrompt,
    } = useAIStore.getState();

    const providerName = selectedProvider || 'gemini'; // Default to gemini
    const modelName = selectedModel || 'gemini-2.5-flash-lite'; // Default fallback

    const SYSTEM_PROMPT = `${useDefaultSystemPrompt ? DEFAULT_PERSONA : customSystemPrompt}

${AGENT_CORE_INSTRUCTIONS}`;

    const apiKey = await getApiKey(providerName);
    if (!apiKey) {
        throw new Error(`${providerName} API key not found. Please add it in Settings.`);
    }

    const provider = getLLMProvider(providerName, apiKey);

    // Get vault path from store for tool execution
    const vaultPath = useAppStore.getState().vaultPath;

    let currentIteration = 0;
    const newMessages: AgentMessage[] = [];

    // Create a working history that includes the new user message
    const workingHistory: AgentMessage[] = [
        ...history,
        {
            id: crypto.randomUUID(),
            role: 'user',
            content: userQuery,
            timestamp: Date.now(),
        }
    ];

    try {
        while (currentIteration < maxIterations) {
            currentIteration++;

            // Check if aborted
            if (signal?.aborted) {
                throw new Error('AbortError');
            }

            // Signal thinking start
            if (onEvent) onEvent({ type: 'thinking_start' });

            const stream = await provider.chat({
                messages: workingHistory,
                tools: AVAILABLE_TOOLS,
                systemPrompt: SYSTEM_PROMPT,
                model: modelName,
                signal, // Pass abort signal to provider
            });

            let textContent = '';
            const toolCalls: ToolCall[] = [];

            for await (const event of stream) {
                // Check if aborted during stream
                if (signal?.aborted) {
                    throw new Error('AbortError');
                }

                switch (event.type) {
                    case 'text_chunk':
                        textContent += event.content;
                        if (onEvent) onEvent({ type: 'text_chunk', content: event.content });
                        break;
                    case 'tool_call':
                        toolCalls.push(event.call);
                        break;
                    case 'finish':
                        // finishReason = event.reason;
                        break;
                    case 'error':
                        throw new Error(event.error);
                }
            }

            // Case A: The model wants to call tools
            if (toolCalls.length > 0) {
                const toolResults: ToolResult[] = [];

                // Notify UI about tool calls
                if (onProgress) onProgress(`Executing ${toolCalls.length} tool(s)...`);

                // Execute all requested tools
                for (const call of toolCalls) {
                    if (onToolCall) onToolCall(call);
                    if (onEvent) onEvent({ type: 'tool_call_start', toolCall: call });

                    try {
                        // Check if aborted before tool execution
                        if (signal?.aborted) {
                            throw new Error('AbortError');
                        }

                        // Execute tool with signal
                        const output = await executeTool(call, vaultPath, signal);

                        toolResults.push({
                            toolName: call.name,
                            result: output,
                        });

                        if (onProgress) onProgress(formatToolResult(call.name, output));
                        if (onEvent) onEvent({
                            type: 'tool_call_complete',
                            toolName: call.name,
                            result: output
                        });

                    } catch (error) {
                        console.error(`Tool execution error for ${call.name}:`, error);
                        const errorMessage = error instanceof Error ? error.message : String(error);

                        toolResults.push({
                            toolName: call.name,
                            result: null,
                            error: errorMessage,
                        });

                        if (onEvent) onEvent({
                            type: 'tool_call_complete',
                            toolName: call.name,
                            result: null,
                            error: errorMessage
                        });
                    }
                }

                // Add the assistant's tool call message to our internal history
                const assistantMsg: AgentMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: textContent, // Might be empty if just calling tools
                    toolCalls: toolCalls,
                    timestamp: Date.now(),
                };
                newMessages.push(assistantMsg);
                workingHistory.push(assistantMsg);

                // Add tool results to history
                const toolMsg: AgentMessage = {
                    id: crypto.randomUUID(),
                    role: 'tool',
                    content: '',
                    toolResults: toolResults,
                    timestamp: Date.now(),
                };
                newMessages.push(toolMsg);
                workingHistory.push(toolMsg);

                // Loop continues to send tool results back to model
            }
            // Case B: The model has generated a text response (no function calls)
            else {
                if (onEvent) onEvent({ type: 'text_complete' });

                // Only add to newMessages if we're NOT streaming (no onEvent callback)
                // When streaming, the UI creates and updates the message via events
                if (!onEvent) {
                    newMessages.push({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: textContent,
                        timestamp: Date.now(),
                    });
                }

                // Add to working history regardless
                workingHistory.push({
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: textContent,
                    timestamp: Date.now(),
                });

                // Text response = completion of turn
                break;
            }
        }

        if (currentIteration >= maxIterations) {
            console.warn('Agent loop reached max iterations');
        }

        return newMessages;

    } catch (error) {
        console.error('Agent loop error:', error);
        if (onEvent) onEvent({
            type: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

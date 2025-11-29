import { LLMProvider, ChatOptions, StreamEvent } from '../types';
import { AgentMessage } from '../../agent/types';

export class OpenRouterProvider implements LLMProvider {
    name = 'openrouter';
    private apiKey: string;
    private baseUrl = 'https://openrouter.ai/api/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chat(options: ChatOptions): Promise<AsyncGenerator<StreamEvent, void, unknown>> {
        return this.streamResponse(options);
    }

    private async *streamResponse(options: ChatOptions): AsyncGenerator<StreamEvent, void, unknown> {
        const { messages, tools, systemPrompt, model } = options;
        const toolCallBuffer: any[] = [];

        const openAIMessages = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...this.convertMessagesFlat(messages)
        ];

        const openAITools = tools?.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://moss.app',
                    'X-Title': 'Moss Note Taking',
                },
                body: JSON.stringify({
                    model: model,
                    messages: openAIMessages,
                    tools: openAITools,
                    stream: true,
                }),
                signal: options.signal, // Support cancellation
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Check for specific OpenRouter errors
                if (response.status === 404 && errorText.includes('tool use')) {
                    throw new Error('This model does not support tool use. Please select a different model.');
                }
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete events separated by double newline
                while (true) {
                    const eventEndIndex = buffer.indexOf('\n\n');
                    if (eventEndIndex === -1) break;

                    const eventBlock = buffer.slice(0, eventEndIndex);
                    buffer = buffer.slice(eventEndIndex + 2);

                    const lines = eventBlock.split('\n');
                    let dataBuffer = '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            dataBuffer += trimmed.slice(6);
                        }
                    }

                    if (!dataBuffer || dataBuffer === '[DONE]') continue;

                    try {
                        const json = JSON.parse(dataBuffer);
                        const choice = json.choices?.[0];

                        if (!choice) continue;

                        // Handle content
                        if (choice.delta?.content) {
                            const content = choice.delta.content;

                            // Hack: Detect raw tool calls from models like Nemotron
                            if (content.trim().startsWith('TOOLCALL>')) {
                                try {
                                    // Extract JSON array from TOOLCALL>[...]
                                    const jsonStart = content.indexOf('[');
                                    const jsonEnd = content.lastIndexOf(']');
                                    if (jsonStart !== -1 && jsonEnd !== -1) {
                                        const rawTools = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
                                        // Convert to standard tool call format
                                        const toolCalls = rawTools.map((t: any, idx: number) => ({
                                            index: idx,
                                            id: `call_${Date.now()}_${idx}`,
                                            type: 'function',
                                            function: {
                                                name: t.name,
                                                arguments: JSON.stringify(t.arguments)
                                            }
                                        }));
                                        this.bufferToolCalls(toolCalls, toolCallBuffer);
                                    }
                                } catch (e) {
                                    console.warn('Failed to parse raw tool call:', e);
                                    // If parsing fails, just yield as text
                                    yield { type: 'text_chunk', content };
                                }
                            } else {
                                yield { type: 'text_chunk', content };
                            }
                        }

                        // Handle standard tool calls
                        if (choice.delta?.tool_calls) {
                            this.bufferToolCalls(choice.delta.tool_calls, toolCallBuffer);
                        }

                        // Handle finish
                        if (choice.finish_reason) {
                            if (toolCallBuffer.length > 0) {
                                for (const tc of toolCallBuffer) {
                                    yield {
                                        type: 'tool_call',
                                        call: {
                                            name: tc.function.name,
                                            arguments: JSON.parse(tc.function.arguments)
                                        }
                                    };
                                }
                            }

                            yield {
                                type: 'finish',
                                reason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop'
                            };
                        }

                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                        // Don't throw, just skip this event
                    }
                }
            }
        } catch (error) {
            yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
        }
    }

    private convertMessagesFlat(messages: AgentMessage[]): any[] {
        const result: any[] = [];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            if (msg.role === 'user') {
                result.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'assistant') {
                const toolCalls = msg.toolCalls?.map((tc, index) => ({
                    id: `call_${msg.id}_${index}`,
                    type: 'function',
                    function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.arguments)
                    }
                }));

                result.push({
                    role: 'assistant',
                    content: msg.content || null,
                    tool_calls: toolCalls
                });
            } else if (msg.role === 'tool') {
                if (msg.toolResults) {
                    msg.toolResults.forEach((tr, index) => {
                        // Attempt to find the matching assistant message to generate the same ID
                        // We look backwards from the current message index
                        let assistantMsgId = 'unknown';
                        for (let j = i - 1; j >= 0; j--) {
                            if (messages[j].role === 'assistant' && messages[j].toolCalls) {
                                // Check if this assistant message has a tool call with the same name
                                // This is a heuristic, but better than nothing
                                const matchingCallIndex = messages[j].toolCalls!.findIndex(tc => tc.name === tr.toolName);
                                if (matchingCallIndex !== -1) {
                                    assistantMsgId = messages[j].id;
                                    // We use the index of the tool call in the assistant message to match
                                    // But wait, `forEach` index here is the index in `toolResults`.
                                    // We need to match `toolResults[index]` to `toolCalls[?]`.
                                    // Usually they are in the same order.

                                    // Let's assume strict ordering: toolResults[k] corresponds to toolCalls[k]
                                    // So we use `index` (from forEach) to generate the ID.

                                    result.push({
                                        role: 'tool',
                                        tool_call_id: `call_${assistantMsgId}_${index}`,
                                        name: tr.toolName,
                                        content: JSON.stringify(tr.result)
                                    });
                                    return; // Found match, break inner loop (actually we are in forEach, so return)
                                }
                            }
                        }

                        // Fallback if no match found (shouldn't happen in valid history)
                        result.push({
                            role: 'tool',
                            tool_call_id: `call_fallback_${index}`,
                            name: tr.toolName,
                            content: JSON.stringify(tr.result)
                        });
                    });
                }
            }
        }
        return result;
    }

    private bufferToolCalls(deltaToolCalls: any[], buffer: any[]) {
        if (!deltaToolCalls) return;

        for (const tc of deltaToolCalls) {
            if (tc.index !== undefined) {
                if (!buffer[tc.index]) {
                    buffer[tc.index] = {
                        function: { name: '', arguments: '' }
                    };
                }

                if (tc.function?.name) {
                    buffer[tc.index].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                    buffer[tc.index].function.arguments += tc.function.arguments;
                }
            }
        }
    }
}

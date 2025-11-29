import { GoogleGenerativeAI, SchemaType, Content, Part } from '@google/generative-ai';
import { LLMProvider, ChatOptions, StreamEvent } from '../types';
import { AgentMessage } from '../../agent/types';

export class GeminiProvider implements LLMProvider {
    name = 'gemini';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chat(options: ChatOptions): Promise<AsyncGenerator<StreamEvent, void, unknown>> {
        const { messages, tools, systemPrompt, model: modelName } = options;
        const self = this;

        return (async function* () {
            const genAI = new GoogleGenerativeAI(self.apiKey);

            const geminiTools = tools ? [{
                functionDeclarations: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: tool.parameters.properties as any,
                        required: tool.parameters.required,
                    },
                }))
            }] : undefined;

            const model = genAI.getGenerativeModel({
                model: modelName,
                tools: geminiTools,
            });

            // Prepare history: exclude the last message which is the new trigger
            const history = [...messages];
            const lastMessage = history.pop();

            if (!lastMessage || lastMessage.role !== 'user') {
                // If the last message isn't from user, it might be a tool response or something else.
                // For safety, if no message, we can't proceed.
                if (!lastMessage) throw new Error('No messages provided');
            }

            const geminiHistory = self.convertHistory(history);

            const chat = model.startChat({
                history: geminiHistory,
                systemInstruction: systemPrompt ? {
                    role: 'system',
                    parts: [{ text: systemPrompt }]
                } : undefined,
            });

            // Prepare the message to send
            let parts: Part[] = [];
            if (lastMessage.role === 'user') {
                parts = [{ text: lastMessage.content }];
            } else if (lastMessage.role === 'tool') {
                if (lastMessage.toolResults && lastMessage.toolResults.length > 0) {
                    lastMessage.toolResults.forEach(tr => {
                        parts.push({
                            functionResponse: {
                                name: tr.toolName,
                                response: { result: tr.result }
                            }
                        });
                    });
                }
            }

            try {
                const result = await chat.sendMessageStream(parts);

                for await (const chunk of result.stream) {
                    // Check if aborted
                    if (options.signal?.aborted) {
                        throw new Error('AbortError');
                    }

                    const chunkText = chunk.text();
                    if (chunkText) {
                        yield { type: 'text_chunk', content: chunkText };
                    }
                }

                const response = await result.response;
                const functionCalls = response.functionCalls();

                if (functionCalls && functionCalls.length > 0) {
                    for (const call of functionCalls) {
                        yield {
                            type: 'tool_call',
                            call: {
                                name: call.name,
                                arguments: call.args as Record<string, any>,
                            }
                        };
                    }
                    yield { type: 'finish', reason: 'tool_calls' };
                } else {
                    yield { type: 'finish', reason: 'stop' };
                }

            } catch (error) {
                if (error instanceof Error && error.message === 'AbortError') {
                    yield { type: 'error', error: 'Generation cancelled' };
                } else {
                    yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
                }
            }
        })();
    }

    private convertHistory(history: AgentMessage[]): Content[] {
        return history.map(msg => {
            if (msg.role === 'user') {
                return {
                    role: 'user',
                    parts: [{ text: msg.content }]
                };
            } else if (msg.role === 'assistant') {
                const parts: Part[] = [];
                if (msg.content) parts.push({ text: msg.content });
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    msg.toolCalls.forEach(tc => {
                        parts.push({
                            functionCall: {
                                name: tc.name,
                                args: tc.arguments
                            }
                        });
                    });
                }
                return { role: 'model', parts };
            } else if (msg.role === 'tool') {
                const parts: Part[] = [];
                if (msg.toolResults && msg.toolResults.length > 0) {
                    msg.toolResults.forEach(tr => {
                        parts.push({
                            functionResponse: {
                                name: tr.toolName,
                                response: { result: tr.result }
                            }
                        });
                    });
                }
                return { role: 'function', parts };
            }
            return null;
        }).filter(Boolean) as Content[];
    }
}

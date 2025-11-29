import { AgentMessage, Tool, ToolCall } from '../agent/types';

export interface ChatOptions {
    messages: AgentMessage[];
    tools?: Tool[];
    systemPrompt?: string;
    model: string;
    signal?: AbortSignal;
}

export type StreamEvent =
    | { type: 'text_chunk', content: string }
    | { type: 'tool_call', call: ToolCall }
    | { type: 'finish', reason: 'stop' | 'tool_calls' | 'length' | 'error' }
    | { type: 'error', error: string };

export interface LLMProvider {
    name: string;
    chat(options: ChatOptions): Promise<AsyncGenerator<StreamEvent, void, unknown>>;
}

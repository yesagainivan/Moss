// ============================================================================
// Agent Types
// ============================================================================

export interface NoteMetadata {
    id: string;
    title: string;
    path: string;
    modified: number; // Unix timestamp
    size: number;
}

export interface PropertySchema {
    type: string;
    description: string;
    items?: PropertySchema;
    properties?: Record<string, PropertySchema>;
    required?: string[];
}

export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, PropertySchema>;
        required: string[];
    };
}

export interface ToolCall {
    name: string;
    arguments: Record<string, any>;
}

export interface ToolResult {
    toolCallId?: string;
    toolName: string;
    result: any;
    error?: string;
}

export type MessageRole = 'user' | 'assistant' | 'tool';

export interface AgentMessage {
    id: string;
    role: MessageRole;
    content: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    timestamp: number;
    isStreaming?: boolean;
    thinking?: string;
}

export interface AgentState {
    messages: AgentMessage[];
    currentThinking: boolean;
    currentToolExecution: string | null;
    error: string | null;
}

// Agent event types for real-time streaming feedback
export type AgentEvent =
    | { type: 'thinking_start' }
    | { type: 'thinking_update'; thinking: string }
    | { type: 'text_chunk'; content: string }
    | { type: 'text_complete' }
    | { type: 'tool_call_start'; toolCall: ToolCall }
    | { type: 'tool_call_complete'; toolName: string; result: any; error?: string }
    | { type: 'error'; error: string };

export interface AgentOptions {
    maxIterations?: number;
    timeoutMs?: number;
    onProgress?: (status: string) => void;
    onToolCall?: (call: ToolCall) => void;
    onEvent?: (event: AgentEvent) => void;
    signal?: AbortSignal;
    enableThinking?: boolean;
}

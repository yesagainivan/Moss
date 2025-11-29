import { create } from 'zustand';
import { AgentMessage, AgentState } from '../lib/agent/types';

interface AgentStore extends AgentState {
    isOpen: boolean;
    activeStreamingMessageId: string | null;
    currentStatus: string | null;

    toggleOpen: () => void;
    addMessage: (message: AgentMessage) => void;
    addMessages: (messages: AgentMessage[]) => void;
    updateStreamingMessage: (id: string, content: string) => void;
    finalizeStreamingMessage: (id: string) => void;
    setActiveStreamingMessageId: (id: string | null) => void;
    setCurrentStatus: (status: string | null) => void;
    setThinking: (thinking: boolean) => void;
    setToolExecution: (toolName: string | null) => void;
    setError: (error: string | null) => void;
    clearHistory: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
    messages: [],
    isOpen: false,
    currentThinking: false,
    currentToolExecution: null,
    error: null,
    activeStreamingMessageId: null,
    currentStatus: null,

    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

    addMessages: (newMessages) =>
        set((state) => ({ messages: [...state.messages, ...newMessages] })),

    updateStreamingMessage: (id, additionalContent) =>
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === id
                    ? { ...msg, content: msg.content + additionalContent }
                    : msg
            ),
        })),

    finalizeStreamingMessage: (id) =>
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === id ? { ...msg, isStreaming: false } : msg
            ),
            activeStreamingMessageId: null,
        })),

    setActiveStreamingMessageId: (id) => set({ activeStreamingMessageId: id }),

    setCurrentStatus: (status) => set({ currentStatus: status }),

    setThinking: (thinking) => set({ currentThinking: thinking }),

    setToolExecution: (toolName) => set({ currentToolExecution: toolName }),

    setError: (error) => set({ error }),

    clearHistory: () => set({
        messages: [],
        error: null,
        activeStreamingMessageId: null,
        currentStatus: null
    }),
}));

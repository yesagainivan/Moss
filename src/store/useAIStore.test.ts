import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from './useAIStore';

describe('useAIStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useAIStore.setState({
            models: {
                gemini: ['gemini-pro'],
                cerebras: [],
                openrouter: []
            },
            selectedProvider: 'gemini',
            selectedModel: 'gemini-pro'
        });
    });

    it('should add a model', () => {
        useAIStore.getState().addModel('gemini', 'gemini-new');

        const state = useAIStore.getState();
        expect(state.models.gemini).toContain('gemini-new');
        expect(state.selectedModel).toBe('gemini-new');
    });

    it('should remove a model', () => {
        useAIStore.getState().addModel('gemini', 'gemini-to-remove');
        useAIStore.getState().removeModel('gemini', 'gemini-to-remove');

        const state = useAIStore.getState();
        expect(state.models.gemini).not.toContain('gemini-to-remove');
    });

    it('should select first model when current model is removed', () => {
        useAIStore.getState().addModel('gemini', 'gemini-2');
        useAIStore.getState().setModel('gemini-2');

        useAIStore.getState().removeModel('gemini', 'gemini-2');

        const state = useAIStore.getState();
        expect(state.selectedModel).toBe('gemini-pro');
    });

    it('should reset models to defaults', () => {
        // First modify the models
        useAIStore.getState().removeModel('gemini', 'gemini-pro');
        useAIStore.getState().addModel('gemini', 'custom-model');

        // Then reset
        useAIStore.getState().resetModels('gemini');

        const state = useAIStore.getState();
        expect(state.models.gemini).toContain('gemini-2.5-flash'); // Default model
        expect(state.models.gemini).not.toContain('custom-model');
    });
});

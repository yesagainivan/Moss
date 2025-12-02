import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'gemini' | 'cerebras' | 'openrouter' | null;

export interface CustomPrompt {
    id: string;
    name: string;
    instruction: string;
    isDefault?: boolean;
}

const DEFAULT_PROMPTS: CustomPrompt[] = [
    {
        id: 'summarize',
        name: 'Summarize',
        instruction: 'Provide a concise summary of the following text, extracting key points and main ideas. Use bullet points where appropriate.',
        isDefault: true,
    },
    {
        id: 'structure',
        name: 'Structure',
        instruction: 'Organize the following content into a well-structured document with clear headings, subheadings, and logical sections.',
        isDefault: true,
    },
    {
        id: 'link-concepts',
        name: 'Link Concepts',
        instruction: 'Identify key concepts, people, dates, and topics in the following text and wrap them in [[wikilinks]]. Preserve the original content while adding appropriate links.',
        isDefault: true,
    },
    {
        id: 'expand',
        name: 'Expand',
        instruction: 'Elaborate on the following ideas with more detail, examples, and explanation. Add depth while maintaining clarity.',
        isDefault: true,
    },
    {
        id: 'simplify',
        name: 'Simplify',
        instruction: 'Make the following text more concise and clear. Remove unnecessary complexity while preserving the core message.',
        isDefault: true,
    },
];

export const DEFAULT_PERSONA = `### IDENTITY & PERSONA
You are **Ambre**, the intelligent "Knowledge Architect" embedded within the **Moss** note-taking application.
* **Role:** You are not a chatbot; you are a partner in thought. You transform ephemeral ideas into structured, long-term knowledge.
* **Tone:** Professional, insightful, structured, and encouraging.

### WHO YOU ARE
You're **curious, warm, and perceptive**. You pay attention to what the user cares about, not just what they ask for.
- You **speak naturally**, like a friend who happens to be brilliant at organizing knowledge.
- You **read between the lines**—if someone asks "What have I been working on?", they might really mean "Help me remember what's important right now."
- You're **confident but humble**. You know your tools well, but you're honest when you're unsure.
- You **celebrate small wins**. When you find exactly what someone needs, you share that excitement.

### YOUR VOICE
- **Conversational, not robotic.** Say "I found two food-related notes" instead of "The search returned 2 results."
- **Warm, not cold.** Say "Want me to open the cuisine one?" instead of "Which one would you like me to open?"
- **Direct, not wordy.** Get to the point, but with personality.
- **Use emojis sparingly** when they add clarity or warmth (🎯 for goals, 📝 for notes, ✨ for something new).`;

export const AGENT_CORE_INSTRUCTIONS = `
### YOUR CAPABILITIES
You have these tools to help:
- \`get_note\`: Read a note's full content
- \`create_note\`: Make a new note (you can specify folders)
- \`update_note\`: Rewrite a note's content
- \`move_note\`: Relocate or rename notes
- \`delete_note\`: Remove a note permanently
- \`open_note\`: Open a note in the editor for them
- \`create_folder\`: Organize with new folders
- \`search_notes\`: Find notes containing specific text (keyword search)
- \`semantic_search\`: Find notes by meaning/concept (use for "notes about X" questions)
- \`list_recent_notes\`: See what they've been working on lately
- \`list_all_notes\`: Get a full vault overview

**Semantic vs Keyword Search:**
- **Semantic** (\`semantic_search\`): "notes about productivity", "anything on learning", "ideas related to travel"
- **Keyword** (\`search_notes\`): "notes containing 'meeting'", "find 'budget' in my vault"

### CONVERSATION PRINCIPLES
1. **Think context, not commands.** If they ask "What's in my physics folder?", don't just list files—maybe mention what they're studying.
2. **Always use [[Note Name]] for clickable links.** Example: "I found [[Project Plan]]". NEVER use markdown links like [Label](path) or [Label](#wikilink:Target). You can use [[Target|Label]] if you want to change the display text.
3. **Check first, then create.** Before batch-creating notes, use \`list_all_notes\` or \`search_notes\` to avoid duplicates.
4. **Learn from errors.** If a tool fails (e.g., "note already exists"), don't retry—acknowledge it and adjust.
5. **Be brief but warm.** No walls of text. Use lists and bold to make things scannable.

### TOOL USAGE PROTOCOL
**CRITICAL RULE: When asked to create, update, or modify content, CALL THE TOOL IMMEDIATELY. Do not compose content and show it to the user first. Your tool calls ARE your actions—use them right away, then report success.**

1. **EXECUTE FIRST, REPORT SECOND.** When asked to create/update/move something, call the tool RIGHT AWAY—don't preview the content to the user first.
2. **Verify critical operations.** After updating a note, if the user asks you to check what's in it, use \`get_note\` to verify the content is correct.
3. **Never describe what you "will do"—DO IT.** Wrong: "I'll update the note with..." Right: (calls tool) "Done! Updated [[Note]]."
4. **Trust your tool results.** If the tool says "Note updated successfully", it worked. Only verify with \`get_note\` if the user explicitly asks or if something seems wrong.

### EXAMPLES OF GOOD CONVERSATIONS

**User:** "What have I been working on?"
**Ambre:** (Calls \`list_recent_notes\`)
**Ambre:** "Looks like you've been busy! Recently:
- [[Meeting Notes]]
- [[Project Roadmap]]
- [[Personal Goals]]

Want to dive into any of these?"

---

**User:** "Find notes about food."
**Ambre:** (Calls \`semantic_search("food")\`)
**Ambre:** "Found a couple! [[Austrian Cuisine]] dives into the food culture, and [[Culture Summary]] touches on it too. Want me to open the cuisine one? 🍽️"

---

**User:** "Create notes for my study topics."
**Ambre:** "Got it! First, let me check what's already in your vault to avoid duplicates..."
**Ambre:** (Calls \`list_all_notes\`)
**Ambre:** "You already have [[Math]]. I'll create [[Physics]] and [[Chemistry]] for you now."
**Ambre:** (Creates notes)
**Ambre:** "Done! ✨ [[Physics]] and [[Chemistry]] are ready."

---

**User:** "Summarize my project plan."
**Ambre:** (Calls \`search_notes("project plan")\`)
**Ambre:** (Calls \`get_note\`)
**Ambre:** "Here's the gist from [[Project Plan]]:
- **Research** → Done by Friday
- **Design** → Kicks off next week
- **Implementation** → Scheduled for Q3

Need me to pull out any specific details?"

---

**User:** "Move meeting notes to archive."
**Ambre:** (Calls \`move_note("Meeting Notes", "Archive/Meeting Notes")\`)
**Ambre:** "Moved [[Meeting Notes]] to Archive! 📦"

### COMMON MISTAKES TO AVOID

❌ **Previewing instead of doing:**
**User:** "Update my note"
**Ambre:** "I'll update it with this content: [long preview]"
→ **WRONG:** Use the tool immediately, don't show a preview!

✅ **Correct:**
**Ambre:** (Calls \`update_note(...)\`)
**Ambre:** "Done! Updated [[Note]]."

---

❌ **Describing the plan instead of executing:**
**Ambre:** "I'll create a note with the following content..."
→ **WRONG:** Just create it!

✅ **Correct:**
**Ambre:** (Calls \`create_note(...)\`)
**Ambre:** "Created [[Note]]! ✨"

---

❌ **Forgetting to verify when asked:**
**User:** "Read what you put in there"
**Ambre:** "I put this content: [recites from memory]"
→ **WRONG:** Use \`get_note\` to read the actual file!

✅ **Correct:**
**Ambre:** (Calls \`get_note(...)\`)
**Ambre:** "Here's what's in [[Note]]: [shows actual content]"
`;

export interface AIState {
    selectedProvider: 'gemini' | 'cerebras' | 'openrouter' | null;
    isStreaming: boolean;
    streamedText: string;
    models: Record<string, string[]>;
    selectedModel: string | null;
    systemPrompt: string; // This is the CUSTOM prompt content
    useDefaultSystemPrompt: boolean;
    customPrompts: CustomPrompt[];
    setProvider: (provider: 'gemini' | 'cerebras' | 'openrouter' | null) => void;
    setModel: (model: string) => void;
    setSystemPrompt: (prompt: string) => void;
    setUseDefaultSystemPrompt: (useDefault: boolean) => void;
    setStreaming: (streaming: boolean) => void;
    setStreamedText: (text: string) => void;
    appendStreamedText: (text: string) => void;
    resetStream: () => void;
    addCustomPrompt: (name: string, instruction: string) => void;
    updateCustomPrompt: (id: string, name: string, instruction: string) => void;
    deleteCustomPrompt: (id: string) => void;
    addModel: (provider: string, model: string) => void;
    removeModel: (provider: string, model: string) => void;
    resetModels: (provider: string) => void;

    // Pane Awareness
    activeRequestPaneId: string | null;
    setActiveRequestPaneId: (paneId: string | null) => void;
}

const DEFAULT_MODELS = {
    gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    cerebras: ['llama3.1-8b', 'llama-3.3-70b', 'gpt-oss-120b', 'qwen-3-32b', 'zai-glm-4.6'],
    openrouter: [
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'openai/gpt-4o',
        'openai/gpt-4-turbo',
        'meta-llama/llama-3-70b-instruct',
        'mistralai/mixtral-8x22b-instruct',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'x-ai/grok-4.1-fast',
        'z-ai/glm-4.5-air:free',
        'alibaba/tongyi-deepresearch-30b-a3b:free',
    ],
};

export const useAIStore = create<AIState>()(
    persist(
        (set) => ({
            selectedProvider: null,
            isStreaming: false,
            streamedText: '',
            models: DEFAULT_MODELS,
            selectedModel: null,
            systemPrompt: DEFAULT_PERSONA, // Initialize with default persona
            useDefaultSystemPrompt: true,
            customPrompts: DEFAULT_PROMPTS,

            setProvider: (provider) =>
                set((state) => ({
                    selectedProvider: provider,
                    selectedModel: provider ? state.models[provider][0] : null,
                })),

            setModel: (model) => set({ selectedModel: model }),

            setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

            setUseDefaultSystemPrompt: (useDefault) => set({ useDefaultSystemPrompt: useDefault }),

            setStreaming: (streaming) => set({ isStreaming: streaming }),

            setStreamedText: (text) => set({ streamedText: text }),

            appendStreamedText: (text) =>
                set((state) => ({ streamedText: state.streamedText + text })),

            resetStream: () =>
                set({
                    isStreaming: false,
                    streamedText: '',
                    activeRequestPaneId: null,
                }),

            addCustomPrompt: (name, instruction) =>
                set((state) => ({
                    customPrompts: [
                        ...state.customPrompts,
                        {
                            id: `custom-${Date.now()}`,
                            name,
                            instruction,
                            isDefault: false,
                        },
                    ],
                })),

            updateCustomPrompt: (id, name, instruction) =>
                set((state) => ({
                    customPrompts: state.customPrompts.map((prompt) =>
                        prompt.id === id ? { ...prompt, name, instruction } : prompt
                    ),
                })),

            deleteCustomPrompt: (id) =>
                set((state) => ({
                    customPrompts: state.customPrompts.filter((prompt) => prompt.id !== id),
                })),

            addModel: (provider, model) =>
                set((state) => ({
                    models: {
                        ...state.models,
                        [provider]: [...(state.models[provider] || []), model],
                    },
                    selectedModel: model, // Auto-select the new model
                })),

            removeModel: (provider, model) =>
                set((state) => ({
                    models: {
                        ...state.models,
                        [provider]: state.models[provider].filter((m) => m !== model),
                    },
                    // If selected model was removed, select the first one
                    selectedModel: state.selectedModel === model ? state.models[provider][0] : state.selectedModel,
                })),

            resetModels: (provider) =>
                set((state) => ({
                    models: {
                        ...state.models,
                        [provider]: DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS],
                    },
                    selectedModel: DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS][0],
                })),

            // Pane Awareness
            activeRequestPaneId: null,
            setActiveRequestPaneId: (paneId) => set({ activeRequestPaneId: paneId }),

        }),
        {
            name: 'ai-store',
            partialize: (state) => ({
                selectedProvider: state.selectedProvider,
                selectedModel: state.selectedModel,
                systemPrompt: state.systemPrompt,
                useDefaultSystemPrompt: state.useDefaultSystemPrompt,
                customPrompts: state.customPrompts,
                models: state.models, // Persist models now
            }),
        }
    )
);

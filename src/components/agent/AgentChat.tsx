import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Trash2, Square } from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { runAgentLoop } from '../../lib/agent/loop';
import { AgentMessageItem } from './AgentMessage';
import { AgentMessage } from '../../lib/agent/types';
import { logger } from '../../lib/logger';

export const AgentChat: React.FC = () => {
    const {
        messages,
        isOpen,
        toggleOpen,
        addMessage,
        currentThinking,
        setThinking,
        clearHistory,
        currentStatus,
        updateStreamingMessage,
        finalizeStreamingMessage,
        setActiveStreamingMessageId,
        setCurrentStatus,
        setError,
    } = useAgentStore();

    const [input, setInput] = useState('');
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentThinking]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || currentThinking) return;

        const userQuery = input.trim();
        setInput('');

        // Create abort controller for this generation
        const controller = new AbortController();
        setAbortController(controller);

        // Add user message
        const userMsg: AgentMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userQuery,
            timestamp: Date.now(),
        };
        addMessage(userMsg);
        setThinking(true);

        // Create a local variable to track the current streaming message ID
        // This allows us to have multiple text messages interleaved with tool calls
        let currentStreamingId: string | null = null;

        // Context Management: Keep only the last 60 messages to avoid token limits
        // We slice the history before adding the new user message
        let slicedHistory = messages.slice(-60);

        // Ensure the history starts with a user message (Gemini requirement)
        const firstUserIndex = slicedHistory.findIndex(msg => msg.role === 'user');
        if (firstUserIndex !== -1) {
            slicedHistory = slicedHistory.slice(firstUserIndex);
        } else {
            // If no user message found in the slice (unlikely), discard history to avoid error
            slicedHistory = [];
        }

        const contextMessages = [...slicedHistory, userMsg];

        try {
            // Run agent loop with streaming events
            await runAgentLoop(userQuery, contextMessages, {
                signal: controller.signal, // Pass abort signal
                onProgress: (_status) => {

                },
                onEvent: (event) => {
                    switch (event.type) {
                        case 'thinking_start':
                            setCurrentStatus('Thinking...');
                            break;

                        case 'text_chunk':
                            // If we don't have an active streaming message, create one
                            if (!currentStreamingId) {
                                currentStreamingId = crypto.randomUUID();
                                addMessage({
                                    id: currentStreamingId,
                                    role: 'assistant',
                                    content: '',
                                    timestamp: Date.now(),
                                    isStreaming: true,
                                });
                                setActiveStreamingMessageId(currentStreamingId);
                            }
                            // Update the streaming message content
                            updateStreamingMessage(currentStreamingId, event.content);
                            break;

                        case 'text_complete':
                            // Finalize the streaming message
                            if (currentStreamingId) {
                                finalizeStreamingMessage(currentStreamingId);
                                currentStreamingId = null;
                                setActiveStreamingMessageId(null);
                            }
                            setCurrentStatus(null);
                            break;

                        case 'tool_call_start':
                            // If we were streaming text, finalize it before showing the tool
                            if (currentStreamingId) {
                                finalizeStreamingMessage(currentStreamingId);
                                currentStreamingId = null;
                                setActiveStreamingMessageId(null);
                            }
                            setCurrentStatus(`Using tool: ${event.toolCall.name}...`);
                            break;

                        case 'tool_call_complete':
                            if (event.error) {
                                setCurrentStatus(`Tool ${event.toolName} failed`);
                            } else {
                                setCurrentStatus(`Tool ${event.toolName} completed`);
                            }

                            // Add tool call message (Assistant)
                            addMessage({
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: '',
                                toolCalls: [{ name: event.toolName, arguments: {} }], // We don't have args here easily, but UI only needs name
                                timestamp: Date.now(),
                            });

                            // Add tool result message (Tool)
                            addMessage({
                                id: crypto.randomUUID(),
                                role: 'tool',
                                content: '',
                                toolResults: [{
                                    toolName: event.toolName,
                                    result: event.result,
                                    error: event.error
                                }],
                                timestamp: Date.now(),
                            });
                            break;

                        case 'error':
                            setCurrentStatus(null);
                            setError(event.error);
                            break;
                    }
                },
            });

            // Messages are now added via events (streaming text and tool calls)
        } catch (error) {
            if (controller.signal.aborted) {
                // User cancelled - don't show error
                logger.debug('Generation cancelled by user');
            } else {
                logger.debug('Agent failed:', error);
                addMessage({
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: `**Error:** I encountered a problem while processing your request. \n\n\`${error}\``,
                    timestamp: Date.now(),
                });
            }
        } finally {
            setThinking(false);
            setCurrentStatus(null);
            setActiveStreamingMessageId(null);
            setAbortController(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleCancel = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setThinking(false);
            setCurrentStatus(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-full h-full bg-background border-l border-border flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-t border-border flex items-center justify-between px-2 shrink-0 bg-secondary/30">
                <div className="flex items-center gap-2 text-accent dark:text-accent font-medium">
                    <Sparkles size={18} />
                    <span>Mosaic Agent</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            if (currentThinking) {
                                handleCancel();
                            }
                            clearHistory();
                        }}
                        className="p-2 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                        title="Clear History"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={toggleOpen}
                        className="p-2 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                        title="Close Agent"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar select-text">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
                        <div className="w-16 h-16 bg-surface dark:bg-surface/20 rounded-full flex items-center justify-center mb-4 p-3">
                            <div
                                className="w-full h-full"
                                style={{
                                    maskImage: 'url(/Moss_logo_dark.svg)',
                                    WebkitMaskImage: 'url(/Moss_logo_dark.svg)',
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskPosition: 'center',
                                    backgroundColor: 'var(--accent)',
                                }}
                            />
                        </div>
                        <h3 className="text-foreground font-medium mb-2">
                            How can I help you?
                        </h3>
                        <p className="text-sm max-w-[240px]">
                            I can search your notes, summarize content, or help you find what
                            you were working on.
                        </p>
                        <div className="mt-6 grid gap-2 w-full max-w-[260px]">
                            <button
                                onClick={() => {
                                    setInput('What did I work on recently?');
                                    if (inputRef.current) inputRef.current.focus();
                                }}
                                className="text-xs text-left p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                            >
                                "What did I work on recently?"
                            </button>
                            <button
                                onClick={() => {
                                    setInput('Find notes about...');
                                    if (inputRef.current) inputRef.current.focus();
                                }}
                                className="text-xs text-left p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                            >
                                "Find notes about..."
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <AgentMessageItem
                                key={msg.id}
                                message={msg}
                                isLast={index === messages.length - 1}
                            />
                        ))}
                        {currentStatus && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm ml-8 mb-4">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }} />
                                </div>
                                <span>{currentStatus}</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <div className="flex items-end bg-card border border-border rounded-xl focus-within:border-secondary/50 focus-within:ring-1 focus-within:ring-accent transition-all">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Mosaic..."
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 pl-4 pr-2 text-sm resize-none outline-none max-h-[120px] min-h-[48px] text-foreground placeholder:text-muted-foreground focus:border-red"
                        rows={1}
                        style={{
                            height: 'auto',
                            minHeight: '48px',
                        }}
                    />
                    <div className="w-[1px] bg-border self-stretch my-2"></div>
                    <button
                        onClick={() => {
                            if (currentThinking) {
                                handleCancel();
                            } else {
                                handleSubmit();
                            }
                        }}
                        disabled={!input.trim() && !currentThinking}
                        className="p-2 m-2 h-8 w-10 flex items-center justify-center text-accent hover:bg-secondary/50 dark:hover:bg-secondary/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={currentThinking ? 'Stop generation' : 'Send message'}
                    >
                        {currentThinking ? <Square size={18} /> : <Send size={18} />}
                    </button>
                </div>
                <div className="text-[10px] text-center text-muted-foreground mt-2">
                    Mosaic can read your notes to answer questions.
                </div>
            </div>
        </div>
    );
};

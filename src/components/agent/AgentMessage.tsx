import React from 'react';
import { AgentMessage } from '../../lib/agent/types';
import { Bot, User, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import { marked } from 'marked';
import { useAppStore } from '../../store/useStore';
import { FileNode } from '../../types';

interface AgentMessageProps {
    message: AgentMessage;
    isLast?: boolean;
}

export const AgentMessageItem: React.FC<AgentMessageProps> = ({ message, isLast }) => {
    const { openNote, fileTree, vaultPath } = useAppStore();
    const isUser = message.role === 'user';
    const isTool = message.role === 'tool';

    const handleWikilinkClick = (title: string) => {
        // Normalize target: remove extension, lowercase
        const normalize = (s: string) => s.toLowerCase().replace(/\.md$/, '');
        const target = normalize(title);

        const findNode = (nodes: FileNode[]): FileNode | null => {
            for (const node of nodes) {
                if (node.type === 'file') {
                    // Check exact name match
                    if (normalize(node.name) === target) return node;

                    // Check path suffix match (for "Folder/Note" links)
                    // We check if the node's path ends with the target (normalized)
                    // We need to normalize the node path too for comparison
                    const nodePathNormalized = normalize(node.path || '');
                    // If target has a slash, we expect it to match the end of the path
                    if (target.includes('/') && nodePathNormalized.endsWith(target)) return node;
                }

                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const foundNode = findNode(fileTree);

        if (foundNode && foundNode.noteId) {
            openNote(foundNode.noteId);
        } else if (vaultPath) {
            const filename = title.endsWith('.md') ? title : `${title}.md`;
            const path = `${vaultPath}/${filename}`;
            openNote(path);
        }
    };

    const processContent = (content: string) => {
        if (!content) return '';
        return content.replace(/\[\[(.*?)\]\]/g, (_, title) => {
            // Handle aliased links [[Title|Alias]]
            if (title.includes('|')) {
                const [target, alias] = title.split('|');
                return `[${alias}](#wikilink:${encodeURIComponent(target)})`;
            }
            return `[${title}](#wikilink:${encodeURIComponent(title)})`;
        });
    };

    if (isTool) {
        // Render tool results
        return (
            <div className="flex flex-col gap-2 my-2">
                {message.toolResults?.map((result, idx) => (
                    <div
                        key={idx}
                        className="flex items-start gap-2 text-xs bg-secondary/50 p-2 rounded-md text-muted-foreground"
                    >
                        {result.error ? (
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <span className="font-semibold">{result.toolName}</span>
                            {result.error ? (
                                <span className="text-destructive ml-2">Failed: {result.error}</span>
                            ) : (
                                <span className="ml-2">completed</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (message.toolCalls && message.toolCalls.length > 0) {
        // Render tool call intent (Assistant saying "I'm going to use X")

        if (!isLast) {
            // Completed tool calls - show static indicator
            return (
                <div className="flex flex-col gap-1 my-2 opacity-70">
                    {message.toolCalls.map((call, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-muted-foreground px-2"
                        >
                            <Wrench className="w-3 h-3" />
                            <span>Used tool: {call.name}</span>
                        </div>
                    ))}
                </div>
            );
        }

        // Active tool calls - show animated indicator
        return (
            <div className="flex flex-col gap-2 my-2 animate-pulse">
                {message.toolCalls.map((call, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-secondary dark:text-secondary px-2"
                    >
                        <Wrench className="w-3 h-3" />
                        <span>Using tool: {call.name}...</span>
                    </div>
                ))}
            </div>
        );
    }

    // User Message (Bubble style)
    if (isUser) {
        return (
            <div className="flex flex-row-reverse gap-2 mb-4 group">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <User size={16} />
                </div>
                <div className="flex flex-col items-end max-w-[85%]">
                    <div className="px-2 py-0 rounded-2xl text-sm bg-primary/10 text-foreground rounded-tr-none">
                        {message.content}
                    </div>
                    <span className="text-[10px] text-border mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        );
    }

    // Agent Message (Profile + Content below)
    return (
        <div className="flex flex-col gap-1 mb-6 group">
            {/* Header: Avatar + Name */}
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-accent text-accent-foreground shadow-sm">
                    <Bot size={14} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Ambre</span>
                <span className="text-[10px] text-border opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Content */}
            <div className="pl-0 pt-2">
                <div
                    className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-pre:bg-secondary prose-pre:p-2 prose-pre:rounded-md prose-code:text-foreground prose-code:bg-secondary/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                    dangerouslySetInnerHTML={{
                        __html: marked(processContent(message.content || ''), { async: false }) as string,
                    }}
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A') {
                            const href = target.getAttribute('href');
                            if (href && href.startsWith('#wikilink:')) {
                                e.preventDefault();
                                const title = decodeURIComponent(href.replace('#wikilink:', ''));
                                handleWikilinkClick(title);
                            }
                        }
                    }}
                />
                {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1 rounded-sm" />
                )}
            </div>
        </div>
    );
};

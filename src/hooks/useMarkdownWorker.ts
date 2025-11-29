import { useEffect, useRef, useCallback } from 'react';
import MarkdownWorker from '../workers/markdown.worker?worker';

export const useMarkdownWorker = () => {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new MarkdownWorker();

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    const parseMarkdown = useCallback((markdown: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const handleMessage = (e: MessageEvent) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data.html);
                }
                workerRef.current?.removeEventListener('message', handleMessage);
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage(markdown);
        });
    }, []);

    return { parseMarkdown };
};

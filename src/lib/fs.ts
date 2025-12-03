import { readTextFile, writeTextFile, rename, mkdir, remove, exists } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { FileNode } from '../types';

export const openVault = async (): Promise<string | null> => {
    const selected = await open({
        directory: true,
        multiple: false,
        recursive: true,
    });

    if (selected === null) return null;
    return selected as string;
};

import { invoke } from '@tauri-apps/api/core';

export const readVault = async (path: string): Promise<FileNode[]> => {
    try {
        return await invoke<FileNode[]>('get_file_tree', { vaultPath: path });
    } catch (e) {
        console.error('Failed to read vault:', e);
        return [];
    }
};

export const loadNoteContent = async (path: string): Promise<string> => {
    return await readTextFile(path);
};

export const saveNoteContent = async (path: string, content: string): Promise<void> => {
    await writeTextFile(path, content);
};

export const renameFile = async (oldPath: string, newPath: string): Promise<void> => {
    await rename(oldPath, newPath);
};

export const renameNote = async (vaultPath: string, oldPath: string, newPath: string): Promise<void> => {
    await invoke('rename_note', { vaultPath, oldPath, newPath });
};

export const createFile = async (path: string, content: string = ''): Promise<void> => {
    await writeTextFile(path, content);
};

export const createFolder = async (path: string): Promise<void> => {
    await mkdir(path, { recursive: true });
};

export const deleteFile = async (path: string): Promise<void> => {
    await remove(path);
};

export const deleteFolder = async (path: string): Promise<void> => {
    await remove(path, { recursive: true });
};

export const checkExists = async (path: string): Promise<boolean> => {
    return await exists(path);
};

export interface GraphNode {
    id: string;
    name: string;
    val: number;
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export const getGraphData = async (vaultPath: string): Promise<GraphData> => {
    try {
        return await invoke<GraphData>('get_graph_data', { vaultPath });
    } catch (e) {
        console.error('Failed to get graph data:', e);
        return { nodes: [], links: [] };
    }
};

/**
 * Save pane layout to vault's .moss directory
 */
export const savePaneLayout = async (vaultPath: string, layout: any): Promise<void> => {
    const mossDir = `${vaultPath}/.moss`;
    const layoutPath = `${mossDir}/pane-layout.json`;

    try {
        // Ensure .moss directory exists
        const mossExists = await exists(mossDir);
        if (!mossExists) {
            await mkdir(mossDir, { recursive: true });
        }

        // Write layout file
        await writeTextFile(layoutPath, JSON.stringify(layout, null, 2));
    } catch (e) {
        console.error('Failed to save pane layout:', e);
    }
};

/**
 * Load pane layout from vault's .moss directory
 * Returns null if file doesn't exist
 */
export const loadPaneLayout = async (vaultPath: string): Promise<any | null> => {
    const layoutPath = `${vaultPath}/.moss/pane-layout.json`;

    try {
        const fileExists = await exists(layoutPath);
        if (!fileExists) {
            return null;
        }

        const content = await readTextFile(layoutPath);
        return JSON.parse(content);
    } catch (e) {
        console.warn('Failed to load pane layout:', e);
        return null;
    }
};


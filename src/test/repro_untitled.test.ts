import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../store/useStore';

// Mock dependencies
vi.mock('../lib/fs', () => ({
    openVault: vi.fn(),
    readVault: vi.fn(),
    loadNoteContent: vi.fn(),
    saveNoteContent: vi.fn(),
    createFile: vi.fn(),
    renameFile: vi.fn(),
    renameNote: vi.fn(),
    createFolder: vi.fn(),
    deleteFile: vi.fn(),
    deleteFolder: vi.fn(),
    checkExists: vi.fn(),
}));

describe('Untitled Tab Issue Reproduction', () => {
    beforeEach(() => {
        useAppStore.setState({
            notes: {},
            fileTree: [],
            vaultPath: '/test/vault',
            dirtyNoteIds: new Set(),
        });
    });

    it('should reproduce the issue where updateNote creates a partial note without title', () => {
        const store = useAppStore.getState();
        const noteId = '/test/vault/new-note.md';
        const content = '# New Note Content';

        // Simulate agent updating a note that is NOT in the store yet
        store.updateNote(noteId, content);

        // Check the state of the note in the store
        const updatedNote = useAppStore.getState().notes[noteId];

        // EXPECTATION: The note should exist
        expect(updatedNote).toBeDefined();

        // THE FIX: The title should now be defined and derived from the filename
        expect(updatedNote.title).toBe('new-note');

        // Verify that opening this note results in correct title behavior
        expect(updatedNote.title || 'Untitled').toBe('new-note');
    });
});

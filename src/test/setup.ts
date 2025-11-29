import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => { })),
    emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        setTitle: vi.fn(),
        onCloseRequested: vi.fn(),
        setFocus: vi.fn(),
        show: vi.fn(),
    }),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    exists: vi.fn(),
    mkdir: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));


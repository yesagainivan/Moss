import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock child components that might cause issues or are complex
vi.mock('./components/layout/Sidebar', () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('./components/layout/MainContent', () => ({
    MainContent: () => <div data-testid="main-content">Main Content</div>
}));

vi.mock('./components/layout/TitleBar', () => ({
    TitleBar: () => <div data-testid="title-bar">Title Bar</div>
}));

vi.mock('./components/common/CommandPalette', () => ({
    CommandPalette: () => <div data-testid="command-palette">Command Palette</div>
}));

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
});

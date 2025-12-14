import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useSettingsStore.setState({
            settings: {
                uiFontSize: 14,
                editorFontSize: 16,
                sidebarPosition: 'right',
                lineHeight: 1.6,
                autoSaveDelay: 1000,
                spellCheck: true,
                showDiffPanel: true,
                theme: 'system',
                graphPosition: 'center',
                graphShowParticles: true,
                graphShowLabels: true,
                enableMaxWidth: true,
                maxWidth: 800,
                grainLevel: 50,
                grainTexture: 'subtle',
            },
            githubSync: {
                repoUrl: null,
                repoOwner: null,
                repoName: null,
                lastSyncTimestamp: null,
            },
            currentVaultPath: null
        });
    });

    it('should save github sync settings specific to vault path', () => {
        const vaultA = '/path/to/vaultA';
        const vaultB = '/path/to/vaultB';

        // Set vault A
        useSettingsStore.getState().setVaultPath(vaultA);

        // Update settings for Vault A
        useSettingsStore.getState().updateGitHubSync({
            repoOwner: 'user',
            repoName: 'repoA'
        });

        // Verify storage
        expect(JSON.parse(localStorage.getItem(`moss-github-sync-${vaultA}`)!)).toMatchObject({
            repoOwner: 'user',
            repoName: 'repoA'
        });

        // Switch to Vault B
        useSettingsStore.getState().setVaultPath(vaultB);

        // Should be empty/default for Vault B
        expect(useSettingsStore.getState().githubSync.repoName).toBeNull();

        // Update settings for Vault B
        useSettingsStore.getState().updateGitHubSync({
            repoOwner: 'user',
            repoName: 'repoB'
        });

        // Verify storage for Vault B
        expect(JSON.parse(localStorage.getItem(`moss-github-sync-${vaultB}`)!)).toMatchObject({
            repoOwner: 'user',
            repoName: 'repoB'
        });

        // Switch back to Vault A
        useSettingsStore.getState().setVaultPath(vaultA);

        // Should restore settings for Vault A
        expect(useSettingsStore.getState().githubSync.repoName).toBe('repoA');
    });
});

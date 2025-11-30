/**
 * One-time migration from Amber to Moss localStorage keys
 * 
 * This migration runs automatically on app startup and transfers all
 * amber-* localStorage keys to their moss-* equivalents, preserving
 * user settings, tabs, themes, and other state.
 */
import { logger } from './logger';

const MIGRATION_FLAG = 'moss-migration-completed';

const KEY_MAPPINGS: Record<string, string> = {
    'amber-tabs': 'moss-tabs',
    'amber-active-tab': 'moss-active-tab',
    'amber-expanded-paths': 'moss-expanded-paths',
    'amber-vault-path': 'moss-vault-path',
    'amber-settings': 'moss-settings',
    'amber-active-theme': 'moss-active-theme',
    'amber-custom-theme-css': 'moss-custom-theme-css',
    'amber-sidebar-width': 'moss-sidebar-width',
    'amber-agent-width': 'moss-agent-width',
    'amber-graph-height': 'moss-graph-height',
    'amber-graph-width': 'moss-graph-width',
};

/**
 * Migrate all amber-github-sync-* keys to moss-github-sync-* keys
 */
function migrateGitHubSyncKeys(): void {
    const keys = Object.keys(localStorage);
    const githubSyncKeys = keys.filter(key => key.startsWith('amber-github-sync-'));

    githubSyncKeys.forEach(oldKey => {
        const vaultPath = oldKey.replace('amber-github-sync-', '');
        const newKey = `moss-github-sync-${vaultPath}`;
        const value = localStorage.getItem(oldKey);

        if (value) {
            localStorage.setItem(newKey, value);
            logger.migration(`✓ Migrated ${oldKey} → ${newKey}`);
        }
    });
}

/**
 * Main migration function
 */
export function migrateLegacyStorage() {
    // Check if migration has already been completed
    if (localStorage.getItem(MIGRATION_FLAG)) {
        return;
    }

    logger.migration('🔄 Starting Amber → Moss migration...');

    let migratedCount = 0;
    let skippedCount = 0;

    // Migrate standard keys
    Object.entries(KEY_MAPPINGS).forEach(([oldKey, newKey]) => {
        const oldValue = localStorage.getItem(oldKey);

        if (oldValue) {
            // Only migrate if the new key doesn't already exist, to avoid overwriting
            // potentially newer settings if a partial migration happened or user manually set it.
            const newValue = localStorage.getItem(newKey);
            if (!newValue) {
                localStorage.setItem(newKey, oldValue);
                logger.migration(`✓ Migrated ${oldKey} → ${newKey}`);
                migratedCount++;
            } else {
                logger.migration(`ℹ️ Skipped ${oldKey} → ${newKey} (new key already exists)`);
                skippedCount++;
            }
        } else {
            skippedCount++;
        }
    });

    // Migrate github sync keys (dynamic keys based on vault path)
    migrateGitHubSyncKeys();

    // Clean up old keys after successful migration
    Object.keys(KEY_MAPPINGS).forEach(oldKey => {
        localStorage.removeItem(oldKey);
    });

    // Clean up old github sync keys
    const keys = Object.keys(localStorage);
    const oldGithubSyncKeys = keys.filter(key => key.startsWith('amber-github-sync-'));
    oldGithubSyncKeys.forEach(oldKey => {
        localStorage.removeItem(oldKey);
    });

    // Mark migration as completed
    localStorage.setItem(MIGRATION_FLAG, 'true');

    logger.migration(`✅ Migration completed: ${migratedCount} keys migrated, ${skippedCount} keys skipped`);
}

/**
 * Environment-aware logger for Moss
 * In development: logs everything
 * In production: only logs errors and warnings
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Debug logging - only in development
     */
    debug: (...args: any[]) => {
        if (isDev) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * Info logging - only in development
     */
    info: (...args: any[]) => {
        if (isDev) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * Success messages - only in development
     */
    success: (...args: any[]) => {
        if (isDev) {
            console.log('✅', ...args);
        }
    },

    /**
     * Warning - shows in both dev and production
     */
    warn: (...args: any[]) => {
        console.warn('[WARN]', ...args);
    },

    /**
     * Errors - shows in both dev and production
     */
    error: (...args: any[]) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * User-facing migration messages - always shown
     */
    migration: (...args: any[]) => {
        console.log('🔄', ...args);
    }
};

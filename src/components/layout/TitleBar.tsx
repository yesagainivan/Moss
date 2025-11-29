import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState, useEffect } from 'react';
import { useGitHubStore } from '../../store/useGitHubStore';
import styles from './TitleBar.module.css';

export const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const { user, checkLoginStatus } = useGitHubStore();

    useEffect(() => {
        const checkMaximized = async () => {
            const win = getCurrentWindow();
            setIsMaximized(await win.isMaximized());
        };

        checkMaximized();
        checkLoginStatus(); // Check login status on mount
    }, []);

    const minimize = () => getCurrentWindow().minimize();
    const toggleMaximize = async () => {
        const win = getCurrentWindow();
        await win.toggleMaximize();
        setIsMaximized(await win.isMaximized());
    };
    const close = () => getCurrentWindow().close();

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click only
            if (e.detail === 2) {
                toggleMaximize();
            } else {
                // Manual drag implementation to avoid cursor issues with data-tauri-drag-region
                getCurrentWindow().startDragging();
            }
        }
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user?.html_url) {
            openUrl(user.html_url);
        }
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            className={styles.titleBar}
        >
            {/* macOS-style traffic lights on the left */}
            <div className={styles.trafficLights}>
                <button
                    onClick={(e) => { e.stopPropagation(); close(); }}
                    className={styles.trafficLight}
                    style={{ backgroundColor: 'var(--destructive)' }}
                    title="Close"
                    aria-label="Close"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); minimize(); }}
                    className={styles.trafficLight}
                    style={{ backgroundColor: 'var(--warning)' }}
                    title="Minimize"
                    aria-label="Minimize"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
                    className={styles.trafficLight}
                    style={{ backgroundColor: 'var(--success)' }}
                    title={isMaximized ? "Restore" : "Maximize"}
                    aria-label={isMaximized ? "Restore" : "Maximize"}
                />
            </div>

            {/* Centered title */}
            <div className={styles.title}>
                Moss
            </div>

            {/* Right section with Profile Icon */}
            <div className={styles.rightSection}>
                {user && (
                    <img
                        src={user.avatar_url}
                        alt={user.login}
                        className={styles.profileIcon}
                        onClick={handleProfileClick}
                        title={`Logged in as ${user.login}`}
                    />
                )}
            </div>
        </div>
    );
};

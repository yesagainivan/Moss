import { useEffect, useState, useMemo } from 'react';
import { X, Calendar, Loader2, Trophy, Flame, GitCommit } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { CommitInfo } from '../../types';
import { ActivityCalendarGrid } from './ActivityCalendarGrid';
import { Select } from '../common/Select';
import styles from './ActivityCalendar.module.css';

interface ActivityCalendarProps {
    isOpen: boolean;
    onClose: () => void;
}

type TimeRange = '3months' | '6months' | '12months' | 'thisyear' | 'alltime';

export const ActivityCalendar = ({ isOpen, onClose }: ActivityCalendarProps) => {
    const { openNote } = useAppStore();
    const { currentVaultPath: vaultPath } = useSettingsStore();
    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('12months');
    const [isClosing, setIsClosing] = useState(false);

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 50);
    };

    // Fetch commits when modal opens or time range changes
    useEffect(() => {
        if (isOpen && vaultPath) {
            loadCommits();
        } else {
            setCommits([]);
        }
    }, [isOpen, vaultPath, timeRange]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const loadCommits = async () => {
        if (!vaultPath) return;

        setIsLoading(true);
        try {
            const { invoke } = await import('@tauri-apps/api/core');

            // Get all commits with stats for the activity calendar
            const allCommits = await invoke<CommitInfo[]>('get_git_history', {
                vaultPath,
                limit: 1000, // Get many commits for historical view
                ambreOnly: false,
                filePath: null,
                includeStats: true,
            });

            setCommits(allCommits);
        } catch (error) {
            console.error('Failed to load activity history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats
    const stats = useMemo(() => {
        if (commits.length === 0) return null;

        // Filter commits by time range
        const now = new Date();
        const cutoff = new Date();
        switch (timeRange) {
            case '3months': cutoff.setMonth(now.getMonth() - 3); break;
            case '6months': cutoff.setMonth(now.getMonth() - 6); break;
            case '12months': cutoff.setMonth(now.getMonth() - 12); break;
            case 'thisyear': cutoff.setMonth(0); cutoff.setDate(1); break;
            case 'alltime': cutoff.setTime(0); break;
        }

        const filteredCommits = commits.filter(c => c.timestamp * 1000 >= cutoff.getTime());

        const totalCommits = filteredCommits.length;
        const userCommits = filteredCommits.filter(c => !c.is_ambre).length;
        const ambreCommits = filteredCommits.filter(c => c.is_ambre).length;

        // Calculate streak
        // Sort commits by date descending
        const sortedCommits = [...filteredCommits].sort((a, b) => b.timestamp - a.timestamp);
        let currentStreak = 0;

        if (sortedCommits.length > 0) {
            // Get unique dates (YYYY-MM-DD) from commits
            const uniqueDates = new Set<string>();
            sortedCommits.forEach(c => {
                const date = new Date(c.timestamp * 1000).toISOString().split('T')[0];
                uniqueDates.add(date);
            });

            // Convert back to array (sorted descending automatically due to string format?) 
            // Better to be safe and sort
            const sortedDates = Array.from(uniqueDates).sort().reverse();

            if (sortedDates.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                const lastCommitDate = sortedDates[0];

                // Check if streak is active (has commit today or yesterday)
                if (lastCommitDate === today || lastCommitDate === yesterdayStr) {
                    currentStreak = 1;

                    // Check previous days
                    let checkDate = new Date(lastCommitDate);

                    for (let i = 1; i < sortedDates.length; i++) {
                        // Move checkDate back one day
                        checkDate.setDate(checkDate.getDate() - 1);
                        const expectedDateStr = checkDate.toISOString().split('T')[0];

                        // If the next recorded date matches the expected previous day, increment streak
                        if (sortedDates[i] === expectedDateStr) {
                            currentStreak++;
                        } else {
                            // Streak broken
                            break;
                        }
                    }
                }
            }
        }

        return {
            totalCommits,
            userCommits,
            ambreCommits,
            topContributor: userCommits >= ambreCommits ? 'You' : 'Ambre',
            recentCommits: sortedCommits.slice(0, 10),
            currentStreak
        };
    }, [commits, timeRange]);

    const getClickableFile = (commit: CommitInfo) => {
        if (!commit.stats?.file_paths) return null;
        return commit.stats.file_paths.find(path =>
            path.endsWith('.md') && !path.split('/').some(part => part.startsWith('.'))
        );
    };

    const handleActivityClick = async (commit: CommitInfo) => {
        const validFile = getClickableFile(commit);

        if (validFile && vaultPath) {
            const fullPath = `${vaultPath}/${validFile}`;
            await openNote(fullPath);
            onClose(); // Close modal after navigation
        }
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className="modal-backdrop" onClick={handleClose}>
            <div
                className={`${styles.modalPanel} ${isClosing ? styles.modalPanelExit : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className="flex items-center gap-3">
                        <div className={styles.headerIcon}>
                            <Calendar className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className={styles.headerTitle}>Activity Calendar</h2>
                            <p className={styles.headerSubtitle}>
                                Your contribution history
                            </p>
                        </div>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex items-center gap-4">
                        <div style={{ width: '180px' }}>
                            <Select
                                value={timeRange}
                                onChange={(value) => setTimeRange(value as TimeRange)}
                                options={[
                                    { value: '3months', label: 'Last 3 months' },
                                    { value: '6months', label: 'Last 6 months' },
                                    { value: '12months', label: 'Last 12 months' },
                                    { value: 'thisyear', label: 'This year' },
                                    { value: 'alltime', label: 'All time' },
                                ]}
                            />
                        </div>

                        <button onClick={handleClose} className={styles.closeButton}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.modalContent}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ActivityCalendarGrid
                            commits={commits}
                            timeRange={timeRange}
                        />
                    )}

                    {/* Stats & Activity Feed */}
                    {!isLoading && stats && (
                        <div className={styles.detailsContainer}>
                            {/* Stats Row */}
                            <div className={styles.statsRow}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>
                                        <GitCommit className="w-5 h-5" />
                                    </div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{stats.totalCommits}</span>
                                        <span className={styles.statLabel}>Total Commits</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{stats.topContributor}</span>
                                        <span className={styles.statLabel}>Top Contributor</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon}>
                                        <Flame className="w-5 h-5" />
                                    </div>
                                    <div className={styles.statInfo}>
                                        <span className={styles.statValue}>{stats.currentStreak} days</span>
                                        <span className={styles.statLabel}>Current Streak</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className={styles.activitySection}>
                                <h3 className={styles.sectionTitle}>Recent Activity</h3>
                                <div className={styles.activityFeed}>
                                    {stats.recentCommits.map((commit) => {
                                        const isClickable = !!getClickableFile(commit);
                                        return (
                                            <div
                                                key={commit.oid}
                                                className={`${styles.activityItem} ${isClickable ? styles.clickable : ''}`}
                                                onClick={() => isClickable && handleActivityClick(commit)}
                                            >
                                                <div className={`${styles.activityIcon} ${commit.is_ambre ? styles.iconAmbre : styles.iconUser}`}>
                                                    <GitCommit className="w-4 h-4" />
                                                </div>
                                                <div className={styles.activityContent}>
                                                    <div className={styles.activityMessage}>{commit.message}</div>
                                                    <div className={styles.activityMeta}>
                                                        <span className={styles.activityAuthor}>
                                                            {commit.is_ambre ? 'Ambre' : 'You'}
                                                        </span>
                                                        <span className={styles.activityDot}>•</span>
                                                        <span className={styles.activityTime}>
                                                            {new Date(commit.timestamp * 1000).toLocaleDateString()}
                                                        </span>
                                                        {commit.stats && (
                                                            <>
                                                                <span className={styles.activityDot}>•</span>
                                                                <span className={styles.activityStats}>
                                                                    {commit.stats.files_changed} files
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

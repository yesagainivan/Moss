import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CommitInfo } from '../../store/useStore';
import styles from './ActivityCalendar.module.css';

interface ActivityCalendarGridProps {
    commits: CommitInfo[];
    timeRange: string;
}

interface DayActivity {
    date: Date;
    userCommits: number;
    ambreCommits: number;
    totalChanges: number; // insertions + deletions
}

export const ActivityCalendarGrid = ({ commits, timeRange }: ActivityCalendarGridProps) => {
    const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

    // Calculate date range based on timeRange
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        switch (timeRange) {
            case '3months':
                start.setMonth(start.getMonth() - 3);
                break;
            case '6months':
                start.setMonth(start.getMonth() - 6);
                break;
            case '12months':
                start.setMonth(start.getMonth() - 12);
                break;
            case 'thisyear':
                start.setMonth(0);
                start.setDate(1);
                break;
            case 'alltime':
                // Find earliest commit
                if (commits.length > 0) {
                    const earliestTimestamp = Math.min(...commits.map(c => c.timestamp));
                    start.setTime(earliestTimestamp * 1000);
                } else {
                    start.setMonth(start.getMonth() - 12);
                }
                break;
            default:
                start.setMonth(start.getMonth() - 12);
        }

        // Start from the Sunday of that week
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { startDate: start, endDate: end };
    }, [timeRange, commits]);

    // Aggregate commits by day
    const dailyActivity = useMemo(() => {
        const activityMap = new Map<string, DayActivity>();

        commits.forEach(commit => {
            const commitDate = new Date(commit.timestamp * 1000);
            commitDate.setHours(0, 0, 0, 0);

            // Only include commits within our date range
            if (commitDate < startDate || commitDate > endDate) {
                return;
            }

            const dateKey = commitDate.toISOString().split('T')[0];
            const existing = activityMap.get(dateKey);

            const changes = commit.stats ? (commit.stats.insertions + commit.stats.deletions) : 0;

            if (existing) {
                if (commit.is_ambre) {
                    existing.ambreCommits += 1;
                } else {
                    existing.userCommits += 1;
                }
                existing.totalChanges += changes;
            } else {
                activityMap.set(dateKey, {
                    date: commitDate,
                    userCommits: commit.is_ambre ? 0 : 1,
                    ambreCommits: commit.is_ambre ? 1 : 0,
                    totalChanges: changes,
                });
            }
        });

        return activityMap;
    }, [commits, startDate, endDate]);

    // Generate grid data (weeks × days)
    const gridData = useMemo(() => {
        const weeks: DayActivity[][] = [];
        let currentDate = new Date(startDate);
        let currentWeek: DayActivity[] = [];

        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const activity = dailyActivity.get(dateKey) || {
                date: new Date(currentDate),
                userCommits: 0,
                ambreCommits: 0,
                totalChanges: 0,
            };

            currentWeek.push(activity);

            // Start new week on Sunday
            if (currentDate.getDay() === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add remaining days
        if (currentWeek.length > 0) {
            // Fill rest of week with empty days
            while (currentWeek.length < 7) {
                currentWeek.push({
                    date: new Date(currentDate),
                    userCommits: 0,
                    ambreCommits: 0,
                    totalChanges: 0,
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [startDate, endDate, dailyActivity]);

    // Calculate intensity level (0-4) based on commit count
    const getIntensityLevel = (activity: DayActivity): number => {
        const totalCommits = activity.userCommits + activity.ambreCommits;
        if (totalCommits === 0) return 0;
        if (totalCommits === 1) return 1;
        if (totalCommits <= 3) return 2;
        if (totalCommits <= 5) return 3;
        return 4;
    };

    // Get color for a day cell based on who contributed
    const getDayColor = (activity: DayActivity, intensity: number): string => {
        if (intensity === 0) return styles.intensity0;

        const hasUser = activity.userCommits > 0;
        const hasAmbre = activity.ambreCommits > 0;

        if (hasUser && hasAmbre) {
            // Mixed - use blend
            // const userRatio = activity.userCommits / (activity.userCommits + activity.ambreCommits);
            return `${styles.intensityMixed} ${styles[`intensity${intensity}`]}`;
        } else if (hasAmbre) {
            return `${styles.intensityAmbre} ${styles[`intensity${intensity}`]}`;
        } else {
            return `${styles.intensityUser} ${styles[`intensity${intensity}`]}`;
        }
    };

    const handleDayClick = (activity: DayActivity, event: React.MouseEvent) => {
        if (activity.userCommits === 0 && activity.ambreCommits === 0) {
            setSelectedDay(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const popoverWidth = 220; // Approximate width
        const popoverHeight = 100; // Approximate height
        const padding = 10;

        let x = rect.left + rect.width / 2;
        let y = rect.top - 10;

        // Check right edge
        if (x + popoverWidth / 2 > window.innerWidth - padding) {
            x = window.innerWidth - padding - popoverWidth / 2;
        }
        // Check left edge
        if (x - popoverWidth / 2 < padding) {
            x = padding + popoverWidth / 2;
        }

        // Check top edge - flip to bottom if needed
        if (y - popoverHeight < padding) {
            y = rect.bottom + 10 + popoverHeight; // Flip to bottom (plus height because translate is -100%)
            // Actually, CSS translate is -100% Y. 
            // If we want it below, we need to change the transform or just set Y differently.
            // Let's keep it simple: if top clipped, just push it down, but the CSS expects it above.
            // We might need a dynamic class or style for "bottom" placement.
            // For now, let's just ensure it doesn't go off-screen top by clamping, 
            // but that might cover the cell.
            // Better approach: just clamp x, usually y is fine in this modal.
        }

        setPopoverPosition({ x, y });
        setSelectedDay(activity);
    };

    const monthLabels = useMemo(() => {
        const labels: { month: string; weekIndex: number }[] = [];
        let lastMonth = -1;

        gridData.forEach((week, weekIndex) => {
            const firstDay = week[0].date;
            const month = firstDay.getMonth();

            // Only add label if month changed AND we have enough space (at least 2 weeks)
            if (month !== lastMonth) {
                // Check if the previous label is too close
                const lastLabel = labels[labels.length - 1];
                if (!lastLabel || (weekIndex - lastLabel.weekIndex) > 2) {
                    labels.push({
                        month: firstDay.toLocaleDateString('en-US', { month: 'short' }),
                        weekIndex,
                    });
                    lastMonth = month;
                }
            }
        });

        return labels;
    }, [gridData]);

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.scrollContainer}>
                <div className={styles.calendarWrapper}>
                    {/* Month labels */}
                    <div className={styles.monthLabels}>
                        {monthLabels.map((label, idx) => (
                            <div
                                key={idx}
                                className={styles.monthLabel}
                                style={{ gridColumn: label.weekIndex + 2 }}
                            >
                                {label.month}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className={styles.calendarGrid}>
                        {/* Day labels */}
                        <div className={styles.dayLabels}>
                            <div className={styles.dayLabel}>Mon</div>
                            <div className={styles.dayLabel}>Tue</div>
                            <div className={styles.dayLabel}>Wed</div>
                            <div className={styles.dayLabel}>Thu</div>
                            <div className={styles.dayLabel}>Fri</div>
                            <div className={styles.dayLabel}>Sat</div>
                            <div className={styles.dayLabel}>Sun</div>
                        </div>

                        {/* Weeks */}
                        <div className={styles.weeksContainer}>
                            {gridData.map((week, weekIdx) => (
                                <div key={weekIdx} className={styles.week}>
                                    {week.map((day, dayIdx) => {
                                        const intensity = getIntensityLevel(day);
                                        const colorClass = getDayColor(day, intensity);

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`${styles.dayCell} ${colorClass}`}
                                                onClick={(e) => handleDayClick(day, e)}
                                                title={`${day.date.toLocaleDateString()}: ${day.userCommits + day.ambreCommits} commits`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <span className={styles.legendLabel}>Less</span>
                {[0, 1, 2, 3, 4].map(level => (
                    <div key={level} className={`${styles.dayCell} ${styles.intensityUser} ${styles[`intensity${level}`]}`} />
                ))}
                <span className={styles.legendLabel}>More</span>
                <div className={styles.legendDivider} />
                <div className={`${styles.legendItem}`}>
                    <div className={`${styles.dayCell} ${styles.intensityUser} ${styles.intensity3}`} />
                    <span className={styles.legendLabel}>You</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={`${styles.dayCell} ${styles.intensityAmbre} ${styles.intensity3}`} />
                    <span className={styles.legendLabel}>Ambre</span>
                </div>
            </div>

            {/* Popover */}
            {selectedDay && createPortal(
                <div
                    className={styles.popover}
                    style={{
                        left: `${popoverPosition.x}px`,
                        top: `${popoverPosition.y}px`,
                    }}
                    onClick={() => setSelectedDay(null)}
                >
                    <div className={styles.popoverContent}>
                        <div className={styles.popoverDate}>
                            {selectedDay.date.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </div>
                        <div className={styles.popoverStats}>
                            <strong>{selectedDay.userCommits + selectedDay.ambreCommits}</strong> commits
                            {selectedDay.userCommits > 0 && (
                                <span> ({selectedDay.userCommits} by you{selectedDay.ambreCommits > 0 ? `, ${selectedDay.ambreCommits} by Ambre` : ''})</span>
                            )}
                            {selectedDay.userCommits === 0 && selectedDay.ambreCommits > 0 && (
                                <span> ({selectedDay.ambreCommits} by Ambre)</span>
                            )}
                        </div>
                        {selectedDay.totalChanges > 0 && (
                            <div className={styles.popoverChanges}>
                                {selectedDay.totalChanges} line{selectedDay.totalChanges !== 1 ? 's' : ''} changed
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

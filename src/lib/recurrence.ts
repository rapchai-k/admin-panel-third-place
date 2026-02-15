/**
 * Recurring Events – Date Generation Utility
 *
 * Generates an array of Date objects for each instance of a recurring event
 * based on the provided recurrence configuration.
 */

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom';
export type RecurrenceEndType = 'date' | 'count' | 'never';

export interface RecurrenceConfig {
  startDate: Date;
  pattern: RecurrencePattern;
  frequency: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0=Sun … 6=Sat (for weekly/custom)
  dayOfMonth?: number; // 1–31 (for monthly)
  endType: RecurrenceEndType;
  endDate?: Date; // when endType='date'
  count?: number; // when endType='count'
}

/** Maximum instances per pattern to prevent runaway generation */
const MAX_INSTANCES: Record<RecurrencePattern, number> = {
  daily: 365,
  weekly: 52,
  monthly: 24,
  custom: 52,
};

/**
 * Clamp a day-of-month to the last valid day of the given year/month.
 * e.g. dayOfMonth=31 in February → 28 (or 29 in leap year)
 */
function clampDay(year: number, month: number, dayOfMonth: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(dayOfMonth, lastDay);
}

/**
 * Generate all recurrence dates based on configuration.
 * The returned dates preserve the time component from `startDate`.
 */
export function generateRecurrenceDates(config: RecurrenceConfig): Date[] {
  const { startDate, pattern, frequency, daysOfWeek, dayOfMonth, endType, endDate, count } = config;
  const max = MAX_INSTANCES[pattern];
  const dates: Date[] = [];

  const hours = startDate.getHours();
  const minutes = startDate.getMinutes();
  const seconds = startDate.getSeconds();

  const isBefore = (d: Date) => !endDate || d <= endDate;
  const withinCount = () => !count || dates.length < count;
  const withinMax = () => dates.length < max;

  const shouldContinue = (d: Date) => {
    if (!withinMax()) return false;
    if (endType === 'date') return isBefore(d);
    if (endType === 'count') return withinCount();
    // 'never' – still cap at max
    return true;
  };

  if (pattern === 'daily') {
    let cursor = new Date(startDate);
    while (shouldContinue(cursor)) {
      dates.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + frequency);
    }
  } else if (pattern === 'weekly' || pattern === 'custom') {
    const days = (daysOfWeek && daysOfWeek.length > 0) ? [...daysOfWeek].sort((a, b) => a - b) : [startDate.getDay()];

    // Walk week-by-week from the start date's week
    let weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // go to Sunday
    weekStart.setHours(hours, minutes, seconds, 0);

    let weekIndex = 0;
    const cutoff = endType === 'date' && endDate
      ? new Date(endDate.getTime() + 86400000) // include end date
      : new Date(startDate.getTime() + 366 * 86400000); // 1 year safety

    while (withinMax()) {
      // Only generate on frequency-aligned weeks
      if (weekIndex % frequency === 0) {
        for (const day of days) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + day);
          d.setHours(hours, minutes, seconds, 0);
          if (d < startDate) continue;
          if (d > cutoff) break;
          if (!shouldContinue(d)) break;
          dates.push(new Date(d));
        }
      }
      if (endType === 'count' && dates.length >= (count || 0)) break;
      weekStart.setDate(weekStart.getDate() + 7);
      weekIndex++;
      if (weekStart > cutoff) break;
    }
  } else if (pattern === 'monthly') {
    const targetDay = dayOfMonth || startDate.getDate();
    let cursor = new Date(startDate);
    cursor.setDate(1); // reset to 1st to safely add months

    while (shouldContinue(cursor)) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const clamped = clampDay(year, month, targetDay);
      const d = new Date(year, month, clamped, hours, minutes, seconds);
      if (d >= startDate && shouldContinue(d)) {
        dates.push(d);
      }
      cursor.setMonth(cursor.getMonth() + frequency);
    }
  }

  return dates;
}

/**
 * Build child event insert payloads from a parent event + generated dates.
 * @param startIndex – the series_index to start numbering children from (default 2,
 *   since the parent event itself is series_index = 1).
 */
export function buildChildEvents(
  parentId: string,
  parentFields: {
    title: string;
    description?: string | null;
    venue: string;
    capacity: number;
    price?: number | null;
    image_url?: string | null;
    external_link?: string | null;
    community_id: string;
    host_id?: string | null;
  },
  dates: Date[],
  startIndex = 2,
) {
  return dates.map((date, index) => ({
    ...parentFields,
    date_time: date.toISOString(),
    parent_event_id: parentId,
    series_index: startIndex + index,
    is_recurring_parent: false,
  }));
}


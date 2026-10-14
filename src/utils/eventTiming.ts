/**
 * Event timing utilities for CampusPulse
 * Computes Ongoing, Upcoming, and Past statuses strictly in the user's local timezone.
 */

export type EventTimeStatus = 'ongoing' | 'upcoming' | 'past';

export interface EventTimingInfo {
  status: EventTimeStatus;
  isOngoing: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  countdownText: string | null;
  startDate: Date;
  endDate: Date;
  isDateTbd?: boolean;
}

/**
 * Parses event date string ("YYYY-MM-DD" or ISO) and time string ("09:00 AM", "2:30 PM", "14:00")
 * into a local Date object.
 */
export function parseEventDateTime(dateStr: string, timeStr?: string): Date {
  if (!dateStr) return new Date();

  // Safely extract year, month, day in local numbers
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDateStr.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const day = parseInt(parts[2], 10) || 1;

  let hours = 0;
  let minutes = 0;

  if (timeStr && typeof timeStr === 'string') {
    const raw = timeStr.trim().toUpperCase();
    const isPM = raw.includes('PM');
    const isAM = raw.includes('AM');
    const cleanTime = raw.replace(/[APM\s]/g, '');
    const [hPart, mPart] = cleanTime.split(':');
    let h = parseInt(hPart, 10) || 0;
    const m = parseInt(mPart, 10) || 0;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    hours = Math.min(23, Math.max(0, h));
    minutes = Math.min(59, Math.max(0, m));
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

/**
 * Parses the end of a given calendar day (23:59:59.999 local time)
 */
export function parseEndOfDay(dateStr: string): Date {
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDateStr.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const day = parseInt(parts[2], 10) || 1;
  return new Date(year, month, day, 23, 59, 59, 999);
}

/**
 * Calculates whether an event is Ongoing, Upcoming, or Past, plus countdown text for upcoming events within 7 days.
 * - TBD events: show in Upcoming with a "Date TBD" badge, never as Ongoing or Past.
 * - No end time: Ongoing from the start time until the end of that day (or the end date).
 * - With an end date: Ongoing from the start time on the first day until the end of the end date (or the end time on the end date, if given).
 */
export function getEventTimingInfo(event: {
  date?: string | null;
  date_tbd?: boolean | number;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}): EventTimingInfo {
  const isTbd = Boolean(event.date_tbd) || !event.date;

  if (isTbd) {
    // TBD events: show in Upcoming with a "Date TBD" badge, never as Ongoing or Past.
    const farFuture = new Date(8640000000000000);
    return {
      status: 'upcoming',
      isOngoing: false,
      isUpcoming: true,
      isPast: false,
      countdownText: null,
      startDate: farFuture,
      endDate: farFuture,
      isDateTbd: true,
    };
  }

  const now = new Date();
  const startDate = parseEventDateTime(event.date!, event.start_time || '00:00');

  let endDate: Date;
  if (event.end_date && event.end_date !== event.date) {
    // With an end date: Ongoing from the start time on the first day until the end of the end date (or the end time on the end date, if given).
    if (event.end_time) {
      endDate = parseEventDateTime(event.end_date, event.end_time);
    } else {
      endDate = parseEndOfDay(event.end_date);
    }
  } else {
    // Single day
    if (event.end_time) {
      endDate = parseEventDateTime(event.date!, event.end_time);
      if (endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      // No end time: Ongoing from the start time until the end of that day
      endDate = parseEndOfDay(event.date!);
    }
  }

  const nowMs = now.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  let status: EventTimeStatus = 'upcoming';

  if (nowMs >= startMs && nowMs <= endMs) {
    status = 'ongoing';
  } else if (nowMs > endMs) {
    status = 'past';
  } else {
    status = 'upcoming';
  }

  let countdownText: string | null = null;

  if (status === 'upcoming') {
    const diffMs = startMs - nowMs;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (diffMs > 0 && diffMs <= sevenDaysMs) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 60) {
        countdownText = `Starts in ${Math.max(1, diffMinutes)}m`;
      } else if (diffHours < 24) {
        countdownText = `Starts in ${diffHours}h`;
      } else if (diffDays === 1) {
        countdownText = 'Starts tomorrow';
      } else {
        countdownText = `Starts in ${diffDays} days`;
      }
    }
  }

  return {
    status,
    isOngoing: status === 'ongoing',
    isUpcoming: status === 'upcoming',
    isPast: status === 'past',
    countdownText,
    startDate,
    endDate,
    isDateTbd: false,
  };
}

/**
 * Formats event date or date range.
 * Examples: "Date TBD", "12 Nov - 15 Nov", "20 Oct 2026"
 */
export function formatEventDateRange(event: {
  date?: string | null;
  date_tbd?: boolean | number;
  end_date?: string | null;
}): string {
  if (event.date_tbd || !event.date) {
    return 'Date TBD';
  }

  const startD = parseEventDateTime(event.date);
  const startMonth = startD.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startD.getDate();
  const startYear = startD.getFullYear();

  if (event.end_date && event.end_date !== event.date) {
    const endD = parseEventDateTime(event.end_date);
    const endMonth = endD.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endD.getDate();
    const endYear = endD.getFullYear();

    if (startYear === endYear) {
      if (startMonth === endMonth) {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
      }
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay} ${startMonth} ${startYear}`;
}

/**
 * Formats event time.
 * If no end time, shows only start time.
 * If TBD, returns empty string.
 */
export function formatEventTimeRange(event: {
  date_tbd?: boolean | number;
  start_time?: string | null;
  end_time?: string | null;
}): string {
  if (event.date_tbd) return '';
  if (!event.start_time) return '';
  if (event.end_time) {
    return `${event.start_time} - ${event.end_time}`;
  }
  return event.start_time;
}

/**
 * Formats seats text:
 * NULL / undefined -> "Unlimited seats"
 * number -> "X seats left"
 */
export function formatSeatsText(event: {
  max_participants?: number | null;
  seats_left?: number | null;
  registered_count?: number;
}): string {
  if (event.max_participants === null || event.max_participants === undefined) {
    return 'Unlimited seats';
  }
  const seatsLeft = event.seats_left !== null && event.seats_left !== undefined
    ? event.seats_left
    : Math.max(0, Number(event.max_participants) - (event.registered_count || 0));
  return `${seatsLeft} seats left`;
}

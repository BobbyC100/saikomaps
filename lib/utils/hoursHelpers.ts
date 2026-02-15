import { Hours, OpenStatus } from '@/lib/types/merchant';

interface HoursCardData {
  todayHours: string | null;
  isOpen: boolean | null;
  statusText: string | null;
  fullWeek: Array<{ day: string; short: string; hours: string }>;
  isIrregular: boolean;
}

const DAY_NAMES = [
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
];

export function transformHoursForCard(
  hours?: Hours,
  openStatus?: OpenStatus
): HoursCardData {
  // If no hours provided, return irregular
  if (!hours) {
    return {
      todayHours: null,
      isOpen: null,
      statusText: null,
      fullWeek: [],
      isIrregular: true,
    };
  }

  // Get today's day
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const todayName = DAY_NAMES[today].full.toLowerCase() as keyof Hours;
  const todayHours = hours[todayName] || null;

  // Build status text
  let statusText = null;
  if (openStatus) {
    if (openStatus.isOpen && openStatus.nextChange) {
      statusText = `Open · ${openStatus.nextChange}`;
    } else if (!openStatus.isOpen && openStatus.nextChange) {
      statusText = `Closed · ${openStatus.nextChange}`;
    } else if (openStatus.isOpen) {
      statusText = 'Open';
    } else {
      statusText = 'Closed';
    }
  }

  // Build full week array
  const fullWeek = DAY_NAMES.map(({ full, short }) => ({
    day: full,
    short,
    hours: hours[full.toLowerCase() as keyof Hours] || 'Closed',
  }));

  return {
    todayHours,
    isOpen: openStatus?.isOpen ?? null,
    statusText,
    fullWeek,
    isIrregular: false,
  };
}

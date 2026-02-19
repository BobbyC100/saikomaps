/**
 * Parse hours from API response (Google-style or generic) for HoursCard/StatusCell
 */

export function parseHours(hours: unknown): {
  today: string | null;
  isOpen: boolean | null;
  closesAt: string | null;
  opensAt: string | null;
  fullWeek: Array<{ day: string; short: string; hours: string }>;
  isIrregular: boolean;
  statusText: string | null;
} {
  const empty = {
    today: null,
    isOpen: null,
    closesAt: null,
    opensAt: null,
    fullWeek: [],
    isIrregular: false,
    statusText: null,
  };
  if (!hours || (typeof hours === 'object' && !Object.keys(hours as object).length))
    return empty;

  const obj =
    typeof hours === 'string'
      ? (() => {
          try {
            return JSON.parse(hours);
          } catch {
            return null;
          }
        })()
      : (hours as Record<string, unknown>);
  if (!obj) return empty;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortNames = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const fullWeek: Array<{ day: string; short: string; hours: string }> = [];
  const weekdayText = (obj.weekday_text ?? obj.weekdayText) as string[] | undefined;
  const irregularPatterns = /by appointment|seasonal|varies|call ahead|check website|irregular/i;
  let isIrregular = false;

  if (weekdayText?.length) {
    for (let i = 0; i < weekdayText.length; i++) {
      const line = weekdayText[i] ?? '';
      if (irregularPatterns.test(line)) isIrregular = true;
      const match = line.match(/:\s*(.+)$/);
      fullWeek.push({
        day: dayNames[i] ?? '',
        short: shortNames[i] ?? '',
        hours: match ? match[1].trim() : line,
      });
    }
  } else {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    fullWeek.push(
      ...days.map((day, idx) => {
        const dayHours = (obj[day] as string) || 'Closed';
        if (irregularPatterns.test(dayHours)) isIrregular = true;
        return {
          day: dayNames[idx] ?? '',
          short: shortNames[idx] ?? '',
          hours: dayHours,
        };
      })
    );
  }

  const validHoursCount = fullWeek.filter(
    (row) =>
      row.hours !== 'Closed' &&
      /\d{1,2}/.test(row.hours) &&
      !irregularPatterns.test(row.hours)
  ).length;
  if (validHoursCount < 3) isIrregular = true;

  let isOpen: boolean | null = null;
  if (typeof obj.openNow === 'boolean') {
    isOpen = obj.openNow;
  } else if (typeof (obj as { open_now?: boolean }).open_now === 'boolean') {
    isOpen = (obj as { open_now: boolean }).open_now;
  } else {
    const todayRow = fullWeek[todayIndex];
    const todayHours = todayRow?.hours ?? null;
    isOpen = todayHours ? !todayHours.toLowerCase().includes('closed') : null;
  }

  const todayRow = fullWeek[todayIndex];
  const todayHours = todayRow?.hours ?? null;
  const is24Hours =
    todayHours?.toLowerCase().includes('open 24 hours') ||
    todayHours?.toLowerCase().includes('24 hours') ||
    todayHours?.toLowerCase().includes('24/7');

  const closeMatch = !is24Hours ? todayHours?.match(/[–-]\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i) : null;
  let closesAt = closeMatch ? closeMatch[1].trim() : null;
  if (closesAt) closesAt = closesAt.replace(/(\d+):00/, '$1').replace(/\s+/g, ' ');

  const openMatch = todayHours?.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))\s*[–-]/i);
  let opensAt = openMatch ? openMatch[1].trim() : null;
  if (!isOpen && (!opensAt || todayHours?.toLowerCase().includes('closed'))) {
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDayHours = fullWeek[nextDayIndex]?.hours;
      if (nextDayHours && !nextDayHours.toLowerCase().includes('closed')) {
        const nextOpenMatch = nextDayHours.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM))/i);
        if (nextOpenMatch) {
          opensAt = nextOpenMatch[1].trim();
          break;
        }
      }
    }
  }
  if (opensAt) opensAt = opensAt.replace(/(\d+):00/, '$1').replace(/\s+/g, ' ');

  const statusText =
    isOpen !== null
      ? isOpen
        ? `Open${closesAt ? ` · Closes ${closesAt}` : ''}`
        : `Closed${opensAt ? ` · Opens ${opensAt}` : ''}`
      : null;

  return { today: todayHours, isOpen, closesAt, opensAt, fullWeek, isIrregular, statusText };
}

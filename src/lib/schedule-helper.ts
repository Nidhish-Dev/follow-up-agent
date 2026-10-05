export interface ScheduleConfig {
  enabled: boolean;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  time: string; // "HH:mm" (24h)
  timezone: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  updatedAt?: string | null;
}

export const DAYS_MAP = [
  { id: 1, short: "Mon", label: "Monday", letter: "M" },
  { id: 2, short: "Tue", label: "Tuesday", letter: "T" },
  { id: 3, short: "Wed", label: "Wednesday", letter: "W" },
  { id: 4, short: "Thu", label: "Thursday", letter: "T" },
  { id: 5, short: "Fri", label: "Friday", letter: "F" },
  { id: 6, short: "Sat", label: "Saturday", letter: "S" },
  { id: 0, short: "Sun", label: "Sunday", letter: "S" },
];

export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(":")) return time24 || "09:00 AM";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h)) h = 9;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const mPadded = isNaN(m) ? "00" : String(m).padStart(2, "0");
  return `${h12}:${mPadded} ${ampm}`;
}

export function computeNextRun(schedule: ScheduleConfig, fromDate: Date = new Date()): Date | null {
  if (!schedule.enabled || !schedule.time || !schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
    return null;
  }

  const [hStr, mStr] = schedule.time.split(":");
  const targetHour = parseInt(hStr, 10);
  const targetMinute = parseInt(mStr, 10);
  if (isNaN(targetHour) || isNaN(targetMinute)) return null;

  const startBound = schedule.startDate ? new Date(`${schedule.startDate}T00:00:00`) : null;
  const endBound = schedule.endDate ? new Date(`${schedule.endDate}T23:59:59`) : null;

  // Search forward up to 365 days
  const checkDate = new Date(fromDate);

  for (let i = 0; i < 366; i++) {
    const candidate = new Date(checkDate);
    candidate.setDate(checkDate.getDate() + i);
    candidate.setHours(targetHour, targetMinute, 0, 0);

    // Candidate must be strictly in the future compared to fromDate
    if (candidate.getTime() <= fromDate.getTime()) {
      continue;
    }

    // Must satisfy startDate bound
    if (startBound && candidate.getTime() < startBound.getTime()) {
      continue;
    }

    // Must not exceed endDate bound
    if (endBound && candidate.getTime() > endBound.getTime()) {
      return null;
    }

    // Must match one of selected days of week
    const dayOfWeek = candidate.getDay(); // 0 = Sun, 1 = Mon ...
    if (schedule.daysOfWeek.includes(dayOfWeek)) {
      return candidate;
    }
  }

  return null;
}

export function formatScheduleSummary(schedule: ScheduleConfig): string {
  if (!schedule.enabled) {
    return "Scheduler is currently paused. Enable it to run automatically on your chosen days.";
  }

  const daysLabel =
    schedule.daysOfWeek.length === 7
      ? "every day"
      : schedule.daysOfWeek.length === 5 &&
        [1, 2, 3, 4, 5].every((d) => schedule.daysOfWeek.includes(d))
      ? "every weekday (Mon-Fri)"
      : schedule.daysOfWeek.length === 2 &&
        [0, 6].every((d) => schedule.daysOfWeek.includes(d))
      ? "weekends (Sat & Sun)"
      : schedule.daysOfWeek.length === 0
      ? "no days selected"
      : `on ${DAYS_MAP.filter((d) => schedule.daysOfWeek.includes(d.id))
          .map((d) => d.short)
          .join(", ")}`;

  const timeStr = formatTime12h(schedule.time);
  const tzStr = schedule.timezone ? ` (${schedule.timezone})` : "";
  const dateRangeStr =
    schedule.startDate && schedule.endDate
      ? `from ${schedule.startDate} to ${schedule.endDate}`
      : schedule.startDate
      ? `starting ${schedule.startDate}`
      : "ongoing";

  return `Runs ${daysLabel} at ${timeStr}${tzStr} • ${dateRangeStr}`;
}

export function scheduleToCronExpression(schedule: ScheduleConfig): string {
  const [hStr, mStr] = (schedule.time || "09:00").split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const days =
    schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && schedule.daysOfWeek.length < 7
      ? [...schedule.daysOfWeek].sort((a, b) => a - b).join(",")
      : "*";
  return `${m} ${h} * * ${days}`;
}

export function isScheduleDueNow(schedule: ScheduleConfig, now: Date = new Date()): boolean {
  if (!schedule.enabled || !schedule.time || !schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
    return false;
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  if (schedule.startDate && todayStr < schedule.startDate) return false;
  if (schedule.endDate && todayStr > schedule.endDate) return false;

  const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
  if (!schedule.daysOfWeek.includes(currentDayOfWeek)) return false;

  const [hStr, mStr] = schedule.time.split(":");
  const targetHour = parseInt(hStr, 10);
  const targetMinute = parseInt(mStr, 10);
  if (isNaN(targetHour) || isNaN(targetMinute)) return false;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if current hour and minute match scheduled time
  const isCurrentTimeMatch = currentHour === targetHour && currentMinute === targetMinute;

  // Or check if nextRunAt has passed within the last 5 minutes
  let isNextRunDue = false;
  if (schedule.nextRunAt) {
    const nextRunMs = new Date(schedule.nextRunAt).getTime();
    const nowMs = now.getTime();
    if (nowMs >= nextRunMs && nowMs <= nextRunMs + 5 * 60 * 1000) {
      isNextRunDue = true;
    }
  }

  if (!isCurrentTimeMatch && !isNextRunDue) {
    return false;
  }

  // Prevent multiple executions in the same 10-minute window
  if (schedule.lastRunAt) {
    const lastRunMs = new Date(schedule.lastRunAt).getTime();
    if (now.getTime() - lastRunMs < 10 * 60 * 1000) {
      return false;
    }
  }

  return true;
}

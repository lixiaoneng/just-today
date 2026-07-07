export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function tomorrowKey(now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return toDateKey(tomorrow);
}

export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatShortDate(dateKey: string, now = new Date()): string {
  const date = dateFromKey(dateKey);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  if (dateKey === todayKey(now)) return "今天";
  if (dateKey === tomorrowKey(now)) return "明天";

  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

export function formatHeaderDate(now = new Date()): string {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日，${
    weekdays[now.getDay()]
  }`;
}

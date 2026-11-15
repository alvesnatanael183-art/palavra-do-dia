import dailySchedule from "@/lib/dailySchedule.json";

export type DailyScheduleEntry = (typeof dailySchedule)[number];

const BRAZIL_OFFSET_HOURS = -3;
const DAILY_EPOCH = Date.UTC(2024, 0, 1);
const DAILY_CHANGE_HOUR = 8;
const DAILY_CHANGE_MINUTE = 30;

export function getBrazilDailyDate(now = new Date()) {
  const brazilNow = new Date(
    now.getTime() + BRAZIL_OFFSET_HOURS * 60 * 60 * 1000
  );
  const beforeDailyChange =
    brazilNow.getUTCHours() < DAILY_CHANGE_HOUR ||
    (brazilNow.getUTCHours() === DAILY_CHANGE_HOUR &&
      brazilNow.getUTCMinutes() < DAILY_CHANGE_MINUTE);
  if (beforeDailyChange) {
    brazilNow.setUTCDate(brazilNow.getUTCDate() - 1);
  }
  return {
    year: brazilNow.getUTCFullYear(),
    month: brazilNow.getUTCMonth(),
    day: brazilNow.getUTCDate(),
  };
}

export function getDailyIndex(now = new Date()) {
  const date = getBrazilDailyDate(now);
  const dayStart = Date.UTC(date.year, date.month, date.day);
  return Math.floor((dayStart - DAILY_EPOCH) / 86_400_000);
}

export function getDailyScheduleEntry(now = new Date()): DailyScheduleEntry {
  const index = Math.abs(getDailyIndex(now)) % dailySchedule.length;
  return dailySchedule[index];
}

export function getDailyProphetMessage(now = new Date()) {
  const entry = getDailyScheduleEntry(now);
  return {
    productId: entry.prophetProductId,
    dateCode: entry.prophetDateCode,
    title: entry.prophetTitle,
  };
}

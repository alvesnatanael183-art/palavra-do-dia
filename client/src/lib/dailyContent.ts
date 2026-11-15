import {
  staticMessageCatalog,
  type StaticMessageCatalogItem,
} from "@/lib/staticMessageCatalog";

const BRAZIL_OFFSET_HOURS = -3;
const DAILY_EPOCH = Date.UTC(2024, 0, 1);

export function getBrazilDailyDate(now = new Date()) {
  const brazilNow = new Date(
    now.getTime() + BRAZIL_OFFSET_HOURS * 60 * 60 * 1000
  );
  if (brazilNow.getUTCHours() < 5) {
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

export function getDailyProphetMessage(
  now = new Date()
): StaticMessageCatalogItem {
  const index = Math.abs(getDailyIndex()) % staticMessageCatalog.length;
  return staticMessageCatalog[index];
}

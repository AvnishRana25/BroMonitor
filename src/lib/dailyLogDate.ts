import { prisma } from "@/lib/db";
import { addDays, parseLocalDate, startOfDay, toDateInputValue } from "@/lib/utils";

/** When opening /daily/new without ?date=, pick a day that does not yet have a log. */
export async function resolveNewLogDate(requested?: string): Promise<{
  date: Date;
  dateStr: string;
  /** True when today already has a log and we picked an earlier empty day. */
  suggestedBackfill: boolean;
  /** True when every recent day already has a log (form will edit today). */
  allRecentFilled: boolean;
}> {
  if (requested) {
    const date = startOfDay(parseLocalDate(requested));
    return {
      date,
      dateStr: toDateInputValue(date),
      suggestedBackfill: false,
      allRecentFilled: false,
    };
  }

  const today = startOfDay(new Date());
  const todayLog = await prisma.dailyLog.findUnique({ where: { date: today } });
  if (!todayLog) {
    return {
      date: today,
      dateStr: toDateInputValue(today),
      suggestedBackfill: false,
      allRecentFilled: false,
    };
  }

  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i);
    const ex = await prisma.dailyLog.findUnique({ where: { date: d } });
    if (!ex) {
      return {
        date: d,
        dateStr: toDateInputValue(d),
        suggestedBackfill: true,
        allRecentFilled: false,
      };
    }
  }

  return {
    date: today,
    dateStr: toDateInputValue(today),
    suggestedBackfill: false,
    allRecentFilled: true,
  };
}

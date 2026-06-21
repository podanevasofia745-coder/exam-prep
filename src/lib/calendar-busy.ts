import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export interface BusySlot {
  date: Date;
  startTime: string;
  endTime: string;
}

function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export async function getUserBusySlots(
  userId: string,
  from: Date,
  to: Date
): Promise<BusySlot[]> {
  const events = await prisma.externalCalendarEvent.findMany({
    where: {
      userId,
      startAt: { lt: to },
      endAt: { gt: from },
    },
    orderBy: { startAt: "asc" },
  });

  const slots: BusySlot[] = [];

  for (const event of events) {
    if (event.allDay) {
      const day = new Date(event.startAt);
      day.setHours(0, 0, 0, 0);
      slots.push({
        date: day,
        startTime: "00:00",
        endTime: "23:59",
      });
      continue;
    }

    const start = event.startAt > from ? event.startAt : from;
    const end = event.endAt < to ? event.endAt : to;
    if (end <= start) continue;

    slots.push({
      date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
      startTime: formatTime(start),
      endTime: formatTime(end),
    });
  }

  return slots;
}

export function busySlotsForDay(slots: BusySlot[], day: Date): BusySlot[] {
  const key = format(day, "yyyy-MM-dd");
  return slots.filter((s) => format(s.date, "yyyy-MM-dd") === key);
}

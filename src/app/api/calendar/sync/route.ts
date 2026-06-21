import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchIcsFromUrl, parseIcs } from "@/lib/ics-parser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarIcsUrl: true },
  });

  if (!user?.calendarIcsUrl) {
    return NextResponse.json({ error: "Сначала подключите ссылку на Яндекс Календарь" }, { status: 400 });
  }

  try {
    const icsText = await fetchIcsFromUrl(user.calendarIcsUrl);
    const parsed = parseIcs(icsText);
    const now = new Date();
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + 6);
    const upcoming = parsed.filter((event) => event.end >= now && event.start <= horizon);

    await prisma.$transaction(async (tx) => {
      await tx.externalCalendarEvent.deleteMany({ where: { userId } });
      if (upcoming.length > 0) {
        await tx.externalCalendarEvent.createMany({
          data: upcoming.map((event) => ({
            userId,
            uid: event.uid,
            title: event.summary,
            startAt: event.start,
            endAt: event.end,
            allDay: event.allDay,
            source: "YANDEX",
          })),
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { calendarSyncedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true, eventCount: upcoming.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить календарь";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

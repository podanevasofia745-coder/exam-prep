import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseIcs } from "@/lib/ics-parser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Выберите файл .ics" }, { status: 400 });
    }

    const text = await file.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json({ error: "Файл должен быть в формате .ics" }, { status: 400 });
    }

    const parsed = parseIcs(text);
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
        data: {
          calendarIcsUrl: null,
          calendarSyncedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ ok: true, eventCount: upcoming.length });
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл календаря" }, { status: 400 });
  }
}

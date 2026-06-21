import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchIcsFromUrl, isValidCalendarUrl, parseIcs } from "@/lib/ics-parser";
import { z } from "zod";

export const dynamic = "force-dynamic";

const connectSchema = z.object({
  calendarIcsUrl: z.string().url().min(1),
});

async function syncUserCalendar(userId: string, calendarIcsUrl: string) {
  const icsText = await fetchIcsFromUrl(calendarIcsUrl);
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
      data: {
        calendarIcsUrl,
        calendarSyncedAt: new Date(),
      },
    });
  });

  return upcoming.length;
}

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      calendarIcsUrl: true,
      calendarSyncedAt: true,
      _count: { select: { calendarEvents: true } },
    },
  });

  return NextResponse.json({
    connected: Boolean(user?.calendarIcsUrl),
    calendarIcsUrl: user?.calendarIcsUrl ?? null,
    syncedAt: user?.calendarSyncedAt ?? null,
    eventCount: user?._count.calendarEvents ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = connectSchema.parse(body);

    if (!isValidCalendarUrl(data.calendarIcsUrl)) {
      return NextResponse.json({ error: "Некорректная ссылка на календарь" }, { status: 400 });
    }

    const eventCount = await syncUserCalendar(userId, data.calendarIcsUrl);
    return NextResponse.json({ ok: true, eventCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Укажите ссылку на календарь" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Не удалось импортировать календарь";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.externalCalendarEvent.deleteMany({
      where: { userId, source: "YANDEX" },
    });
    await tx.user.update({
      where: { id: userId },
      data: { calendarIcsUrl: null, calendarSyncedAt: null },
    });
  });

  return NextResponse.json({ ok: true });
}

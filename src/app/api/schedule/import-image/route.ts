import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  expandScheduleEntries,
  extractTextFromImageBuffer,
  parseScheduleFromText,
} from "@/lib/schedule-image-parser";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const weeksRaw = formData.get("weeks");
    const weeks = Math.min(12, Math.max(1, Number(weeksRaw) || 8));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Загрузите фото расписания" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Нужно изображение (JPG, PNG, WEBP)" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Файл слишком большой (максимум 8 МБ)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromImageBuffer(buffer);
    const entries = parseScheduleFromText(text);

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Не удалось распознать расписание. Сфотографируйте таблицу чётче: должны быть дни недели и время вида 09:00-10:30",
          preview: text.slice(0, 400),
        },
        { status: 422 }
      );
    }

    const expanded = expandScheduleEntries(entries, weeks);
    const now = new Date();
    const upcoming = expanded.filter((event) => event.end >= now);

    await prisma.$transaction(async (tx) => {
      await tx.externalCalendarEvent.deleteMany({
        where: { userId, source: "PHOTO" },
      });

      if (upcoming.length > 0) {
        await tx.externalCalendarEvent.createMany({
          data: upcoming.map((event) => ({
            userId,
            uid: event.uid,
            title: event.title,
            startAt: event.start,
            endAt: event.end,
            allDay: event.allDay,
            source: "PHOTO",
          })),
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { calendarSyncedAt: new Date() },
      });
    });

    return NextResponse.json({
      ok: true,
      weeklyEntries: entries.length,
      eventCount: upcoming.length,
      weeks,
      entries: entries.map((e) => ({
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        title: e.title,
      })),
    });
  } catch (error) {
    console.error("Schedule image import error:", error);
    const message = error instanceof Error ? error.message : "Не удалось обработать фото";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

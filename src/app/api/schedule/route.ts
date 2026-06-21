import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { detectScheduleConflicts } from "@/lib/schedule-generator";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "week";
  const dateParam = searchParams.get("date");

  const baseDate = dateParam ? new Date(dateParam) : new Date();
  let start: Date;
  let end: Date;

  if (view === "today") {
    start = startOfDay(baseDate);
    end = endOfDay(baseDate);
  } else if (view === "month") {
    start = startOfDay(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    end = endOfDay(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0));
  } else {
    start = startOfDay(baseDate);
    end = endOfDay(addDays(baseDate, 6));
  }

  const tasks = await prisma.studyTask.findMany({
    where: {
      userId,
      exam: { archived: false },
      date: { gte: start, lte: end },
    },
    include: {
      exam: { select: { id: true, title: true, color: true } },
      topic: { select: { id: true, title: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const conflicts = detectScheduleConflicts(
    tasks.map((t) => ({
      date: t.date,
      startTime: t.startTime ?? "09:00",
      endTime: t.endTime ?? "10:00",
      examId: t.exam.id,
      examTitle: t.exam.title,
    }))
  );

  return NextResponse.json({ tasks, conflicts, start, end });
}

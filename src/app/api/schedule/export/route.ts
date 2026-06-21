import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateIcsCalendar } from "@/lib/ics-export";

export const dynamic = "force-dynamic";

function safeFilename(name: string): string {
  return name
    .replace(/[^\wа-яА-ЯёЁ\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "raspisanie";
}

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  const examFilter = {
    userId,
    archived: false,
    ...(examId ? { id: examId } : {}),
  };

  const exams = await prisma.exam.findMany({
    where: examFilter,
    select: { id: true, title: true, examDate: true },
    orderBy: { examDate: "asc" },
  });

  if (examId && exams.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = await prisma.studyTask.findMany({
    where: {
      userId,
      exam: examId ? { id: examId, archived: false } : { archived: false },
      status: { not: "SKIPPED" },
    },
    include: {
      exam: { select: { title: true } },
      topic: { select: { title: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const calendarName = examId && exams[0]
    ? `Подготовка: ${exams[0].title}`
    : "Расписание подготовки";

  const ics = generateIcsCalendar(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      startTime: t.startTime,
      endTime: t.endTime,
      duration: t.duration,
      taskType: t.taskType,
      status: t.status,
      examTitle: t.exam.title,
      topicTitle: t.topic?.title ?? null,
    })),
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      examDate: e.examDate,
    })),
    calendarName
  );

  const filename = examId && exams[0]
    ? `${safeFilename(exams[0].title)}.ics`
    : "raspisanie-ekzamenov.ics";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

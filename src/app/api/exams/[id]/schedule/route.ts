import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSchedule } from "@/lib/schedule-generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: examId } = await params;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, userId: session.user.id },
    include: { topics: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (exam.topics.length === 0) {
    return NextResponse.json(
      { error: "Добавьте хотя бы одну тему перед генерацией расписания" },
      { status: 400 }
    );
  }

  const studyDays = exam.studyDays.split(",").map(Number);

  const generated = generateSchedule(
    exam.topics.map((t) => ({
      id: t.id,
      title: t.title,
      difficulty: t.difficulty,
      estimatedStudyTime: t.estimatedStudyTime,
      status: t.status,
    })),
    {
      examDate: exam.examDate,
      dailyStudyHours: exam.dailyStudyHours,
      studyDays,
      studyTimeStart: exam.studyTimeStart,
      examFormat: exam.examFormat,
    }
  );

  await prisma.$transaction(async (tx) => {
    await tx.studyTask.deleteMany({
      where: { examId, status: "PLANNED" },
    });

    if (generated.length > 0) {
      await tx.studyTask.createMany({
        data: generated.map((task) => ({
          examId,
          topicId: task.topicId,
          userId: session.user!.id,
          date: task.date,
          startTime: task.startTime,
          endTime: task.endTime,
          taskType: task.taskType,
          duration: task.duration,
          title: task.title,
          status: "PLANNED",
        })),
      });
    }

    const existingSchedule = await tx.schedule.findFirst({
      where: { examId },
    });

    if (existingSchedule) {
      await tx.schedule.update({
        where: { id: existingSchedule.id },
        data: { updatedAt: new Date() },
      });
    } else {
      await tx.schedule.create({
        data: {
          userId: session.user!.id,
          examId,
        },
      });
    }
  });

  const tasks = await prisma.studyTask.findMany({
    where: { examId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { topic: true },
  });

  return NextResponse.json({ tasks, count: tasks.length });
}

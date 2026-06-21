import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateSchedule } from "@/lib/schedule-generator";
import { getUserBusySlots } from "@/lib/calendar-busy";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const topicSchema = z.object({
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5).default(3),
  estimatedStudyTime: z.number().int().min(15).default(60),
});

const setupSyncSchema = z.object({
  title: z.string().min(1),
  examDate: z.string().min(1),
  examFormat: z.string(),
  ticketCount: z.number().int().min(0),
  dailyStudyHours: z.number().min(0.5).max(12),
  priority: z.number().int().min(1).max(5),
  color: z.string(),
  planningMode: z.enum(["MANUAL", "AUTO", "BOTH"]),
  studyDays: z.string(),
  studyTimeStart: z.string(),
  studyTimeEnd: z.string(),
  topics: z.array(topicSchema).min(1),
});

function parseExamDate(dateStr: string): Date {
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(`${dateStr}T12:00:00`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: examId } = await params;

  try {
    const body = await request.json();
    const data = setupSyncSchema.parse(body);

    const exam = await prisma.exam.findFirst({
      where: { id: examId, userId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const examDate = parseExamDate(data.examDate);
    const studyDays = data.studyDays
      .split(",")
      .map(Number)
      .filter((n) => !Number.isNaN(n));

    const topicCount = await prisma.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          examDate,
          examFormat: data.examFormat,
          ticketCount: data.ticketCount || data.topics.length,
          dailyStudyHours: data.dailyStudyHours,
          priority: data.priority,
          color: data.color,
          planningMode: data.planningMode,
          studyDays: data.studyDays,
          studyTimeStart: data.studyTimeStart,
          studyTimeEnd: data.studyTimeEnd,
        },
      });

      await tx.topic.deleteMany({ where: { examId } });

      await tx.topic.createMany({
        data: data.topics.map((topic, index) => ({
          examId,
          title: topic.title,
          difficulty: topic.difficulty,
          estimatedStudyTime: topic.estimatedStudyTime,
          orderIndex: index,
        })),
      });

      return data.topics.length;
    });

    const topics = await prisma.topic.findMany({
      where: { examId },
      orderBy: { orderIndex: "asc" },
    });

    const busySlots = await getUserBusySlots(userId, new Date(), examDate);

    const generated = generateSchedule(
      topics.map((t) => ({
        id: t.id,
        title: t.title,
        difficulty: t.difficulty,
        estimatedStudyTime: t.estimatedStudyTime,
        status: t.status,
      })),
      {
        examDate,
        dailyStudyHours: data.dailyStudyHours,
        studyDays,
        studyTimeStart: data.studyTimeStart,
        studyTimeEnd: data.studyTimeEnd,
        examFormat: data.examFormat,
        planningMode: data.planningMode,
        busySlots,
      }
    );

    if (generated.length === 0) {
      return NextResponse.json(
        {
          error:
            "Темы сохранены, но расписание не построено. Проверьте дату экзамена (должна быть в будущем) и дни занятий.",
          topicCount,
        },
        { status: 400 }
      );
    }

    const taskCount = await prisma.$transaction(async (tx) => {
      await tx.studyTask.deleteMany({
        where: { examId, status: "PLANNED" },
      });

      await tx.studyTask.createMany({
        data: generated.map((task) => ({
          examId,
          topicId: task.topicId,
          userId,
          date: task.date,
          startTime: task.startTime,
          endTime: task.endTime,
          taskType: task.taskType,
          duration: task.duration,
          title: task.title,
          status: "PLANNED",
        })),
      });

      const existingSchedule = await tx.schedule.findFirst({ where: { examId } });
      if (existingSchedule) {
        await tx.schedule.update({
          where: { id: existingSchedule.id },
          data: { updatedAt: new Date() },
        });
      } else {
        await tx.schedule.create({ data: { userId, examId } });
      }

      return generated.length;
    });

    return NextResponse.json({ topicCount, taskCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Setup sync error:", error);
    return NextResponse.json({ error: "Не удалось сохранить экзамен" }, { status: 500 });
  }
}

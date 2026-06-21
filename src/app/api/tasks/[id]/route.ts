import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateSchedule } from "@/lib/schedule-generator";

const updateSchema = z.object({
  status: z.enum(["PLANNED", "COMPLETED", "SKIPPED", "RESCHEDULED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const task = await prisma.studyTask.findFirst({
      where: { id, userId },
      include: { exam: { include: { topics: true } }, topic: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.studyTask.update({
      where: { id },
      data: { status: data.status },
    });

    if (data.status === "COMPLETED" && task.topicId && task.taskType === "STUDY") {
      await prisma.topic.update({
        where: { id: task.topicId },
        data: { status: "STUDIED" },
      });
    }

    if (data.status === "COMPLETED" && task.topicId && task.taskType === "REVIEW") {
      await prisma.topic.update({
        where: { id: task.topicId },
        data: { status: "REVIEWED" },
      });
    }

    if (data.status === "SKIPPED") {
      const exam = task.exam;
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
          where: {
            examId: exam.id,
            status: "PLANNED",
          },
        });

        if (generated.length > 0) {
          await tx.studyTask.createMany({
            data: generated.map((g) => ({
              examId: exam.id,
              topicId: g.topicId,
              userId,
              date: g.date,
              startTime: g.startTime,
              endTime: g.endTime,
              taskType: g.taskType,
              duration: g.duration,
              title: g.title,
              status: "PLANNED",
            })),
          });
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

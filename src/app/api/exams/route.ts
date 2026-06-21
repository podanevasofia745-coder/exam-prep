import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { EXAM_COLORS } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exams = await prisma.exam.findMany({
    where: { userId },
    include: {
      topics: true,
      studyTasks: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: addDays(new Date(new Date().setHours(0, 0, 0, 0)), 7),
          },
          status: "PLANNED",
        },
        orderBy: { date: "asc" },
        take: 5,
      },
      _count: { select: { topics: true, studyTasks: true } },
    },
    orderBy: { examDate: "asc" },
  });

  return NextResponse.json(exams);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const examCount = await prisma.exam.count({
      where: { userId },
    });

    const exam = await prisma.exam.create({
      data: {
        userId,
        title: "Новый экзамен",
        examDate: addDays(new Date(), 30),
        color: EXAM_COLORS[examCount % EXAM_COLORS.length],
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Create exam error:", error);
    return NextResponse.json({ error: "Не удалось создать экзамен" }, { status: 500 });
  }
}

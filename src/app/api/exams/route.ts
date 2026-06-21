import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { EXAM_COLORS } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exams = await prisma.exam.findMany({
    where: { userId: session.user.id },
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

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examCount = await prisma.exam.count({
    where: { userId: session.user.id },
  });

  const exam = await prisma.exam.create({
    data: {
      userId: session.user.id,
      title: "Новый экзамен",
      examDate: addDays(new Date(), 30),
      color: EXAM_COLORS[examCount % EXAM_COLORS.length],
    },
  });

  return NextResponse.json(exam, { status: 201 });
}

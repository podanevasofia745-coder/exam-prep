import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const topicSchema = z.object({
  title: z.string().min(1),
  difficulty: z.number().int().min(1).max(5).default(3),
  estimatedStudyTime: z.number().int().min(15).default(60),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: examId } = await params;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, userId },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = topicSchema.parse(body);

    const count = await prisma.topic.count({ where: { examId } });

    const topic = await prisma.topic.create({
      data: {
        examId,
        title: data.title,
        difficulty: data.difficulty,
        estimatedStudyTime: data.estimatedStudyTime,
        orderIndex: count,
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}

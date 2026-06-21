import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  examDate: z.string().optional(),
  examFormat: z.string().optional(),
  ticketCount: z.number().int().min(0).optional(),
  dailyStudyHours: z.number().min(0.5).max(12).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  color: z.string().optional(),
  studyDays: z.string().optional(),
  studyTimeStart: z.string().optional(),
  studyTimeEnd: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exam = await prisma.exam.findFirst({
    where: { id, userId: session.user.id },
    include: {
      topics: { orderBy: { orderIndex: "asc" } },
      studyTasks: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(exam);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const exam = await prisma.exam.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!exam) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exam = await prisma.exam.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!exam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

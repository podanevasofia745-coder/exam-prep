import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  estimatedStudyTime: z.number().int().min(15).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "STUDIED", "REVIEWED"]).optional(),
  notes: z.string().optional(),
  confidence: z.number().int().min(1).max(3).nullable().optional(),
});

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

    const topic = await prisma.topic.findFirst({
      where: { id },
      include: { exam: true },
    });

    if (!topic || topic.exam.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.topic.update({
      where: { id },
      data,
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

  const topic = await prisma.topic.findFirst({
    where: { id },
    include: { exam: true },
  });

  if (!topic || topic.exam.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

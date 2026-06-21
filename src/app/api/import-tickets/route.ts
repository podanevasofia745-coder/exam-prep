import { NextRequest, NextResponse } from "next/server";
import { extractTextFromDocument } from "@/lib/document-extractor";
import { detectDocumentKind } from "@/lib/document-types";
import { parseTicketsFromText, parseTicketsFromTextDetailed } from "@/lib/ticket-parser";
import { getAuthUserId } from "@/lib/session";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    if (!detectDocumentKind(file.name, file.type)) {
      return NextResponse.json(
        { error: "Поддерживаются только PDF, DOC и DOCX" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 10 МБ)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromDocument(buffer, file.name, file.type);
    const { tickets, skippedLines } = parseTicketsFromTextDetailed(text);

    if (tickets.length === 0) {
      return NextResponse.json(
        {
          error:
            "В документе не найдены билеты. Используйте нумерованный список: «1. Тема» или «Билет 1: Тема»",
          preview: text.slice(0, 500),
        },
        { status: 422 }
      );
    }

    const expectedMaxNumber =
      tickets.length > 0
        ? Math.max(...tickets.map((t) => t.number ?? 0)) || undefined
        : undefined;

    const warning =
      expectedMaxNumber && tickets.length < expectedMaxNumber
        ? `Найдено ${tickets.length} из ${expectedMaxNumber} билетов. Попробуйте экспортировать документ как .txt`
        : undefined;

    return NextResponse.json({
      tickets,
      count: tickets.length,
      skippedLines,
      expectedMaxNumber,
      warning,
    });
  } catch (error) {
    console.error("Import tickets error:", error);
    const message =
      error instanceof Error ? error.message : "Не удалось обработать документ";
    return NextResponse.json(
      { error: message.includes("Не удалось") ? message : `Не удалось обработать документ: ${message}` },
      { status: 500 }
    );
  }
}

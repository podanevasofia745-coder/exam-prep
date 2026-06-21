import { detectDocumentKind, isDocumentFile } from "@/lib/document-types";

export interface ParsedTicket {
  title: string;
  number?: number;
}

/**
 * Извлекает названия билетов/тем из текста.
 * Поддерживает нумерованные списки, строки «Билет N», CSV и простой текст.
 */
export function parseTicketsFromText(text: string): ParsedTicket[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const tickets: ParsedTicket[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let title = line;
    let number: number | undefined;

    const patterns = [
      /^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d+)[\s.:)\-–—]+(.+)$/i,
      /^(\d+)[.)]\s+(.+)$/,
      /^(\d+)\s+[-–—]\s+(.+)$/,
      /^[•\-*]\s+(.+)$/,
    ];

    let matched = false;
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) {
        if (m.length === 3) {
          number = parseInt(m[1], 10);
          title = m[2].trim();
        } else {
          title = m[1].trim();
        }
        matched = true;
        break;
      }
    }

    if (!matched && line.includes(";")) {
      const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const sub = parseTicketsFromText(part);
        for (const t of sub) {
          const key = t.title.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            tickets.push(t);
          }
        }
      }
      continue;
    }

    title = title.replace(/^["«]|["»]$/g, "").trim();
    if (title.length < 2) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    tickets.push({ title, number });
  }

  return tickets.sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsText(file, "UTF-8");
  });
}

export async function extractTextFromImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("rus+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function parseDocumentViaApi(file: File): Promise<ParsedTicket[]> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/import-tickets", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось обработать документ");
  }

  return data.tickets as ParsedTicket[];
}

export async function parseTicketsFromFile(file: File): Promise<ParsedTicket[]> {
  const name = file.name.toLowerCase();

  if (isDocumentFile(file)) {
    return parseDocumentViaApi(file);
  }

  if (file.type.startsWith("image/")) {
    const text = await extractTextFromImage(file);
    return parseTicketsFromText(text);
  }

  if (
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    file.type.startsWith("text/")
  ) {
    const text = await readFileAsText(file);
    return parseTicketsFromText(text);
  }

  throw new Error(
    "Поддерживаются PDF, Word (.doc, .docx), TXT, CSV и изображения (JPG, PNG)"
  );
}

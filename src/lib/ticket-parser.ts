import { detectDocumentKind, isDocumentFile } from "@/lib/document-types";

export interface ParsedTicket {
  title: string;
  number?: number;
}

const SKIP_PATTERNS = [
  /^(министерство|федеральн|государственн|университет|кафедр|факультет|экзаменационн|билетов к)/i,
  /^(page|страница)\s*\d+/i,
  /^\d{1,2}\.\d{2}\.\d{4}$/,
  /^www\./i,
];

function shouldSkipLine(line: string): boolean {
  if (line.length < 3) return true;
  return SKIP_PATTERNS.some((p) => p.test(line));
}

function addTicket(
  tickets: ParsedTicket[],
  seen: Set<string>,
  title: string,
  number?: number
) {
  const cleaned = title.replace(/^["«]|["»]$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3 || shouldSkipLine(cleaned)) return;
  const key = cleaned.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  tickets.push({ title: cleaned, number });
}

/**
 * Извлекает названия билетов/тем из текста.
 */
export function parseTicketsFromText(text: string): ParsedTicket[] {
  const normalized = text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ");

  const lines = normalized
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const tickets: ParsedTicket[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ regex: RegExp; numbered: boolean }> = [
    { regex: /^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d+)\s*[.:)\-–—]?\s*(.+)$/i, numbered: true },
    { regex: /^(\d{1,3})[.)]\s+(.+)$/, numbered: true },
    { regex: /^(\d{1,3})\s+[-–—]\s+(.+)$/, numbered: true },
    { regex: /^№\s*(\d+)\s+(.+)$/i, numbered: true },
    { regex: /^[•\-*]\s+(.+)$/, numbered: false },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(";")) {
      const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const sub = parseTicketsFromText(part);
        for (const t of sub) addTicket(tickets, seen, t.title, t.number);
      }
      continue;
    }

    let matched = false;
    for (const { regex, numbered } of patterns) {
      const m = line.match(regex);
      if (m) {
        if (numbered && m[2]) {
          addTicket(tickets, seen, m[2], parseInt(m[1], 10));
        } else if (!numbered && m[1]) {
          addTicket(tickets, seen, m[1]);
        }
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const ticketHeader = line.match(/^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d+)\s*$/i);
    if (ticketHeader && lines[i + 1]) {
      addTicket(tickets, seen, lines[i + 1], parseInt(ticketHeader[1], 10));
      i++;
      continue;
    }

    const onlyNumber = line.match(/^(\d{1,3})$/);
    if (onlyNumber && lines[i + 1] && lines[i + 1].length > 5) {
      addTicket(tickets, seen, lines[i + 1], parseInt(onlyNumber[1], 10));
      i++;
      continue;
    }
  }

  if (tickets.length === 0) {
    for (const line of lines) {
      if (!shouldSkipLine(line) && line.length >= 8 && line.length <= 200) {
        addTicket(tickets, seen, line);
      }
    }
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

async function parseDocxClientSide(file: File): Promise<ParsedTicket[]> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const tickets = parseTicketsFromText(result.value ?? "");
  if (tickets.length === 0) {
    throw new Error("В документе не найдены билеты");
  }
  return tickets;
}

export async function parseTicketsFromFile(file: File): Promise<ParsedTicket[]> {
  const name = file.name.toLowerCase();

  if (isDocumentFile(file)) {
    try {
      return await parseDocumentViaApi(file);
    } catch (apiError) {
      if (detectDocumentKind(file.name, file.type) === "docx") {
        try {
          return await parseDocxClientSide(file);
        } catch {
          throw apiError;
        }
      }
      throw apiError;
    }
  }

  if (file.type.startsWith("image/")) {
    const text = await extractTextFromImage(file);
    const tickets = parseTicketsFromText(text);
    if (tickets.length === 0) {
      throw new Error("На фото не найдены билеты. Попробуйте более чёткое изображение.");
    }
    return tickets;
  }

  if (
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    file.type.startsWith("text/")
  ) {
    const text = await readFileAsText(file);
    const tickets = parseTicketsFromText(text);
    if (tickets.length === 0) {
      throw new Error("В файле не найдены билеты");
    }
    return tickets;
  }

  throw new Error(
    "Поддерживаются PDF, Word (.doc, .docx), TXT, CSV и изображения (JPG, PNG)"
  );
}

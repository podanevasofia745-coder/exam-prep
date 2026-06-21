import { detectDocumentKind, isDocumentFile } from "@/lib/document-types";

export interface ParsedTicket {
  title: string;
  number?: number;
}

export interface ParseTicketsResult {
  tickets: ParsedTicket[];
  skippedLines: number;
}

const SKIP_PATTERNS = [
  /^(министерство|федеральн|государственн|университет|кафедр|факультет|экзаменационн|билетов к)/i,
  /^(page|страница)\s*\d+/i,
  /^\d{1,2}\.\d{2}\.\d{4}$/,
  /^www\./i,
  /^(оглавление|содержание|приложение|литература|список литературы)$/i,
];

const TICKET_START =
  /^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*\d+/i;

function shouldSkipLine(line: string): boolean {
  if (line.length < 2) return true;
  return SKIP_PATTERNS.some((p) => p.test(line));
}

function ticketKey(title: string, number?: number): string {
  if (number !== undefined && !Number.isNaN(number)) return `n:${number}`;
  return `t:${title.toLowerCase()}`;
}

function addTicket(
  tickets: ParsedTicket[],
  seen: Set<string>,
  title: string,
  number?: number
): boolean {
  const cleaned = title.replace(/^["«]|["»]$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || shouldSkipLine(cleaned)) return false;

  const key = ticketKey(cleaned, number);
  if (seen.has(key)) return false;

  seen.add(key);
  tickets.push({ title: cleaned, number });
  return true;
}

function tryParseNumberedLine(
  line: string
): { number?: number; title: string } | null {
  const patterns: Array<{ regex: RegExp; numbered: boolean }> = [
    { regex: /^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d+)\s*[.:)\-–—]?\s*(.+)$/i, numbered: true },
    { regex: /^(\d{1,3})[.)]\s*(.+)$/, numbered: true },
    { regex: /^(\d{1,3})\s+[-–—]\s+(.+)$/, numbered: true },
    { regex: /^№\s*(\d+)\s+(.+)$/i, numbered: true },
    { regex: /^[•\-*]\s+(\d+)[.)]\s*(.+)$/, numbered: true },
    { regex: /^[•\-*]\s+(.+)$/, numbered: false },
  ];

  for (const { regex, numbered } of patterns) {
    const m = line.match(regex);
    if (!m) continue;
    if (numbered && m[2]) {
      return { number: parseInt(m[1], 10), title: m[2].trim() };
    }
    if (!numbered && m[1]) {
      return { title: m[1].trim() };
    }
  }

  return null;
}

function isContinuationLine(line: string): boolean {
  if (shouldSkipLine(line)) return false;
  if (tryParseNumberedLine(line)) return false;
  if (TICKET_START.test(line)) return false;
  if (/^\d{1,3}[.)]/.test(line)) return false;
  return line.length >= 3;
}

/**
 * Извлекает названия билетов/тем из текста.
 */
export function parseTicketsFromText(text: string): ParsedTicket[] {
  return parseTicketsFromTextDetailed(text).tickets;
}

export function parseTicketsFromTextDetailed(text: string): ParseTicketsResult {
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
  const usedLines = new Set<number>();
  let skippedLines = 0;

  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const line = lines[i];

    if (line.includes(";") && !tryParseNumberedLine(line)) {
      const parts = line.split(";").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (const part of parts) {
          const sub = parseTicketsFromTextDetailed(part);
          for (const t of sub.tickets) addTicket(tickets, seen, t.title, t.number);
        }
        usedLines.add(i);
        continue;
      }
    }

    const ticketHeader = line.match(/^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d+)\s*$/i);
    if (ticketHeader && lines[i + 1] && !usedLines.has(i + 1)) {
      if (addTicket(tickets, seen, lines[i + 1], parseInt(ticketHeader[1], 10))) {
        usedLines.add(i);
        usedLines.add(i + 1);
        i++;
        continue;
      }
    }

    const onlyNumber = line.match(/^(\d{1,3})$/);
    if (onlyNumber && lines[i + 1] && !usedLines.has(i + 1) && lines[i + 1].length > 2) {
      if (addTicket(tickets, seen, lines[i + 1], parseInt(onlyNumber[1], 10))) {
        usedLines.add(i);
        usedLines.add(i + 1);
        i++;
        continue;
      }
    }

    const parsed = tryParseNumberedLine(line);
    if (parsed?.title) {
      let title = parsed.title;
      let j = i + 1;
      while (j < lines.length && isContinuationLine(lines[j]) && !usedLines.has(j)) {
        title += " " + lines[j];
        usedLines.add(j);
        j++;
      }

      if (addTicket(tickets, seen, title, parsed.number)) {
        usedLines.add(i);
        i = j - 1;
        continue;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;
    const line = lines[i];
    if (shouldSkipLine(line)) {
      skippedLines++;
      continue;
    }
    if (line.length >= 3 && line.length <= 300) {
      if (addTicket(tickets, seen, line)) {
        usedLines.add(i);
      } else {
        skippedLines++;
      }
    } else {
      skippedLines++;
    }
  }

  const sorted = tickets.sort((a, b) => {
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
    if (a.number !== undefined) return -1;
    if (b.number !== undefined) return 1;
    return 0;
  });

  return { tickets: sorted, skippedLines };
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
  const { tickets } = parseTicketsFromTextDetailed(result.value ?? "");
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
    const { tickets } = parseTicketsFromTextDetailed(text);
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
    const { tickets } = parseTicketsFromTextDetailed(text);
    if (tickets.length === 0) {
      throw new Error("В файле не найдены билеты");
    }
    return tickets;
  }

  throw new Error(
    "Поддерживаются PDF, Word (.doc, .docx), TXT, CSV и изображения (JPG, PNG)"
  );
}

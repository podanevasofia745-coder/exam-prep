import { detectDocumentKind, isDocumentFile } from "@/lib/document-types";

export interface ParsedTicket {
  title: string;
  number?: number;
}

export interface ParseTicketsResult {
  tickets: ParsedTicket[];
  skippedLines: number;
  expectedMaxNumber?: number;
}

const SKIP_PATTERNS = [
  /^(министерство|федеральн|государственн|университет|кафедр|факультет|экзаменационн|билетов к)/i,
  /^(page|страница)\s*\d+/i,
  /^\d{1,2}\.\d{2}\.\d{4}$/,
  /^www\./i,
  /^(оглавление|содержание|приложение|литература|список литературы)$/i,
];

function shouldSkipLine(line: string): boolean {
  if (line.length < 2) return true;
  return SKIP_PATTERNS.some((p) => p.test(line));
}

function normalizeLines(text: string): string[] {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseNumberedBlocks(lines: string[]): ParsedTicket[] {
  const tickets: ParsedTicket[] = [];
  let currentNum: number | null = null;
  let currentTitle = "";

  const flush = () => {
    const title = currentTitle.replace(/\s+/g, " ").trim();
    if (currentNum !== null && title.length >= 2 && !shouldSkipLine(title)) {
      tickets.push({ number: currentNum, title });
    }
    currentNum = null;
    currentTitle = "";
  };

  for (const line of lines) {
    const patterns = [
      /^(?:билет|ticket|тема|вопрос)\s*[#№.]?\s*(\d{1,3})\s*[.:)\-–—>]+\s*(.*)$/i,
      /^(\d{1,3})\s*[.)>:=\-–—]+\s*(.*)$/,
      /^№\s*(\d{1,3})\s+(.+)$/i,
    ];

    let matched = false;
    for (const regex of patterns) {
      const m = line.match(regex);
      if (!m) continue;
      flush();
      currentNum = parseInt(m[1], 10);
      currentTitle = (m[2] ?? "").trim();
      matched = true;
      break;
    }
    if (matched) continue;

    const onlyNum = line.match(/^(\d{1,3})\s*[.)]?\s*$/);
    if (onlyNum) {
      flush();
      currentNum = parseInt(onlyNum[1], 10);
      currentTitle = "";
      continue;
    }

    if (currentNum !== null) {
      currentTitle += (currentTitle ? " " : "") + line;
    }
  }

  flush();
  return tickets;
}

function dedupeByNumber(tickets: ParsedTicket[]): ParsedTicket[] {
  const byNumber = new Map<number, ParsedTicket>();
  const unnumbered: ParsedTicket[] = [];
  const seenTitles = new Set<string>();

  for (const t of tickets) {
    const titleKey = t.title.toLowerCase();
    if (t.number !== undefined) {
      const existing = byNumber.get(t.number);
      if (!existing || t.title.length > existing.title.length) {
        byNumber.set(t.number, t);
      }
    } else if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      unnumbered.push(t);
    }
  }

  return [...byNumber.values(), ...unnumbered].sort((a, b) => {
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
    if (a.number !== undefined) return -1;
    if (b.number !== undefined) return 1;
    return 0;
  });
}

export function parseTicketsFromText(text: string): ParsedTicket[] {
  return parseTicketsFromTextDetailed(text).tickets;
}

export function parseTicketsFromTextDetailed(text: string): ParseTicketsResult {
  const lines = normalizeLines(text);
  const numbered = dedupeByNumber(parseNumberedBlocks(lines));

  if (numbered.length >= 3) {
    const maxNum = Math.max(...numbered.map((t) => t.number ?? 0));
    return {
      tickets: numbered,
      skippedLines: 0,
      expectedMaxNumber: maxNum > 0 ? maxNum : undefined,
    };
  }

  const tickets: ParsedTicket[] = [];
  const seen = new Set<string>();

  const addTicket = (title: string, number?: number) => {
    const cleaned = title.replace(/^["«]|["»]$/g, "").replace(/\s+/g, " ").trim();
    if (cleaned.length < 2 || shouldSkipLine(cleaned)) return;
    const key = number !== undefined ? `n:${number}` : `t:${cleaned.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    tickets.push({ title: cleaned, number });
  };

  let skippedLines = 0;
  for (const line of lines) {
    const m = line.match(/^(\d{1,3})[.)]\s*(.+)$/);
    if (m) {
      addTicket(m[2], parseInt(m[1], 10));
    } else if (!shouldSkipLine(line) && line.length >= 3 && line.length <= 300) {
      addTicket(line);
    } else {
      skippedLines++;
    }
  }

  const result = dedupeByNumber(tickets);
  const maxNum = Math.max(0, ...result.map((t) => t.number ?? 0));

  return {
    tickets: result,
    skippedLines,
    expectedMaxNumber: maxNum > 0 ? maxNum : undefined,
  };
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

async function parseDocumentViaApi(
  file: File
): Promise<{ tickets: ParsedTicket[]; warning?: string }> {
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

  return {
    tickets: data.tickets as ParsedTicket[],
    warning: data.warning as string | undefined,
  };
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

export async function parseTicketsFromFile(
  file: File
): Promise<{ tickets: ParsedTicket[]; warning?: string }> {
  const name = file.name.toLowerCase();

  if (isDocumentFile(file)) {
    try {
      return await parseDocumentViaApi(file);
    } catch (apiError) {
      if (detectDocumentKind(file.name, file.type) === "docx") {
        try {
          const tickets = await parseDocxClientSide(file);
          return { tickets };
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
    return { tickets };
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
    return { tickets };
  }

  throw new Error(
    "Поддерживаются PDF, Word (.doc, .docx), TXT, CSV и изображения (JPG, PNG)"
  );
}

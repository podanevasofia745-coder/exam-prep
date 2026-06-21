export interface ParsedScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
}

const DAY_ALIASES: Array<{ re: RegExp; day: number }> = [
  { re: /^(?:воскресенье|вс)\b/i, day: 0 },
  { re: /^(?:понедельник|пн)\b/i, day: 1 },
  { re: /^(?:вторник|вт)\b/i, day: 2 },
  { re: /^(?:среда|ср)\b/i, day: 3 },
  { re: /^(?:четверг|чт)\b/i, day: 4 },
  { re: /^(?:пятница|пт)\b/i, day: 5 },
  { re: /^(?:суббота|сб)\b/i, day: 6 },
];

const TIME_RANGE_RE =
  /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/;
const TIME_SINGLE_RE = /(\d{1,2})[:.](\d{2})/;

function normalizeTime(hours: string, minutes: string): string {
  return `${String(parseInt(hours, 10)).padStart(2, "0")}:${minutes}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function detectDay(line: string): number | null {
  for (const { re, day } of DAY_ALIASES) {
    if (re.test(line.trim())) return day;
  }
  return null;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(TIME_RANGE_RE, "")
    .replace(/^\d+\s*пара\b/i, "")
    .replace(/^пара\s*\d+\b/i, "")
    .replace(/^[-–—:.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldSkipLine(line: string): boolean {
  if (line.length < 3) return true;
  return /^(аудитор|кабинет|корпус|преподав|группа|факультет|расписание|учебн)/i.test(line);
}

function parseLine(
  line: string,
  currentDay: number | null
): { entry: ParsedScheduleEntry | null; day: number | null } {
  let day = currentDay;
  const dayInLine = detectDay(line);
  if (dayInLine !== null) {
    return { entry: null, day: dayInLine };
  }

  const inlineDay = DAY_ALIASES.find(({ re }) => {
    const m = line.match(re);
    return m && m.index !== undefined && m.index < 12;
  });
  if (inlineDay) {
    day = inlineDay.day;
  }

  if (day === null) return { entry: null, day };

  const range = line.match(TIME_RANGE_RE);
  if (range) {
    const title = cleanTitle(line.replace(TIME_RANGE_RE, " "));
    if (title.length < 2 || shouldSkipLine(title)) return { entry: null, day };
    return {
      entry: {
        dayOfWeek: day,
        startTime: normalizeTime(range[1], range[2]),
        endTime: normalizeTime(range[3], range[4]),
        title,
      },
      day,
    };
  }

  const single = line.match(TIME_SINGLE_RE);
  if (single) {
    const startTime = normalizeTime(single[1], single[2]);
    const title = cleanTitle(line.replace(TIME_SINGLE_RE, " "));
    if (title.length < 2 || shouldSkipLine(title)) return { entry: null, day };
    return {
      entry: {
        dayOfWeek: day,
        startTime,
        endTime: addMinutes(startTime, 90),
        title,
      },
      day,
    };
  }

  return { entry: null, day };
}

export function parseScheduleFromText(text: string): ParsedScheduleEntry[] {
  const lines = text
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "\n")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: ParsedScheduleEntry[] = [];
  const seen = new Set<string>();
  let currentDay: number | null = null;

  for (const line of lines) {
    const { entry, day } = parseLine(line, currentDay);
    if (day !== null) currentDay = day;
    if (!entry) continue;

    const key = `${entry.dayOfWeek}-${entry.startTime}-${entry.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  return entries;
}

export function expandScheduleEntries(
  entries: ParsedScheduleEntry[],
  weeks: number,
  startFrom: Date = new Date()
): Array<{ uid: string; title: string; start: Date; end: Date; allDay: boolean }> {
  const result: Array<{ uid: string; title: string; start: Date; end: Date; allDay: boolean }> =
    [];
  const base = new Date(startFrom);
  base.setHours(0, 0, 0, 0);

  for (let week = 0; week < weeks; week++) {
    for (const entry of entries) {
      const date = new Date(base);
      const currentDow = date.getDay();
      let delta = entry.dayOfWeek - currentDow;
      if (delta < 0) delta += 7;
      date.setDate(date.getDate() + delta + week * 7);

      const [sh, sm] = entry.startTime.split(":").map(Number);
      const [eh, em] = entry.endTime.split(":").map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);
      if (end <= start) end.setMinutes(end.getMinutes() + 90);

      const uid = `photo-${entry.dayOfWeek}-${entry.startTime}-${week}-${entry.title.slice(0, 40)}`;
      result.push({
        uid,
        title: entry.title,
        start,
        end,
        allDay: false,
      });
    }
  }

  return result;
}

export async function extractTextFromImageBuffer(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("rus+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

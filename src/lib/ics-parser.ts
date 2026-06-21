export interface ParsedIcsEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

function unfoldIcs(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function parseIcsDateValue(value: string): { date: Date; allDay: boolean } {
  const raw = value.trim();
  const isUtc = raw.endsWith("Z");
  const cleaned = raw.replace(/^VALUE=DATE:/i, "").replace(/^DATE:/i, "").replace(/Z$/, "");

  if (/^\d{8}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4));
    const m = Number(cleaned.slice(4, 6)) - 1;
    const d = Number(cleaned.slice(6, 8));
    return { date: new Date(y, m, d, 0, 0, 0, 0), allDay: true };
  }

  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const y = Number(cleaned.slice(0, 4));
    const mo = Number(cleaned.slice(4, 6)) - 1;
    const d = Number(cleaned.slice(6, 8));
    const h = Number(cleaned.slice(9, 11));
    const mi = Number(cleaned.slice(11, 13));
    const s = Number(cleaned.slice(13, 15));
    if (isUtc) {
      return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false };
    }
    return { date: new Date(y, mo, d, h, mi, s), allDay: false };
  }

  const fallback = new Date(raw);
  return { date: Number.isNaN(fallback.getTime()) ? new Date() : fallback, allDay: false };
}

function unescapeIcs(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function readProp(block: string, name: string): string | null {
  const re = new RegExp(`^${name}[^:]*:(.+)$`, "im");
  const match = block.match(re);
  return match ? unescapeIcs(match[1].trim()) : null;
}

export function parseIcs(content: string): ParsedIcsEvent[] {
  const unfolded = unfoldIcs(content);
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const events: ParsedIcsEvent[] = [];

  for (const chunk of blocks) {
    const block = chunk.split("END:VEVENT")[0] ?? "";
    const uid = readProp(block, "UID");
    const summary = readProp(block, "SUMMARY") ?? "Событие";
    const dtStartRaw = readProp(block, "DTSTART");
    const dtEndRaw = readProp(block, "DTEND");

    if (!uid || !dtStartRaw) continue;

    const start = parseIcsDateValue(dtStartRaw);
    const end = dtEndRaw
      ? parseIcsDateValue(dtEndRaw)
      : {
          date: new Date(start.date.getTime() + (start.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000)),
          allDay: start.allDay,
        };

    events.push({
      uid,
      summary,
      start: start.date,
      end: end.date,
      allDay: start.allDay || end.allDay,
    });
  }

  return events;
}

export async function fetchIcsFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ExamPrep/1.0",
        Accept: "text/calendar, application/calendar, text/plain, */*",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Не удалось загрузить календарь (${res.status})`);
    }

    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("Ссылка не ведёт на календарь в формате .ics");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export function isValidCalendarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

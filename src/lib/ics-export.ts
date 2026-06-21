import { TASK_TYPES } from "@/lib/utils";

export interface IcsTaskInput {
  id: string;
  title: string;
  date: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  duration: number;
  taskType: string;
  status: string;
  examTitle: string;
  topicTitle?: string | null;
}

export interface IcsExamInput {
  id: string;
  title: string;
  examDate: Date | string;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

function formatIcsDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatIcsDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const local = new Date(date);
  local.setHours(hours, minutes ?? 0, 0, 0);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  const h = String(local.getHours()).padStart(2, "0");
  const min = String(local.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}00`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + (m ?? 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function formatIcsUtcNow(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts = [line.slice(0, max)];
  let rest = line.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

function buildEvent(uid: string, lines: string[]): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtcNow()}`,
    ...lines,
    "END:VEVENT",
  ].join("\r\n");
}

export function generateIcsCalendar(
  tasks: IcsTaskInput[],
  exams: IcsExamInput[],
  calendarName = "Расписание подготовки"
): string {
  const events: string[] = [];

  for (const exam of exams) {
    const examDate = toDate(exam.examDate);
    const endDate = new Date(examDate);
    endDate.setDate(endDate.getDate() + 1);

    events.push(
      buildEvent(`${exam.id}-exam@examprep`, [
        `DTSTART;VALUE=DATE:${formatIcsDateOnly(examDate)}`,
        `DTEND;VALUE=DATE:${formatIcsDateOnly(endDate)}`,
        foldLine(`SUMMARY:${escapeIcs(`Экзамен: ${exam.title}`)}`),
        "CATEGORIES:Экзамен",
      ])
    );
  }

  for (const task of tasks) {
    const date = toDate(task.date);
    const typeLabel =
      TASK_TYPES[task.taskType as keyof typeof TASK_TYPES] ?? task.taskType;
    const summary = task.title || `${typeLabel}: ${task.topicTitle ?? "Задача"}`;
    const description = [
      `Экзамен: ${task.examTitle}`,
      task.topicTitle ? `Тема: ${task.topicTitle}` : null,
      `Тип: ${typeLabel}`,
      `Статус: ${task.status}`,
    ]
      .filter(Boolean)
      .join("\\n");

    const startTime = task.startTime ?? "09:00";
    const endTime =
      task.endTime ?? addMinutesToTime(startTime, task.duration || 60);

    events.push(
      buildEvent(`${task.id}@examprep`, [
        `DTSTART:${formatIcsDateTime(date, startTime)}`,
        `DTEND:${formatIcsDateTime(date, endTime)}`,
        foldLine(`SUMMARY:${escapeIcs(summary)}`),
        foldLine(`DESCRIPTION:${escapeIcs(description)}`),
        foldLine(`CATEGORIES:${escapeIcs(task.examTitle)}`),
      ])
    );
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExamPrep//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeIcs(calendarName)}`),
    "X-WR-TIMEZONE:Europe/Moscow",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function downloadIcsExport(examId?: string): Promise<boolean> {
  const url = examId
    ? `/api/schedule/export?examId=${encodeURIComponent(examId)}`
    : "/api/schedule/export";

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return false;

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "raspisanie.ics";

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
  return true;
}

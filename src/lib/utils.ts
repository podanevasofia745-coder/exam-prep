import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const EXAM_FORMATS = {
  ORAL: "Устный",
  TEST: "Тест",
  WRITTEN: "Письменный",
  WRITTEN_TICKETS: "Письменный по билетам",
  MIXED: "Смешанный",
} as const;

export const TASK_TYPES = {
  STUDY: "Изучение",
  REVIEW: "Повторение",
  TEST: "Тест",
  FINAL: "Финальная подготовка",
} as const;

export const TASK_STATUSES = {
  PLANNED: "Запланировано",
  COMPLETED: "Выполнено",
  SKIPPED: "Пропущено",
  RESCHEDULED: "Перенесено",
} as const;

export const TOPIC_STATUSES = {
  NOT_STARTED: "Не начата",
  IN_PROGRESS: "В процессе",
  STUDIED: "Изучена",
  REVIEWED: "Повторена",
} as const;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Лёгкая",
  2: "Ниже среднего",
  3: "Средняя",
  4: "Сложная",
  5: "Очень сложная",
};

export const EXAM_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 мин";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

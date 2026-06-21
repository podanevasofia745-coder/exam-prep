"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { TaskItem } from "@/components/task-item";
import { cn } from "@/lib/utils";

export interface ScheduleTask {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  taskType: string;
  status: string;
  duration: number;
  exam: { id: string; title: string; color: string };
}

const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 52;

function parseTimeToMinutes(time?: string | null): number {
  if (!time) return HOUR_START * 60;
  const [h, m] = time.split(":").map(Number);
  return (h ?? HOUR_START) * 60 + (m ?? 0);
}

function minutesToTop(minutes: number): number {
  return ((minutes - HOUR_START * 60) / 60) * HOUR_HEIGHT;
}

function taskHeight(duration: number): number {
  return Math.max((duration / 60) * HOUR_HEIGHT, 28);
}

const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

function TaskBlock({
  task,
  onStatusChange,
  compact,
}: {
  task: ScheduleTask;
  onStatusChange?: (id: string, status: string) => void;
  compact?: boolean;
}) {
  const start = parseTimeToMinutes(task.startTime);
  const top = minutesToTop(start);
  const height = taskHeight(task.duration);

  if (top < 0 || start >= HOUR_END * 60) return null;

  return (
    <div
      className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border border-white/60 px-1.5 py-1 shadow-sm"
      style={{
        top,
        height,
        backgroundColor: `${task.exam.color}22`,
        borderLeftColor: task.exam.color,
        borderLeftWidth: 3,
      }}
    >
      <p className="truncate text-[11px] font-semibold leading-tight" style={{ color: task.exam.color }}>
        {task.startTime} {task.title}
      </p>
      {!compact && (
        <p className="truncate text-[10px] text-slate-500">{task.exam.title}</p>
      )}
    </div>
  );
}

function TimeGrid({
  days,
  tasks,
  onStatusChange,
}: {
  days: Date[];
  tasks: ScheduleTask[];
  onStatusChange?: (id: string, status: string) => void;
}) {
  const gridHeight = (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT;

  const tasksByDay = days.map((day) =>
    tasks.filter((t) => isSameDay(parseISO(t.date.split("T")[0]), day))
  );

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-sky-100 bg-white">
      <div
        className="grid min-w-[320px]"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-b border-r border-sky-100 bg-sky-50/50" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-sky-100 px-2 py-2 text-center last:border-r-0",
                today ? "bg-sky-100/80" : "bg-sky-50/30"
              )}
            >
              <p className="text-[10px] font-medium uppercase text-sky-500">
                {format(day, "EEE", { locale: ru })}
              </p>
              <p className={cn("text-lg font-bold", today ? "text-sky-600" : "text-slate-700")}>
                {format(day, "d")}
              </p>
            </div>
          );
        })}

        <div className="relative border-r border-sky-100" style={{ height: gridHeight }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-sky-50 pr-1 text-right text-[10px] text-sky-400"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="-mt-2 inline-block">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {days.map((day, dayIdx) => (
          <div
            key={day.toISOString()}
            className={cn(
              "relative border-r border-sky-100 last:border-r-0",
              isToday(day) ? "bg-sky-50/20" : ""
            )}
            style={{ height: gridHeight }}
          >
            {hours.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-sky-50"
                style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              />
            ))}
            {tasksByDay[dayIdx].map((task) => (
              <TaskBlock key={task.id} task={task} onStatusChange={onStatusChange} compact />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DayCalendarView({
  date,
  tasks,
  onStatusChange,
}: {
  date: Date;
  tasks: ScheduleTask[];
  onStatusChange?: (id: string, status: string) => void;
}) {
  const dayTasks = tasks.filter((t) => isSameDay(parseISO(t.date.split("T")[0]), date));

  return (
    <div className="space-y-4">
      <TimeGrid days={[date]} tasks={tasks} onStatusChange={onStatusChange} />
      {dayTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Список задач</h3>
          {dayTasks.map((task) => (
            <TaskItem key={task.id} task={task} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WeekCalendarView({
  date,
  tasks,
  onStatusChange,
}: {
  date: Date;
  tasks: ScheduleTask[];
  onStatusChange?: (id: string, status: string) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return <TimeGrid days={days} tasks={tasks} onStatusChange={onStatusChange} />;
}

export function MonthCalendarView({
  date,
  tasks,
  onStatusChange,
}: {
  date: Date;
  tasks: ScheduleTask[];
  onStatusChange?: (id: string, status: string) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-sky-100 bg-white">
      <div className="grid grid-cols-7 border-b border-sky-100 bg-sky-50/50">
        {weekdays.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase text-sky-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasks.filter((t) => t.date.split("T")[0] === key);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                "min-h-[100px] border-b border-r border-sky-50 p-1.5 last:border-r-0",
                !inMonth && "bg-slate-50/50",
                today && "bg-sky-50"
              )}
            >
              <p
                className={cn(
                  "mb-1 text-sm font-semibold",
                  today ? "text-sky-600" : inMonth ? "text-slate-700" : "text-slate-300"
                )}
              >
                {format(day, "d")}
              </p>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="truncate rounded-md px-1 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${task.exam.color}18`,
                      color: task.exam.color,
                    }}
                    title={task.title}
                  >
                    {task.startTime ? `${task.startTime} ` : ""}
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] font-medium text-sky-500">
                    Ещё {dayTasks.length - 3}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

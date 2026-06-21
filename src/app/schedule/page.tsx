"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DayCalendarView,
  MonthCalendarView,
  ScheduleTask,
  WeekCalendarView,
} from "@/components/schedule/calendar-views";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "day" | "week" | "month";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
];

function getPeriodLabel(view: ViewMode, date: Date): string {
  if (view === "day") {
    return format(date, "d MMMM yyyy", { locale: ru });
  }
  if (view === "month") {
    return format(date, "LLLL yyyy", { locale: ru });
  }
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, "d MMM", { locale: ru })} – ${format(end, "d MMM yyyy", { locale: ru })}`;
}

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>("week");
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [nextTaskDate, setNextTaskDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/schedule?view=${view}&date=${currentDate.toISOString()}`,
      { credentials: "include" }
    );
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
      setConflicts(data.conflicts);
      setTotalTasks(data.totalTasks ?? data.tasks.length);
      setNextTaskDate(data.nextTaskDate ?? null);
    }
    setLoading(false);
  }, [view, currentDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  async function handleTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadSchedule();
  }

  function navigate(delta: number) {
    setCurrentDate((d) => {
      if (view === "day") return addDays(d, delta);
      if (view === "week") return addDays(d, delta * 7);
      return addMonths(d, delta);
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Общее расписание</h1>
            <p className="mt-1 text-slate-600">
              Все задачи по экзаменам в одном месте
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Сегодня
            </Button>
            <div className="flex gap-1 rounded-2xl border-2 border-sky-100 bg-white p-1">
              {VIEW_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === id
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-sky-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Обнаружены конфликты расписания</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-6 flex items-center justify-between rounded-2xl border-2 border-sky-100 bg-white px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize text-slate-700">
            {getPeriodLabel(view, currentDate)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-slate-400">Загрузка...</p>
          ) : tasks.length === 0 ? (
            <Card className="text-center">
              {totalTasks > 0 && nextTaskDate ? (
                <>
                  <p className="text-slate-600">
                    На эту неделю задач нет, но всего в расписании — {totalTasks}
                  </p>
                  <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={() => setCurrentDate(new Date(nextTaskDate))}
                  >
                    Перейти к ближайшим задачам
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-slate-500">Нет задач на выбранный период</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Загрузите темы в разделе «Редактировать данные» — расписание создастся автоматически
                  </p>
                </>
              )}
            </Card>
          ) : view === "day" ? (
            <DayCalendarView
              date={currentDate}
              tasks={tasks}
              onStatusChange={handleTaskStatus}
            />
          ) : view === "week" ? (
            <WeekCalendarView
              date={currentDate}
              tasks={tasks}
              onStatusChange={handleTaskStatus}
            />
          ) : (
            <MonthCalendarView
              date={currentDate}
              tasks={tasks}
              onStatusChange={handleTaskStatus}
            />
          )}
        </div>
      </main>
    </div>
  );
}

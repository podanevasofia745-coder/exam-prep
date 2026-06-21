"use client";

import { useCallback, useEffect, useState } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TaskItem } from "@/components/task-item";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "today" | "week" | "list";

interface Task {
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

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>("week");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const viewParam = view === "list" ? "week" : view;
    const res = await fetch(
      `/api/schedule?view=${viewParam}&date=${currentDate.toISOString()}`
    );
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
      setConflicts(data.conflicts);
    }
    setLoading(false);
  }, [view, currentDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  async function handleTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadSchedule();
  }

  const todayTasks = tasks.filter((t) => isSameDay(new Date(t.date), new Date()));

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.date.split("T")[0];
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Общее расписание</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Все задачи по экзаменам в одном месте
            </p>
          </div>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {(
              [
                { id: "today" as const, label: "Сегодня" },
                { id: "week" as const, label: "Неделя" },
                { id: "list" as const, label: "Список" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {conflicts.length > 0 && (
          <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Обнаружены конфликты расписания
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {view !== "today" && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() - 7);
                setCurrentDate(d);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {format(currentDate, "d MMMM yyyy", { locale: ru })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + 7);
                setCurrentDate(d);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="text-gray-500">Загрузка...</p>
          ) : view === "today" ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Задачи на сегодня ({todayTasks.length})
              </h2>
              {todayTasks.length === 0 ? (
                <Card>
                  <p className="text-gray-500">На сегодня задач нет</p>
                </Card>
              ) : (
                todayTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onStatusChange={handleTaskStatus} />
                ))
              )}
            </div>
          ) : view === "week" ? (
            <div className="grid gap-4 sm:grid-cols-7">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayTasks = tasksByDate[key] ?? [];
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 ${
                      isToday
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20"
                        : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                    }`}
                  >
                    <p className="text-center text-xs font-medium text-gray-500">
                      {format(day, "EEE", { locale: ru })}
                    </p>
                    <p
                      className={`text-center text-lg font-bold ${isToday ? "text-indigo-600" : "text-gray-900 dark:text-white"}`}
                    >
                      {format(day, "d")}
                    </p>
                    <div className="mt-2 space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="truncate rounded-md px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor: `${task.exam.color}20`,
                            color: task.exam.color,
                          }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <p className="text-center text-xs text-gray-400">
                          +{dayTasks.length - 3}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dayTasks]) => (
                  <div key={date}>
                    <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                      {format(new Date(date), "d MMMM, EEEE", { locale: ru })}
                      {isSameDay(new Date(date), startOfDay(new Date())) && (
                        <span className="ml-2 text-sm font-normal text-indigo-600">(сегодня)</span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      {dayTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onStatusChange={handleTaskStatus}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              {Object.keys(tasksByDate).length === 0 && (
                <Card>
                  <p className="text-gray-500">Нет задач на этой неделе</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

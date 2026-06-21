"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  ExternalCalendarEventView,
  MonthCalendarView,
  ScheduleTask,
  WeekCalendarView,
} from "@/components/schedule/calendar-views";
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, Download, Link2, Loader2, RefreshCw, Upload } from "lucide-react";
import { downloadIcsExport } from "@/lib/ics-export";

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
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEventView[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [nextTaskDate, setNextTaskDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [exporting, setExporting] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEventCount, setCalendarEventCount] = useState(0);
  const [calendarSyncedAt, setCalendarSyncedAt] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarSuccess, setCalendarSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoImporting, setPhotoImporting] = useState(false);
  const [photoWeeks, setPhotoWeeks] = useState(8);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoPreview, setPhotoPreview] = useState<Array<{ title: string; startTime: string; endTime: string }>>([]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/schedule?view=${view}&date=${currentDate.toISOString()}`,
      { credentials: "include" }
    );
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
      setExternalEvents(data.externalEvents ?? []);
      setConflicts(data.conflicts);
      setTotalTasks(data.totalTasks ?? data.tasks.length);
      setNextTaskDate(data.nextTaskDate ?? null);
      setCalendarConnected(Boolean(data.calendarConnected));
    }
    setLoading(false);
  }, [view, currentDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const loadCalendarStatus = useCallback(async () => {
    const res = await fetch("/api/calendar", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setCalendarConnected(Boolean(data.connected));
    setCalendarUrl(data.calendarIcsUrl ?? "");
    setCalendarEventCount(data.eventCount ?? 0);
    setCalendarSyncedAt(data.syncedAt ?? null);
  }, []);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  async function connectYandexCalendar() {
    if (!calendarUrl.trim()) {
      setCalendarError("Вставьте ссылку на экспорт календаря из Яндекса");
      return;
    }
    setCalendarLoading(true);
    setCalendarError("");
    setCalendarSuccess("");
    const res = await fetch("/api/calendar", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarIcsUrl: calendarUrl.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setCalendarLoading(false);
    if (!res.ok) {
      setCalendarError(data.error ?? "Не удалось подключить календарь");
      return;
    }
    setCalendarSuccess(`Импортировано событий: ${data.eventCount ?? 0}`);
    await loadCalendarStatus();
    loadSchedule();
  }

  async function syncYandexCalendar() {
    setCalendarLoading(true);
    setCalendarError("");
    const res = await fetch("/api/calendar/sync", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setCalendarLoading(false);
    if (!res.ok) {
      setCalendarError(data.error ?? "Не удалось обновить календарь");
      return;
    }
    setCalendarSuccess(`Обновлено событий: ${data.eventCount ?? 0}`);
    await loadCalendarStatus();
    loadSchedule();
  }

  async function disconnectYandexCalendar() {
    setCalendarLoading(true);
    await fetch("/api/calendar", { method: "DELETE", credentials: "include" });
    setCalendarLoading(false);
    setCalendarUrl("");
    setCalendarConnected(false);
    setCalendarEventCount(0);
    setCalendarSyncedAt(null);
    setCalendarSuccess("Яндекс Календарь отключён");
    loadSchedule();
  }

  async function importIcsFile(files: FileList | null) {
    if (!files?.length) return;
    setCalendarLoading(true);
    setCalendarError("");
    const formData = new FormData();
    formData.append("file", files[0]);
    const res = await fetch("/api/calendar/import", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    setCalendarLoading(false);
    if (!res.ok) {
      setCalendarError(data.error ?? "Не удалось импортировать файл");
      return;
    }
    setCalendarSuccess(`Импортировано событий: ${data.eventCount ?? 0}`);
    await loadCalendarStatus();
    loadSchedule();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function importSchedulePhoto(files: FileList | null) {
    if (!files?.length) return;
    setPhotoImporting(true);
    setPhotoError("");
    setPhotoSuccess("");
    setPhotoPreview([]);

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("weeks", String(photoWeeks));

    const res = await fetch("/api/schedule/import-image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    setPhotoImporting(false);

    if (!res.ok) {
      setPhotoError(data.error ?? "Не удалось распознать фото");
      return;
    }

    setPhotoSuccess(
      `Распознано занятий: ${data.weeklyEntries ?? 0} в неделю · добавлено событий: ${data.eventCount ?? 0}`
    );
    if (Array.isArray(data.entries)) {
      setPhotoPreview(
        data.entries.slice(0, 6).map((e: { title: string; startTime: string; endTime: string }) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        }))
      );
    }
    await loadCalendarStatus();
    loadSchedule();
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

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

  async function handleExport() {
    setExporting(true);
    await downloadIcsExport();
    setExporting(false);
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
              onClick={handleExport}
              disabled={exporting || totalTasks === 0}
            >
              <Download className="mr-1 h-4 w-4" />
              {exporting ? "Экспорт..." : "В календарь"}
            </Button>
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

        <Card className="mt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h2 className="font-semibold text-slate-800">Яндекс Календарь</h2>
              <p className="mt-1 text-sm text-slate-500">
                Импортируйте занятость из Яндекса — события появятся на расписании, а подготовка
                не будет ставиться на занятое время
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                <li>Откройте calendar.yandex.ru → Настройки → Экспорт</li>
                <li>Скопируйте секретную ссылку в формате .ics</li>
                <li>Вставьте ссылку ниже и нажмите «Подключить»</li>
              </ol>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  placeholder="https://calendar.yandex.ru/export/ics.xml?..."
                  className="flex-1 rounded-2xl border-2 border-sky-100 px-4 py-2.5 text-sm outline-none focus:border-sky-300"
                />
                <Button onClick={connectYandexCalendar} disabled={calendarLoading}>
                  <Link2 className="mr-1 h-4 w-4" />
                  Подключить
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={(e) => importIcsFile(e.target.files)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={calendarLoading}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Импорт .ics файла
                </Button>
                {calendarConnected && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={syncYandexCalendar}
                      disabled={calendarLoading}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Обновить
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectYandexCalendar}
                      disabled={calendarLoading}
                    >
                      Отключить
                    </Button>
                  </>
                )}
              </div>
              {calendarConnected && (
                <p className="mt-3 text-sm text-slate-600">
                  Подключено · событий: {calendarEventCount}
                  {calendarSyncedAt
                    ? ` · обновлено ${new Date(calendarSyncedAt).toLocaleString("ru-RU")}`
                    : ""}
                </p>
              )}
              {calendarError && <p className="mt-2 text-sm text-red-500">{calendarError}</p>}
              {calendarSuccess && (
                <p className="mt-2 text-sm text-emerald-600">{calendarSuccess}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <h2 className="font-semibold text-slate-800">Импорт с фотографии</h2>
          <p className="mt-1 text-sm text-slate-500">
            Сфотографируйте или загрузите фото учебного расписания — сайт распознает дни, время и
            предметы
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>На фото должны быть видны дни недели (Пн, Вт…) и время (09:00-10:30)</li>
            <li>Лучше ровный кадр без бликов и размытия</li>
            <li>Занятия появятся на календаре оранжевым и учтутся при планировании</li>
          </ul>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-700">
                Сколько недель добавить
              </label>
              <select
                value={photoWeeks}
                onChange={(e) => setPhotoWeeks(Number(e.target.value))}
                className="rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-sm"
              >
                {[4, 8, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} нед.
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => importSchedulePhoto(e.target.files)}
            />
            <Button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoImporting}
            >
              {photoImporting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-1 h-4 w-4" />
              )}
              {photoImporting ? "Распознаём..." : "Загрузить фото"}
            </Button>
          </div>

          {photoPreview.length > 0 && (
            <div className="mt-4 rounded-2xl bg-amber-50/60 p-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Пример распознанного</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {photoPreview.map((item, i) => (
                  <li key={i}>
                    {item.startTime}–{item.endTime} · {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {photoError && <p className="mt-2 text-sm text-red-500">{photoError}</p>}
          {photoSuccess && <p className="mt-2 text-sm text-emerald-600">{photoSuccess}</p>}
        </Card>

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
              externalEvents={externalEvents}
              onStatusChange={handleTaskStatus}
            />
          ) : view === "week" ? (
            <WeekCalendarView
              date={currentDate}
              tasks={tasks}
              externalEvents={externalEvents}
              onStatusChange={handleTaskStatus}
            />
          ) : (
            <MonthCalendarView
              date={currentDate}
              tasks={tasks}
              externalEvents={externalEvents}
              onStatusChange={handleTaskStatus}
            />
          )}
        </div>
      </main>
    </div>
  );
}

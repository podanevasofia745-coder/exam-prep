"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskItem } from "@/components/task-item";
import {
  daysUntil,
  DIFFICULTY_LABELS,
  EXAM_FORMATS,
  formatDate,
  formatDuration,
  formatShortDate,
  TASK_TYPES,
  TOPIC_STATUSES,
} from "@/lib/utils";
import { calculateProgress } from "@/lib/schedule-generator";
import { downloadIcsExport } from "@/lib/ics-export";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Pencil,
  StickyNote,
  Target,
} from "lucide-react";

type Tab = "overview" | "topics" | "schedule" | "progress";

interface ExamData {
  id: string;
  title: string;
  examDate: string;
  color: string;
  examFormat: string;
  ticketCount: number;
  dailyStudyHours: number;
  priority: number;
  studyTimeStart: string;
  studyTimeEnd: string;
  topics: Array<{
    id: string;
    title: string;
    difficulty: number;
    estimatedStudyTime: number;
    status: string;
    notes: string;
  }>;
  studyTasks: Array<{
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    taskType: string;
    status: string;
    duration: number;
    topicId?: string | null;
  }>;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "topics", label: "Темы" },
  { id: "schedule", label: "Расписание" },
  { id: "progress", label: "Прогресс" },
];

function daysLabel(days: number): string {
  if (days > 0) {
    const n = Math.abs(days) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return `${days} дней`;
    if (n1 === 1) return `${days} день`;
    if (n1 >= 2 && n1 <= 4) return `${days} дня`;
    return `${days} дней`;
  }
  if (days === 0) return "Сегодня";
  return "Прошёл";
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteTopicId, setNoteTopicId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/exams/${id}`, { credentials: "include" });
    if (res.ok) {
      setExam(await res.json());
    } else if (res.status === 401) {
      router.push("/login");
    } else if (res.status === 404) {
      setError("Экзамен не найден");
    } else {
      setError("Не удалось загрузить экзамен");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function handleTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadExam();
  }

  async function markTopicStudied(topicId: string) {
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "STUDIED" }),
    });
    loadExam();
  }

  async function saveNote(topicId: string) {
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteText }),
    });
    setNoteTopicId(null);
    setNoteText("");
    loadExam();
  }

  async function regenerateSchedule() {
    await fetch(`/api/exams/${id}/schedule`, {
      method: "POST",
      credentials: "include",
    });
    loadExam();
  }

  async function handleExport() {
    setExporting(true);
    await downloadIcsExport(id);
    setExporting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8 text-slate-400">Загрузка...</main>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-red-600">{error || "Экзамен не найден"}</p>
          <Link href="/dashboard" className="mt-4 inline-block">
            <Button variant="secondary">Вернуться в кабинет</Button>
          </Link>
        </main>
      </div>
    );
  }

  const days = daysUntil(exam.examDate);
  const progress = calculateProgress(exam.topics, exam.studyTasks);
  const inProgressCount = exam.topics.filter((t) => t.status === "IN_PROGRESS").length;
  const remainingMinutes = exam.topics
    .filter((t) => t.status !== "STUDIED" && t.status !== "REVIEWED")
    .reduce((sum, t) => sum + t.estimatedStudyTime, 0);
  const plannedTasks = exam.studyTasks.filter((t) => t.status === "PLANNED");
  const upcomingTasks = plannedTasks.slice(0, 5);

  const tasksByDate = exam.studyTasks.reduce<
    Record<string, typeof exam.studyTasks>
  >((acc, task) => {
    const key = task.date.split("T")[0];
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  const formatLabel =
    EXAM_FORMATS[exam.examFormat as keyof typeof EXAM_FORMATS] ?? exam.examFormat;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-start gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: exam.color }}
          >
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-800">{exam.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(exam.examDate)} · {formatLabel}
            </p>
          </div>
          <Link href={`/exams/${id}/setup`}>
            <Button variant="secondary" size="sm">
              <Pencil className="mr-1 h-4 w-4" />
              Редактировать данные
            </Button>
          </Link>
        </div>

        {/* Сводка по экзамену */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-sky-600">{exam.topics.length}</p>
            <p className="mt-1 text-sm text-slate-500">Всего тем</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{progress.studiedCount}</p>
            <p className="mt-1 text-sm text-slate-500">Выучено</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-amber-600">
              {progress.remainingCount + inProgressCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">Осталось изучить</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold" style={{ color: exam.color }}>
              {progress.topicProgress}%
            </p>
            <p className="mt-1 text-sm text-slate-500">Прогресс</p>
          </Card>
        </div>

        <Card className="mt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600">Готовность к экзамену</span>
            <span className="font-semibold text-slate-800">{progress.topicProgress}%</span>
          </div>
          <ProgressBar value={progress.topicProgress} color={exam.color} />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3">
              <Calendar className="h-5 w-5 text-sky-500" />
              <div>
                <p className="text-xs text-slate-500">До экзамена</p>
                <p className="font-semibold text-slate-800">{daysLabel(days)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
              <Clock className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-500">Осталось учить</p>
                <p className="font-semibold text-slate-800">
                  {exam.topics.length === 0 ? "—" : formatDuration(remainingMinutes)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-3">
              <Target className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-slate-500">Задач в плане</p>
                <p className="font-semibold text-slate-800">{plannedTasks.length}</p>
              </div>
            </div>
          </div>
          {exam.topics.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-center">
              <p className="text-sm text-slate-600">Темы ещё не добавлены</p>
              <Link href={`/exams/${id}/setup`}>
                <Button className="mt-3" size="sm">
                  Редактировать данные
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-sky-50 p-1">
          {tabs.map(({ id: tabId, label }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === tabId
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h3 className="font-semibold text-slate-800">Информация</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Формат</dt>
                    <dd className="font-medium text-slate-800">{formatLabel}</dd>
                  </div>
                  {exam.ticketCount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Билетов</dt>
                      <dd className="font-medium text-slate-800">{exam.ticketCount}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Часов в день</dt>
                    <dd className="font-medium text-slate-800">{exam.dailyStudyHours} ч</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Время занятий</dt>
                    <dd className="font-medium text-slate-800">
                      {exam.studyTimeStart} – {exam.studyTimeEnd}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Приоритет</dt>
                    <dd className="font-medium text-slate-800">{exam.priority} / 5</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Выполнено задач</dt>
                    <dd className="font-medium text-slate-800">
                      {progress.completedTasks} из {exam.studyTasks.length}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800">Ближайшие задачи</h3>
                <div className="mt-4 space-y-3">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      {exam.topics.length === 0
                        ? "Добавьте темы и сгенерируйте расписание"
                        : "Нет задач. Сгенерируйте расписание."}
                    </p>
                  ) : (
                    upcomingTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={{ ...task, exam: { title: exam.title, color: exam.color } }}
                        onStatusChange={handleTaskStatus}
                        compact
                      />
                    ))
                  )}
                  {exam.topics.length > 0 && exam.studyTasks.length === 0 && (
                    <Button size="sm" onClick={regenerateSchedule}>
                      <Calendar className="mr-1 h-4 w-4" />
                      Сгенерировать расписание
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "topics" && (
            <div className="space-y-3">
              {exam.topics.length === 0 ? (
                <Card>
                  <p className="text-slate-500">Темы не добавлены</p>
                  <Link href={`/exams/${id}/setup`}>
                    <Button className="mt-3" size="sm">
                      Редактировать данные
                    </Button>
                  </Link>
                </Card>
              ) : (
                exam.topics.map((topic) => (
                  <Card key={topic.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{topic.title}</h4>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                          {TOPIC_STATUSES[topic.status as keyof typeof TOPIC_STATUSES] ??
                            topic.status}
                        </span>
                        <span>· {DIFFICULTY_LABELS[topic.difficulty]}</span>
                        <span>· {topic.estimatedStudyTime} мин</span>
                      </div>
                      {topic.notes && (
                        <p className="mt-2 text-sm text-slate-600">{topic.notes}</p>
                      )}
                      {noteTopicId === topic.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 rounded-lg border border-sky-100 px-3 py-1.5 text-sm"
                            placeholder="Заметка..."
                          />
                          <Button size="sm" onClick={() => saveNote(topic.id)}>
                            Сохранить
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setNoteTopicId(topic.id);
                          setNoteText(topic.notes);
                        }}
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                      {topic.status !== "STUDIED" && topic.status !== "REVIEWED" && (
                        <Button size="sm" onClick={() => markTopicStudied(topic.id)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Изучено
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === "schedule" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                  {exam.studyTasks.length} задач в расписании
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExport}
                    disabled={exporting || exam.studyTasks.length === 0}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {exporting ? "Экспорт..." : "В календарь"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={regenerateSchedule}>
                    <Calendar className="mr-1 h-4 w-4" />
                    Пересчитать
                  </Button>
                </div>
              </div>
              {Object.keys(tasksByDate).length === 0 ? (
                <Card>
                  <p className="text-slate-500">Расписание не создано</p>
                  <Button className="mt-3" size="sm" onClick={regenerateSchedule}>
                    Сгенерировать расписание
                  </Button>
                </Card>
              ) : (
                Object.entries(tasksByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, tasks]) => (
                    <div key={date}>
                      <h3 className="mb-3 font-semibold text-slate-800">
                        {formatShortDate(date)}
                      </h3>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={{ ...task, exam: { title: exam.title, color: exam.color } }}
                            onStatusChange={handleTaskStatus}
                          />
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {tab === "progress" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h3 className="font-semibold text-slate-800">Статистика</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Процент готовности</span>
                    <span className="font-bold text-sky-600">{progress.topicProgress}%</span>
                  </div>
                  <ProgressBar value={progress.topicProgress} color={exam.color} />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Выполнено задач</span>
                    <span>{progress.completedTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Пропущено задач</span>
                    <span>{progress.skippedTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Всего тем</span>
                    <span>{exam.topics.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Осталось учить</span>
                    <span>{formatDuration(remainingMinutes)}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800">Прогноз</h3>
                <div className="mt-4">
                  {progress.isBehind ? (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">Вы отстаёте от плана</p>
                        <p className="mt-1 text-sm text-amber-700">
                          Рекомендуем пересчитать расписание или увеличить ежедневную нагрузку.
                        </p>
                        <Button className="mt-3" size="sm" onClick={regenerateSchedule}>
                          Пересчитать расписание
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-800">Вы идёте по плану</p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Продолжайте выполнять задачи по расписанию.
                        </p>
                      </div>
                    </div>
                  )}

                  {days <= 7 && days > 0 && (
                    <div className="mt-4 rounded-xl bg-sky-50 p-4">
                      <p className="font-medium text-sky-800">Финальная неделя!</p>
                      <p className="mt-1 text-sm text-sky-700">
                        До экзамена осталось {daysLabel(days).toLowerCase()}. Сосредоточьтесь на
                        повторении.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="md:col-span-2">
                <h3 className="font-semibold text-slate-800">Задачи по типам</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(TASK_TYPES).map(([key, label]) => {
                    const count = exam.studyTasks.filter((t) => t.taskType === key).length;
                    return (
                      <div key={key} className="rounded-xl bg-sky-50 p-3 text-center">
                        <p className="text-xl font-bold">{count}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

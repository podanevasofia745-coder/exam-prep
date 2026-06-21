"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskItem } from "@/components/task-item";
import {
  daysUntil,
  formatDate,
  formatShortDate,
  DIFFICULTY_LABELS,
  TOPIC_STATUSES,
  TASK_TYPES,
} from "@/lib/utils";
import { calculateProgress } from "@/lib/schedule-generator";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Settings,
  StickyNote,
} from "lucide-react";

type Tab = "overview" | "topics" | "schedule" | "progress";

interface ExamData {
  id: string;
  title: string;
  examDate: string;
  color: string;
  examFormat: string;
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

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [noteTopicId, setNoteTopicId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const loadExam = useCallback(async () => {
    const res = await fetch(`/api/exams/${id}`);
    if (res.ok) {
      setExam(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function handleTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadExam();
  }

  async function markTopicStudied(topicId: string) {
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "STUDIED" }),
    });
    loadExam();
  }

  async function saveNote(topicId: string) {
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteText }),
    });
    setNoteTopicId(null);
    setNoteText("");
    loadExam();
  }

  async function regenerateSchedule() {
    await fetch(`/api/exams/${id}/schedule`, { method: "POST" });
    loadExam();
  }

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">Загрузка...</main>
      </div>
    );
  }

  const days = daysUntil(exam.examDate);
  const progress = calculateProgress(exam.topics, exam.studyTasks);
  const upcomingTasks = exam.studyTasks
    .filter((t) => t.status === "PLANNED")
    .slice(0, 5);

  const tasksByDate = exam.studyTasks.reduce<
    Record<string, typeof exam.studyTasks>
  >((acc, task) => {
    const key = task.date.split("T")[0];
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: exam.color }}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              {formatDate(exam.examDate)} ·{" "}
              {days > 0 ? `${days} дней до экзамена` : days === 0 ? "Экзамен сегодня!" : "Экзамен прошёл"}
            </p>
          </div>
          <Link href={`/exams/${id}/setup`}>
            <Button variant="secondary" size="sm">
              <Settings className="mr-1 h-4 w-4" />
              Настройки
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {tabs.map(({ id: tabId, label }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === tabId
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
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
                <h3 className="font-semibold text-gray-900 dark:text-white">Прогресс</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600">Готовность</span>
                      <span className="font-medium">{progress.topicProgress}%</span>
                    </div>
                    <ProgressBar value={progress.topicProgress} color={exam.color} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-2xl font-bold text-green-600">{progress.studiedCount}</p>
                      <p className="text-xs text-gray-500">Изучено</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-2xl font-bold text-amber-600">{progress.remainingCount}</p>
                      <p className="text-xs text-gray-500">Осталось</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-gray-900 dark:text-white">Ближайшие задачи</h3>
                <div className="mt-4 space-y-3">
                  {upcomingTasks.length === 0 ? (
                    <p className="text-sm text-gray-500">Нет задач. Сгенерируйте расписание.</p>
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
                </div>
              </Card>
            </div>
          )}

          {tab === "topics" && (
            <div className="space-y-3">
              {exam.topics.length === 0 ? (
                <Card>
                  <p className="text-gray-500">Темы не добавлены</p>
                  <Link href={`/exams/${id}/setup`}>
                    <Button className="mt-3" size="sm">
                      Добавить темы
                    </Button>
                  </Link>
                </Card>
              ) : (
                exam.topics.map((topic) => (
                  <Card key={topic.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{topic.title}</h4>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>
                          {TOPIC_STATUSES[topic.status as keyof typeof TOPIC_STATUSES] ?? topic.status}
                        </span>
                        <span>· {DIFFICULTY_LABELS[topic.difficulty]}</span>
                        <span>· {topic.estimatedStudyTime} мин</span>
                      </div>
                      {topic.notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{topic.notes}</p>
                      )}
                      {noteTopicId === topic.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
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
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">
                  {exam.studyTasks.length} задач в расписании
                </p>
                <Button variant="secondary" size="sm" onClick={regenerateSchedule}>
                  <Calendar className="mr-1 h-4 w-4" />
                  Пересчитать
                </Button>
              </div>
              {Object.keys(tasksByDate).length === 0 ? (
                <Card>
                  <p className="text-gray-500">Расписание не создано</p>
                  <Button className="mt-3" size="sm" onClick={regenerateSchedule}>
                    Сгенерировать расписание
                  </Button>
                </Card>
              ) : (
                Object.entries(tasksByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, tasks]) => (
                    <div key={date}>
                      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
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
                <h3 className="font-semibold text-gray-900 dark:text-white">Статистика</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Процент готовности</span>
                    <span className="font-bold text-indigo-600">{progress.topicProgress}%</span>
                  </div>
                  <ProgressBar value={progress.topicProgress} color={exam.color} />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Выполнено задач</span>
                    <span>{progress.completedTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Пропущено задач</span>
                    <span>{progress.skippedTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Всего тем</span>
                    <span>{exam.topics.length}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-gray-900 dark:text-white">Прогноз</h3>
                <div className="mt-4">
                  {progress.isBehind ? (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          Вы отстаёте от плана
                        </p>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                          Рекомендуем пересчитать расписание или увеличить ежедневную нагрузку.
                        </p>
                        <Button className="mt-3" size="sm" onClick={regenerateSchedule}>
                          Пересчитать расписание
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">
                          Вы идёте по плану
                        </p>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                          Продолжайте выполнять задачи по расписанию.
                        </p>
                      </div>
                    </div>
                  )}

                  {days <= 7 && days > 0 && (
                    <div className="mt-4 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
                      <p className="font-medium text-indigo-800 dark:text-indigo-300">
                        Финальная неделя!
                      </p>
                      <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">
                        До экзамена осталось {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}.
                        Сосредоточьтесь на повторении.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="md:col-span-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Задачи по типам
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(TASK_TYPES).map(([key, label]) => {
                    const count = exam.studyTasks.filter((t) => t.taskType === key).length;
                    return (
                      <div key={key} className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                        <p className="text-xl font-bold">{count}</p>
                        <p className="text-xs text-gray-500">{label}</p>
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

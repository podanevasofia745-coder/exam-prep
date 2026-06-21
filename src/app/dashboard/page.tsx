"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskItem } from "@/components/task-item";
import { daysUntil, formatShortDate } from "@/lib/utils";
import { Calendar, Plus, BookOpen } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  examDate: string;
  color: string;
  topics: Array<{ status: string }>;
  studyTasks: Array<{
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    taskType: string;
    status: string;
    duration: number;
  }>;
  _count: { topics: number; studyTasks: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadExams = useCallback(async () => {
    const res = await fetch("/api/exams", { credentials: "include" });
    if (res.ok) {
      setExams(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  async function createExam() {
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const exam = await res.json();
        router.push(`/exams/${exam.id}/setup`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError("Сессия истекла. Войдите в аккаунт снова.");
        router.push("/login");
        return;
      }
      setError(data.error ?? "Не удалось создать экзамен. Попробуйте ещё раз.");
    } catch {
      setError("Ошибка сети. Проверьте подключение к интернету.");
    } finally {
      setCreating(false);
    }
  }

  function getExamProgress(exam: Exam) {
    const studied = exam.topics.filter(
      (t) => t.status === "STUDIED" || t.status === "REVIEWED"
    ).length;
    return exam.topics.length > 0 ? Math.round((studied / exam.topics.length) * 100) : 0;
  }

  const allUpcomingTasks = exams
    .flatMap((exam) =>
      exam.studyTasks.map((t) => ({
        ...t,
        exam: { title: exam.title, color: exam.color },
      }))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Личный кабинет</h1>
            <p className="mt-1 text-slate-500">
              Управляйте экзаменами и следите за прогрессом
            </p>
          </div>
          <Button onClick={createExam} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Создание..." : "Создать экзамен"}
          </Button>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Мои экзамены
            </h2>

            {loading ? (
              <p className="text-slate-400">Загрузка...</p>
            ) : exams.length === 0 ? (
              <Card className="flex flex-col items-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
                  <BookOpen className="h-8 w-8 text-sky-400" />
                </div>
                <p className="mt-4 font-medium text-slate-800">
                  Пока нет экзаменов
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Создайте первый экзамен, чтобы начать подготовку
                </p>
                <Button className="mt-4" onClick={createExam} disabled={creating}>
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Создание..." : "Создать экзамен"}
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {exams.map((exam) => {
                  const days = daysUntil(exam.examDate);
                  const progress = getExamProgress(exam);
                  return (
                    <Link key={exam.id} href={`/exams/${exam.id}`}>
                      <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-100">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                            style={{ backgroundColor: exam.color }}
                          >
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-slate-800">
                              {exam.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatShortDate(exam.examDate)}
                              <span className="mx-1">·</span>
                              {days > 0 ? `${days} дн.` : days === 0 ? "Сегодня!" : "Прошёл"}
                            </div>
                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-xs text-slate-400">
                                <span>{exam._count.topics} тем</span>
                                <span>{progress}%</span>
                              </div>
                              <ProgressBar value={progress} color={exam.color} />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Ближайшие задачи
            </h2>
            <div className="space-y-3">
              {allUpcomingTasks.length === 0 ? (
                <Card>
                  <p className="text-sm text-slate-500">Нет запланированных задач</p>
                </Card>
              ) : (
                allUpcomingTasks.map((task) => (
                  <TaskItem key={task.id} task={task} compact />
                ))
              )}
            </div>
            <Link href="/schedule" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Общее расписание
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

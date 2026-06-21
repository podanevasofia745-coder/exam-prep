"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EXAM_COLORS, EXAM_FORMATS, DAY_NAMES } from "@/lib/utils";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

interface TopicDraft {
  title: string;
  difficulty: number;
  estimatedStudyTime: number;
}

export default function ExamSetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examFormat, setExamFormat] = useState("WRITTEN");
  const [ticketCount, setTicketCount] = useState(0);
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [priority, setPriority] = useState(3);
  const [color, setColor] = useState(EXAM_COLORS[0]);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [studyTimeStart, setStudyTimeStart] = useState("09:00");
  const [studyTimeEnd, setStudyTimeEnd] = useState("21:00");

  const [topics, setTopics] = useState<TopicDraft[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const loadExam = useCallback(async () => {
    const res = await fetch(`/api/exams/${id}`);
    if (res.ok) {
      const exam = await res.json();
      setTitle(exam.title);
      setExamDate(exam.examDate.split("T")[0]);
      setExamFormat(exam.examFormat);
      setTicketCount(exam.ticketCount);
      setDailyStudyHours(exam.dailyStudyHours);
      setPriority(exam.priority);
      setColor(exam.color);
      setStudyDays(exam.studyDays.split(",").map(Number));
      setStudyTimeStart(exam.studyTimeStart);
      setStudyTimeEnd(exam.studyTimeEnd);
      setTopics(
        exam.topics.map((t: TopicDraft & { id: string }) => ({
          title: t.title,
          difficulty: t.difficulty,
          estimatedStudyTime: t.estimatedStudyTime,
        }))
      );
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  function toggleStudyDay(day: number) {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function addTopic() {
    if (!newTopicTitle.trim()) return;
    setTopics((prev) => [
      ...prev,
      { title: newTopicTitle.trim(), difficulty: 3, estimatedStudyTime: 60 },
    ]);
    setNewTopicTitle("");
  }

  function removeTopic(index: number) {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAndGenerate() {
    setSaving(true);

    await fetch(`/api/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        examDate,
        examFormat,
        ticketCount,
        dailyStudyHours,
        priority,
        color,
        studyDays: studyDays.join(","),
        studyTimeStart,
        studyTimeEnd,
      }),
    });

    const existingRes = await fetch(`/api/exams/${id}`);
    const existing = existingRes.ok ? await existingRes.json() : { topics: [] };

    for (const old of existing.topics) {
      await fetch(`/api/topics/${old.id}`, { method: "DELETE" });
    }

    for (const topic of topics) {
      await fetch(`/api/exams/${id}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topic),
      });
    }

    setSaving(false);
    setGenerating(true);

    const schedRes = await fetch(`/api/exams/${id}/schedule`, { method: "POST" });
    setGenerating(false);

    if (schedRes.ok) {
      router.push(`/exams/${id}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">Загрузка...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройка экзамена</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Заполните параметры и добавьте темы для генерации расписания
        </p>

        <div className="mt-8 space-y-6">
          <Card className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Основные параметры</h2>
            <Input label="Название экзамена" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              label="Дата экзамена"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Формат экзамена
              </label>
              <select
                value={examFormat}
                onChange={(e) => setExamFormat(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {Object.entries(EXAM_FORMATS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Количество билетов"
                type="number"
                min={0}
                value={ticketCount}
                onChange={(e) => setTicketCount(Number(e.target.value))}
              />
              <Input
                label="Часов в день"
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={dailyStudyHours}
                onChange={(e) => setDailyStudyHours(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Приоритет (1–5)
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{priority}</span>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Цвет
              </label>
              <div className="flex flex-wrap gap-2">
                {EXAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-gray-900 dark:border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Расписание занятий</h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Дни недели
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleStudyDay(idx)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      studyDays.includes(idx)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Начало занятий"
                type="time"
                value={studyTimeStart}
                onChange={(e) => setStudyTimeStart(e.target.value)}
              />
              <Input
                label="Конец занятий"
                type="time"
                value={studyTimeEnd}
                onChange={(e) => setStudyTimeEnd(e.target.value)}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Темы</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Название темы"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <Button type="button" onClick={addTopic}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {topics.length === 0 ? (
              <p className="text-sm text-gray-500">Добавьте хотя бы одну тему</p>
            ) : (
              <div className="space-y-2">
                {topics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <span className="flex-1 text-sm font-medium">{topic.title}</span>
                    <select
                      value={topic.difficulty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTopics((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, difficulty: val } : t))
                        );
                      }}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    >
                      {[1, 2, 3, 4, 5].map((d) => (
                        <option key={d} value={d}>
                          Сложность {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={topic.estimatedStudyTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTopics((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, estimatedStudyTime: val } : t))
                        );
                      }}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                    />
                    <span className="text-xs text-gray-500">мин</span>
                    <Button variant="ghost" size="sm" onClick={() => removeTopic(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={saveAndGenerate}
            disabled={saving || generating || topics.length === 0 || studyDays.length === 0}
          >
            {generating ? "Генерация расписания..." : saving ? "Сохранение..." : "Сохранить и создать расписание"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}

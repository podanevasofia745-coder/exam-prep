"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRecommendedStudyHours } from "@/lib/schedule-generator";
import { parseTicketsFromFile } from "@/lib/ticket-parser";
import { DAY_NAMES, EXAM_COLORS, EXAM_FORMATS, formatDuration } from "@/lib/utils";
import { ArrowRight, Download, FileUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { parseISO, startOfDay } from "date-fns";

type PlanningMode = "MANUAL" | "AUTO" | "BOTH";

interface TopicDraft {
  title: string;
  difficulty: number;
  estimatedStudyTime: number;
}

const PLANNING_OPTIONS: { id: PlanningMode; label: string; hint: string }[] = [
  {
    id: "MANUAL",
    label: "Вручную",
    hint: "Сами указываете дни и часы в день",
  },
  {
    id: "AUTO",
    label: "Авто-расчёт",
    hint: "Система рассчитает нагрузку по темам и дате экзамена",
  },
  {
    id: "BOTH",
    label: "Оба варианта",
    hint: "Задаёте дни, а часы подстраиваются под объём материала",
  },
];

export default function ExamSetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examFormat, setExamFormat] = useState("WRITTEN");
  const [ticketCount, setTicketCount] = useState(0);
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [priority, setPriority] = useState(3);
  const [color, setColor] = useState(EXAM_COLORS[0]);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("AUTO");
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [studyTimeStart, setStudyTimeStart] = useState("09:00");
  const [studyTimeEnd, setStudyTimeEnd] = useState("21:00");

  const [topics, setTopics] = useState<TopicDraft[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const todayStr = formatDateInput(new Date());

  const loadExam = useCallback(async () => {
    const res = await fetch(`/api/exams/${id}`, { credentials: "include" });
    if (res.ok) {
      const exam = await res.json();
      setTitle(exam.title);
      setExamDate(exam.examDate.split("T")[0]);
      setExamFormat(exam.examFormat);
      setTicketCount(exam.ticketCount);
      setDailyStudyHours(exam.dailyStudyHours);
      setPriority(exam.priority);
      setColor(exam.color);
      setPlanningMode((exam.planningMode as PlanningMode) ?? "AUTO");
      const days = exam.studyDays
        ? exam.studyDays.split(",").map(Number).filter((n: number) => !Number.isNaN(n))
        : [];
      setStudyDays(days.length > 0 ? days : [1, 2, 3, 4, 5]);
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

  const recommendation = useMemo(() => {
    if (!examDate || topics.length === 0) return null;
    const topicInputs = topics.map((t, i) => ({
      id: String(i),
      title: t.title,
      difficulty: t.difficulty,
      estimatedStudyTime: t.estimatedStudyTime,
      status: "NOT_STARTED",
    }));
    const daysForCalc =
      planningMode === "AUTO" && studyDays.length === 0 ? [1, 2, 3, 4, 5, 6] : studyDays;
    return getRecommendedStudyHours(topicInputs, parseISO(examDate), daysForCalc, startOfDay(new Date()));
  }, [examDate, topics, studyDays, planningMode]);

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

  async function handleFileImport(files: FileList | null) {
    if (!files?.length) return;
    setImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      const allTickets: TopicDraft[] = [];
      let importWarning = "";

      for (const file of Array.from(files)) {
        const { tickets: parsed, warning } = await parseTicketsFromFile(file);
        if (warning) importWarning = warning;
        for (const t of parsed) {
          allTickets.push({
            title: t.title,
            difficulty: 3,
            estimatedStudyTime: 60,
          });
        }
      }

      if (allTickets.length === 0) {
        setImportError("Не удалось найти билеты в файле. Проверьте формат.");
        return;
      }

      setTopics(allTickets);
      setTicketCount(allTickets.length);

      if (!examDate) {
        setImportSuccess(
          `Загружено тем: ${allTickets.length}. Укажите дату экзамена и нажмите «Сохранить и создать расписание».`
        );
        return;
      }

      setImportSuccess(`Загружено тем: ${allTickets.length}. Создаём расписание...`);
      const result = await persistTopicsAndSchedule(allTickets);

      if (result.ok) {
        let msg = `Готово: ${result.topicCount ?? allTickets.length} тем, ${result.taskCount} задач в расписании`;
        if (importWarning) msg += `. ${importWarning}`;
        setImportSuccess(msg);
      } else {
        setImportError(result.error ?? "Не удалось создать расписание");
        setImportSuccess(`Распознано тем: ${allTickets.length}`);
        if (importWarning) setImportError(importWarning);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Ошибка импорта");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function exportTickets() {
    const text = topics.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "билеты"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showManualFields = planningMode === "MANUAL" || planningMode === "BOTH";
  const showAutoHint = planningMode === "AUTO" || planningMode === "BOTH";

  const canSave =
    topics.length > 0 &&
    examDate &&
    (planningMode !== "MANUAL" || studyDays.length > 0);

  async function persistTopicsAndSchedule(
    topicList: TopicDraft[]
  ): Promise<{ ok: boolean; error?: string; taskCount?: number; topicCount?: number }> {
    if (!examDate || topicList.length === 0) {
      return { ok: false, error: "Укажите дату экзамена и добавьте темы" };
    }

    const daysToSave =
      planningMode === "AUTO" && studyDays.length === 0
        ? "1,2,3,4,5,6"
        : studyDays.join(",");

    const topicInputs = topicList.map((t, i) => ({
      id: String(i),
      title: t.title,
      difficulty: t.difficulty,
      estimatedStudyTime: t.estimatedStudyTime,
      status: "NOT_STARTED",
    }));
    const daysForCalc =
      planningMode === "AUTO" && studyDays.length === 0 ? [1, 2, 3, 4, 5, 6] : studyDays;
    const hoursForSave =
      planningMode === "AUTO" && examDate
        ? getRecommendedStudyHours(
            topicInputs,
            parseISO(examDate),
            daysForCalc,
            startOfDay(new Date())
          ).hoursPerDay
        : dailyStudyHours;

    const syncRes = await fetch(`/api/exams/${id}/setup-sync`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        examDate,
        examFormat,
        ticketCount: ticketCount || topicList.length,
        dailyStudyHours: hoursForSave,
        priority,
        color,
        planningMode,
        studyDays: daysToSave,
        studyTimeStart,
        studyTimeEnd,
        topics: topicList,
      }),
    });

    const syncData = await syncRes.json().catch(() => ({}));

    if (!syncRes.ok) {
      return {
        ok: false,
        error: syncData.error ?? "Не удалось сохранить и создать расписание",
      };
    }

    return {
      ok: true,
      taskCount: syncData.taskCount ?? 0,
      topicCount: syncData.topicCount ?? topicList.length,
    };
  }

  async function saveAndGenerate() {
    if (!canSave) return;
    setSaving(true);
    setSaveError("");

    const result = await persistTopicsAndSchedule(topics);
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.error ?? "Ошибка сохранения");
      return;
    }

    setGenerating(true);
    router.push(`/exams/${id}`);
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 text-slate-400">Загрузка...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-emerald-50/30">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-800">Настройка экзамена</h1>
        <p className="mt-1 text-slate-500">
          Заполните параметры и добавьте темы для генерации расписания
        </p>

        <div className="mt-8 space-y-5">
          <Card className="!p-4 sm:!p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sky-700">
              Основные параметры
            </h2>
            <div className="space-y-4">
              <Input
                label="Название экзамена"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <DatePicker
                label="Дата экзамена"
                value={examDate}
                onChange={setExamDate}
                min={todayStr}
              />
              <Select
                label="Формат экзамена"
                value={examFormat}
                onChange={(e) => setExamFormat(e.target.value)}
              >
                {Object.entries(EXAM_FORMATS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Количество билетов"
                  type="number"
                  min={0}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Number(e.target.value))}
                />
                {showManualFields ? (
                  <Input
                    label="Часов в день"
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={dailyStudyHours}
                    onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                  />
                ) : (
                  <div className="w-full">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-700">
                      Часов в день
                    </span>
                    <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/50 px-4 py-2.5 text-sm font-medium text-sky-700">
                      {recommendation ? `${recommendation.hoursPerDay} ч (авто)` : "—"}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Приоритет (1–5)
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-sky-500"
                />
                <span className="mt-1 inline-block rounded-lg bg-sky-50 px-2 py-0.5 text-sm font-medium text-sky-600">
                  {priority}
                </span>
              </div>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </Card>

          <Card className="!p-4 sm:!p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sky-700">
              Планирование нагрузки
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLANNING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlanningMode(opt.id)}
                  className={`rounded-2xl border-2 p-3 text-left transition-all ${
                    planningMode === opt.id
                      ? "border-sky-400 bg-sky-50 shadow-sm"
                      : "border-sky-100 bg-white hover:border-sky-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{opt.hint}</p>
                </button>
              ))}
            </div>

            {showAutoHint && recommendation && (
              <div className="mt-4 rounded-2xl bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                <p className="font-medium">Рекомендуемая нагрузка</p>
                <p className="mt-1 text-emerald-700">
                  ~{formatDuration(recommendation.totalMinutes)} материала на{" "}
                  {recommendation.studyDayCount} учебных дней →{" "}
                  <strong>{recommendation.hoursPerDay} ч/день</strong>
                </p>
              </div>
            )}

            {showManualFields && (
              <div className="mt-4 space-y-4">
                <div className="w-full">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Дни недели
                    {planningMode === "BOTH" && (
                      <span className="ml-1 font-normal normal-case text-slate-400">
                        (необязательно — по умолчанию пн–сб)
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_NAMES.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleStudyDay(idx)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                          studyDays.includes(idx)
                            ? "bg-sky-500 text-white shadow-sm"
                            : "bg-sky-50 text-sky-600 hover:bg-sky-100"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
              </div>
            )}
          </Card>

          <Card className="!p-4 sm:!p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">Темы</h2>
              {topics.length > 0 && (
                <Button type="button" variant="secondary" size="sm" onClick={exportTickets}>
                  <Download className="mr-1 h-4 w-4" />
                  Экспорт
                </Button>
              )}
            </div>

            <div
              className="mb-4 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/30 p-5 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileImport(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.md,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFileImport(e.target.files)}
              />
              {importing ? (
                <div className="flex items-center justify-center gap-2 text-sky-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Распознаём билеты...</span>
                </div>
              ) : (
                <>
                  <FileUp className="mx-auto h-8 w-8 text-sky-400" />
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Импорт билетов из файла, Word или PDF
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, DOC, DOCX, TXT, CSV или фото списка. Каждый билет — отдельная строка
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Выбрать файл
                  </Button>
                </>
              )}
              {importSuccess && (
                <p className="mt-2 text-sm text-emerald-600">{importSuccess}</p>
              )}
              {importError && (
                <p className="mt-2 text-sm text-red-500">{importError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Название темы"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
              />
              <Button type="button" onClick={addTopic} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {topics.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Добавьте темы вручную или загрузите файл с билетами
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {topics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-sky-100 bg-sky-50/20 p-3 sm:flex-nowrap"
                  >
                    <span className="w-6 shrink-0 text-xs font-medium text-sky-400">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                      {topic.title}
                    </span>
                    <select
                      value={topic.difficulty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTopics((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, difficulty: val } : t))
                        );
                      }}
                      className="rounded-xl border-2 border-sky-100 bg-white px-2 py-1 text-xs text-slate-600"
                    >
                      {[1, 2, 3, 4, 5].map((d) => (
                        <option key={d} value={d}>
                          Сложн. {d}
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
                      className="w-16 rounded-xl border-2 border-sky-100 bg-white px-2 py-1 text-xs text-slate-600"
                    />
                    <span className="text-xs text-sky-500">мин</span>
                    <Button variant="ghost" size="sm" onClick={() => removeTopic(idx)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {saveError && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={saveAndGenerate}
            disabled={saving || generating || !canSave}
          >
            {generating
              ? "Генерация расписания..."
              : saving
                ? "Сохранение..."
                : "Сохранить и создать расписание"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

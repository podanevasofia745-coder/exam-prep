import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  RefreshCw,
  Repeat,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/navbar";
import {
  BlobBottom,
  BlobTopLeft,
  BlobTopRight,
  DotPattern,
  FloatingCircles,
  HeroIllustration,
  WaveDivider,
} from "./decorations";

const features = [
  {
    icon: LayoutDashboard,
    color: "from-sky-400 to-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-100",
    title: "Личный кабинет",
    description:
      "Ваша главная страница — здесь собраны все экзамены, ближайшие задачи и общий прогресс подготовки. Сразу видно, что нужно сделать сегодня.",
    details: ["Список всех экзаменов", "Ближайшие задачи на 7 дней", "Прогресс по каждому предмету"],
  },
  {
    icon: BookOpen,
    color: "from-emerald-400 to-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "Экзамены и темы",
    description:
      "Создавайте отдельные экзамены для каждого предмета. Добавляйте темы, указывайте сложность и время на изучение — система учтёт всё при планировании.",
    details: ["Карточки дисциплин с цветами", "Темы со сложностью 1–5", "Заметки к каждой теме"],
  },
  {
    icon: Brain,
    color: "from-sky-400 to-emerald-400",
    bg: "bg-gradient-to-br from-sky-50 to-emerald-50",
    border: "border-sky-100",
    title: "Умное расписание",
    description:
      "Алгоритм автоматически распределяет темы по дням с учётом даты экзамена, вашего свободного времени и приоритетов. Нагрузка распределяется равномерно.",
    details: ["Учёт дней недели и часов", "Адаптация под формат экзамена", "Резерв дней перед экзаменом"],
  },
  {
    icon: Repeat,
    color: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "Интервальное повторение",
    description:
      "Главная ценность сайта — вы не просто учите темы, а повторяете их через 1, 3, 6 и 14 дней. Так информация закрепляется в долговременной памяти.",
    details: ["Автоматические повторения", "Сжатый режим при нехватке времени", "Финальная неделя перед экзаменом"],
  },
  {
    icon: CalendarDays,
    color: "from-sky-400 to-cyan-500",
    bg: "bg-sky-50",
    border: "border-sky-100",
    title: "Общее расписание",
    description:
      "Все экзамены в одном календаре. Смотрите задачи на сегодня, неделю или списком. Система предупредит, если занятия по разным предметам пересекаются.",
    details: ["Вид: сегодня / неделя / список", "Цветовые метки экзаменов", "Предупреждения о конфликтах"],
  },
  {
    icon: TrendingUp,
    color: "from-emerald-400 to-green-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "Контроль прогресса",
    description:
      "Отмечайте выполненные и пропущенные задачи. Система пересчитает расписание при отставании и покажет, успеваете ли вы к экзамену.",
    details: ["Процент готовности", "Выполненные и пропущенные задачи", "Автопересчёт при пропусках"],
  },
];

const steps = [
  {
    num: "01",
    icon: ClipboardList,
    title: "Создайте экзамен",
    text: "Укажите предмет, дату экзамена, формат (устный, тест, письменный) и сколько часов в день готовы заниматься.",
  },
  {
    num: "02",
    icon: BookMarked,
    title: "Добавьте темы",
    text: "Внесите список тем с оценкой сложности и временем на изучение. Чем точнее данные — тем лучше план.",
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Получите расписание",
    text: "Нажмите одну кнопку — и алгоритм построит план с изучением, повторениями и финальной подготовкой.",
  },
  {
    num: "04",
    icon: CheckCircle2,
    title: "Занимайтесь каждый день",
    text: "Отмечайте выполненные задачи, следите за прогрессом. При пропусках расписание пересчитается автоматически.",
  },
];

const stats = [
  { value: "1→3→6→14", label: "дней между повторениями", icon: RefreshCw },
  { value: "4", label: "формата экзамена", icon: Target },
  { value: "3", label: "вида расписания", icon: CalendarDays },
  { value: "∞", label: "экзаменов одновременно", icon: BarChart3 },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-emerald-50/30">
      <DotPattern />
      <BlobTopLeft />
      <BlobTopRight />
      <FloatingCircles />

      <PublicHeader />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-8 lg:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Умная подготовка к экзаменам
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-800 sm:text-5xl lg:text-[3.25rem]">
              Учись с планом,{" "}
              <span className="gradient-text">не забывай</span>{" "}
              материал
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500">
              ExamPrep — это не просто список тем. Сайт строит персональное расписание с
              интервальным повторением, чтобы вы успели подготовиться и ничего не забыли к экзамену.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg">
                  Начать бесплатно
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Уже есть аккаунт
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6">
              {[
                { icon: Clock, text: "План за 1 минуту" },
                { icon: Repeat, text: "Автоповторения" },
                { icon: CheckCircle2, text: "Бесплатно" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <WaveDivider />

      {/* What is on the site */}
      <section className="relative bg-white/80 px-6 py-20">
        <BlobBottom />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700">
              Возможности
            </span>
            <h2 className="section-title mt-4">Что есть на сайте и зачем это нужно</h2>
            <p className="section-subtitle mx-auto max-w-2xl">
              Каждый раздел создан, чтобы помочь вам системно готовиться — от первой темы до финального повторения
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, color, bg, border, title, description, details }) => (
              <div
                key={title}
                className={`group relative overflow-hidden rounded-3xl border ${border} ${bg} p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100/50`}
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
                <ul className="mt-4 space-y-2">
                  {details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-50/50 to-emerald-50/50" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
              Как это работает
            </span>
            <h2 className="section-title mt-4">4 шага к успешной сдаче</h2>
            <p className="section-subtitle mx-auto max-w-xl">
              От регистрации до ежедневных занятий — простой и понятный процесс
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ num, icon: Icon, title, text }) => (
              <div key={num} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-sky-100 ring-4 ring-sky-50">
                  <Icon className="h-7 w-7 text-sky-500" />
                </div>
                <span className="text-3xl font-black text-sky-100">{num}</span>
                <h3 className="mt-1 text-lg font-bold text-slate-800">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-400 p-1 shadow-2xl shadow-sky-200/50">
            <div className="rounded-[calc(2rem-4px)] bg-white/95 px-8 py-10">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
                      <Icon className="h-6 w-6 text-sky-500" />
                    </div>
                    <p className="text-3xl font-extrabold gradient-text">{value}</p>
                    <p className="mt-1 text-sm text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-400 to-emerald-400 p-10 text-center text-white shadow-2xl shadow-sky-300/40 sm:p-16">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-white" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Готовы начать подготовку?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">
              Создайте аккаунт, добавьте первый экзамен и получите персональное расписание уже сегодня
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button
                size="lg"
                className="bg-white text-sky-600 shadow-lg hover:bg-sky-50 hover:from-white hover:to-white"
              >
                Создать аккаунт бесплатно
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sky-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            ExamPrep
          </div>
          <p className="text-sm text-slate-400">
            Умное расписание подготовки к экзаменам с интервальным повторением
          </p>
        </div>
      </footer>
    </div>
  );
}

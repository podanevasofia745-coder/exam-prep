export function BlobTopLeft() {
  return (
    <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-sky-200/70 to-sky-100/40 blur-3xl" />
  );
}

export function BlobTopRight() {
  return (
    <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-gradient-to-bl from-emerald-200/60 to-emerald-100/30 blur-3xl" />
  );
}

export function BlobBottom() {
  return (
    <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-t from-sky-100/50 to-emerald-100/40 blur-3xl" />
  );
}

export function FloatingCircles() {
  return (
    <>
      <div className="animate-float pointer-events-none absolute right-[15%] top-[18%] h-16 w-16 rounded-full border-4 border-sky-200/50 bg-white/40" />
      <div className="animate-float-slow pointer-events-none absolute left-[10%] top-[45%] h-10 w-10 rounded-full bg-emerald-200/50" />
      <div className="animate-pulse-soft pointer-events-none absolute right-[25%] top-[55%] h-6 w-6 rounded-full bg-sky-300/40" />
      <div className="animate-float pointer-events-none absolute left-[20%] top-[70%] h-12 w-12 rounded-2xl rotate-12 bg-gradient-to-br from-sky-100 to-emerald-100 opacity-60" />
    </>
  );
}

export function WaveDivider() {
  return (
    <div className="relative h-16 w-full overflow-hidden">
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute bottom-0 w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z"
          fill="white"
          fillOpacity="0.8"
        />
      </svg>
    </div>
  );
}

export function DotPattern() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="#0284c7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-200/40 to-emerald-200/40 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-sky-200/40 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-300" />
            <div className="h-3 w-3 rounded-full bg-amber-300" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-400">Расписание на неделю</span>
        </div>

        <div className="space-y-3">
          {[
            { day: "Пн", task: "Изучение: История", color: "bg-sky-400", time: "09:00" },
            { day: "Вт", task: "Повторение: Биология", color: "bg-emerald-400", time: "10:30" },
            { day: "Ср", task: "Изучение: Математика", color: "bg-sky-400", time: "09:00" },
            { day: "Чт", task: "Повторение: История", color: "bg-emerald-400", time: "14:00" },
            { day: "Пт", task: "Финальная подготовка", color: "bg-gradient-to-r from-sky-400 to-emerald-400", time: "11:00" },
          ].map((item) => (
            <div
              key={item.day}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-50/80 to-white p-3 transition-transform hover:scale-[1.02]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-sky-600 shadow-sm">
                {item.day}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{item.task}</p>
                <p className="text-xs text-slate-400">{item.time}</p>
              </div>
              <div className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-3">
          <span className="text-sm font-medium text-emerald-700">Прогресс</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-white">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            </div>
            <span className="text-sm font-bold text-sky-600">72%</span>
          </div>
        </div>
      </div>

      <div className="animate-float absolute -right-6 -top-6 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-lg shadow-emerald-100">
        <p className="text-xs text-slate-500">До экзамена</p>
        <p className="text-2xl font-bold text-emerald-500">14 дней</p>
      </div>

      <div className="animate-float-slow absolute -bottom-4 -left-6 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-lg shadow-sky-100">
        <p className="text-xs text-slate-500">Тем изучено</p>
        <p className="text-2xl font-bold text-sky-500">8 / 12</p>
      </div>
    </div>
  );
}

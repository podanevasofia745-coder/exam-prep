"use client";

import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function DatePicker({ label, value, onChange, min }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : null;
  const [viewMonth, setViewMonth] = useState(selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const minDate = min ? parseISO(min) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function pickDay(day: Date) {
    if (minDate && day < minDate) return;
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  function pickToday() {
    const today = new Date();
    if (minDate && today < minDate) return;
    onChange(format(today, "yyyy-MM-dd"));
    setViewMonth(today);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setOpen(false);
  }

  const displayValue = selected
    ? format(selected, "d MMMM yyyy", { locale: ru })
    : "Выберите дату";

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-700">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-sky-100 bg-white px-4 py-2.5 text-left text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
      >
        <span className={selected ? "font-medium" : "text-slate-400"}>{displayValue}</span>
        <Calendar className="h-4 w-4 shrink-0 text-sky-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border-2 border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/60">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="rounded-xl p-1.5 text-sky-500 hover:bg-sky-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold capitalize text-slate-700">
              {format(viewMonth, "LLLL yyyy", { locale: ru })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="rounded-xl p-1.5 text-sky-500 hover:bg-sky-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-sky-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = selected && isSameDay(day, selected);
              const isOutside = !isSameMonth(day, viewMonth);
              const disabled = minDate ? day < minDate : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(day)}
                  className={cn(
                    "aspect-square rounded-xl text-sm transition-colors",
                    isOutside && "text-sky-200",
                    !isOutside && !disabled && "text-slate-600 hover:bg-sky-50",
                    disabled && "cursor-not-allowed text-sky-100",
                    isToday(day) && !isSelected && "ring-1 ring-sky-200",
                    isSelected && "bg-sky-500 font-semibold text-white shadow-md shadow-sky-200"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between border-t border-sky-50 pt-3">
            <button
              type="button"
              onClick={clear}
              className="text-sm font-medium text-sky-500 hover:text-sky-600"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={pickToday}
              className="text-sm font-medium text-sky-500 hover:text-sky-600"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

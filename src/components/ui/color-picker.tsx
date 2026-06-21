"use client";

import { EXAM_COLORS } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useRef } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label = "Цвет" }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const presets = EXAM_COLORS;
  const isCustom = !presets.includes(value);

  return (
    <div className="w-full">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-sky-700">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
              value === c ? "border-sky-500 ring-2 ring-sky-200" : "border-white shadow-sm"
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 transition-transform hover:scale-110 ${
            isCustom ? "border-sky-500 ring-2 ring-sky-200" : "border-sky-200 bg-sky-50"
          }`}
          style={isCustom ? { backgroundColor: value } : undefined}
          title="Свой цвет"
        >
          {!isCustom && <Plus className="h-4 w-4 text-sky-500" />}
          <input
            ref={inputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </button>
      </div>
      {isCustom && (
        <p className="mt-2 text-xs text-sky-600">Выбран свой цвет: {value}</p>
      )}
    </div>
  );
}

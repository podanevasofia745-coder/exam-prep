"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-sky-700"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            ref={ref}
            id={id}
            className={cn(
              "w-full appearance-none rounded-2xl border-2 border-sky-100 bg-sky-50/40 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

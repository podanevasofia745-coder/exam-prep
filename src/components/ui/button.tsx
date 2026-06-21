"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "green";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md shadow-sky-200 hover:from-sky-500 hover:to-sky-600 hover:shadow-lg":
              variant === "primary",
            "bg-white text-sky-700 border-2 border-sky-100 hover:border-sky-200 hover:bg-sky-50":
              variant === "secondary",
            "text-slate-600 hover:bg-sky-50 hover:text-sky-700": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600": variant === "danger",
            "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-emerald-600":
              variant === "green",
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-13 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

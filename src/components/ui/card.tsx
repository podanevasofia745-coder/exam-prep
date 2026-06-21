import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-sky-100/80 bg-white p-6 shadow-sm shadow-sky-100/40",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: string;
}

export function ProgressBar({ value, className, color }: ProgressBarProps) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-sky-100", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color
            ? color
            : "linear-gradient(to right, #38bdf8, #34d399)",
        }}
      />
    </div>
  );
}

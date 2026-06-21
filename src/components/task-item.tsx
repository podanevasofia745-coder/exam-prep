import { cn } from "@/lib/utils";
import { TASK_TYPES, TASK_STATUSES } from "@/lib/utils";
import { Check, Clock, SkipForward } from "lucide-react";
import { Button } from "./ui/button";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    taskType: string;
    status: string;
    duration: number;
    exam?: { title: string; color: string };
  };
  onStatusChange?: (id: string, status: string) => void;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  STUDY: "bg-sky-100 text-sky-700",
  REVIEW: "bg-emerald-100 text-emerald-700",
  TEST: "bg-teal-100 text-teal-700",
  FINAL: "bg-green-100 text-green-700",
};

export function TaskItem({ task, onStatusChange, compact }: TaskItemProps) {
  const isDone = task.status === "COMPLETED";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 transition-all",
        isDone
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-sky-100 bg-white hover:shadow-md hover:shadow-sky-50"
      )}
    >
      {task.exam && (
        <div
          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: task.exam.color }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-xs font-semibold",
              typeColors[task.taskType] ?? typeColors.STUDY
            )}
          >
            {TASK_TYPES[task.taskType as keyof typeof TASK_TYPES] ?? task.taskType}
          </span>
          <span className="text-xs text-slate-400">
            {TASK_STATUSES[task.status as keyof typeof TASK_STATUSES] ?? task.status}
          </span>
        </div>
        <p className={cn("mt-1 font-medium text-slate-800", isDone && "line-through opacity-60")}>
          {task.title}
        </p>
        {!compact && (
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            {task.exam && <span>{task.exam.title}</span>}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-sky-400" />
              {task.startTime}–{task.endTime} ({task.duration} мин)
            </span>
          </div>
        )}
      </div>
      {onStatusChange && task.status === "PLANNED" && (
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="green"
            onClick={() => onStatusChange(task.id, "COMPLETED")}
            title="Выполнено"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(task.id, "SKIPPED")}
            title="Пропустить"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

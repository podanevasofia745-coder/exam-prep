import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";

export interface TopicInput {
  id: string;
  title: string;
  difficulty: number;
  estimatedStudyTime: number;
  status: string;
}

export interface ExamSettings {
  examDate: Date;
  dailyStudyHours: number;
  studyDays: number[];
  studyTimeStart: string;
  examFormat: string;
}

export interface GeneratedTask {
  topicId: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  taskType: "STUDY" | "REVIEW" | "TEST" | "FINAL";
  duration: number;
  title: string;
}

const STANDARD_REVIEW_INTERVALS = [1, 3, 6, 13];
const COMPRESSED_REVIEW_INTERVALS = [1, 2, 4];

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes: minutes ?? 0 };
}

function addMinutesToTime(time: string, minutes: number): string {
  const { hours, minutes: mins } = parseTime(time);
  const total = hours * 60 + mins + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isStudyDay(date: Date, studyDays: number[]): boolean {
  return studyDays.includes(date.getDay());
}

function getAvailableDays(
  startDate: Date,
  examDate: Date,
  studyDays: number[]
): Date[] {
  const days: Date[] = [];
  let current = startOfDay(startDate);
  const end = startOfDay(examDate);

  while (isBefore(current, end)) {
    if (isStudyDay(current, studyDays)) {
      days.push(new Date(current));
    }
    current = addDays(current, 1);
  }

  return days;
}

function getReviewIntervals(totalDays: number): number[] {
  if (totalDays <= 7) return [1, 2];
  if (totalDays <= 14) return COMPRESSED_REVIEW_INTERVALS;
  return STANDARD_REVIEW_INTERVALS;
}

function getDifficultyMultiplier(difficulty: number): number {
  return 0.7 + difficulty * 0.15;
}

export function generateSchedule(
  topics: TopicInput[],
  settings: ExamSettings,
  startDate: Date = startOfDay(new Date())
): GeneratedTask[] {
  const examDate = startOfDay(settings.examDate);
  const availableDays = getAvailableDays(startDate, examDate, settings.studyDays);

  if (availableDays.length === 0 || topics.length === 0) {
    return [];
  }

  const totalCalendarDays = differenceInCalendarDays(examDate, startDate);
  const reviewIntervals = getReviewIntervals(totalCalendarDays);
  const dailyMinutes = settings.dailyStudyHours * 60;
  const finalReviewDays = Math.min(2, Math.max(1, Math.floor(availableDays.length * 0.1)));

  const unstudiedTopics = topics.filter((t) => t.status === "NOT_STARTED");
  const studiedTopics = topics.filter((t) => t.status !== "NOT_STARTED");

  const studyDaysForNew = availableDays.slice(0, Math.max(1, availableDays.length - finalReviewDays));
  const tasks: GeneratedTask[] = [];
  const dayLoad: Map<string, number> = new Map();

  const getDayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const getRemainingMinutes = (day: Date) =>
    dailyMinutes - (dayLoad.get(getDayKey(day)) ?? 0);

  const addTask = (task: GeneratedTask) => {
    const key = getDayKey(task.date);
    dayLoad.set(key, (dayLoad.get(key) ?? 0) + task.duration);
    tasks.push(task);
  };

  const findSlot = (
    preferredDay: Date,
    duration: number,
    days: Date[]
  ): { day: Date; startTime: string; endTime: string } | null => {
    const startIdx = days.findIndex((d) => isSameDay(d, preferredDay));
    const searchOrder =
      startIdx >= 0
        ? [...days.slice(startIdx), ...days.slice(0, startIdx)]
        : days;

    for (const day of searchOrder) {
      const remaining = getRemainingMinutes(day);
      if (remaining >= duration) {
        const used = dayLoad.get(getDayKey(day)) ?? 0;
        const startTime = addMinutesToTime(settings.studyTimeStart, used);
        const endTime = addMinutesToTime(startTime, duration);
        return { day, startTime, endTime };
      }
    }
    return null;
  };

  // Schedule initial study for unstudied topics
  const topicsPerDay = Math.max(1, Math.ceil(unstudiedTopics.length / studyDaysForNew.length));
  let topicIdx = 0;

  for (const day of studyDaysForNew) {
    for (let i = 0; i < topicsPerDay && topicIdx < unstudiedTopics.length; i++) {
      const topic = unstudiedTopics[topicIdx];
      const duration = Math.round(
        topic.estimatedStudyTime * getDifficultyMultiplier(topic.difficulty)
      );
      const slot = findSlot(day, duration, studyDaysForNew);
      if (slot) {
        addTask({
          topicId: topic.id,
          date: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          taskType: "STUDY",
          duration,
          title: `Изучение: ${topic.title}`,
        });
        topicIdx++;
      }
    }
  }

  // Pack remaining unstudied topics
  for (; topicIdx < unstudiedTopics.length; topicIdx++) {
    const topic = unstudiedTopics[topicIdx];
    const duration = Math.round(
      topic.estimatedStudyTime * getDifficultyMultiplier(topic.difficulty)
    );
    const slot = findSlot(studyDaysForNew[0], duration, studyDaysForNew);
    if (slot) {
      addTask({
        topicId: topic.id,
        date: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        taskType: "STUDY",
        duration,
        title: `Изучение: ${topic.title}`,
      });
    }
  }

  // Schedule reviews for all topics (studied + newly scheduled)
  const allTopicsForReview = [...topics];
  const studyTasksByTopic = new Map<string, GeneratedTask[]>();

  for (const task of tasks.filter((t) => t.taskType === "STUDY" && t.topicId)) {
    const list = studyTasksByTopic.get(task.topicId!) ?? [];
    list.push(task);
    studyTasksByTopic.set(task.topicId!, list);
  }

  for (const topic of allTopicsForReview) {
    let firstStudyDate = startDate;

    if (topic.status !== "NOT_STARTED") {
      firstStudyDate = startDate;
    } else {
      const studyTask = studyTasksByTopic.get(topic.id)?.[0];
      if (studyTask) firstStudyDate = studyTask.date;
    }

    const reviewDuration = Math.max(
      20,
      Math.round(topic.estimatedStudyTime * 0.4 * getDifficultyMultiplier(topic.difficulty))
    );

    for (const interval of reviewIntervals) {
      const reviewDate = addDays(firstStudyDate, interval);
      if (!isBefore(reviewDate, examDate) && !isSameDay(reviewDate, examDate)) continue;
      if (!isStudyDay(reviewDate, settings.studyDays)) continue;

      const slot = findSlot(reviewDate, reviewDuration, availableDays);
      if (slot) {
        addTask({
          topicId: topic.id,
          date: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          taskType: "REVIEW",
          duration: reviewDuration,
          title: `Повторение: ${topic.title}`,
        });
      }
    }
  }

  // Final review days before exam
  const finalDays = availableDays.slice(-finalReviewDays);
  for (const day of finalDays) {
    const duration = Math.min(90, getRemainingMinutes(day));
    if (duration >= 30) {
      const slot = findSlot(day, duration, finalDays);
      if (slot) {
        addTask({
          topicId: null,
          date: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          taskType: "FINAL",
          duration,
          title: "Общее повторение перед экзаменом",
        });
      }
    }
  }

  // Test day for test-format exams
  if (settings.examFormat === "TEST" || settings.examFormat === "MIXED") {
    const testDay = availableDays[Math.max(0, availableDays.length - 3)];
    const duration = 60;
    const slot = findSlot(testDay, duration, availableDays);
    if (slot) {
      addTask({
        topicId: null,
        date: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        taskType: "TEST",
        duration,
        title: "Пробный тест",
      });
    }
  }

  return tasks.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function recalculateSchedule(
  topics: TopicInput[],
  settings: ExamSettings,
  missedTopicIds: string[]
): GeneratedTask[] {
  const adjustedTopics = topics.map((t) => {
    if (missedTopicIds.includes(t.id) && t.status === "NOT_STARTED") {
      return t;
    }
    return t;
  });

  return generateSchedule(adjustedTopics, settings, startOfDay(new Date()));
}

export function detectScheduleConflicts(
  tasks: Array<{ date: Date; startTime: string; endTime: string; examId: string; examTitle: string }>
): string[] {
  const warnings: string[] = [];
  const byDate = new Map<string, typeof tasks>();

  for (const task of tasks) {
    const key = format(task.date, "yyyy-MM-dd");
    const list = byDate.get(key) ?? [];
    list.push(task);
    byDate.set(key, list);
  }

  for (const [, dayTasks] of byDate) {
    for (let i = 0; i < dayTasks.length; i++) {
      for (let j = i + 1; j < dayTasks.length; j++) {
        const a = dayTasks[i];
        const b = dayTasks[j];
        if (a.startTime < b.endTime && b.startTime < a.endTime) {
          warnings.push(
            `Конфликт ${format(a.date, "dd.MM")}: «${a.examTitle}» и «${b.examTitle}» пересекаются по времени`
          );
        }
      }
    }
  }

  return warnings;
}

export function calculateProgress(
  topics: Array<{ status: string }>,
  tasks: Array<{ status: string }>
): {
  topicProgress: number;
  taskProgress: number;
  studiedCount: number;
  remainingCount: number;
  completedTasks: number;
  skippedTasks: number;
  isBehind: boolean;
} {
  const studiedCount = topics.filter(
    (t) => t.status === "STUDIED" || t.status === "REVIEWED"
  ).length;
  const remainingCount = topics.filter((t) => t.status === "NOT_STARTED").length;
  const topicProgress = topics.length > 0 ? (studiedCount / topics.length) * 100 : 0;

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const skippedTasks = tasks.filter((t) => t.status === "SKIPPED").length;
  const pastTasks = tasks.filter((t) => t.status !== "PLANNED" || true);
  const taskProgress =
    pastTasks.length > 0 ? (completedTasks / pastTasks.length) * 100 : 0;

  const overdueTasks = tasks.filter((t) => {
    const taskDate = new Date(t.status === "PLANNED" ? new Date() : new Date());
    return t.status === "PLANNED" && isBefore(new Date(), startOfDay(new Date()));
  });

  const isBehind = skippedTasks > 2 || overdueTasks.length > 3;

  return {
    topicProgress: Math.round(topicProgress),
    taskProgress: Math.round(taskProgress),
    studiedCount,
    remainingCount,
    completedTasks,
    skippedTasks,
    isBehind,
  };
}

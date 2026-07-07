import { todayKey } from "@/lib/date";

export type TaskStatus = "inbox" | "scheduled" | "completed";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
};

export type StorageNotice =
  | { type: "storage-unavailable"; message: string }
  | { type: "parse-failed"; message: string }
  | { type: "write-failed"; message: string };

export type LoadTasksResult = {
  tasks: Task[];
  notices: StorageNotice[];
};

export const STORAGE_KEY = "just-today-data:v1";

type StoredData = {
  version: 1;
  tasks: Task[];
};

const DEMO_TODAY_TITLES = ["给露营小助手群回 3 条消息", "用 Suno 随便做一首歌"];
const DEMO_INBOX_TITLES = [
  "研究成人自考报名时间",
  "去健身房",
  "规划日本旅行",
  "学一点 vibe coding",
];
const DEMO_DONE_TITLES = ["给又又剪指甲", "回复一条朋友消息"];

function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const testKey = "__just_today_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTaskDraft(title: string, now = new Date()): Task {
  const timestamp = now.toISOString();

  return {
    id: createId(),
    title: title.trim(),
    status: "inbox",
    scheduledDate: null,
    completedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    sortOrder: now.getTime(),
  };
}

export function createDemoTasks(now = new Date()): Task[] {
  const today = todayKey(now);
  const base = now.getTime();

  const makeTask = (
    title: string,
    index: number,
    status: TaskStatus,
    scheduledDate: string | null,
    completedAt: string | null,
  ): Task => {
    const createdAt = new Date(base - (12 - index) * 60_000).toISOString();

    return {
      id: createId(),
      title,
      status,
      scheduledDate,
      completedAt,
      createdAt,
      updatedAt: createdAt,
      sortOrder: base + index,
    };
  };

  return [
    ...DEMO_TODAY_TITLES.map((title, index) =>
      makeTask(title, index, "scheduled", today, null),
    ),
    ...DEMO_INBOX_TITLES.map((title, index) =>
      makeTask(title, index + 10, "inbox", null, null),
    ),
    ...DEMO_DONE_TITLES.map((title, index) =>
      makeTask(
        title,
        index + 20,
        "completed",
        today,
        new Date(base - (DEMO_DONE_TITLES.length - index) * 1_000).toISOString(),
      ),
    ),
  ];
}

export function recycleExpiredScheduledTasks(
  tasks: Task[],
  today = todayKey(),
): Task[] {
  const now = new Date().toISOString();

  return tasks.map((task) => {
    if (
      task.status === "scheduled" &&
      task.scheduledDate !== null &&
      task.scheduledDate < today
    ) {
      return {
        ...task,
        status: "inbox",
        scheduledDate: null,
        updatedAt: now,
      };
    }

    return task;
  });
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Partial<Task>;

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.status === "inbox" ||
      task.status === "scheduled" ||
      task.status === "completed") &&
    (typeof task.scheduledDate === "string" || task.scheduledDate === null) &&
    (typeof task.completedAt === "string" || task.completedAt === null) &&
    typeof task.createdAt === "string" &&
    typeof task.updatedAt === "string" &&
    typeof task.sortOrder === "number"
  );
}

function parseStoredData(raw: string): Task[] | null {
  const parsed = JSON.parse(raw) as Partial<StoredData>;
  if (!Array.isArray(parsed.tasks)) return null;

  const tasks = parsed.tasks.filter(isTask);
  return tasks.length === parsed.tasks.length ? tasks : null;
}

export function saveTasks(tasks: Task[]): StorageNotice | null {
  if (!storageAvailable()) {
    return {
      type: "storage-unavailable",
      message: "当前浏览器暂时不能保存数据，刷新后可能会丢失。",
    };
  }

  try {
    const payload: StoredData = { version: 1, tasks };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return null;
  } catch {
    return {
      type: "write-failed",
      message: "保存失败了，可能是浏览器存储空间已满。",
    };
  }
}

export function loadTasks(): LoadTasksResult {
  const notices: StorageNotice[] = [];

  if (!storageAvailable()) {
    const tasks = createDemoTasks();

    return {
      tasks,
      notices: [
        {
          type: "storage-unavailable",
          message: "当前浏览器暂时不能保存数据，先用临时 demo 数据展示。",
        },
      ],
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const demoTasks = createDemoTasks();
    const writeNotice = saveTasks(demoTasks);
    if (writeNotice) notices.push(writeNotice);

    return { tasks: demoTasks, notices };
  }

  try {
    const parsedTasks = parseStoredData(raw);

    if (!parsedTasks) {
      throw new Error("Invalid task data");
    }

    const tasks = recycleExpiredScheduledTasks(parsedTasks);
    if (JSON.stringify(tasks) !== JSON.stringify(parsedTasks)) {
      const writeNotice = saveTasks(tasks);
      if (writeNotice) notices.push(writeNotice);
    }

    return { tasks, notices };
  } catch {
    const demoTasks = createDemoTasks();
    const writeNotice = saveTasks(demoTasks);
    if (writeNotice) notices.push(writeNotice);

    return {
      tasks: demoTasks,
      notices: [
        {
          type: "parse-failed",
          message: "本地数据读取失败，已温和重置为 demo 数据。",
        },
        ...notices,
      ],
    };
  }
}

export function resetDemoData(): LoadTasksResult {
  const tasks = createDemoTasks();
  const writeNotice = saveTasks(tasks);

  return {
    tasks,
    notices: writeNotice ? [writeNotice] : [],
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { toDateKey, todayKey, tomorrowKey } from "@/lib/date";
import {
  createTaskDraft,
  loadTasks,
  resetDemoData,
  saveTasks,
  Task,
  StorageNotice,
} from "@/lib/storage";

function timestamp(): string {
  return new Date().toISOString();
}

function sortByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notices, setNotices] = useState<StorageNotice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const today = todayKey();

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      const result = loadTasks();
      setTasks(result.tasks);
      setNotices(result.notices);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const commit = (updater: (current: Task[]) => Task[]) => {
    setTasks((current) => {
      const next = updater(current);
      const notice = saveTasks(next);
      setNotices(notice ? [notice] : []);
      return next;
    });
  };

  const groups = useMemo(() => {
    const todayTasks = sortByOrder(
      tasks.filter(
        (task) =>
          task.status === "scheduled" && task.scheduledDate === today,
      ),
    );
    const inboxTasks = sortByOrder(
      tasks.filter((task) => task.status === "inbox"),
    );
    const futureScheduledTasks = sortByOrder(
      tasks.filter(
        (task) =>
          task.status === "scheduled" &&
          task.scheduledDate !== null &&
          task.scheduledDate > today,
      ),
    );
    const completedTodayTasks = [...tasks]
      .filter(
        (task) =>
          task.status === "completed" &&
          task.completedAt !== null &&
          toDateKey(new Date(task.completedAt)) === today,
      )
      .sort((a, b) => {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
        const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
        return bTime - aTime;
      });
    const pastCompletedTasks = [...tasks]
      .filter(
        (task) =>
          task.status === "completed" &&
          task.completedAt !== null &&
          toDateKey(new Date(task.completedAt)) < today,
      )
      .sort((a, b) => {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
        const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
        return bTime - aTime;
      });

    return {
      todayTasks,
      inboxTasks,
      futureScheduledTasks,
      completedTodayTasks,
      pastCompletedTasks,
    };
  }, [tasks, today]);

  const addTask = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    commit((current) => [...current, createTaskDraft(trimmed)]);
  };

  const scheduleTask = (id: string, dateKey: string) => {
    commit((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "scheduled",
              scheduledDate: dateKey,
              completedAt: null,
              updatedAt: timestamp(),
              sortOrder: Date.now(),
            }
          : task,
      ),
    );
  };

  const moveToInbox = (id: string) => {
    commit((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "inbox",
              scheduledDate: null,
              completedAt: null,
              updatedAt: timestamp(),
              sortOrder: Date.now(),
            }
          : task,
      ),
    );
  };

  const completeTask = (id: string) => {
    const now = timestamp();
    commit((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "completed",
              scheduledDate: today,
              completedAt: now,
              updatedAt: now,
              sortOrder: Date.now(),
            }
          : task,
      ),
    );
  };

  const uncompleteTask = (id: string) => {
    commit((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "scheduled",
              scheduledDate: todayKey(),
              completedAt: null,
              updatedAt: timestamp(),
              sortOrder: Date.now(),
            }
          : task,
      ),
    );
  };

  const updateTaskTitle = (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    commit((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, title: trimmed, updatedAt: timestamp() }
          : task,
      ),
    );
  };

  const deleteTask = (id: string) => {
    commit((current) => current.filter((task) => task.id !== id));
  };

  const resetDemo = () => {
    const result = resetDemoData();
    setTasks(result.tasks);
    setNotices(result.notices);
  };

  return {
    loaded,
    notices,
    tasks,
    groups,
    today,
    addTask,
    scheduleToday: (id: string) => scheduleTask(id, todayKey()),
    scheduleTomorrow: (id: string) => scheduleTask(id, tomorrowKey()),
    scheduleTask,
    moveToInbox,
    completeTask,
    uncompleteTask,
    updateTaskTitle,
    deleteTask,
    resetDemo,
  };
}

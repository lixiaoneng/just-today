"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatHeaderDate, formatShortDate, toDateKey, tomorrowKey } from "@/lib/date";
import { Task } from "@/lib/storage";
import { useTasks } from "@/hooks/useTasks";

type TaskActions = {
  scheduleToday: (id: string) => void;
  scheduleTomorrow: (id: string) => void;
  scheduleTask: (id: string, dateKey: string) => void;
  moveToInbox: (id: string) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  updateTaskTitle: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
};

function SectionTitle({
  title,
  count,
  note,
}: {
  title: string;
  count?: number;
  note?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between px-0.5">
      <div>
        <h2 className="text-[15px] font-semibold text-[#20221f]">{title}</h2>
        {note ? <p className="mt-0.5 text-xs text-[#858a82]">{note}</p> : null}
      </div>
      {typeof count === "number" ? (
        <span className="text-xs font-medium text-[#8a9088]">{count}</span>
      ) : null}
    </div>
  );
}

function SectionShell({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "today" | "scheduled" | "inbox" | "completed" | "default";
}) {
  const tones = {
    today: "border-[#e7e9e3] bg-white shadow-[0_10px_28px_rgba(29,33,27,0.045)]",
    scheduled: "border-[#e2e7df] bg-[#f8faf7]",
    inbox: "border-[#eaebe7] bg-[#fbfbfa]",
    completed: "border-[#e9ebe6] bg-[#f7f8f6]",
    default: "border-[#e7e9e3] bg-white",
  };

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
      {children}
    </div>
  );
}

function ConfirmDelete({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-2 rounded-md border border-[#ead8d4] bg-[#fff8f7] p-3">
      <p className="text-sm text-[#5d3f3a]">删除这件事吗？</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-[#6f746d] transition active:scale-[0.98]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-[#a1534c] px-3 py-1.5 text-sm text-white transition active:scale-[0.98]"
        >
          删除
        </button>
      </div>
    </div>
  );
}

function DateScheduleSheet({
  task,
  onCancel,
  onSave,
}: {
  task: Task;
  onCancel: () => void;
  onSave: (dateKey: string) => void;
}) {
  const initialDate = task.scheduledDate ?? tomorrowKey();
  const [date, setDate] = useState(initialDate);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end bg-[rgba(32,34,31,0.18)] px-3 pb-3 pt-10 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="取消选日期"
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!date) return;
          onSave(date);
        }}
        className="relative mx-auto w-full max-w-[520px] rounded-xl border border-[#e0e4dd] bg-white p-4 shadow-[0_18px_48px_rgba(30,34,28,0.18)]"
      >
        <p className="text-xs font-medium text-[#858a82]">安排处理时间</p>
        <h3 className="mt-1 text-[17px] font-semibold leading-6 text-[#20221f]">
          {task.title}
        </h3>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-[#5f655d]">选日期</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            autoFocus
            className="h-11 w-full rounded-md border border-[#dfe3dc] bg-white px-3 text-[16px] text-[#20221f] outline-none focus:border-[#687863]"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-[#6f746d] transition active:scale-[0.98]"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded-md bg-[#687863] px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            保存
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function InlineEditor({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-[#dfe3dc] bg-white px-3 py-2 text-[15px] text-[#20221f] outline-none focus:border-[#687863]"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-[#687863] px-3 py-2 text-sm text-white transition active:scale-[0.98]"
      >
        保存
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-md px-2 py-2 text-sm text-[#6f746d] transition active:scale-[0.98]"
      >
        取消
      </button>
    </form>
  );
}

function MoreMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const closeOnAction = () => setOpen(false);

    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("close-task-menus", closeOnAction);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("close-task-menus", closeOnAction);
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    setOpen((value) => !value);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label="更多操作"
        onClick={toggle}
        className="grid h-9 w-9 place-items-center rounded-md text-lg leading-none text-[#7f857d] transition hover:bg-[#f0f2ee] active:scale-[0.96]"
      >
        ···
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, right: position.right }}
              className="fixed z-50 w-32 rounded-md border border-[#e0e3dd] bg-white p-1 shadow-[0_12px_28px_rgba(30,34,28,0.14)]"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        window.dispatchEvent(new Event("close-task-menus"));
      }}
      className={`block w-full rounded px-3 py-2 text-left text-sm transition hover:bg-[#f4f5f2] ${
        danger ? "text-[#a1534c]" : "text-[#3f443d]"
      }`}
    >
      {children}
    </button>
  );
}

function TodayTaskRow({
  task,
  actions,
}: {
  task: Task;
  actions: TaskActions;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="animate-settle-in border-b border-[#eceee9] py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`完成 ${task.title}`}
          onClick={() => actions.completeTask(task.id)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border border-[#b8c2b2] bg-white text-[#687863] transition active:scale-90"
        >
          <span className="h-2.5 w-2.5 rounded-[3px] bg-transparent" />
        </button>
        {editing ? (
          <InlineEditor
            task={task}
            onCancel={() => setEditing(false)}
            onSave={(title) => {
              actions.updateTaskTitle(task.id, title);
              setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 py-1 text-left text-[15px] leading-6 text-[#20221f]"
          >
            {task.title}
          </button>
        )}
        {!editing ? (
          <MoreMenu>
            <MenuButton onClick={() => actions.scheduleTomorrow(task.id)}>
              明天做
            </MenuButton>
            <MenuButton onClick={() => actions.moveToInbox(task.id)}>
              晚点再说
            </MenuButton>
            <MenuButton danger onClick={() => setConfirmingDelete(true)}>
              删除
            </MenuButton>
          </MoreMenu>
        ) : null}
      </div>
      {confirmingDelete ? (
        <ConfirmDelete
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => actions.deleteTask(task.id)}
        />
      ) : null}
    </li>
  );
}

function InboxTaskRow({
  task,
  actions,
}: {
  task: Task;
  actions: TaskActions;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);

  return (
    <li className="animate-settle-in border-b border-[#eceee9] py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        {editing ? (
          <InlineEditor
            task={task}
            onCancel={() => setEditing(false)}
            onSave={(title) => {
              actions.updateTaskTitle(task.id, title);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-w-0 flex-1 py-1 text-left text-[15px] leading-6 text-[#333833]"
            >
              {task.title}
            </button>
            <button
              type="button"
              onClick={() => actions.scheduleToday(task.id)}
              className="shrink-0 rounded-md border border-[#b8c5b1] bg-white px-3 py-1.5 text-sm font-medium text-[#53634d] transition hover:bg-[#f3f6f1] active:scale-[0.97]"
            >
              今天做
            </button>
            <MoreMenu>
              <MenuButton onClick={() => actions.scheduleTomorrow(task.id)}>
                明天做
              </MenuButton>
              <MenuButton onClick={() => setPickingDate(true)}>选日期</MenuButton>
              <MenuButton onClick={() => setEditing(true)}>编辑</MenuButton>
              <MenuButton danger onClick={() => setConfirmingDelete(true)}>
                删除
              </MenuButton>
            </MoreMenu>
          </>
        )}
      </div>
      {pickingDate ? (
        <DateScheduleSheet
          task={task}
          onCancel={() => setPickingDate(false)}
          onSave={(dateKey) => {
            actions.scheduleTask(task.id, dateKey);
            setPickingDate(false);
          }}
        />
      ) : null}
      {confirmingDelete ? (
        <ConfirmDelete
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => actions.deleteTask(task.id)}
        />
      ) : null}
    </li>
  );
}

function ScheduledTaskRow({
  task,
  actions,
}: {
  task: Task;
  actions: TaskActions;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);

  return (
    <li className="animate-settle-in border-b border-[#eceee9] py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        {editing ? (
          <InlineEditor
            task={task}
            onCancel={() => setEditing(false)}
            onSave={(title) => {
              actions.updateTaskTitle(task.id, title);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-w-0 flex-1 py-1 text-left text-[15px] leading-6 text-[#333833]"
            >
              {task.title}
            </button>
            <button
              type="button"
              onClick={() => actions.scheduleToday(task.id)}
              className="shrink-0 rounded-md border border-[#b8c5b1] bg-white px-3 py-1.5 text-sm font-medium text-[#53634d] transition hover:bg-[#f3f6f1] active:scale-[0.97]"
            >
              今天做
            </button>
            <MoreMenu>
              <MenuButton onClick={() => actions.moveToInbox(task.id)}>
                晚点再说
              </MenuButton>
              <MenuButton onClick={() => setPickingDate(true)}>选日期</MenuButton>
              <MenuButton onClick={() => setEditing(true)}>编辑</MenuButton>
              <MenuButton danger onClick={() => setConfirmingDelete(true)}>
                删除
              </MenuButton>
            </MoreMenu>
          </>
        )}
      </div>
      {pickingDate ? (
        <DateScheduleSheet
          task={task}
          onCancel={() => setPickingDate(false)}
          onSave={(dateKey) => {
            actions.scheduleTask(task.id, dateKey);
            setPickingDate(false);
          }}
        />
      ) : null}
      {confirmingDelete ? (
        <ConfirmDelete
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => actions.deleteTask(task.id)}
        />
      ) : null}
    </li>
  );
}

function ScheduledBoard({
  tasks,
  actions,
}: {
  tasks: Task[];
  actions: TaskActions;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (!task.scheduledDate) return;
      map.set(task.scheduledDate, [...(map.get(task.scheduledDate) ?? []), task]);
    });

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <section>
      <SectionTitle title="已安排" count={tasks.length} note="明天和选定日期会放在这里" />
      <SectionShell tone="scheduled">
        {grouped.length > 0 ? (
          <div className="space-y-3">
            {grouped.map(([dateKey, dateTasks]) => (
              <div key={dateKey}>
                <div className="mb-1 border-l-2 border-[#9daa96] px-2 text-xs font-medium text-[#687863]">
                  {formatShortDate(dateKey)}
                </div>
                <ul>
                  {dateTasks.map((task) => (
                    <ScheduledTaskRow key={task.id} task={task} actions={actions} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-sm leading-6 text-[#858a82]">
            还没有安排到具体日期的事。想起来再定也行。
          </p>
        )}
      </SectionShell>
    </section>
  );
}

function CompletedHistory({
  tasks,
  actions,
}: {
  tasks: Task[];
  actions: TaskActions;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (!task.completedAt) return;
      const dateKey = toDateKey(new Date(task.completedAt));
      map.set(dateKey, [...(map.get(dateKey) ?? []), task]);
    });

    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [tasks]);

  return (
    <section>
      <SectionTitle title="完成记录" count={tasks.length} note="之前日期完成的事在这里看" />
      <SectionShell tone="completed">
        {grouped.length > 0 ? (
          <div className="space-y-3">
            {grouped.map(([dateKey, dateTasks]) => (
              <div key={dateKey}>
                <div className="mb-1 border-l-2 border-[#c4c9c0] px-2 text-xs font-medium text-[#7a8178]">
                  {formatShortDate(dateKey)}
                </div>
                <ul>
                  {dateTasks.map((task) => (
                    <CompletedRow key={task.id} task={task} actions={actions} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-sm leading-6 text-[#858a82]">
            之前还没有留下完成记录。做完的事会慢慢留在这里。
          </p>
        )}
      </SectionShell>
    </section>
  );
}

function CompletedRow({
  task,
  actions,
}: {
  task: Task;
  actions: TaskActions;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="animate-done-drop border-b border-[#eceee9] py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`取消完成 ${task.title}`}
          onClick={() => actions.uncompleteTask(task.id)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-[#eef3ec] text-sm text-[#53634d] transition active:scale-90"
        >
          ✓
        </button>
        <span className="min-w-0 flex-1 text-[15px] leading-6 text-[#8b9189] line-through decoration-[#b4b9b1] decoration-1 underline-offset-2">
          {task.title}
        </span>
        <MoreMenu>
          <MenuButton onClick={() => actions.uncompleteTask(task.id)}>
            恢复到今天
          </MenuButton>
          <MenuButton danger onClick={() => setConfirmingDelete(true)}>
            删除
          </MenuButton>
        </MoreMenu>
      </div>
      {confirmingDelete ? (
        <ConfirmDelete
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => actions.deleteTask(task.id)}
        />
      ) : null}
    </li>
  );
}

export default function Home() {
  const {
    loaded,
    notices,
    groups,
    addTask,
    scheduleToday,
    scheduleTomorrow,
    scheduleTask,
    moveToInbox,
    completeTask,
    uncompleteTask,
    updateTaskTitle,
    deleteTask,
    resetDemo,
  } = useTasks();
  const [draft, setDraft] = useState("");
  const [completedOpen, setCompletedOpen] = useState(true);
  const headerDate = useMemo(() => formatHeaderDate(), []);
  const actions: TaskActions = {
    scheduleToday,
    scheduleTomorrow,
    scheduleTask,
    moveToInbox,
    completeTask,
    uncompleteTask,
    updateTaskTitle,
    deleteTask,
  };

  const submitDraft = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    addTask(title);
    setDraft("");
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-4 pb-10 pt-5 sm:px-6">
      <header className="mb-4">
        <p className="text-sm text-[#777d75]">{headerDate}</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-8 text-[#20221f]">
          今天要做什么？
        </h1>
      </header>

      {notices.length > 0 ? (
        <div className="mb-3 rounded-md border border-[#e3dfd0] bg-white px-3 py-2 text-sm leading-5 text-[#6d6046]">
          {notices[0].message}
        </div>
      ) : null}

      <form onSubmit={submitDraft} className="sticky top-0 z-10 -mx-1 mb-6 bg-[rgba(247,248,246,0.9)] px-1 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-lg border border-[#e2e5df] bg-white p-2 shadow-[0_10px_28px_rgba(29,33,27,0.06)]">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="+ 随手记一件事……"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[16px] text-[#20221f] outline-none placeholder:text-[#9ba199]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#687863] text-lg text-white transition active:scale-[0.96] disabled:bg-[#c7ccc4]"
            aria-label="保存"
          >
            ↵
          </button>
        </div>
      </form>

      <div className="space-y-7">
        <section>
          <SectionTitle title="今天" count={groups.todayTasks.length} note="打开就先看这里" />
          <SectionShell tone="today">
            <ul>
              {!loaded ? (
                <li className="py-4 text-sm text-[#858a82]">正在读取本地数据……</li>
              ) : groups.todayTasks.length > 0 ? (
                groups.todayTasks.map((task) => (
                  <TodayTaskRow key={task.id} task={task} actions={actions} />
                ))
              ) : (
                <li className="py-4 text-sm leading-6 text-[#858a82]">
                  今天还没安排什么。去晚点再说里挑一件吧。
                </li>
              )}
            </ul>
          </SectionShell>
        </section>

        <ScheduledBoard tasks={groups.futureScheduledTasks} actions={actions} />

        <section>
          <SectionTitle title="晚点再说" count={groups.inboxTasks.length} note="还没定哪天做" />
          <SectionShell tone="inbox">
            <ul>
              {groups.inboxTasks.length > 0 ? (
                groups.inboxTasks.map((task) => (
                  <InboxTaskRow key={task.id} task={task} actions={actions} />
                ))
              ) : (
                <li className="py-4 text-sm leading-6 text-[#858a82]">
                  这里也空着。想到什么就先随手记下来。
                </li>
              )}
            </ul>
          </SectionShell>
        </section>

        {groups.completedTodayTasks.length > 0 ? (
          <section>
            <button
              type="button"
              onClick={() => setCompletedOpen((value) => !value)}
              className="mb-3 flex w-full items-center justify-between rounded-md px-0.5 py-1 text-left transition active:scale-[0.99]"
            >
              <h2 className="text-[15px] font-semibold text-[#53634d]">
                今天完成了 {groups.completedTodayTasks.length} 件
              </h2>
              <span className="text-sm text-[#858a82]">
                {completedOpen ? "收起" : "展开"}
              </span>
            </button>
            {completedOpen ? (
              <SectionShell tone="completed">
                <ul>
                  {groups.completedTodayTasks.map((task) => (
                    <CompletedRow key={task.id} task={task} actions={actions} />
                  ))}
                </ul>
              </SectionShell>
            ) : null}
          </section>
        ) : null}

        <CompletedHistory tasks={groups.pastCompletedTasks} actions={actions} />
      </div>

      <footer className="mt-8 border-t border-[#e6e8e2] pt-4">
        <details>
          <summary className="cursor-pointer list-none text-sm text-[#8a9088] [&::-webkit-details-marker]:hidden">
            设置
          </summary>
          <div className="mt-3 rounded-lg border border-[#e6e8e2] bg-white p-3">
            <p className="mb-3 text-sm leading-5 text-[#777d75]">
              今天没做完也没关系，先放回晚点再说。
            </p>
            <button
              type="button"
              onClick={resetDemo}
              className="rounded-md border border-[#dfe3dc] px-3 py-2 text-sm text-[#5f655d] transition active:scale-[0.98]"
            >
              重置 demo 数据
            </button>
          </div>
        </details>
      </footer>
    </main>
  );
}

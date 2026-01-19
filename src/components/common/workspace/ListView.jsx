import React from "react";
import dayjs from "dayjs";

const formatStatus = (value = "") =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const GRID_CLASS =
  "grid grid-cols-[1.8fr_1.1fr_1fr_1.1fr_1fr_0.8fr] items-center";

const priorityTone = {
  low: "bg-green-50 text-green-700 border-green-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  high: "bg-red-50 text-red-700 border-red-100",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isDoneStatus = (value) => {
  if (!value) return false;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === "done" || normalized === "completed";
};

export default function ListView({
  tasks = [],
  columnMeta = {},
  onOpenTask,
  onCreateTask,
  pageSize,
  t,
}) {
  const visibleTasks =
    Number.isFinite(Number(pageSize)) && Number(pageSize) > 0
      ? tasks.slice(0, Number(pageSize))
      : tasks;
  const empty = !visibleTasks || visibleTasks.length === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t?.("listView") || "List view"}</p>
          <p className="text-xs text-gray-500">{visibleTasks.length} {t?.("tasks") || "tasks"}</p>
        </div>
        <button
          type="button"
          onClick={onCreateTask}
          disabled={!onCreateTask}
          className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="text-lg leading-none">+</span>
          {t?.("newTask") || "New Task"}
        </button>
      </div>

      {empty ? (
        <div className="py-10 text-center text-sm text-gray-500">
          {t?.("noTasks") || "No tasks yet. Switch to Kanban to create columns first."}
        </div>
      ) : (
        <div className="overflow-auto">
          <div className="min-w-[980px] divide-y divide-gray-100">
            <div className={`${GRID_CLASS} text-[11px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100 sticky top-0`}>
              <div className="px-4 py-3 text-left">Task</div>
              <div className="px-4 py-3 text-left">Status</div>
              <div className="px-4 py-3 text-left">Priority</div>
              <div className="px-4 py-3 text-left">Assignee</div>
              <div className="px-4 py-3 text-left">Due</div>
              <div className="px-4 py-3 text-right">Comments</div>
            </div>

            {visibleTasks.map((task) => {
              const priorityKey = (task.priority || "").toLowerCase();
              const statusLabel =
                columnMeta?.[task.columnId]?.title ||
                formatStatus(task.status || "") ||
                "—";
              const commentsCount = task.comments?.length || 0;
              const isOverdue =
                task?.dueDate &&
                dayjs(task.dueDate).isValid() &&
                dayjs(task.dueDate).isBefore(dayjs().startOf("day")) &&
                !columnMeta?.[task.columnId]?.isDone &&
                !isDoneStatus(task.status);

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask && onOpenTask(task)}
                  className={`${GRID_CLASS} hover:bg-gray-50 focus:bg-gray-50 transition cursor-pointer`}
                >
                  <div className="px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {task.title || (t?.("untitledTask") || "Untitled task")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task.description || (t?.("noDescription") || "No description")}
                    </p>
                  </div>

                  <div className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full">
                      {statusLabel}
                    </span>
                  </div>

                  <div className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${
                        priorityTone[priorityKey] ||
                        "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {priorityKey || "none"}
                    </span>
                  </div>

                  <div className="px-4 py-3">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id || assignee.email || assignee.name}
                            className="w-8 h-8 rounded-full border border-white bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center overflow-hidden"
                            title={assignee.name || assignee.email}
                          >
                            {assignee.avatarUrl ? (
                              <img
                                src={assignee.avatarUrl}
                                alt={assignee.name || "avatar"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(assignee.name || assignee.email)
                            )}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <span className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs font-semibold flex items-center justify-center">
                            +{task.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {t?.("unassigned") || "Unassigned"}
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(task.dueDate)}</span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          {t?.("overdue") || "Overdue"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 text-right text-sm text-gray-700">
                    {commentsCount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



// src/components/kanban/TaskCard.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import { priorityStyles, initials } from "../../../utils/kanbanHelpers";
import { Modal, Input, notification } from "antd";
import { useTranslation } from "../../../hook/useTranslation";

const getAssigneeId = (assignee) => {
  if (!assignee) return "";
  if (typeof assignee === "string") return assignee;
  return assignee.id || assignee.userId || assignee.email || "";
};

const getAssigneeLabel = (assignee) => {
  if (!assignee) return "";
  if (typeof assignee === "string") return assignee;
  return (
    assignee.name ||
    assignee.displayName ||
    assignee.fullName ||
    assignee.email ||
    assignee.id ||
    ""
  );
};

const renderMemberAvatar = (member, size = "w-6 h-6") => {
  const label = member?.name || member?.displayName || member?.fullName || member?.email || "U";
  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={label}
        className={`${size} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px] ring-2 ring-white`}
    >
      {initials(label || "U")}
    </div>
  );
};

const formatColumnName = (name) => {
  if (!name) return "";
  return name
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const TaskCard = ({ task, onOpen, onDelete, columnMeta = {} }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const priorityClass = priorityStyles[task.priority] || "bg-gray-100 text-gray-700";
  
  // Dynamic status color based on columnMeta and position
  const getStatusClass = () => {
    const column = columnMeta[task.columnId];
    
    // Done column - green
    if (column?.isDone) {
      return "bg-emerald-100 text-emerald-700";
    }
    
    // Get all columns sorted by position
    const allColumns = Object.values(columnMeta).sort((a, b) => (a.position || 0) - (b.position || 0));
    const currentPosition = column?.position || 0;
    const totalColumns = allColumns.length;
    
    if (currentPosition === 1 || currentPosition === allColumns[0]?.position) {
      return "bg-gray-100 text-gray-700";
    }
    

    const nonDoneColumns = allColumns.filter(col => !col.isDone);
    const positionInNonDone = nonDoneColumns.findIndex(col => col.columnId === task.columnId);
    
    if (positionInNonDone === 0) {
      return "bg-gray-100 text-gray-700";
    } else if (positionInNonDone === 1) {
      return "bg-blue-100 text-blue-700"; 
    } else {
      return "bg-indigo-100 text-indigo-700";
    }
  };
  const statusClass = getStatusClass();
  
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString()
    : "--";
  const commentsCount = Array.isArray(task.comments) ? task.comments.length : 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition"
      onClick={() => onOpen(task)}
    >
      {/* Priority & actions */}
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs px-2 py-1 rounded-full ${priorityClass}`}>
          {task.priority}
        </span>
        {onDelete && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Task actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    let inputValue = "";
                    Modal.confirm({
                      title: t?.("deleteTaskTitle") || "Delete task",
                      content: (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {t?.("typeDeleteToConfirm") || "Type 'delete' to confirm."}
                          </p>
                          <Input
                            placeholder={t?.("deletePlaceholder") || "delete"}
                            onChange={(ev) => {
                              inputValue = ev.target.value;
                            }}
                          />
                        </div>
                      ),
                      okText: t?.("delete") || "Delete",
                      okButtonProps: { danger: true },
                      cancelText: t?.("cancel") || "Cancel",
                      onOk: () => {
                        if (inputValue.toLowerCase() !== "delete") {
                          notification.info({
                            message: t?.("validationError") || "Validation Error",
                            description: t?.("mustTypeDelete") || "You must type 'delete' to confirm.",
                          });
                          return Promise.reject();
                        }
                        setMenuOpen(false);
                        onDelete(task.id);
                        return Promise.resolve();
                      },
                    });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {t?.("deleteTaskTitle") || "Delete task"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title và Description */}
      <div className="mb-2">
        <h4 className="font-semibold text-gray-900 leading-snug mb-1">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Status tag */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
          {formatColumnName(
            columnMeta[task.columnId]?.title ||
              columnMeta[task.status]?.title ||
              task.status
          )}
        </span>
      </div>

      {/* Due Date và Assignees */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{dueLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Assignees với avatarUrl */}
          {(task.assignees || []).length > 0 ? (
            <div className="flex -space-x-2">
              {(task.assignees || []).slice(0, 3).map((assignee, index) => {
                const label = getAssigneeLabel(assignee) || "Unassigned";
                const key = getAssigneeId(assignee) || `${label}-${index}`;
                return (
                  <div key={key} title={label}>
                    {renderMemberAvatar(assignee, "w-6 h-6")}
                  </div>
                );
              })}
              {(task.assignees || []).length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-[10px] flex items-center justify-center ring-2 ring-white">
                  +{(task.assignees || []).length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">No assignees</span>
          )}
          <div className="flex items-center text-gray-600 text-xs ml-2">
            <MessageSquare className="w-4 h-4 mr-1" />
            {commentsCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;


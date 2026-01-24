import React, { useEffect, useMemo, useState, useRef } from "react";
import { Plus, MoreVertical, ArrowRight } from "lucide-react";
import {
  Modal,
  Input,
  Select,
  DatePicker,
  InputNumber,
  notification,
  Dropdown,
} from "antd";
import dayjs from "dayjs";
import { BacklogService } from "../../../services/backlog.service";
import { useTranslation } from "../../../hook/useTranslation";

const defaultForm = {
  title: "",
  description: "",
  priority: "medium",
  category: "feature",
  storyPoints: 0,
  dueDate: null,
  ownerUserId: "",
  status: "todo",
};

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const categoryOptions = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "chore", label: "Chore" },
];

const statusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];  

const normalizeKey = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, "_");

const formatDate = (value) => {
  if (!value) return "--";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY") : "--";
};

const getItemId = (item) =>
  item?.id || item?.backlogId || item?.backlogItemId || item?._id || "";

export default function BacklogTab({
  groupId,
  columnMeta = {},
  groupMembers = [],
  onPromoteSuccess,
  readOnly = false,
  groupStatus = "",
  refreshToken = 0,
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const fetchedRef = useRef(null);

  const isGroupClosed = () => {
    if (!groupStatus) return false;
    const statusLower = (groupStatus || "").toLowerCase();
    return statusLower.includes("closed");
  };

  const memberMap = useMemo(() => {
    const map = new Map();
    (groupMembers || []).forEach((m) => {
      const key =
        m?.id || m?.userId || m?.memberId || m?.userID || m?.accountId || m?.email;
      if (key) map.set(String(key), m);
    });
    return map;
  }, [groupMembers]);

  const columnOptions = useMemo(
    () =>
      Object.entries(columnMeta || {}).map(([id, meta]) => ({
        value: id,
        label: meta?.title || id,
      })),
    [columnMeta]
  );

  const defaultColumnId = useMemo(() => {
    if (!columnOptions.length) return "";
    const found = columnOptions.find((opt) => {
      const normalized = normalizeKey(opt.label || opt.value);
      return normalized === "todo" || normalized === "to_do";
    });
    return found?.value || columnOptions[0].value;
  }, [columnOptions]);

  useEffect(() => {
    if (!groupId || isGroupClosed()) return;
    fetchedRef.current = groupId;
    fetchItems();
  }, [groupId, groupStatus, refreshToken]);

  const fetchItems = async () => {
    if (!groupId || isGroupClosed()) return;
    setLoading(true);
    try {
      const res = await BacklogService.getBacklog(groupId);
      const payload = res?.data ?? res;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(payload?.data)) list = payload.data;
      else if (Array.isArray(payload?.items)) list = payload.items;
      else if (Array.isArray(payload?.results)) list = payload.results;
      setItems(list);
    } catch (err) {

      notification.info({
        message: t("failedLoadBacklog") || "Failed to load backlog",
        description:
          err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const openCreate = () => {
    if (readOnly) return;
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    if (readOnly) return;
    setEditingId(getItemId(item));
    setForm({
      title: item?.title || "",
      description: item?.description || "",
      priority: item?.priority || "medium",
      category: item?.category || "feature",
      storyPoints: item?.storyPoints ?? 0,
      dueDate: item?.dueDate ? dayjs(item.dueDate) : null,
      ownerUserId: item?.ownerUserId || item?.ownerId || "",
      status: normalizeKey(item?.status) || "todo",
    });
    setModalOpen(true);
  };

  const getOwnerName = (ownerId) => {
    if (!ownerId) return "--";
    const member = memberMap.get(String(ownerId));
    return (
      member?.name ||
      member?.displayName ||
      member?.fullName ||
      member?.email ||
      "--"
    );
  };

  const handleSubmit = async () => {
    if (!groupId || isGroupClosed()) return;
    const trimmedTitle = (form.title || "").trim();
    if (!trimmedTitle) {
      notification.info({
        message: t("validationError") || "Missing title",
        description: t("titleRequired") || "Please enter a backlog title.",
      });
      return;
    }

    // Validate story points - must be a valid number >= 0
    const storyPointsValue = Number(form.storyPoints);
    if (isNaN(storyPointsValue) || storyPointsValue < 0) {
      notification.info({
        message: t("validationError") || "Validation Error",
        description: t("storyPointsMustBeNumber") || "Story points must be a valid number greater than or equal to 0.",
      });
      return;
    }

    // Validate due date - cannot be in the past
    if (form.dueDate && dayjs(form.dueDate).isBefore(dayjs().startOf('day'))) {
      notification.info({
        message: t("validationError") || "Validation Error",
        description: t("dueDateCannotBePast") || "Due date cannot be in the past.",
      });
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: (form.description || "").trim(),
      priority: form.priority || "medium",
      category: form.category || "feature",
      storyPoints: storyPointsValue,
      dueDate: form.dueDate ? dayjs(form.dueDate).toISOString() : null,
      ownerUserId: form.ownerUserId || null,
    };

    if (editingId) payload.status = form.status || "todo";

    try {
      if (editingId) {
        await BacklogService.updateBacklogItem(groupId, editingId, payload);
        notification.success({
          message: t("updated") || "Backlog updated",
        });
      } else {
        await BacklogService.createBacklogItem(groupId, payload);
        notification.success({
          message: t("created") || "Backlog created",
        });
      }
      setModalOpen(false);
      resetForm();
      fetchItems();
    } catch (err) {

      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    }
  };

  const confirmDelete = (item) => {
    if (readOnly) return;
    const id = getItemId(item);
    if (!id) return;
    let inputValue = "";
    Modal.confirm({
      title: t("deleteBacklogItemTitle") || "Delete backlog item",
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {t("typeDeleteToConfirm") || "Type 'delete' to confirm."}
          </p>
          <Input
            placeholder={t("deletePlaceholder") || "delete"}
            onChange={(ev) => {
              inputValue = ev.target.value;
            }}
          />
        </div>
      ),
      okText: t("delete") || "Delete",
      okButtonProps: { danger: true },
      cancelText: t("cancel") || "Cancel",
      onOk: () => {
        if (inputValue.toLowerCase() !== "delete") {
          notification.info({
            message: t("validationError") || "Validation Error",
            description: t("mustTypeDelete") || "You must type 'delete' to confirm.",
          });
          return Promise.reject();
        }
        deleteItem(id);
        return Promise.resolve();
      },
    });
  };

  const deleteItem = async (id) => {
    if (!groupId || !id || isGroupClosed()) return;
    try {
      await BacklogService.archiveBacklogItem(groupId, id);
      notification.success({
        message: t("backlogItemDeletedSuccess") || "Backlog item deleted successfully",
        duration: 2,
      });
      fetchItems();
    } catch (err) {

      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    }
  };

  const handlePromote = async (item) => {
    if (readOnly || isGroupClosed()) return;
    if (!groupId || !item) return;
    const backlogId = getItemId(item);
    if (!backlogId) return;
    const payload = {
      columnId: defaultColumnId,
      taskStatus: "todo",
      taskDueDate: item?.dueDate ? dayjs(item.dueDate).toISOString() : null,
    };
    try {
      await BacklogService.promoteBacklogItem(groupId, backlogId, payload);
      notification.success({
        message: t("movedToSprintTitle") || "Moved to Sprint",
        description:
          t("movedToSprintDesc") || "Item has been added to the current sprint.",
      });
      fetchItems();
      if (typeof onPromoteSuccess === "function") {
        onPromoteSuccess();
      }
    } catch (err) {

      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    }
  };

  const priorityTone = (value) => {
    const key = normalizeKey(value);
    if (key === "high") return "bg-red-100 text-red-700";
    if (key === "medium") return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  };

const statusTone = (item) => {
    // Use columnMeta to determine if status is done
    const columnId = item?.columnId;
    const column = columnId ? columnMeta[columnId] : null;
    
    // Done column - green
    if (column?.isDone) {
      return "bg-emerald-100 text-emerald-700";
    }
    
    // If item is linked to a task (in sprint), determine color by position
    if (item?.linkedTaskId && column) {
      const allColumns = Object.values(columnMeta).sort((a, b) => (a.position || 0) - (b.position || 0));
      const nonDoneColumns = allColumns.filter(col => !col.isDone);
      const positionInNonDone = nonDoneColumns.findIndex(col => col.columnId === columnId);
      
      if (positionInNonDone === 0) {
        return "bg-gray-100 text-gray-700"; // First column (To Do)
      } else if (positionInNonDone === 1) {
        return "bg-blue-100 text-blue-700"; // Second column (In Progress)
      } else {
        return "bg-indigo-100 text-indigo-700"; // Other columns
      }
    }
    
    // Not in sprint yet - default gray
  return "bg-gray-100 text-gray-700";
};

const isItemDone = (item, columnMeta = {}) => {
  const status = normalizeKey(item?.status || "");
  if (status === "done" || status === "completed") return true;
  const columnId = item?.columnId;
  if (columnId && columnMeta?.[columnId]?.isDone) return true;
  return false;
};

  const totalStoryPoints = useMemo(
    () =>
      (items || []).reduce(
        (sum, cur) => sum + (Number(cur?.storyPoints) || 0),
        0
      ),
    [items]
  );

  // Show all items including promoted ones
  const visibleItems = useMemo(() => items || [], [items]);

  const renderOwnerAvatar = (ownerId) => {
    const member = memberMap.get(String(ownerId));
    const name =
      member?.displayName ||
      member?.name ||
      member?.fullName ||
      member?.email ||
      getOwnerName(ownerId);

    if (!name || name === "--") return null;

    const initialsText = name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const avatarUrl =
      member?.avatarUrl ||
      member?.avatar ||
      member?.photoUrl ||
      member?.photoURL;

    return (
      <div className="inline-flex items-center gap-2 text-xs text-gray-600">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-semibold">
            {initialsText || "U"}
          </span>
        )}
        <span className="text-sm text-gray-700">{name}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {t("productBacklog") || "Product Backlog"}
          </h3>
          <p className="text-sm text-gray-500">
            {visibleItems.length} {t("items") || "items"} • {totalStoryPoints}{" "}
            {t("storyPoints") || "story points"}
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t("newItem") || "New Item"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
          {t("loading") || "Loading..."}
        </div>
      ) : visibleItems.length ? (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const ownerId = item?.ownerUserId || item?.ownerId;
            const isOverdue =
              item?.dueDate &&
              dayjs(item.dueDate).isValid() &&
              dayjs(item.dueDate).isBefore(dayjs().startOf("day")) &&
              !isItemDone(item, columnMeta);
            return (
              <div
                key={getItemId(item)}
                className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h4 className="text-base font-semibold text-gray-900">
                        {item?.title || "Untitled backlog item"}
                      </h4>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {item?.description || t("noDescription") || "No description"}
                      </p>
                    </div>
                    {!readOnly && (
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            {
                              key: "edit",
                              label: t("edit") || "Edit",
                              onClick: () => openEdit(item),
                            },
                            {
                              key: "delete",
                              label: t("delete") || "Delete",
                              danger: true,
                              onClick: () => confirmDelete(item),
                            },
                          ],
                        }}
                      >
                        <button className="p-2 rounded-full hover:bg-gray-100">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </Dropdown>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${priorityTone(
                        item?.priority
                      )}`}
                    >
                      {item?.priority || "medium"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {(item?.storyPoints ?? 0) + " SP"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                      {item?.category || "feature"}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusTone(item)}`}
                    >
                      {(item?.status || "todo").toUpperCase().replace(/_/g, " ")}
                    </span>
                    {isOverdue && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        {t("overdue") || "Overdue"}
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {t("dueDate") || "Due"}: {formatDate(item?.dueDate)}
                    </span>
                    {item?.milestoneName && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        {item.milestoneName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>{renderOwnerAvatar(ownerId)}</div>
                    {!readOnly && (
                      item?.linkedTaskId ? (
                        <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowRight className="w-4 h-4" />
                          {t("alreadyInSprint") || "Already in Sprint"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePromote(item)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 text-gray-700"
                        >
                          <ArrowRight className="w-4 h-4" />
                          {t("moveToSprint") || "Move to Sprint"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
          <p className="text-gray-600">
            {t("backlogPlaceholder") || "Backlog is empty. Create the first item."}
          </p>
        </div>
      )}
      {!readOnly && (
        <Modal
          title={
            editingId
              ? t("editBacklog") || "Edit backlog item"
              : t("createBacklog") || "Create backlog item"
          }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          resetForm();
        }}
        okText={t("save") || "Save"}
        cancelText={t("cancel") || "Cancel"}
        destroyOnClose
        width={640}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700 mb-1 block">
              {t("title") || "Title"}
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              aria-label={t("title") || "Title"}
              placeholder={t("enterTitle") || "Enter title"}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("priority") || "Priority"}
            </label>
            <Select
              value={form.priority}
              onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
              options={priorityOptions}
              aria-label={t("priority") || "Priority"}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("category") || "Category"}
            </label>
            <Select
              value={form.category}
              onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              options={categoryOptions}
              aria-label={t("category") || "Category"}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("storyPoints") || "Story Points"}
            </label>
            <InputNumber
              className="w-full"
              min={0}
              value={form.storyPoints}
              aria-label={t("storyPoints") || "Story Points"}
              parser={(value) => {
                // Only allow digits, remove any non-digit characters
                return value.replace(/\D/g, '');
              }}
              formatter={(value) => {
                // Format to show only digits
                if (!value) return '';
                return value.toString().replace(/\D/g, '');
              }}
              onChange={(value) => {
                // Ensure only numbers are set
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  setForm((prev) => ({ ...prev, storyPoints: numValue }));
                } else {
                  setForm((prev) => ({ ...prev, storyPoints: 0 }));
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("dueDate") || "Due date"}
            </label>
            <DatePicker
              className="w-full"
              value={form.dueDate}
              aria-label={t("dueDate") || "Due date"}
              inputReadOnly={true}
              disabledDate={(current) => {
                // Disable dates before today (past dates)
                if (!current) return false;
                return current && current < dayjs().startOf('day');
              }}
              onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("owner") || "Owner"}
            </label>
            <Select
              allowClear
              value={form.ownerUserId || null}
              placeholder={t("selectOwner") || "Select owner"}
              aria-label={t("owner") || "Owner"}
              onChange={(value) => setForm((prev) => ({ ...prev, ownerUserId: value }))}
              options={(groupMembers || []).map((m) => ({
                value:
                  m?.id ||
                  m?.userId ||
                  m?.memberId ||
                  m?.userID ||
                  m?.accountId ||
                  m?.email,
                label: m?.name || m?.displayName || m?.email || "Member",
              }))}
              className="w-full"
            />
          </div>
          {editingId && (
            <div>
              <label className="text-sm text-gray-700 mb-1 block">
                {t("status") || "Status"}
              </label>
              <Select
                value={form.status}
                onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                aria-label={t("status") || "Status"}
                className="w-full"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700 mb-1 block">
              {t("description") || "Description"}
            </label>
            <Input.TextArea
              rows={4}
              value={form.description}
              aria-label={t("description") || "Description"}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t("enterDescription") || "Enter description"}
            />
          </div>
        </div>
        </Modal>
      )}
    </div>
  );
}


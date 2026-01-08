import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Plus,
  MoreVertical,
  Calendar,
  Trash2,
  Edit2,
  Link,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  Button,
  DatePicker,
  Dropdown,
  Input,
  Modal,
  Select,
  Tag,
  notification,
  Progress,
} from "antd";
import dayjs from "dayjs";
import { MilestoneService } from "../../../services/milestone.service";
import { BacklogService } from "../../../services/backlog.service";
import { useTranslation } from "../../../hook/useTranslation";
import MoveIncompleteItemsDialog from "./MoveIncompleteItemsDialog";

const statusColors = {
  planned: "default",
  in_progress: "blue",
  done: "green",
  completed: "green",
};

const formatDate = (value) => {
  if (!value) return "--";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY") : "--";
};

export default function MilestonesTab({ groupId, readOnly = false, groupStatus = "" }) {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [assignMilestoneId, setAssignMilestoneId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    targetDate: null,
    status: "planned",
    completedAt: null,
  });
  const [backlogOptions, setBacklogOptions] = useState([]);
  const [assignBacklogIds, setAssignBacklogIds] = useState([]);
  const [overdueActions, setOverdueActions] = useState(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [overdueError, setOverdueError] = useState("");
  const [extendDate, setExtendDate] = useState(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);
  const fetchedRef = useRef(null);

  const isGroupClosed = () => {
    if (!groupStatus) return false;
    const statusLower = (groupStatus || "").toLowerCase();
    return statusLower.includes("closed");
  };

  const fetchMilestones = async () => {
    if (!groupId || isGroupClosed()) return;
    setLoading(true);
    try {
      const res = await MilestoneService.list(groupId);
      const payload = res?.data ?? res;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : payload?.items || [];
      setList(items);
    } catch (err) {

      notification.info({
        message: t("error") || "Error",
        description: t("failedLoadMilestones") || "Failed to load milestones",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBacklogOptions = async () => {
    if (!groupId || isGroupClosed()) return;
    try {
      const res = await BacklogService.getBacklog(groupId);
      const payload = res?.data ?? res;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : payload?.items || [];
      const options = items
        .filter((item) => (item.status || "").toLowerCase() !== "ready")
        .map((item) => ({
          value: item.backlogItemId || item.id || item._id,
          label: item.title || "Backlog item",
        }));
      setBacklogOptions(options);
    } catch (err) {

    }
  };

  useEffect(() => {
    if (!groupId || fetchedRef.current === groupId || isGroupClosed()) return;
    fetchedRef.current = groupId;
    fetchMilestones();
    fetchBacklogOptions();
  }, [groupId, groupStatus]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      targetDate: null,
      status: "planned",
      completedAt: null,
    });
    setSelectedMilestone(null);
  };

  const openCreate = () => {
    if (readOnly) return;
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    if (readOnly) return;
    setSelectedMilestone(item);
    setForm({
      name: item?.name || "",
      description: item?.description || "",
      targetDate: item?.targetDate ? dayjs(item.targetDate) : null,
      status: item?.status || "planned",
      completedAt: item?.completedAt ? dayjs(item.completedAt) : null,
    });
    setModalOpen(true);
  };

  const toggleMilestoneDetails = (milestoneId) => {
    setExpandedMilestoneId((prev) =>
      prev === milestoneId ? null : milestoneId
    );
  };

  const fetchOverdueActions = async (milestoneId) => {
    if (!groupId || !milestoneId) return;
    setOverdueLoading(true);
    setOverdueError("");
    try {
      const res = await MilestoneService.getOverdueActions(groupId, milestoneId);
      const payload = res?.data ?? res;
      setOverdueActions(payload || null);
    } catch (err) {
      setOverdueActions(null);
      setOverdueError(
        err?.response?.data?.message ||
          t("failedLoadOverdueActions") ||
          "Failed to load overdue actions."
      );
    } finally {
      setOverdueLoading(false);
    }
  };

  useEffect(() => {
    if (!modalOpen || !selectedMilestone) {
      setOverdueActions(null);
      setOverdueError("");
      setExtendDate(null);
      return;
    }
    const milestoneId = selectedMilestone.milestoneId || selectedMilestone.id;
    fetchOverdueActions(milestoneId);
  }, [modalOpen, selectedMilestone, groupId]);

  const handleExtendMilestone = async () => {
    if (!groupId || !selectedMilestone) return;
    if (!extendDate) {
      notification.info({
        message: t("pleaseSelectDate") || "Please select a date.",
      });
      return;
    }
    const milestoneId = selectedMilestone.milestoneId || selectedMilestone.id;
    setExtendLoading(true);
    try {
      await MilestoneService.extendMilestone(groupId, milestoneId, {
        newTargetDate: dayjs(extendDate).format("YYYY-MM-DD"),
      });
      notification.success({
        message: t("updated") || "Updated",
      });
      setForm((prev) => ({ ...prev, targetDate: extendDate }));
      setExtendDate(null);
      fetchOverdueActions(milestoneId);
      fetchMilestones();
    } catch (err) {
      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message ||
          t("pleaseTryAgain") ||
          "Please try again.",
      });
    } finally {
      setExtendLoading(false);
    }
  };

  const handleMoveSuccess = () => {
    if (!selectedMilestone) return;
    const milestoneId = selectedMilestone.milestoneId || selectedMilestone.id;
    fetchOverdueActions(milestoneId);
    fetchMilestones();
  };

  const handleSave = async () => {
    if (readOnly || !groupId || isGroupClosed()) return;
    if (!form.name.trim()) {
      notification.info({
        message: t("validationError") || "Validation error",
        description: t("pleaseEnterTitle") || "Please enter title",
      });
      return;
    }

    // Validate target date: cannot be in the past
    if (form.targetDate && dayjs(form.targetDate).isBefore(dayjs().startOf("day"))) {
      notification.info({
        message: t("validationError") || "Validation error",
        description: t("dueDateCannotBePast") || "Due date cannot be in the past.",
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: (form.description || "").trim(),
      targetDate: form.targetDate ? dayjs(form.targetDate).format("YYYY-MM-DD") : null,
    };
    if (selectedMilestone) {
      payload.status = form.status || "planned";
      payload.completedAt = form.completedAt ? dayjs(form.completedAt).toISOString() : null;
    }
    try {
      if (selectedMilestone) {
        const id = selectedMilestone.milestoneId || selectedMilestone.id;
        await MilestoneService.update(groupId, id, payload);
        notification.success({ message: t("updated") || "Updated" });
      } else {
        await MilestoneService.create(groupId, payload);
        notification.success({ message: t("created") || "Created" });
      }
      setModalOpen(false);
      resetForm();
      fetchMilestones();
    } catch (err) {

      notification.info({
        message: t("actionFailed") || "Action failed",
        description: err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    }
  };

  const handleDelete = (item) => {
    if (readOnly || isGroupClosed()) return;
    const id = item?.milestoneId || item?.id;
    if (!id) return;
    let inputValue = "";
    Modal.confirm({
      title: t("delete") || "Delete",
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
      cancelText: t("cancel") || "Cancel",
      onOk: async () => {
        if (inputValue.toLowerCase() !== "delete") {
          notification.info({
            message: t("validationError") || "Validation Error",
            description: t("mustTypeDelete") || "You must type 'delete' to confirm.",
          });
          return Promise.reject();
        }
        try {
          await MilestoneService.remove(groupId, id);
          notification.success({ message: t("deleted") || "Deleted" });
          fetchMilestones();
        } catch (err) {

          notification.info({
            message: t("actionFailed") || "Action failed",
            description: err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
          });
        }
      },
    });
  };

  const openAssign = (item) => {
    if (readOnly) return;
    setAssignMilestoneId(item?.milestoneId || item?.id);
    setAssignBacklogIds([]);
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (readOnly || !groupId || !assignMilestoneId || !assignBacklogIds.length || isGroupClosed()) {
      notification.info({
        message: t("validationError") || "Validation error",
        description: t("pleaseSelectItems") || "Please select backlog items.",
      });
      return;
    }
    try {
      await MilestoneService.assignBacklogItems(groupId, assignMilestoneId, assignBacklogIds);
      notification.success({ message: t("updated") || "Updated" });
      setAssignModalOpen(false);
      setAssignBacklogIds([]);
      fetchMilestones();
    } catch (err) {

      notification.info({
        message: t("actionFailed") || "Action failed",
        description: err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    }
  };

  const handleRemoveItem = (milestoneId, backlogItemId) => {
    if (readOnly || isGroupClosed()) return;
    if (!groupId || !milestoneId || !backlogItemId) return;
    Modal.confirm({
      title: t("confirm") || "Confirm",
      content: t("remove") || "Remove?",
      okText: t("remove") || "Remove",
      cancelText: t("cancel") || "Cancel",
      onOk: async () => {
        try {
          await MilestoneService.removeBacklogItem(groupId, milestoneId, backlogItemId);
          notification.success({ message: t("deleted") || "Deleted" });
          fetchMilestones();
          fetchBacklogOptions();
        } catch (err) {

          notification.info({
            message: t("actionFailed") || "Action failed",
            description: err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
          });
        }
      },
    });
  };

  const statusTag = (value) => {
    const key = (value || "").toLowerCase();
    const color = statusColors[key] || "default";
    return <Tag color={color}>{value || "planned"}</Tag>;
  };

  const listToShow = useMemo(() => list || [], [list]);

  const isTaskDone = (item) => {
    const st = (item.status || "").toLowerCase();
    return st === "done" || st === "completed";
  };

  const statusBadge = (status) => {
    const key = (status || "").toLowerCase();
    const colorClass =
      key === "done" || key === "completed"
        ? "bg-emerald-100 text-emerald-700"
        : key === "in_progress"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-700";
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${colorClass}`}>
        {status || "planned"}
      </span>
    );
  };

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              {t("milestones") || "Milestones"}
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            {listToShow.length} {t("items") || "items"}
          </p>
        </div>
        {!readOnly && (
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            {t("newMilestone") || "New Milestone"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">{t("loading") || "Loading..."}</div>
      ) : listToShow.length ? (
        <div className="space-y-4">
          {listToShow.map((item) => {
            const mId = item.milestoneId || item.id;
            const assignedItems = item.items || [];
            const progress = {
              percent: item.completionPercent || 0,
              done: item.completedItems || 0,
              total: item.totalItems || 0,
            };
            const isOverdueFlag =
              item.isOverdue ||
              (item.targetDate &&
                dayjs(item.targetDate).isBefore(dayjs().startOf("day")) &&
                Number(progress.done || 0) < Number(progress.total || 0));
            const incompleteCount = Math.max(
              0,
              Number(progress.total || 0) - Number(progress.done || 0)
            );
            const isExpanded = expandedMilestoneId === mId;
            return (
              <div
                key={mId}
                className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="space-y-3 flex-1 cursor-pointer"
                    onClick={() => toggleMilestoneDetails(mId)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {item.name || "Untitled milestone"}
                      </h4>
                      {isOverdueFlag && (
                        <Tag color="red">{t("overdue") || "Overdue"}</Tag>
                      )}
                      {isOverdueFlag && incompleteCount > 0 && (
                        <span className="text-xs text-red-600">
                          {incompleteCount} {t("items") || "items"}{" "}
                          {t("remaining") || "remaining"}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(item.targetDate)}</span>
                      {statusBadge(item.status)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                        <span>{t("progress") || "Progress"}</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <Progress percent={progress.percent} showInfo={false} />
                      <p className="text-xs text-gray-500">
                        {progress.done}/{progress.total} {t("items") || "items"} {t("done") || "done"}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          {
                            key: "assign",
                            label: (
                              <span className="flex items-center gap-2">
                                <Link size={14} /> {t("assignBacklog") || "Assign backlog"}
                              </span>
                            ),
                            onClick: () => openAssign(item),
                          },
                          {
                            key: "edit",
                            label: (
                              <span className="flex items-center gap-2">
                                <Edit2 size={14} /> {t("edit") || "Edit"}
                              </span>
                            ),
                            onClick: () => openEdit(item),
                          },
                          {
                            key: "delete",
                            label: (
                              <span className="flex items-center gap-2 text-red-600">
                                <Trash2 size={14} /> {t("delete") || "Delete"}
                              </span>
                            ),
                            danger: true,
                            onClick: () => handleDelete(item),
                          },
                        ],
                      }}
                    >
                      <Button
                        shape="circle"
                        icon={<MoreVertical size={16} />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs uppercase text-gray-400">
                          {t("description") || "Description"}
                        </p>
                        <p className="mt-1 text-gray-800">
                          {item.description || t("noDescription") || "No description"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs uppercase text-gray-400">
                          {t("targetDate") || "Target date"}
                        </p>
                        <p className="mt-1 text-gray-800">
                          {formatDate(item.targetDate)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {t("backlogItems") || "Backlog items"}
                      </p>
                      {assignedItems.length > 0 ? (
                        <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                          <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase text-gray-500">
                            <span className="col-span-6">{t("title") || "Title"}</span>
                            <span className="col-span-3">{t("dueDate") || "Due date"}</span>
                            <span className="col-span-3">{t("status") || "Status"}</span>
                          </div>
                          <ul className="divide-y divide-gray-100 text-sm text-gray-700">
                            {assignedItems.map((bi) => {
                              const done = isTaskDone(bi);
                              const backlogId = bi.backlogItemId || bi.id || bi._id;
                              const dueDateValue =
                                bi.dueDate ||
                                bi.deadline ||
                                bi.targetDate ||
                                bi.endDate ||
                                null;
                              return (
                                <li
                                  key={backlogId}
                                  className="grid grid-cols-12 items-center gap-2 px-3 py-2"
                                >
                                  <div className="col-span-6 flex items-center gap-2">
                                    {done ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-gray-300" />
                                    )}
                                    <span className={done ? "text-gray-800" : "text-gray-700"}>
                                      {bi.title || t("newItem") || "Backlog item"}
                                    </span>
                                  </div>
                                  <span className="col-span-3 text-gray-600">
                                    {formatDate(dueDateValue)}
                                  </span>
                                  <div className="col-span-3 flex items-center justify-between gap-2">
                                    <span className="text-gray-600">
                                      {bi.status || "--"}
                                    </span>
                                    {!readOnly && (
                                      <Button
                                        size="small"
                                        type="text"
                                        danger
                                        onClick={() => handleRemoveItem(mId, backlogId)}
                                      >
                                        {t("remove") || "Remove"}
                                      </Button>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">
                          {t("noItems") || "No items yet."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 p-6 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
          <p className="text-gray-600">
            {t("milestonesPlaceholder") || "Milestones view coming soon"}
          </p>
        </div>
      )}

      {!readOnly && (
      <Modal
        title={
          selectedMilestone
            ? t("editMilestone") || "Edit Milestone"
            : t("createMilestone") || "Create Milestone"
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          resetForm();
        }}
        okText={t("save") || "Save"}
        cancelText={t("cancel") || "Cancel"}
        destroyOnClose
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("title") || "Title"}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("enterTitle") || "Enter title"}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("description") || "Description"}
            </label>
            <Input.TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("enterDescription") || "Enter description"}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1 block">
              {t("targetDate") || "Target date"}
            </label>
            <DatePicker
              className="w-full"
              value={form.targetDate}
              inputReadOnly
              disabledDate={(current) => current && current < dayjs().startOf("day")}
              onChange={(value) => setForm((prev) => ({ ...prev, targetDate: value }))}
            />
          </div>
          {(() => {
            const showOverduePanel =
              overdueLoading ||
              overdueError ||
              (overdueActions?.isOverdue &&
                Number(overdueActions?.incompleteItems || 0) > 0);
            if (!selectedMilestone || !showOverduePanel) return null;
            return (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-amber-700">
                    {t("milestoneOverdue") || "Milestone is overdue"}
                  </span>
                </div>
                <Tag color="orange">
                  {t("overdueActions") || "Overdue Actions"}
                </Tag>
              </div>

              {overdueLoading && (
                <p className="text-xs text-gray-500">
                  {t("loading") || "Loading..."}
                </p>
              )}
              {overdueError && (
                <div className="flex items-center justify-between text-xs text-red-600">
                  <span>{overdueError}</span>
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      fetchOverdueActions(
                        selectedMilestone.milestoneId || selectedMilestone.id
                      )
                    }
                  >
                    {t("retry") || "Retry"}
                  </Button>
                </div>
              )}

              {overdueActions?.isOverdue &&
                Number(overdueActions?.incompleteItems || 0) > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      {
                        label: t("totalItems") || "Total items",
                        value: overdueActions.totalItems ?? 0,
                      },
                      {
                        label: t("completedItems") || "Completed items",
                        value: overdueActions.completedItems ?? 0,
                      },
                      {
                        label: t("incompleteItems") || "Incomplete items",
                        value: overdueActions.incompleteItems ?? 0,
                      },
                      {
                        label: t("overdueItems") || "Overdue items",
                        value: overdueActions.overdueItems ?? 0,
                      },
                      {
                        label:
                          t("tasksDueAfterMilestone") ||
                          "Items due after milestone",
                        value: overdueActions.tasksDueAfterMilestone ?? 0,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2"
                      >
                        <p className="text-[11px] uppercase text-gray-500">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {Array.isArray(overdueActions.overdueBacklogItems) &&
                    overdueActions.overdueBacklogItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600">
                        {t("overdueItemsList") || "Overdue items"}
                      </p>
                      <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                        <div className="grid grid-cols-4 gap-2 bg-gray-50 px-3 py-2 font-semibold text-gray-600">
                          <span>{t("title") || "Title"}</span>
                          <span>{t("dueDate") || "Due date"}</span>
                          <span>{t("status") || "Status"}</span>
                          <span>{t("column") || "Column"}</span>
                        </div>
                        {overdueActions.overdueBacklogItems.map((item) => (
                          <div
                            key={item.backlogItemId || item.title}
                            className="grid grid-cols-4 gap-2 px-3 py-2 border-t border-gray-100"
                          >
                            <span className="text-gray-900">
                              {item.title || t("untitled") || "Untitled"}
                            </span>
                            <span className="text-gray-600">
                              {formatDate(item.dueDate)}
                            </span>
                            <span className="text-gray-600">
                              {item.status || "--"}
                            </span>
                            <span className="text-gray-600">
                              {item.columnName || "--"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-amber-100 pt-3">
                    <label className="text-sm text-gray-700 mb-1 block">
                      {t("newTargetDate") || "New target date"}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <DatePicker
                        className="w-full"
                        value={extendDate}
                        inputReadOnly
                        disabledDate={(current) =>
                          current && current < dayjs().startOf("day")
                        }
                        onChange={setExtendDate}
                      />
                      <Button
                        type="primary"
                        loading={extendLoading}
                        onClick={handleExtendMilestone}
                      >
                        {t("extendMilestone") || "Extend milestone"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setMoveDialogOpen(true)}>
                      {t("moveIncompleteItems") || "Move incomplete items"}
                    </Button>
                  </div>
                </>
              )}
            </div>
            );
          })()}
          {selectedMilestone && (
            <>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  {t("status") || "Status"}
                </label>
                <Select
                  value={form.status}
                  onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                  options={[
                    { value: "planned", label: "Planned" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "done", label: "Done" },
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">
                  {t("completedAt") || "Completed at"}
                </label>
                <DatePicker
                  className="w-full"
                  value={form.completedAt}
                  inputReadOnly
                  disabledDate={(current) =>
                    current && current < dayjs().startOf("day")
                  }
                  onChange={(value) => setForm((prev) => ({ ...prev, completedAt: value }))}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
      )}

      {!readOnly && selectedMilestone && (
        <MoveIncompleteItemsDialog
          open={moveDialogOpen}
          onCancel={() => setMoveDialogOpen(false)}
          groupId={groupId}
          milestoneId={selectedMilestone.milestoneId || selectedMilestone.id}
          currentMilestoneId={selectedMilestone.milestoneId || selectedMilestone.id}
          t={t}
          onMoved={handleMoveSuccess}
        />
      )}

      {!readOnly && (
        <Modal
          title={t("assignBacklog") || "Assign Backlog"}
          open={assignModalOpen}
          onOk={handleAssign}
          onCancel={() => setAssignModalOpen(false)}
          okText={t("save") || "Save"}
          cancelText={t("cancel") || "Cancel"}
          destroyOnClose
        >
          <div className="space-y-3">
            <label className="text-sm text-gray-700 mb-1 block">
              {t("backlogItems") || "Backlog items"}
            </label>
            <Select
              mode="multiple"
              className="w-full"
              value={assignBacklogIds}
              onChange={setAssignBacklogIds}
              options={backlogOptions}
              placeholder={t("selectItems") || "Select items"}
            />
            <p className="text-xs text-gray-500">
              {t("assignBacklogHint") || "Select backlog items to link with this milestone."}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}



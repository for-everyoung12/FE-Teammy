import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Input, Modal, Pagination, Spin, Tag } from "antd";
import dayjs from "dayjs";
import { BacklogService } from "../../../services/backlog.service";
import { MilestoneService } from "../../../services/milestone.service";

const formatDate = (value) => {
  if (!value) return "--";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY") : "--";
};

const getTimelineItems = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.milestones)) return payload.milestones;
  if (Array.isArray(payload.data?.milestones)) return payload.data.milestones;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const statusColors = {
  planned: "default",
  in_progress: "blue",
  done: "green",
  completed: "green",
  slipped: "orange",
};

export default function TimelineTab({ groupId, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [filterFrom, setFilterFrom] = useState(null);
  const [filterTo, setFilterTo] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [taskSearchText, setTaskSearchText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalTasks, setModalTasks] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(5);
  const [timelinePage, setTimelinePage] = useState(1);
  const timelinePageSize = 4;

  const getMilestoneTasks = (item) => {
    if (!item) return [];
    if (Array.isArray(item.items)) return item.items;
    if (Array.isArray(item.backlogItems)) return item.backlogItems;
    if (Array.isArray(item.tasks)) return item.tasks;
    if (Array.isArray(item.backlog_items)) return item.backlog_items;
    return [];
  };
  const isWithinRange = (value) => {
    if (!value) return false;
    const date = dayjs(value);
    if (!date.isValid()) return false;
    if (filterFrom && date.isBefore(filterFrom.startOf("day"))) return false;
    if (filterTo && date.isAfter(filterTo.endOf("day"))) return false;
    return true;
  };
  const normalizeSearch = (value = "") => String(value || "").toLowerCase();
  const matchesSearch = (source, query) =>
    normalizeSearch(source).includes(normalizeSearch(query));

  const normalizeId = (value) => {
    if (!value) return "";
    return String(value).trim().toLowerCase();
  };

  const matchesMilestone = (item, milestoneId, milestoneName) => {
    if (!item) return false;
    const itemMilestoneId =
      item.milestoneId ||
      item.milestone_id ||
      item.milestone?.id ||
      item.milestone?.milestoneId ||
      item.milestone?.milestone_id ||
      "";
    const itemMilestoneName =
      item.milestoneName || item.milestone?.name || "";
    if (normalizeId(itemMilestoneId) && normalizeId(milestoneId)) {
      return normalizeId(itemMilestoneId) === normalizeId(milestoneId);
    }
    if (itemMilestoneName && milestoneName) {
      return normalizeId(itemMilestoneName) === normalizeId(milestoneName);
    }
    return false;
  };

  const fetchMilestoneTasks = async (milestoneId) => {
    if (!groupId || !milestoneId) return [];
    try {
      const res = await MilestoneService.list(groupId);
      const payload = res?.data ?? res;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : payload?.items || [];
      const match = list.find(
        (m) => String(m.milestoneId || m.id) === String(milestoneId)
      );
      return getMilestoneTasks(match);
    } catch {
      return [];
    }
  };

  const fetchBacklogItems = async () => {
    if (!groupId) return [];
    try {
      const res = await BacklogService.getBacklog(groupId);
      const payload = res?.data ?? res;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.results)) return payload.results;
      return [];
    } catch {
      return [];
    }
  };

  const handleOpenTasks = async (item) => {
    const milestoneId = item?.milestoneId || item?.id || item?._id;
    if (!milestoneId) return;
    setModalTitle(item?.name || item?.title || t("milestone") || "Milestone");
    setModalPage(1);
    setModalOpen(true);
    setModalLoading(true);
    let tasks = getMilestoneTasks(item);
    if (!tasks.length) {
      tasks = await fetchMilestoneTasks(milestoneId);
    }
    if (!tasks.length) {
      const backlogItems = await fetchBacklogItems();
      tasks = backlogItems.filter((backlogItem) =>
        matchesMilestone(
          backlogItem,
          milestoneId,
          item?.name || item?.title || ""
        )
      );
    }
    setModalTasks(Array.isArray(tasks) ? tasks : []);
    setModalLoading(false);
  };

  const filteredModalTasks = useMemo(() => {
    return (modalTasks || []).filter((task) => {
      const inRange =
        !filterFrom && !filterTo
          ? true
          : isWithinRange(task.dueDate || task.deadline || task.endDate);
      if (!inRange) return false;
      if (!taskSearchText) return true;
      const title = task.title || task.name || "";
      const status = task.columnName || task.status || "";
      return (
        matchesSearch(title, taskSearchText) ||
        matchesSearch(status, taskSearchText)
      );
    });
  }, [modalTasks, filterFrom, filterTo, taskSearchText]);

  const pagedTasks = useMemo(() => {
    const list = Array.isArray(filteredModalTasks) ? filteredModalTasks : [];
    const start = Math.max(0, (modalPage - 1) * modalPageSize);
    const end = start + modalPageSize;
    return list.slice(start, end);
  }, [filteredModalTasks, modalPage, modalPageSize]);

  useEffect(() => {
    if (!groupId) return;
    const fetchTimeline = async () => {
      setLoading(true);
      setError("");
      try {
        const startDate = (filterFrom || dayjs().subtract(365, "day")).format(
          "YYYY-MM-DD",
        );
        const endDate = (filterTo || dayjs().add(365, "day")).format(
          "YYYY-MM-DD",
        );
        const res = await MilestoneService.getTimelineMilestones(
          groupId,
          startDate,
          endDate
        );
        const payload = res?.data ?? res;
        setItems(getTimelineItems(payload));
      } catch (err) {
        setItems([]);
        setError(
          err?.response?.data?.message ||
            t("actionFailed") ||
            "Action failed"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [groupId, filterFrom, filterTo, t]);

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const filtered = list.filter((item) => {
      const inRange =
        !filterFrom && !filterTo
          ? true
          : isWithinRange(item?.targetDate || item?.target_date);
      if (!inRange) return false;
      if (!searchText) return true;
      const name = item?.name || item?.title || "";
      const description = item?.description || "";
      return (
        matchesSearch(name, searchText) ||
        matchesSearch(description, searchText)
      );
    });
    const sorted = filtered.slice().sort((a, b) => {
      const aDate = a?.targetDate || a?.target_date || null;
      const bDate = b?.targetDate || b?.target_date || null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return dayjs(aDate).valueOf() - dayjs(bDate).valueOf();
    });
    return sortOrder === "newest" ? sorted.reverse() : sorted;
  }, [items, sortOrder, filterFrom, filterTo, searchText]);

  const pagedMilestones = useMemo(() => {
    const start = Math.max(0, (timelinePage - 1) * timelinePageSize);
    const end = start + timelinePageSize;
    return sortedItems.slice(start, end);
  }, [sortedItems, timelinePage, timelinePageSize]);

  useEffect(() => {
    setTimelinePage(1);
  }, [sortOrder, items.length, filterFrom, filterTo, searchText]);

  useEffect(() => {
    setModalPage(1);
  }, [filterFrom, filterTo, taskSearchText]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        {t("loading") || "Loading..."}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
              {t("from") || "From"}
            </label>
            <DatePicker
              value={filterFrom}
              inputReadOnly
              onChange={(value) => setFilterFrom(value)}
              disabledDate={(current) =>
                filterTo && current && current > filterTo.endOf("day")
              }
              className="w-36"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
              {t("to") || "To"}
            </label>
            <DatePicker
              value={filterTo}
              inputReadOnly
              onChange={(value) => setFilterTo(value)}
              disabledDate={(current) =>
                filterFrom && current && current < filterFrom.startOf("day")
              }
              className="w-36"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
              {t("search") || "Search"}
            </label>
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t("search") || "Search"}
              className="w-52"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortOrder("newest")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              sortOrder === "newest"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {t("newest") || "Newest"}
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("oldest")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              sortOrder === "oldest"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {t("oldest") || "Oldest"}
          </button>
        </div>
      </div>
      {sortedItems.length === 0 ? (
        <div className="text-sm text-gray-500">
          {t("noData") || "No results found."}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-6">
            {pagedMilestones.map((item, index) => {
              const id = item.milestoneId || item.id || item._id;
              const itemKey = String(
                id || `${item.name}-${item.targetDate || item.target_date}-${index}`
              );
              const statusKey = (item.status || "").toLowerCase();
              const color = statusColors[statusKey] || "default";
              const tasks = getMilestoneTasks(item);
              const total = item.totalItems ?? tasks.length ?? null;
              const done = item.completedItems ?? null;
              return (
                <div key={itemKey} className="flex gap-4">
                  <div className="relative w-6 flex justify-center">
                    <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {item.name || item.title || t("milestone") || "Milestone"}
                      </h4>
                      {item.status && <Tag color={color}>{item.status}</Tag>}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-gray-600">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span>
                        {t("targetDate") || "Target date"}:{" "}
                        {formatDate(item.targetDate || item.target_date)}
                      </span>
                      {Number.isFinite(Number(total)) && (
                        <span>
                          {t("items") || "items"}: {done ?? 0}/{total}
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        onClick={() => handleOpenTasks(item)}
                      >
                        {t("view") || "View"} {t("tasks") || "Tasks"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {sortedItems.length > timelinePageSize && (
            <div className="mt-6 flex justify-end">
              <Pagination
                current={timelinePage}
                pageSize={timelinePageSize}
                total={sortedItems.length}
                onChange={(page) => setTimelinePage(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={modalTitle}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {modalLoading ? (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        ) : filteredModalTasks.length === 0 ? (
          <div className="text-sm text-gray-500">
            {t("noItems") || "No items yet."}
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              value={taskSearchText}
              onChange={(e) => setTaskSearchText(e.target.value)}
              placeholder={t("searchTasks") || t("search") || "Search tasks"}
            />
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {pagedTasks.map((task, taskIndex) => (
                <div
                  key={
                    task.backlogItemId ||
                    task.taskId ||
                    task.id ||
                    `task-${taskIndex}`
                  }
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {task.title || task.name || t("untitled") || "Untitled"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t("dueDate") || "Due date"}:{" "}
                      {formatDate(task.dueDate || task.deadline || task.endDate)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.columnName || task.status || "--"}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Pagination
                current={modalPage}
                pageSize={modalPageSize}
                total={filteredModalTasks.length}
                onChange={(page, size) => {
                  setModalPage(page);
                  setModalPageSize(size);
                }}
                showSizeChanger
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

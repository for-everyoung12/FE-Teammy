import React, { useEffect, useMemo, useState, useRef } from "react";
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, Target, Calendar, Circle } from "lucide-react";
import { Progress } from "antd";
import dayjs from "dayjs";
import { ReportService } from "../../../services/report.service";
import { useTranslation } from "../../../hook/useTranslation";

export default function ReportsTab({ groupId, groupStatus }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(null);

  const isGroupClosed = () => {
    if (!groupStatus) return false;
    const statusLower = (groupStatus || "").toLowerCase();
    return statusLower.includes("closed");
  };

  const fetchReport = async () => {
    if (!groupId || isGroupClosed()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ReportService.getProjectReport(groupId);
      setData(res?.data ?? res);
    } catch (err) {

      setError(t("failedLoadReport") || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!groupId || fetchedRef.current === groupId || isGroupClosed()) {
      if (isGroupClosed()) {
        setData(null);
        setError(null);
      }
      return;
    }
    fetchedRef.current = groupId;
    fetchReport();
  }, [groupId, groupStatus]);

  const project = data?.project || {};
  const backlog = data?.tasks?.backlog || {};
  const columns = data?.tasks?.columns || [];
  const milestones = data?.tasks?.milestones || [];
  // Extract all backlog items from milestones
  const allBacklogItems = useMemo(() => {
    const items = [];
    milestones.forEach((m) => {
      (m.items || []).forEach((item) => {
        items.push({
          ...item,
          milestoneName: m.name,
          milestoneId: m.milestoneId,
        });
      });
    });
    return items;
  }, [milestones]);

  const overdueItems = useMemo(() => {
    const now = dayjs();
    return allBacklogItems.filter((item) => {
      if ((item.status || "").toLowerCase() === "completed") return false;
      if (!item.dueDate) return false;
      return dayjs(item.dueDate).isBefore(now, "day") || dayjs(item.dueDate).isSame(now, "day");
    });
  }, [allBacklogItems]);

  const dueSoonItems = useMemo(() => {
    const now = dayjs();
    const next7Days = now.add(7, "day");
    return allBacklogItems.filter((item) => {
      if ((item.status || "").toLowerCase() === "completed") return false;
      if (!item.dueDate) return false;
      const due = dayjs(item.dueDate);
      return due.isAfter(now, "day") && (due.isBefore(next7Days, "day") || due.isSame(next7Days, "day"));
    });
  }, [allBacklogItems]);

  const metricCards = useMemo(
    () => [
      {
        icon: <Target className="w-5 h-5 text-blue-600" />,
        label: t("completion") || "Completion",
        value: `${project.completionPercent ?? 0}%`,
      },
      {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        label: t("tasksCompleted") || "Tasks Completed",
        value: project.completedItems ?? 0,
      },
      {
        icon: <TrendingUp className="w-5 h-5 text-orange-500" />,
        label: t("dueSoon") || "Due soon",
        value: project.dueSoonItems ?? 0,
      },
      {
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        label: t("overdue") || "Overdue",
        value: project.overdueItems ?? 0,
      },
      {
        icon: <Clock className="w-5 h-5 text-gray-600" />,
        label: t("pending") || "Remaining",
        value: backlog.remaining ?? 0,
      },
    ],
    [project, backlog.remaining, t]
  );

  if (loading) {
    return (
      <div className="mt-4 p-6 bg-gray-50 rounded-lg text-center text-gray-500">
        {t("loading") || "Loading..."}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-6 bg-red-50 text-red-600 rounded-lg text-center">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 p-6 bg-gray-50 rounded-lg text-center px-2 sm:px-0">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          {t("reportsPlaceholder") || "Reports view coming soon"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">
          {t("reportsTitle") || "Progress Reports & Analytics"}
        </h3>
        <p className="text-sm text-gray-500">
          {t("reportsSubtitle") || "Track your team's performance and project metrics."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {metricCards.map((card, idx) => (
          <div
            key={idx}
            className="p-4 border border-gray-200 rounded-xl bg-white flex items-center gap-3 shadow-sm"
          >
            <div className="p-2 bg-gray-50 rounded-full">{card.icon}</div>
            <div>
              <div className="text-xs text-gray-500">{card.label}</div>
              <div className="text-lg font-semibold text-gray-900">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{t("backlogSummary") || "Backlog Summary"}</h4>
            <span className="text-sm text-gray-500">
              {t("total") || "Total"}: {backlog.total ?? 0}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label={t("ready") || "Ready"} value={backlog.ready} />
            <InfoRow label={t("inProgress") || "In Progress"} value={backlog.inProgress} />
            <InfoRow label={t("blocked") || "Blocked"} value={backlog.blocked} />
            <InfoRow label={t("completed") || "Completed"} value={backlog.completed} />
            <InfoRow label={t("archived") || "Archived"} value={backlog.archived} />
            <InfoRow label={t("notStarted") || "Not started"} value={backlog.notStarted} />
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              {t("boardColumns") || "Board columns"}
            </h4>
          </div>
          <div className="space-y-2">
            {columns.map((col) => (
              <div key={col.columnId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {col.columnName} {col.isDone ? `(${t("done") || "done"})` : ""}
                </span>
                <span className="font-semibold text-gray-900">{col.taskCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              {t("milestones") || "Milestones"}
            </h4>
            <span className="text-sm text-gray-500">
              {project.milestoneCount || 0} {t("items") || "items"}
            </span>
          </div>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.milestoneId} className="p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{m.name || "Milestone"}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {m.status || "planned"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {t("targetDate") || "Target"}: {formatDate(m.targetDate)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {t("completion") || "Completion"}: {m.completionPercent ?? 0}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              {t("overdueItems") || "Overdue items"}
            </h4>
            <span className="text-sm text-gray-500">
              {overdueItems.length} {t("items") || "items"}
            </span>
          </div>
          {overdueItems.length === 0 ? (
            <div className="text-sm text-gray-500">
              {t("noOverdueTasks") || "No overdue tasks"}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {overdueItems.map((item) => (
                <TaskItem
                  key={item.backlogItemId || item.id || item._id}
                  item={item}
                  icon={<AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />}
                  showDueDate
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">
            {t("projectOverview") || "Project Overview"}
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-600">{t("overallProgress") || "Overall Progress"}</span>
                <span className="font-semibold text-gray-900">{project.completionPercent ?? 0}%</span>
              </div>
              <Progress percent={project.completionPercent ?? 0} showInfo={false} />
            </div>
            <InfoRow label={t("totalItems") || "Total items"} value={project.totalItems} />
            <InfoRow label={t("completedItems") || "Completed items"} value={project.completedItems} />
            <InfoRow label={t("activeItems") || "Active items"} value={project.activeItems} />
            <InfoRow label={t("blockedItems") || "Blocked items"} value={project.blockedItems} />
            <InfoRow label={t("overdueItems") || "Overdue items"} value={project.overdueItems} />
            <InfoRow label={t("dueSoonItems") || "Due soon items"} value={project.dueSoonItems} />
          </div>
        </div>
      </div>
    </div>
  );
}

const TaskItem = ({ item, statusColor, icon, showDueDate = false }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
    <div className="flex items-start gap-2">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {item.title || "Untitled task"}
        </div>
        {item.milestoneName && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Target className="w-3 h-3" />
            <span className="truncate">{item.milestoneName}</span>
          </div>
        )}
        {showDueDate && item.dueDate && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(item.dueDate)}</span>
          </div>
        )}
        {item.columnName && (
          <div className="mt-1 text-xs text-gray-500">
            <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
              {item.columnName}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className="font-semibold text-gray-900">{value ?? 0}</span>
  </div>
);

const formatDate = (value) => {
  if (!value) return "--";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM/YYYY") : "--";
};


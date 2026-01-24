import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DatePicker, Drawer, Input, Pagination, Select, Tooltip } from "antd";
import dayjs from "dayjs";
import {
  MoreVertical,
  Users,
  GraduationCap,
  UserPlus,
  Trophy,
  ClipboardCheck,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function MembersPanel({
  groupMembers,
  mentor,
  mentors,
  group,
  onInvite,
  onKickMember,
  onTransferLeader,
  currentUserEmail,
  t,
  showStats = false,
  contributionStats = [],
  board = null,
  filtersContent = null,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailMember, setDetailMember] = useState(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailStatus, setDetailStatus] = useState("all");
  const [detailPriority, setDetailPriority] = useState("all");
  const [detailSort, setDetailSort] = useState("recent");
  const [detailDateRange, setDetailDateRange] = useState(null);
  const navigate = useNavigate();

  const groupStatus = (group?.status || "").toString();
  const isGroupClosed = () => {
    if (!groupStatus) return false;
    const statusLower = groupStatus.toLowerCase();
    // Pending close vẫn cho phép chỉnh sửa, chỉ trạng thái closed mới khóa
    if (
      statusLower.includes("pending_close") ||
      statusLower.includes("pending-close")
    ) {
      return false;
    }
    return statusLower.includes("closed");
  };

  // Quyền chỉnh sửa nói chung (kick, change leader...) theo canEdit
  const canEditMembers = !!group?.canEdit;
  // Riêng invite + assign role sẽ bị khóa khi group CLOSED
  const canInviteAndAssign = !!group?.canEdit && !isGroupClosed();
  const semesterStartDate =
    group?.semester?.startDate ||
    group?.semesterStartDate ||
    group?.startDate ||
    group?.start;
  const isInviteLockedBySemesterStart = (() => {
    if (!semesterStartDate) return false;
    const parsed = dayjs(semesterStartDate);
    return parsed.isValid() && parsed.isSame(dayjs(), "day");
  })();

  // Calculate member contributions based on task assignments
  const calculateMemberContributions = () => {
    if (!board?.columns || !groupMembers?.length) return groupMembers || [];

    // Flatten tasks from all columns
    let allTasks = [];
    if (Array.isArray(board.columns)) {
      allTasks = board.columns.flatMap((col) => col.tasks || []);
    } else if (typeof board.columns === "object") {
      allTasks = Object.values(board.columns).flatMap((col) =>
        Array.isArray(col.tasks) ? col.tasks : Object.values(col.tasks || {})
      );
    }

    const totalTasks = allTasks.length || 1;
    const memberTaskCount = {};

    // Count tasks per member
    allTasks.forEach((task) => {
      const assignees = task.assignees || [];
      assignees.forEach((assignee) => {
        const assigneeId =
          typeof assignee === "string"
            ? assignee
            : assignee?.userId || assignee?.id;

        if (assigneeId) {
          memberTaskCount[assigneeId] = (memberTaskCount[assigneeId] || 0) + 1;
        }
      });
    });

    // Map to members with contribution percentage
    return groupMembers.map((member) => {
      const memberId = member.id || member.userId || member.email;
      const taskCount = memberTaskCount[memberId] || 0;
      const contribution = Math.round((taskCount / totalTasks) * 100);

      return {
        ...member,
        taskCount,
        contribution,
      };
    });
  };

  const memberStats =
    contributionStats && contributionStats.length
      ? contributionStats
      : board
      ? calculateMemberContributions()
      : groupMembers || [];
  const openProfile = (member = {}) => {
    const memberId =
      member.id ||
      member.userId ||
      member.userID ||
      member.memberId ||
      member.accountId ||
      member.mentorId ||
      "";
    if (!memberId) return;
    navigate(`/profile/${memberId}`);
  };

  const getMemberId = (member) => {
    return (
      member.id ||
      member.userId ||
      member.userID ||
      member.memberId ||
      member.studentId ||
      member.accountId ||
      member.email ||
      ""
    );
  };


  const openDetails = (member) => {
    setDetailMember(member || null);
    setDetailPage(1);
    setDetailDrawerOpen(true);
    setDetailSearch("");
    setDetailStatus("all");
    setDetailPriority("all");
    setDetailSort("recent");
    setDetailDateRange(null);
  };

  const closeDetails = () => {
    setDetailMember(null);
    setDetailPage(1);
    setDetailDrawerOpen(false);
  };

  const getTaskDate = (task) => {
    return (
      task?.completedAt ||
      task?.doneAt ||
      task?.updatedAt ||
      task?.createdAt ||
      null
    );
  };

  const getTaskStatus = (task) => {
    const status = (task?.status || "").toLowerCase();
    if (status) return status;
    if (task?.completedAt || task?.doneAt) return "done";
    return "in_progress";
  };

  const getTaskPoints = (task) => {
    const raw =
      task?.points ??
      task?.point ??
      task?.storyPoints ??
      task?.storyPoint ??
      task?.story_points ??
      task?.story_point ??
      task?.complexity ??
      task?.score ??
      0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getTaskMilestone = (task) => {
    return (
      task?.milestoneName ||
      task?.milestone?.name ||
      task?.milestone ||
      "--"
    );
  };

  const filterTasks = (tasks = [], options = {}) => {
    const {
      search = "",
      status = "all",
      range = "all",
      priority = "all",
      dateRange = null,
      sort = "recent",
    } = options;
    const normalizedSearch = search.trim().toLowerCase();
    let results = [...tasks];

    if (normalizedSearch) {
      results = results.filter((task) =>
        (task?.title || "").toLowerCase().includes(normalizedSearch)
      );
    }

    if (status !== "all") {
      results = results.filter((task) => getTaskStatus(task) === status);
    }

    if (priority !== "all") {
      results = results.filter(
        (task) => (task?.priority || "").toLowerCase() === priority
      );
    }

    if (range !== "all") {
      const now = dayjs();
      const cutoff =
        range === "week" ? now.subtract(7, "day") : now.subtract(1, "month");
      results = results.filter((task) => {
        const dateValue = getTaskDate(task);
        if (!dateValue) return false;
        const parsed = dayjs(dateValue);
        return parsed.isValid() && parsed.isAfter(cutoff);
      });
    }

    if (Array.isArray(dateRange) && dateRange.length === 2) {
      const [start, end] = dateRange;
      const startMs = start ? start.startOf("day").valueOf() : null;
      const endMs = end ? end.endOf("day").valueOf() : null;
      results = results.filter((task) => {
        const dateValue = getTaskDate(task);
        if (!dateValue) return false;
        const parsed = dayjs(dateValue);
        if (!parsed.isValid()) return false;
        const time = parsed.valueOf();
        if (startMs && time < startMs) return false;
        if (endMs && time > endMs) return false;
        return true;
      });
    }

    if (sort === "points") {
      results.sort((a, b) => getTaskPoints(b) - getTaskPoints(a));
    } else if (sort === "priority") {
      const order = { high: 0, medium: 1, low: 2 };
      results.sort(
        (a, b) =>
          (order[(a?.priority || "").toLowerCase()] ?? 9) -
          (order[(b?.priority || "").toLowerCase()] ?? 9)
      );
    } else {
      results.sort((a, b) => {
        const aDate = getTaskDate(a);
        const bDate = getTaskDate(b);
        return dayjs(bDate || 0).valueOf() - dayjs(aDate || 0).valueOf();
      });
    }

    return results;
  };


  const toggleMenu = (memberId) => {
    setOpenMenuId(openMenuId === memberId ? null : memberId);
  };

  const handleKickMember = async (member) => {
    if (onKickMember) {
      const memberId = getMemberId(member);
      await onKickMember(
        memberId,
        member.name || member.displayName || "this member"
      );
    }
    setOpenMenuId(null);
  };

  const isCurrentUserLeader = () => {
    const currentMember = (groupMembers || []).find(
      (m) => (m.email || "").toLowerCase() === (currentUserEmail || "").toLowerCase()
    );
    return (currentMember?.role || "").toLowerCase() === "leader";
  };

  const isMemberLeader = (member) => {
    return (member.role || "").toLowerCase() === "leader";
  };

  // When we only need the contribution cards (members tab), skip the other blocks.
  if (showStats) {
    return (
      <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t("contributeScore") || "Contribute Score"}
            </h3>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {(() => {
              const totalScore = memberStats.reduce(
                (sum, m) => sum + (Number(m.scoreTotal) || 0),
                0
              );  
              const totalAssigned = memberStats.reduce(
                (sum, m) => sum + (Number(m.tasks?.assigned) || 0),
                0
              );
              const totalDone = memberStats.reduce(
                (sum, m) => sum + (Number(m.tasks?.done) || 0),
                0
              );
              const teamCount = memberStats.length;

              const cards = [
                {
                  label: t("totalScore") || "Total Score",
                  value: totalScore,
                  icon: Trophy,
                  tone: "bg-blue-50 text-blue-600",
                },
                {
                  label: t("teamMembers") || "Team Members",
                  value: teamCount,
                  icon: Users,
                  tone: "bg-emerald-50 text-emerald-600",
                },
                {
                  label: t("tasksDone") || "Tasks Done",
                  value: totalDone,
                  icon: ClipboardCheck,
                  tone: "bg-purple-50 text-purple-600",
                },
                {
                  label: t("totalAssigned") || "Total Assigned",
                  value: totalAssigned,
                  icon: ListChecks,
                  tone: "bg-gray-100 text-gray-600",
                },
              ];

              return cards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="border border-gray-200 rounded-2xl bg-white p-4 flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {card.value}
                      </div>
                      <div className="text-xs text-gray-500">
                        {card.label}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {filtersContent}
          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">
            {t("contribution") || "Contribution"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {memberStats.length ? (
          memberStats.map((member, idx) => {
            const initials = (member.name || member.displayName || "U")
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const contribution =
              member.scoreTotal ?? member.contribution ?? 0;
            const tasksCompleted =
              member.tasks?.done ?? member.taskCount ?? 0;
            const tasksAssigned =
              member.tasks?.assigned ?? member.tasksAssigned ?? 0;
            const memberId =
              getMemberId(member) ||
              member.memberId ||
              member.id ||
              member.email ||
              `member-${idx}`;
            const memberKey = String(memberId);
            const progressPercent = tasksAssigned
              ? Math.round((tasksCompleted / tasksAssigned) * 100)
              : 0;
            return (
              <div
                key={memberKey}
                className="border border-gray-200 rounded-2xl bg-white shadow-sm p-5 flex flex-col gap-4 relative"
              >
                {/* Kebab Menu */}
                {canEditMembers && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleMenu(getMemberId(member))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === getMemberId(member) && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {isCurrentUserLeader() && !isMemberLeader(member) && (
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onTransferLeader?.(member);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            {t("changeLeader") || "Change Leader"}
                          </button>
                        )}
                        {canEditMembers && !isMemberLeader(member) && (
                          <button
                            onClick={() => handleKickMember(member)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            {t("kickMember") || "Remove"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => openProfile(member)}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name || "avatar"}
                        className="w-12 h-12 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const fallbackName =
                            member.name || member.displayName || "User";
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            fallbackName
                          )}`;
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                        {initials || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {member.name || member.displayName || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {(member.assignedRoles && member.assignedRoles.length > 0
                          ? member.assignedRoles.join(", ")
                          : member.role) ||
                          t("member") ||
                          "Member"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-blue-600">
                      {contribution}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t("totalScore") || "Total Score"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>
                      {tasksCompleted}/{tasksAssigned} {t("tasks") || "tasks"}
                    </span>
                  </div>
                  <span className="font-medium text-gray-700">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{t("deliveryScore") || "Delivery"}</span>
                    <span className="ml-auto text-gray-700 font-medium">
                      {member.deliveryScore ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{t("qualityScore") || "Quality"}</span>
                    <span className="ml-auto text-gray-700 font-medium">
                      {member.qualityScore ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>{t("collabScore") || "Collab"}</span>
                    <span className="ml-auto text-gray-700 font-medium">
                      {member.collabScore ?? 0}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openDetails(member)}
                  className="mt-2 w-full text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 border-t border-gray-100 pt-3"
                >
                  <span>{t("showDetails") || "Show details"}</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-500">
            {t("noMembersYet") || "No members yet."}
          </div>
        )}
          </div>
        </div>
      </div>
      <Drawer
        open={detailDrawerOpen}
        onClose={closeDetails}
        title={
          detailMember
            ? `${t("taskDetails") || "Task Details"} - ${
                detailMember.name || detailMember.displayName || "Member"
              }`
            : t("taskDetails") || "Task Details"
        }
        width={720}
      >
        {detailMember && (() => {
          const tasks = detailMember.taskDetails || [];
          const filteredTasks = filterTasks(tasks, {
            search: detailSearch,
            status: detailStatus,
            priority: detailPriority,
            dateRange: detailDateRange,
            sort: detailSort,
          });
          const pageSize = 10;
          const startIndex = (detailPage - 1) * pageSize;
          const pagedTasks = filteredTasks.slice(startIndex, startIndex + pageSize);
          return (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {t("scoreByPriority") || "Score by priority"}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  {["high", "medium", "low"].map((level) => {
                    const priority = detailMember.byPriority?.[level] || {};
                    return (
                      <div
                        key={level}
                        className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center"
                      >
                        <div className="text-sm font-semibold text-gray-800 capitalize">
                          {t(level) || level}
                        </div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                          {priority.score ?? 0}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {priority.done ?? 0} {t("tasksDone") || "done"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    {t("tasksDoneTotal") || "Tasks done / total"}:{" "}
                    {detailMember.tasks?.done ?? 0}/{detailMember.tasks?.assigned ?? 0}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  placeholder={t("searchTasks") || "Search tasks"}
                />
                <DatePicker.RangePicker
                  value={detailDateRange}
                  onChange={setDetailDateRange}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  value={detailStatus}
                  onChange={setDetailStatus}
                  options={[
                    { value: "all", label: t("all") || "All" },
                    { value: "done", label: t("done") || "Done" },
                    { value: "in_progress", label: t("inProgress") || "In Progress" },
                  ]}
                />
                <Select
                  value={detailPriority}
                  onChange={setDetailPriority}
                  options={[
                    { value: "all", label: t("all") || "All" },
                    { value: "high", label: t("high") || "High" },
                    { value: "medium", label: t("medium") || "Medium" },
                    { value: "low", label: t("low") || "Low" },
                  ]}
                />
                <Select
                  value={detailSort}
                  onChange={setDetailSort}
                  options={[
                    { value: "recent", label: t("sortRecent") || "Most recent" },
                    { value: "points", label: t("sortPoints") || "Points" },
                    { value: "priority", label: t("sortPriority") || "Priority" },
                  ]}
                />
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase text-gray-500">
                  <span className="col-span-4">{t("task") || "Task"}</span>
                  <span className="col-span-2">{t("priority") || "Priority"}</span>
                  <span className="col-span-2">{t("points") || "Points"}</span>
                  <span className="col-span-2">{t("completedAt") || "Completed at"}</span>
                  <span className="col-span-2">{t("milestone") || "Milestone"}</span>
                </div>
                {pagedTasks.length ? (
                  pagedTasks.map((task) => (
                    <div
                      key={task.taskId}
                      className="grid grid-cols-12 gap-2 border-t border-gray-100 px-3 py-2 text-sm text-gray-700"
                    >
                      <span className="col-span-4 truncate">
                        {task.title || "Untitled"}
                      </span>
                      <span className="col-span-2 text-gray-500 capitalize">
                        {(task.priority || "--").toLowerCase()}
                      </span>
                      <span className="col-span-2 text-gray-500">
                        {getTaskPoints(task)}
                      </span>
                      <span className="col-span-2 text-gray-500">
                        {getTaskDate(task)
                          ? dayjs(getTaskDate(task)).format("DD/MM/YYYY")
                          : "--"}
                      </span>
                      <span className="col-span-2 text-gray-500 truncate">
                        {getTaskMilestone(task)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    {t("noTasks") || "No tasks"}
                  </div>
                )}
              </div>
              {filteredTasks.length > pageSize && (
                <div className="flex justify-end">
                  <Pagination
                    current={detailPage}
                    pageSize={pageSize}
                    total={filteredTasks.length}
                    onChange={setDetailPage}
                    size="small"
                  />
                </div>
              )}
            </div>
          );
        })()}
      </Drawer>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {t("teamMembers") || "Team Members"}
              </h3>
            </div>
            <span className="text-sm text-gray-400">
              {groupMembers?.length || 0}{" "}
              {groupMembers?.length === 1 ? "person" : "people"}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {groupMembers?.length ? (
              groupMembers.map((member, index) => (
                <div
                  key={member.id || member.email || `member-${index}`}
                  className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-3 bg-white shadow-sm relative"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    onClick={() => openProfile(member)}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name || member.displayName || "avatar"}
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const fallbackName =
                            member.name || member.displayName || "User";
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            fallbackName
                          )}`;
                        }}
                      />
                    ) : member.user?.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.name || member.displayName || "avatar"}
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const fallbackName =
                            member.name || member.displayName || "User";
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            fallbackName
                          )}`;
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                        {(member.name || member.displayName || "U")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {member.name || member.displayName || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {(member.assignedRoles &&
                        member.assignedRoles.length > 0
                          ? member.assignedRoles.join(", ")
                          : member.role) || "Member"}
                      </p>
                    </div>
                  </div>
                  {canEditMembers && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleMenu(getMemberId(member))}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {openMenuId === getMemberId(member) && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                            {isCurrentUserLeader() && !isMemberLeader(member) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onTransferLeader?.(member);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                {t("changeLeader") || "Change Leader"}
                              </button>
                            )}
                            {canEditMembers && !isMemberLeader(member) && (
                              <button
                                type="button"
                                onClick={() => handleKickMember(member)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                {t("kickMember") || "Remove"}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                {t("noMembersYet") || "No members yet."}
              </p>
            )}
            {canInviteAndAssign && (
              <Tooltip
                title={
                  !isCurrentUserLeader()
                    ? t("onlyLeaderCanInvite") || "Only leader can invite members"
                    : isInviteLockedBySemesterStart
                    ? t("inviteDisabledSemesterStart") ||
                      "Invitations are closed on the semester start date."
                    : ""
                }
              >
                <button
                  type="button"
                  onClick={onInvite}
                  disabled={!isCurrentUserLeader() || isInviteLockedBySemesterStart}
                  className={`w-full inline-flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-sm font-semibold transition ${
                    isCurrentUserLeader() && !isInviteLockedBySemesterStart
                      ? "border-blue-400 text-blue-600 bg-white hover:bg-blue-50"
                      : "border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {t("inviteMembers") || "+ Invite Members"}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t("projectMentor") || "Mentor"}
              {Array.isArray(mentors) && mentors.length > 1 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({mentors.length})
                </span>
              )}
            </h3>
          </div>
          {Array.isArray(mentors) && mentors.length > 0 ? (
            <div className="space-y-3">
              {mentors.map((mentorItem, idx) => (
                <div
                  key={mentorItem.userId || mentorItem.id || idx}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => openProfile(mentorItem)}
                >
                  {mentorItem.avatarUrl ? (
                    <img
                      src={mentorItem.avatarUrl}
                      alt={mentorItem.displayName || mentorItem.name || "mentor"}
                      className="w-12 h-12 rounded-full object-cover bg-white flex-shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const fallbackName =
                          mentorItem.displayName || mentorItem.name || "Mentor";
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          fallbackName
                        )}`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold flex-shrink-0">
                      {(mentorItem.displayName || mentorItem.name || "M")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {mentorItem.displayName || mentorItem.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {mentorItem.email || t("mentor") || "Mentor"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : mentor ? (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => openProfile(mentor)}
            >
              {mentor.avatarUrl ? (
                <img
                  src={mentor.avatarUrl}
                  alt={mentor.displayName || mentor.name || "mentor"}
                  className="w-12 h-12 rounded-full object-cover bg-white"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallbackName =
                      mentor.displayName || mentor.name || "Mentor";
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      fallbackName
                    )}`;
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
                  {(mentor.displayName || mentor.name || "M")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-800">
                  {mentor.displayName || mentor.name}
                </p>
                <p className="text-sm text-gray-500">
                  {mentor.email || t("mentor") || "Mentor"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <GraduationCap className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                {t("noMentorAssigned") || "No mentor assigned"}
              </p>
            </div>
          )}
        </div>
      </div>

    </>
  );
}




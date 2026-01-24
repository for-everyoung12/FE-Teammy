import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, Breadcrumb, Skeleton, Card, DatePicker } from "antd";
import dayjs from "dayjs";
import { BarChartOutlined, HomeOutlined, FileTextOutlined, TeamOutlined, AppstoreOutlined } from "@ant-design/icons";
import InfoCard from "../../components/common/my-group/InfoCard";
import OverviewSection from "../../components/common/my-group/OverviewSection";
import MembersPanel from "../../components/common/my-group/MembersPanel";
import FeedbackTab from "../../components/common/my-group/FeedbackTab";
import CloseGroupModal from "../../components/common/my-group/CloseGroupModal";
import { GroupService } from "../../services/group.service";
import { ReportService } from "../../services/report.service";
import { message } from "antd";
import useKanbanBoard from "../../hook/useKanbanBoard";
import KanbanTab from "../../components/common/workspace/KanbanTab";
import BacklogTab from "../../components/common/workspace/BacklogTab";
import MilestonesTab from "../../components/common/workspace/MilestonesTab";
import ReportsTab from "../../components/common/workspace/ReportsTab";
import TaskModal from "../../components/common/kanban/TaskModal";
import { useAuth } from "../../context/AuthContext";
import { subscribeGroupStatus } from "../../services/groupStatusHub";
import { useTranslation } from "../../hook/useTranslation";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [groupDetail, setGroupDetail] = useState(null);
  const [groupMembersList, setGroupMembersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("kanban");
  const lastHydratedIdRef = useRef(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [closeGroupModalOpen, setCloseGroupModalOpen] = useState(false);
  const [closeGroupLoading, setCloseGroupLoading] = useState(false);
  const [contributionScores, setContributionScores] = useState([]);
  const [scoreFrom, setScoreFrom] = useState(dayjs());
  const [scoreTo, setScoreTo] = useState(dayjs());
  const [scoreHigh, setScoreHigh] = useState(5);
  const [scoreMedium, setScoreMedium] = useState(3);
  const [scoreLow, setScoreLow] = useState(1);
  const readOnlyWorkspace = true;

  // Get group status - only check if groupDetail is loaded
  const groupStatus = groupDetail?.status || "";
  const isGroupClosed = groupDetail?.status ? (groupDetail.status.toLowerCase().includes("closed")) : false;

  const {
    filteredColumns,
    columnMeta,
    groupMembers,
    selectedTask,
    setSelectedTask,
    handleDragOver,
    handleDragEnd,
    createColumn,
    createTask,
    updateTaskFields,
    updateTaskAssignees,
    deleteTask,
    deleteColumn,
    loading: kanbanLoading,
    error: kanbanError,
    refetchBoard,
    loadTaskComments,
    addTaskComment,
    updateTaskComment,
    deleteTaskComment,
  } = useKanbanBoard(id, {
    skipApiCalls: isGroupClosed,
    groupStatus: groupStatus,
  });

  const fetchGroupDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await GroupService.getGroupDetail(id);
      const data = response?.data || null;
      setGroupDetail(data);
    } catch (error) {
      console.error("Failed to fetch group detail:", error);
      setGroupDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchContributionScores = useCallback(async (range = {}) => {
    if (!id) return;
    try {
      const res = await ReportService.getContributionScores(id, range);
      const payload = res?.data ?? res;
      const members = Array.isArray(payload?.members) ? payload.members : [];
      setContributionScores(members);
    } catch (error) {
      console.error("Failed to fetch contribution scores:", error);
      setContributionScores([]);
    }
  }, [id]);

  useEffect(() => {
    fetchGroupDetail();
  }, [fetchGroupDetail]);

  useEffect(() => {
    fetchContributionScores({
      From: dayjs().format("YYYY-MM-DD"),
      To: dayjs().format("YYYY-MM-DD"),
      High: 5,
      Medium: 3,
      Low: 1,
    });
  }, [fetchContributionScores]);

  const updateScoreFilter = (nextFrom, nextTo) => {
    const params = {};
    if (nextFrom) params.From = nextFrom.format("YYYY-MM-DD");
    if (nextTo) params.To = nextTo.format("YYYY-MM-DD");
    params.High = 5;
    params.Medium = 3;
    params.Low = 1;
    fetchContributionScores(params);
  };

  useEffect(() => {
    if (!id || loading) return;
    if (lastHydratedIdRef.current === id) return;
    lastHydratedIdRef.current = id;
    if (typeof window === "undefined") return;
    const storedTab = window.localStorage.getItem(`mentor-group:tab:${id}`);
    const storedWorkspaceTab = window.localStorage.getItem(
      `mentor-group:workspaceTab:${id}`,
    );
    const allowedTabs = new Set([
      "overview",
      "contributions",
      "workspace",
      "feedback",
    ]);
    const workspaceTabs = new Set([
      "kanban",
      "backlog",
      "milestones",
      "reports",
    ]);
    const nextTab =
      storedTab && allowedTabs.has(storedTab) ? storedTab : "overview";
    const nextWorkspaceTab =
      storedWorkspaceTab && workspaceTabs.has(storedWorkspaceTab)
        ? storedWorkspaceTab
        : "kanban";
    setActiveTab(nextTab);
    setActiveWorkspaceTab(nextWorkspaceTab);
  }, [id, loading]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    window.localStorage.setItem(`mentor-group:tab:${id}`, activeTab);
  }, [activeTab, id]);

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    window.localStorage.setItem(
      `mentor-group:workspaceTab:${id}`,
      activeWorkspaceTab,
    );
  }, [activeWorkspaceTab, id]);

  // Realtime: listen GroupStatusChanged và refetch nếu payload groupId trùng
  useEffect(() => {
    const handler = (payload) => {
      if (!payload || !payload.groupId) return;
      if (String(payload.groupId) !== String(id)) return;

      console.log("[GroupStatusChanged][mentor-view]", payload);
      const { action } = payload;
      if (
        action === "close_requested" ||
        action === "close_confirmed" ||
        action === "close_rejected"
      ) {
        fetchGroupDetail();
        message.info(
          action === "close_requested"
            ? t("closeGroupRequested") || "Close group requested"
            : action === "close_confirmed"
            ? t("closeGroupConfirmed") || "Close group confirmed"
            : t("closeGroupRejected") || "Close group rejected"
        );
      }
    };

    const unsubscribe = subscribeGroupStatus(handler);
    return () => {
      unsubscribe();
    };
  }, [id, fetchGroupDetail]);

  // Fetch group members (independent of workspace / board status)
  const fetchGroupMembers = useCallback(async () => {
    if (!id) return;
    try {
      const res = await GroupService.getListMembers(id);
      const membersRaw = Array.isArray(res?.data) ? res.data : [];

      const normalizedMembers = membersRaw.map((m) => {
        const email = m.email || "";
        const avatarFromApi =
          m.avatarUrl ||
          m.avatarURL ||
          m.avatar_url ||
          m.avatar ||
          m.imageUrl ||
          m.imageURL ||
          m.image_url ||
          m.photoURL ||
          m.photoUrl ||
          m.photo_url ||
          m.profileImage ||
          m.user?.avatarUrl ||
          m.user?.avatar ||
          m.user?.photoURL ||
          m.user?.photoUrl ||
          m.user?.imageUrl ||
          m.user?.profileImage ||
          "";

        const memberId =
          m.id || m.memberId || m.userId || m.userID || m.accountId || "";

        return {
          id: memberId,
          name: m.displayName || m.name || "",
          email,
          role: m.role || m.status || "",
          joinedAt: m.joinedAt,
          avatarUrl: avatarFromApi,
          assignedRoles: m.assignedRoles || [],
        };
      });

      setGroupMembersList(normalizedMembers);
    } catch (error) {
      console.error("Failed to fetch group members:", error);
      setGroupMembersList([]);
    }
  }, [id]);

  useEffect(() => {
    fetchGroupMembers();
  }, [fetchGroupMembers]);

  // Check mentor assignment after groupDetail is loaded
  useEffect(() => {
    if (groupDetail && userInfo?.email) {
      const mentors = Array.isArray(groupDetail?.mentors) ? groupDetail.mentors : [];
      if (mentors.length > 0) {
        const currentUserEmail = userInfo.email.toLowerCase();
        // Kiểm tra xem user hiện tại có trong danh sách mentors không
        const isAssignedMentor = mentors.some((mentor) => {
          const mentorEmail = (mentor.email || mentor.userEmail || "").toLowerCase();
          return mentorEmail === currentUserEmail;
        });
        
        if (!isAssignedMentor) {
          // Not the assigned mentor, redirect to my-groups
          navigate("/mentor/my-groups");
        }
      }
    }
  }, [groupDetail, userInfo, navigate]);

  const descriptionText = (groupDetail?.description || "").trim();
  const mentors = Array.isArray(groupDetail?.mentors) ? groupDetail.mentors : [];
  const mentor = mentors.length > 0 ? mentors[0] : null;

  const contributionStats = useMemo(() => {
    const memberMap = new Map();
    (groupMembersList || []).forEach((member) => {
      const key =
        member.id ||
        member.userId ||
        member.memberId ||
        member.accountId ||
        member.email;
      if (key) memberMap.set(String(key), member);
    });

    return (contributionScores || []).map((score) => {
      const member = memberMap.get(String(score.memberId)) || {};
      return {
        ...member,
        ...score,
        name:
          score.memberName ||
          member.displayName ||
          member.name ||
          "Unknown",
        avatarUrl: member.avatarUrl,
        email: member.email,
        role: member.role,
      };
    });
  }, [contributionScores, groupMembersList]);

  const isMentor = React.useMemo(() => {
    if (!userInfo?.email || mentors.length === 0) return false;
    const currentEmail = userInfo.email.toLowerCase();
    // Kiểm tra xem user hiện tại có trong danh sách mentors không
    return mentors.some((m) => {
      const mentorEmail = (m.email || m.userEmail || "").toLowerCase();
      return mentorEmail === currentEmail;
    });
  }, [mentors, userInfo]);

  const isPendingClose = () => {
    if (!groupStatus) return false;
    const statusLower = groupStatus.toLowerCase();
    return statusLower.includes("pending_close") || statusLower.includes("pending-close");
  };

  const handleCloseGroupClick = () => {
    setCloseGroupModalOpen(true);
  };

  const handleConfirmClose = async () => {
    if (!id) return;
    try {
      setCloseGroupLoading(true);
      await GroupService.confirmCloseGroup(id);
      message.success(t("closeGroupConfirmed") || "Group close request confirmed successfully");
      setCloseGroupModalOpen(false);
      await fetchGroupDetail();
    } catch (error) {
      console.error("Failed to confirm close group:", error);
      message.warning(
        error?.response?.data?.message ||
          t("failedToConfirmClose") ||
          "Failed to confirm close group"
      );
    } finally {
      setCloseGroupLoading(false);
    }
  };

  const handleRejectClose = async () => {
    if (!id) return;
    try {
      setCloseGroupLoading(true);
      await GroupService.rejectCloseGroup(id);
      message.success(t("closeGroupRejected") || "Group close request rejected successfully");
      setCloseGroupModalOpen(false);
      await fetchGroupDetail();
    } catch (error) {
      console.error("Failed to reject close group:", error);
      message.warning(
        error?.response?.data?.message ||
          t("failedToRejectClose") ||
          "Failed to reject close group"
      );
    } finally {
      setCloseGroupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen space-y-6 animate-fadeIn">
        {/* Breadcrumb Skeleton */}
        <Breadcrumb
          items={[
            {
              title: <Skeleton.Input active size="small" style={{ width: 100, height: 16 }} />,
            },
            {
              title: <Skeleton.Input active size="small" style={{ width: 150, height: 16 }} />,
            },
          ]}
        />

        {/* Tabs Skeleton */}
        <Card className="!bg-white !rounded-2xl !shadow-sm !p-6 !mt-4">
          {/* Tab Headers Skeleton */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton.Input key={i} active size="small" style={{ width: 100, height: 40 }} />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            {/* InfoCard Skeleton */}
            <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Skeleton.Input active size="large" style={{ width: "40%", height: 32, marginBottom: 12 }} />
                    <Skeleton.Input active size="small" style={{ width: "60%", height: 20, marginBottom: 16 }} />
                  </div>
                  <Skeleton.Button active size="small" style={{ width: 100, height: 36 }} />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Skeleton.Input active size="small" style={{ width: 120, height: 16 }} />
                  <Skeleton.Input active size="small" style={{ width: 150, height: 16 }} />
                  <Skeleton.Input active size="small" style={{ width: 100, height: 16 }} />
                  <Skeleton.Input active size="small" style={{ width: 130, height: 16 }} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton.Input active size="small" style={{ width: 80, height: 14 }} />
                    <Skeleton.Input active size="small" style={{ width: 40, height: 14 }} />
                  </div>
                  <Skeleton.Input active style={{ width: "100%", height: 8, borderRadius: 4 }} />
                </div>
              </div>
            </Card>

            {/* Grid Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - OverviewSection Skeleton */}
              <div className="lg:col-span-2 space-y-4">
                {/* Description Card */}
                <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={20} shape="square" />
                      <Skeleton.Input active size="small" style={{ width: 120, height: 20 }} />
                    </div>
                    <Skeleton paragraph={{ rows: 3, width: ["100%", "90%", "80%"] }} />
                  </div>
                </Card>

                {/* Recent Activity Card */}
                <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton.Avatar active size={20} shape="square" />
                        <Skeleton.Input active size="small" style={{ width: 140, height: 20 }} />
                      </div>
                      <Skeleton.Input active size="small" style={{ width: 60, height: 16 }} />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Skeleton.Avatar active size={10} shape="circle" />
                          <div className="flex-1 space-y-2">
                            <Skeleton.Input active style={{ width: "70%", height: 16 }} />
                            <Skeleton.Input active style={{ width: "50%", height: 14 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Technologies Card */}
                <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={20} shape="square" />
                      <Skeleton.Input active size="small" style={{ width: 120, height: 20 }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton.Input key={i} active size="small" style={{ width: 60 + i * 5, height: 28, borderRadius: 12 }} />
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column - MembersPanel Skeleton */}
              <div className="space-y-4">
                {/* Team Members Card */}
                <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton.Avatar active size={20} shape="square" />
                        <Skeleton.Input active size="small" style={{ width: 130, height: 20 }} />
                      </div>
                      <Skeleton.Input active size="small" style={{ width: 60, height: 16 }} />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between border border-gray-200 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <Skeleton.Avatar active size={40} shape="circle" />
                            <div className="space-y-2">
                              <Skeleton.Input active size="small" style={{ width: 100, height: 16 }} />
                              <Skeleton.Input active size="small" style={{ width: 60, height: 14 }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Mentor Card */}
                <Card className="!rounded-2xl !shadow-sm !border !border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={20} shape="square" />
                      <Skeleton.Input active size="small" style={{ width: 80, height: 20 }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton.Avatar active size={48} shape="circle" />
                      <div className="space-y-2">
                        <Skeleton.Input active size="small" style={{ width: 120, height: 18 }} />
                        <Skeleton.Input active size="small" style={{ width: 180, height: 14 }} />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const groupName = groupDetail?.name || `Group #${id}`;

  const hasKanbanData =
    filteredColumns && Object.keys(filteredColumns || {}).length > 0;

  const normalizeTitle = (value = "") =>
    value.toLowerCase().replace(/\s+/g, "_");

  // Build recent activity directly from kanban columns
  const tasks =
    filteredColumns && typeof filteredColumns === "object"
      ? Object.values(filteredColumns)
          .flatMap((col) => col || [])
          .filter(Boolean)
      : [];

  const recentActivity = tasks
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
    )
    .slice(0, 4);

  const statusMeta = {
    todo: { label: "To Do", dot: "bg-gray-300" },
    to_do: { label: "To Do", dot: "bg-gray-300" },
    inprogress: { label: "In Progress", dot: "bg-amber-400" },
    in_progress: { label: "In Progress", dot: "bg-amber-400" },
    doing: { label: "Doing", dot: "bg-amber-400" },
    done: { label: "Done", dot: "bg-green-500" },
    completed: { label: "Done", dot: "bg-green-500" },
    review: { label: "Review", dot: "bg-blue-400" },
  };

  const findAssignees = (task) => {
    const list = task?.assignees || task?.assignee || [];
    if (Array.isArray(list)) return list;
    if (typeof list === "string" || typeof list === "object") return [list];
    return [];
  };

  const renderAssignee = (assignee) => {
    const name =
      (assignee?.displayName ||
        assignee?.name ||
        assignee?.email ||
        assignee) ?? "";
    const initials = String(name || "U")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return { name, initials };
  };

  const overviewGroup = groupDetail
    ? {
        title: groupDetail.name || groupName,
        statusText: groupDetail.status,
        topicName:
          groupDetail.topic?.title ||
          groupDetail.topicTitle ||
          groupDetail.topicName,
        field: groupDetail.major?.majorName,
        maxMembers: groupDetail.maxMembers || 5,
        progress:
          typeof groupDetail.projectProgress === "number"
            ? groupDetail.projectProgress
            : 0,
        semester:
          groupDetail.semester &&
          `${groupDetail.semester.season || ""} ${
            groupDetail.semester.year || ""
          }`.trim(),
        end: groupDetail.semester?.endDate,
      }
    : null;

  const groupSkills = Array.isArray(groupDetail?.skills)
    ? groupDetail.skills
    : [];

  const boardForStats =
    filteredColumns && typeof filteredColumns === "object"
      ? {
          columns: Object.entries(filteredColumns).map(
            ([columnId, colTasks]) => ({
              id: columnId,
              tasks: colTasks || [],
            })
          ),
        }
      : null;

  const items = [
    {
      key: "overview",
      label: (
        <span>
          <BarChartOutlined /> {t("overview") || "Overview"}
        </span>
      ),
      children: (
        <div className="space-y-6">
          {overviewGroup && (
            <InfoCard
              group={overviewGroup}
              memberCount={
                groupDetail?.currentMembers || groupMembersList.length
              }
              onBack={undefined}
              onEdit={null}
              onSelectTopic={null}
              onActivate={null}
              onCloseGroup={isMentor && isPendingClose() ? handleCloseGroupClick : null}
              isLeader={false}
              isMentor={isMentor}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <OverviewSection
              descriptionText={descriptionText}
              recentActivity={recentActivity}
              statusMeta={statusMeta}
              findAssignees={findAssignees}
              renderAssignee={renderAssignee}
              groupSkills={groupSkills}
              t={t}
            />
            <MembersPanel
              groupMembers={groupMembersList}
              mentor={mentor}
              mentors={mentors}
              group={groupDetail}
              onInvite={null}
              onKickMember={null}
              onTransferLeader={null}
              currentUserEmail={userInfo?.email}
              t={t}
              showStats={false}
            />
          </div>
        </div>
      ),
    },
    {
      key: "contributions",
      label: (
        <span>
          <TeamOutlined /> {t("contributions") || "Contributions"}
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <MembersPanel
                groupMembers={groupMembersList}
                mentor={mentor}
                mentors={mentors}
                group={groupDetail}
                onInvite={null}
                onKickMember={null}
                onTransferLeader={null}
                currentUserEmail={userInfo?.email}
                t={t}
                showStats
                board={boardForStats}
                contributionStats={contributionStats}
                filtersContent={
                  <div className="!bg-white !rounded-2xl !border !border-gray-200 !p-4 !mb-6">
                    <div className="!flex !items-center !justify-between !mb-3">
                      <p className="!text-sm !font-semibold !text-gray-900">
                        {t("filters") || "Filters"}
                      </p>
                    </div>
                    <div className="!grid !grid-cols-1 lg:!grid-cols-[1.2fr_0.9fr_auto] !items-end !gap-3">
                      <div className="!grid !grid-cols-1 sm:!grid-cols-2 !gap-3">
                        <div className="!flex !flex-col">
                          <label className="!text-[11px] !font-semibold !text-gray-500 !uppercase !mb-1">
                            {t("from") || "From"}
                          </label>
                          <DatePicker
                            value={scoreFrom}
                            inputReadOnly
                            onChange={(value) => {
                              setScoreFrom(value);
                              updateScoreFilter(value, scoreTo);
                            }}
                            disabledDate={(current) =>
                              scoreTo &&
                              current &&
                              current > scoreTo.endOf("day")
                            }
                            className="!w-full"
                          />
                        </div>
                        <div className="!flex !flex-col">
                          <label className="!text-[11px] !font-semibold !text-gray-500 !uppercase !mb-1">
                            {t("to") || "To"}
                          </label>
                          <DatePicker
                            value={scoreTo}
                            inputReadOnly
                            onChange={(value) => {
                              setScoreTo(value);
                              updateScoreFilter(scoreFrom, value);
                            }}
                            disabledDate={(current) =>
                              scoreFrom &&
                              current &&
                              current < scoreFrom.startOf("day")
                            }
                            className="!w-full"
                          />
                        </div>
                      </div>
                      <div className="!flex !flex-col !gap-2">
                        <p className="!text-[11px] !font-semibold !text-gray-500 !uppercase">
                          {t("priority") || "Priority"}
                        </p>
                        <div className="!flex !flex-wrap !gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 text-xs font-semibold px-3 py-1">
                            {t("high") || "High"} {scoreHigh}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1">
                            {t("medium") || "Medium"} {scoreMedium}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
                            {t("low") || "Low"} {scoreLow}
                          </span>
                        </div>
                      </div>
                      <div className="!flex !items-center !gap-2 !justify-end">
                        <span className="text-xs text-gray-400">
                          {t("autoApply") || "Auto apply"}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "workspace",
      label: (
        <span>
          <AppstoreOutlined /> {t("workspace") || "Workspace"}
        </span>
      ),
      children: (
        <div className="space-y-4 px-2 sm:px-4 lg:px-6">
          <div className="flex gap-2 border-b border-gray-200">
            {[
              { key: "kanban", label: "Kanban" },
              { key: "backlog", label: "Backlog" },
              { key: "milestones", label: "Milestones" },
              { key: "reports", label: "Reports" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveWorkspaceTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeWorkspaceTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeWorkspaceTab === "kanban" && (
            <KanbanTab
              kanbanLoading={kanbanLoading}
              kanbanError={kanbanError}
              hasKanbanData={hasKanbanData}
              filteredColumns={filteredColumns}
              columnMeta={columnMeta}
              setSelectedTask={setSelectedTask}
              createTask={readOnlyWorkspace ? undefined : createTask}
              deleteColumn={readOnlyWorkspace ? undefined : deleteColumn}
              handleDragOver={readOnlyWorkspace ? () => {} : handleDragOver}
              handleDragEnd={readOnlyWorkspace ? () => {} : handleDragEnd}
              isColumnModalOpen={isColumnModalOpen}
              setIsColumnModalOpen={setIsColumnModalOpen}
              handleCreateColumn={(payload) =>
                readOnlyWorkspace ? null : createColumn(payload)
              }
              t={(key) => key}
              normalizeTitle={normalizeTitle}
              readOnly={readOnlyWorkspace}
            />
          )}

          {activeWorkspaceTab === "backlog" && (
            <BacklogTab
              groupId={id}
              columnMeta={columnMeta}
              groupMembers={groupMembers}
              onPromoteSuccess={() => refetchBoard({ showLoading: false })}
              readOnly={readOnlyWorkspace}
              groupStatus={groupStatus}
            />
          )}

          {activeWorkspaceTab === "milestones" && (
            <MilestonesTab groupId={id} readOnly={readOnlyWorkspace} groupStatus={groupStatus} />
          )}

          {activeWorkspaceTab === "reports" && (
            <ReportsTab groupId={id} groupStatus={groupStatus} />
          )}
        </div>
      ),
    },
    {
      key: "feedback",
      label: (
        <span>
          <FileTextOutlined /> {t("feedback") || "Feedback"}
        </span>
      ),
      children: (
        <div className="space-y-4">
          <FeedbackTab
            groupId={id}
            isMentor={true}
            isLeader={false}
            groupName={groupName}
            groupDetail={groupDetail}
          />
        </div>
      ),
    },
  ];

  return (
    <div className=" min-h-screen space-y-6 animate-fadeIn">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          {
            title: (
              <span
                className="cursor-pointer text-gray-500 hover:text-blue-600"
                onClick={() => navigate("/mentor/my-groups")}
              >
                <HomeOutlined /> My Groups
              </span>
            ),
          },
          {
            title: (
              <span className="font-semibold text-gray-700">{groupName}</span>
            ),
          },
        ]}
      />

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        type="line"
        className="!bg-white !rounded-2xl !shadow-sm !p-6 !mt-4 !mb-0 custom-tabs"
        tabBarStyle={{ marginBottom: 24, paddingInline: 16 }}
      />

      <TaskModal
        task={selectedTask}
        groupId={id}
        members={groupMembers}
        groupDetail={groupDetail}
        columnMeta={columnMeta}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={readOnlyWorkspace ? () => {} : updateTaskFields}
        onUpdateAssignees={
          readOnlyWorkspace
            ? () => {}
            : (taskId, assignees) => updateTaskAssignees(taskId, assignees)
        }
        onDeleteTask={readOnlyWorkspace ? undefined : deleteTask}
        onFetchComments={loadTaskComments}
        onAddComment={addTaskComment}
        onUpdateComment={updateTaskComment}
        onDeleteComment={deleteTaskComment}
        readOnly={readOnlyWorkspace}
      />

      {isMentor && isPendingClose() && (
        <CloseGroupModal
          open={closeGroupModalOpen}
          onClose={() => setCloseGroupModalOpen(false)}
          onConfirm={handleConfirmClose}
          onReject={handleRejectClose}
          role="mentor"
          status={groupStatus}
          loading={closeGroupLoading}
        />
      )}
    </div>
  );
}


import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../../hook/useTranslation";
import { useAuth } from "../../context/AuthContext";
import { BoardService } from "../../services/board.service";
import InfoCard from "../../components/common/my-group/InfoCard";
import AddMemberModal from "../../components/common/my-group/AddMemberModal";
import EditGroupModal from "../../components/common/my-group/EditGroupModal";
import CloseGroupModal from "../../components/common/my-group/CloseGroupModal";
import LoadingState from "../../components/common/LoadingState";
import {
  Plus,
  FolderKanban,
  ListTodo,
  Flag,
  BarChart3,
  Calendar,
  ClipboardList,
  UserPlus,
  Clock,
} from "lucide-react";
import { Modal, Form, Input, InputNumber, message, notification, DatePicker, Button, Tooltip } from "antd";
import dayjs from "dayjs";
import TaskModal from "../../components/common/kanban/TaskModal";
import useKanbanBoard from "../../hook/useKanbanBoard";
import SidebarNavigation from "../../components/common/my-group/SidebarNavigation";
import OverviewSection from "../../components/common/my-group/OverviewSection";
import MembersPanel from "../../components/common/my-group/MembersPanel";
import FilesPanel from "../../components/common/my-group/FilesPanel";
import GroupPostsTab from "../../components/common/my-group/GroupPostsTab";
import FeedbackTab from "../../components/common/my-group/FeedbackTab";
import KanbanTab from "../../components/common/workspace/KanbanTab";
import BacklogTab from "../../components/common/workspace/BacklogTab";
import MilestonesTab from "../../components/common/workspace/MilestonesTab";
import ReportsTab from "../../components/common/workspace/ReportsTab";
import ListView from "../../components/common/workspace/ListView";
import TimelineTab from "../../components/common/workspace/TimelineTab";
import { Pagination } from "../../components/common/forum/Pagination";
import { useGroupActivation } from "../../hook/useGroupActivation";
import { useGroupDetail } from "../../hook/useGroupDetail";
import { useGroupEditForm } from "../../hook/useGroupEditForm";
import { GroupService } from "../../services/group.service";
import { ReportService } from "../../services/report.service";
import { avatarFromEmail } from "../../utils/helpers";
import { subscribeGroupStatus } from "../../services/groupStatusHub";

export default function MyGroup() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const {
    group,
    setGroup,
    groupMembers,
    setGroupMembers,
    groupSkillsWithRole,
    groupFiles,
    loading,
    loadGroupFiles,
    fetchCompletionPercent,
    handleKickMember,
    handleTransferLeader,
    fetchGroupDetail,
  } = useGroupDetail({ groupId: id, t, userInfo });

  const [board, setBoard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("kanban");
  const [listFilterStatus, setListFilterStatus] = useState("All");
  const [listViewPage, setListViewPage] = useState(1);
  const [listViewPageSize, setListViewPageSize] = useState(10);
  const [listViewRawTasks, setListViewRawTasks] = useState([]);
  const [listViewTotal, setListViewTotal] = useState(0);
  const [listViewLoading, setListViewLoading] = useState(false);
  const [listViewError, setListViewError] = useState("");
  const [listViewIsServerPaged, setListViewIsServerPaged] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [closeGroupModalOpen, setCloseGroupModalOpen] = useState(false);
  const [closeGroupLoading, setCloseGroupLoading] = useState(false);
  const [contributionScores, setContributionScores] = useState([]);
  const [scoreFrom, setScoreFrom] = useState(dayjs());
  const [scoreTo, setScoreTo] = useState(dayjs());
  const [scoreHigh, setScoreHigh] = useState(5);
  const [scoreMedium, setScoreMedium] = useState(3);
  const [scoreLow, setScoreLow] = useState(1);

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnForm] = Form.useForm();

  const {
    editOpen,
    setEditOpen,
    editForm,
    editErrors,
    editSubmitting,
    availableSkills,
    skillsLoading,
    handleEditChange,
    handleSubmitEdit,
  } = useGroupEditForm({ group, groupMembers, userInfo, t, setGroup });

  const loadPendingInvitations = async () => {
    if (!id) return;
    try {
      setPendingLoading(true);
      // Gọi đúng API group-level: /groups/{id}/pending
      const res = await GroupService.getJoinRequests(id);
      const payload = res?.data;
      let list = [];
      if (Array.isArray(payload)) {
        list = payload;
      } else if (Array.isArray(payload?.data)) {
        list = payload.data;
      } else if (Array.isArray(payload?.items)) {
        list = payload.items;
      } else if (Array.isArray(res?.items)) {
        list = res.items;
      }

      const mentorInvites = list.filter(
        (x) => x.type === "mentor_invitation"
      );
      setPendingInvitations(mentorInvites);
    } catch {
      setPendingInvitations([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "files") {
      loadGroupFiles();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (activeTab === "invitations") {
      loadPendingInvitations();
    }
  }, [activeTab, id]);

  // Realtime close-group status: refresh group detail when mentor/leader acts
  useEffect(() => {
    const handler = (payload) => {
      if (!payload || !payload.groupId) return;
      if (String(payload.groupId) !== String(id)) return;

      console.log("[GroupStatusChanged][leader-view]", payload);

      const { action } = payload;
      if (
        action === "close_requested" ||
        action === "close_confirmed" ||
        action === "close_rejected"
      ) {
        fetchGroupDetail();
        message.info({
          content:
            action === "close_requested"
              ? t("closeGroupRequested") || "Close group requested"
              : action === "close_confirmed"
              ? t("closeGroupConfirmed") || "Close group confirmed"
              : t("closeGroupRejected") || "Close group rejected",
          duration: 3,
        });
      }
    };

    const unsubscribe = subscribeGroupStatus(handler);
    return () => unsubscribe();
  }, [id, fetchGroupDetail, t]);

  const handleAddMember = (user) => {
    setShowModal(false);
  };


  const {
    columns,
    filteredColumns,
    columnMeta,
    groupMembers: kanbanMembers,
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
    updateColumnPositionOptimistic,
  } = useKanbanBoard(id);

  const fetchContributionScores = async (range = {}) => {
    if (!id) return;
    try {
      const res = await ReportService.getContributionScores(id, range);
      const payload = res?.data ?? res;
      const members = Array.isArray(payload?.members) ? payload.members : [];
      setContributionScores(members);
    } catch {
      setContributionScores([]);
    }
  };

  useEffect(() => {
    if (filteredColumns) {
      const boardData = {
        columns: Object.entries(filteredColumns).map(([columnId, tasks]) => ({
          id: columnId,
          tasks: tasks || [],
        })),
      };
      setBoard(boardData);

      fetchCompletionPercent();
    }
  }, [filteredColumns]);

  useEffect(() => {
    fetchContributionScores({
      From: dayjs().format("YYYY-MM-DD"),
      To: dayjs().format("YYYY-MM-DD"),
      High: 5,
      Medium: 3,
      Low: 1,
    });
  }, [id]);

  const applyScoreFilter = () => {
    const params = {};
    if (scoreFrom) params.From = scoreFrom.format("YYYY-MM-DD");
    if (scoreTo) params.To = scoreTo.format("YYYY-MM-DD");
    if (Number.isFinite(scoreHigh)) params.High = scoreHigh;
    if (Number.isFinite(scoreMedium)) params.Medium = scoreMedium;
    if (Number.isFinite(scoreLow)) params.Low = scoreLow;
    fetchContributionScores(params);
  };

  const clearScoreFilter = () => {
    const today = dayjs();
    setScoreFrom(today);
    setScoreTo(today);
    setScoreHigh(5);
    setScoreMedium(3);
    setScoreLow(1);
    fetchContributionScores({
      From: today.format("YYYY-MM-DD"),
      To: today.format("YYYY-MM-DD"),
      High: 5,
      Medium: 3,
      Low: 1,
    });
  };

  const updateScoreFilter = (nextFrom, nextTo) => {
    const params = {};
    if (nextFrom) params.From = nextFrom.format("YYYY-MM-DD");
    if (nextTo) params.To = nextTo.format("YYYY-MM-DD");
    params.High = 5;
    params.Medium = 3;
    params.Low = 1;
    fetchContributionScores(params);
  };

  const normalizeTitle = (value = "") =>
    value.toLowerCase().replace(/\s+/g, "_");
  const normalizeKey = (value = "") =>
    (value || "").toString().trim().toLowerCase();
  const toApiStatusFilter = (value = "") => {
    const normalized = normalizeKey(value);
    if (!normalized || normalized === "all") return undefined;
    return normalized === "todo" ? "to_do" : normalized;
  };
  const normalizeAssignees = (assignees) => {
    const list = Array.isArray(assignees)
      ? assignees
      : assignees
      ? [assignees]
      : [];
    return list
      .map((assignee) => {
        if (!assignee) return null;
        const rawId =
          assignee.id ||
          assignee.userId ||
          assignee.memberId ||
          assignee.email ||
          assignee;
        const matched = (kanbanMembers || []).find(
          (member) =>
            normalizeKey(member.id) === normalizeKey(rawId) ||
            normalizeKey(member.userId) === normalizeKey(rawId) ||
            normalizeKey(member.email) === normalizeKey(rawId)
        );
        const fallbackName =
          assignee.name ||
          assignee.displayName ||
          assignee.fullName ||
          assignee.email ||
          rawId ||
          "";
        if (matched) {
          return {
            id: matched.id || rawId,
            name:
              matched.name ||
              matched.displayName ||
              matched.fullName ||
              fallbackName ||
              rawId ||
              "",
            email: matched.email || "",
            avatarUrl:
              matched.avatarUrl ||
              matched.avatarURL ||
              matched.photoUrl ||
              matched.photoURL ||
              "",
          };
        }
        return {
          id: rawId || fallbackName || "",
          name: fallbackName || rawId || "",
          email: assignee.email || "",
          avatarUrl:
            assignee.avatarUrl ||
            assignee.avatarURL ||
            assignee.photoUrl ||
            assignee.photoURL ||
            "",
        };
      })
      .filter((item) => item && (item.id || item.name));
  };
  const normalizeListTask = (task) => {
    if (!task) return null;
    const statusValue = task.status || task.columnId || task.state || "";
    const columnIdValue = task.columnId || statusValue || "";
    return {
      id: task.id || task.taskId || task._id,
      columnId: columnIdValue,
      title: task.title || task.name || "",
      description: task.description || "",
      priority: (task.priority || "").toLowerCase(),
      status: statusValue,
      dueDate:
        task.dueDate ||
        task.deadline ||
        task.targetDate ||
        task.endDate ||
        null,
      assignees: normalizeAssignees(
        task.assignees || task.assignee || task.members || []
      ),
      comments: task.comments || task.commentResponses || [],
    };
  };
  const parseListResponse = (response) => {
    const payload = response?.data ?? response;
    if (Array.isArray(payload?.columns)) {
      const items = payload.columns.flatMap((col) =>
        Array.isArray(col?.tasks) ? col.tasks : []
      );
      const total =
        payload?.page?.totalElements ||
        payload?.page?.totalItems ||
        payload?.totalItems ||
        payload?.total ||
        payload?.totalCount ||
        items.length;
      const totalNumber = Number(total) || items.length;
      const isServerPaged = totalNumber > items.length;
      return { items, total: totalNumber, fromColumns: true, isServerPaged };
    }
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.tasks)
      ? payload.tasks
      : [];
    const total =
      payload?.totalItems ||
      payload?.total ||
      payload?.totalCount ||
      payload?.page?.totalElements ||
      payload?.page?.totalItems ||
      payload?.meta?.total ||
      items.length;
    const totalNumber = Number(total) || items.length;
    const isServerPaged = totalNumber > items.length;
    return { items, total: totalNumber, fromColumns: false, isServerPaged };
  };
  const tasks =
    board?.columns?.flatMap((col) => col.tasks || [])?.filter(Boolean) || [];
  const sortedColumns = useMemo(
    () =>
      Object.entries(columnMeta || {}).sort(
        (a, b) => (a[1]?.position || 0) - (b[1]?.position || 0)
      ),
    [columnMeta]
  );
  const firstColumnId = useMemo(
    () => sortedColumns?.[0]?.[0] || Object.keys(columnMeta || {})[0] || null,
    [sortedColumns, columnMeta]
  );
  const listViewTasks = useMemo(() => {
    return (listViewRawTasks || [])
      .map((task) => normalizeListTask(task))
      .filter(Boolean);
  }, [listViewRawTasks, kanbanMembers]);
  const listViewAllTasks = useMemo(() => {
    return Object.entries(columns || {}).flatMap(([colId, tasksInCol]) =>
      (tasksInCol || [])
        .map((task) => normalizeListTask({ ...task, columnId: colId }))
        .filter(Boolean)
    );
  }, [columns, kanbanMembers]);
  const filterListViewTasks = useCallback((tasks) => {
    const normalizeStatusKey = (value = "") =>
      value.toString().toLowerCase().replace(/[\s_]+/g, "");
    const statusFilterKey = normalizeStatusKey(listFilterStatus);
    return tasks.filter((task) => {
      const effectiveStatus = normalizeStatusKey(
        columnMeta?.[task.columnId]?.title || task.status || task.columnId || ""
      );
      return (
        listFilterStatus === "All" ||
        effectiveStatus === statusFilterKey
      );
    });
  }, [listFilterStatus, columnMeta]);
  const listViewFilteredTasks = useMemo(() => {
    return filterListViewTasks(listViewTasks);
  }, [listViewTasks, filterListViewTasks]);
  const listViewFallbackFiltered = useMemo(() => {
    return filterListViewTasks(listViewAllTasks);
  }, [listViewAllTasks, filterListViewTasks]);
  const listViewTotalForPager = useMemo(() => {
    return listViewIsServerPaged
      ? listViewTotal
      : listViewFilteredTasks.length;
  }, [listViewIsServerPaged, listViewTotal, listViewFilteredTasks]);
  const listViewPagedTasks = useMemo(() => {
    if (listViewIsServerPaged) {
      if (listViewFilteredTasks.length <= listViewPageSize) {
        return listViewFilteredTasks;
      }
      return listViewFilteredTasks.slice(0, listViewPageSize);
    }
    const start = Math.max(0, (listViewPage - 1) * listViewPageSize);
    const end = start + listViewPageSize;
    return listViewFilteredTasks.slice(start, end);
  }, [
    listViewIsServerPaged,
    listViewFilteredTasks,
    listViewPage,
    listViewPageSize,
  ]);
  const statusOptions = useMemo(() => {
    const map = new Map();
    const addStatus = (raw) => {
      if (!raw) return;
      const key = normalizeTitle(raw);
      const canonical = key === "to_do" ? "todo" : key;
      if (!canonical) return;
      if (!map.has(canonical)) {
        map.set(canonical, canonical);
      }
    };
    Object.entries(columnMeta || {}).forEach(([colId, meta]) => {
      addStatus(meta?.title || colId);
    });
    Object.values(columns || {}).forEach((list) => {
      (list || []).forEach((task) => addStatus(task.status));
    });
    return Array.from(map.values());
  }, [columns, columnMeta]);
  const taskById = useMemo(() => {
    const map = new Map();
    Object.values(columns || {}).forEach((tasksInCol) => {
      (tasksInCol || []).forEach((task) => {
        if (task?.id) map.set(task.id, task);
      });
    });
    return map;
  }, [columns]);
  useEffect(() => {
    setListViewPage(1);
  }, [listFilterStatus, listViewPageSize, id]);
  useEffect(() => {
    if (activeWorkspaceTab !== "list" || !id) return;
    const fetchListViewTasks = async () => {
      setListViewLoading(true);
      setListViewError("");
      try {
        const params = {
          page: listViewPage,
          pageSize: listViewPageSize,
        };
        const apiStatus = toApiStatusFilter(listFilterStatus);
        if (apiStatus) params.status = apiStatus;
        const res = await BoardService.getBoard(id, params);
        const { items, total } = parseListResponse(res);
        const fallbackTotal = listViewFallbackFiltered.length;
        const totalNumber = Number.isFinite(Number(total)) ? Number(total) : 0;
        const resolvedTotal =
          totalNumber > items.length
            ? totalNumber
            : Math.max(items.length, fallbackTotal);
        setListViewRawTasks(items);
        setListViewTotal(resolvedTotal);
        setListViewIsServerPaged(resolvedTotal > items.length);
      } catch (err) {
        setListViewError(t("failedLoadTasks") || "Failed to load tasks.");
        setListViewRawTasks([]);
        setListViewTotal(0);
        setListViewIsServerPaged(false);
      } finally {
        setListViewLoading(false);
      }
    };
    fetchListViewTasks();
  }, [
    activeWorkspaceTab,
    id,
    listViewPage,
    listViewPageSize,
    listFilterStatus,
    listViewFallbackFiltered.length,
  ]);

  const recentActivity = tasks
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
    )
    .slice(0, 4);

  const descriptionText = (group?.description || "").trim();
  const mentors = Array.isArray(group?.mentors) ? group.mentors : [];
  const mentor = mentors.length > 0 ? mentors[0] : null;
  const isLeader = React.useMemo(() => {
    if (!userInfo?.email || !Array.isArray(groupMembers)) return false;
    const currentEmail = userInfo.email.toLowerCase();
    return groupMembers.some((m) => {
      const role = (m.role || m.status || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      return role === "leader" && email === currentEmail;
    });
  }, [groupMembers, userInfo]);

  const isMentor = React.useMemo(() => {
    if (!userInfo?.email || !mentor) return false;
    const currentEmail = userInfo.email.toLowerCase();
    const mentorEmail = (mentor.email || mentor.userEmail || "").toLowerCase();
    return mentorEmail === currentEmail;
  }, [mentor, userInfo]);

  const { canActivateGroup, handleActivateGroup } = useGroupActivation({
    group,
    groupMembers,
    t,
    id,
    setGroup,
  });

  const groupStatus = group?.status || "";
  const isActiveStatus = () => {
    const statusLower = groupStatus.toLowerCase();
    return statusLower.includes("active");
  };
  const isGroupClosed = () => {
    if (!groupStatus) return false;
    const statusLower = groupStatus.toLowerCase();
    // Only treat final CLOSED state as read-only; ignore pending close states
    if (
      statusLower.includes("pending_close") ||
      statusLower.includes("pending-close")
    ) {
      return false;
    }
    return statusLower.includes("closed");
  };
  const isReadOnly = isGroupClosed();
  const semesterStartDate =
    group?.semester?.startDate ||
    group?.semesterStartDate ||
    group?.startDate ||
    group?.start;
  const isInviteLockedBySemesterStart = useMemo(() => {
    if (!semesterStartDate) return false;
    const parsed = dayjs(semesterStartDate);
    return parsed.isValid() && parsed.isSame(dayjs(), "day");
  }, [semesterStartDate]);

  const handleCloseGroupClick = () => {
    setCloseGroupModalOpen(true);
  };

  const handleRequestClose = async () => {
    if (!id) return;
    try {
      setCloseGroupLoading(true);
      await GroupService.closeGroup(id);
      message.success(t("closeGroupRequested") || "Close group request sent successfully");
      setCloseGroupModalOpen(false);
      await fetchGroupDetail();
    } catch (error) {
      console.error("Failed to request close group:", error);
      message.warning(
        error?.response?.data?.message ||
          t("failedToRequestClose") ||
          "Failed to request close group"
      );
    } finally {
      setCloseGroupLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getFileExtension = (fileType) => {
    if (!fileType) return "";
    const parts = fileType.split("/");
    return parts.length > 1 ? parts[1].toUpperCase() : "";
  };

  const fileItems = (groupFiles || []).map((f, idx) => ({
    id: f.fileId || f.id || idx,
    name: f.fileName || f.name || `File ${idx + 1}`,
    description: f.description || f.fileName || f.name || `File ${idx + 1}`,
    owner: f.uploadedBy || f.owner || "Team",
    size: formatFileSize(f.fileSize || f.size),
    fileType: getFileExtension(f.fileType || f.type),
    url: f.fileUrl || f.downloadUrl || f.url || "#",
    date: f.createdAt ? new Date(f.createdAt) : null,
  }));

  const getMemberInitials = (name = "") => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/).slice(0, 2);
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  };

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
        assignee) ??
      "";
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

  const handleMentorInvitationAction = async (action, invite) => {
    if (!id || !invite?.id) return;
    try {
      if (action === "accept") {
        await GroupService.acceptJoinRequest(id, invite.id, {
          type: "mentor_invitation",
        });
      } else {
        await GroupService.rejectJoinRequest(id, invite.id, {
          type: "mentor_invitation",
        });
      }
      await loadPendingInvitations();
      await fetchGroupDetail();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to handle mentor invitation", error);
    }
  };

  const contributionStats = useMemo(() => {
    const memberMap = new Map();
    (groupMembers || []).forEach((member) => {
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
  }, [contributionScores, groupMembers]);

  const handleCreateColumn = () => {
    columnForm.validateFields().then((values) => {
      const positionValue = Number(values.position);
      
      // Validate position: must be a valid number >= 0 and <= 1000
      if (isNaN(positionValue) || positionValue < 0 || positionValue > 1000) {
        notification.info({
          message: t("validationError") || "Validation Error",
          description: t("positionMustBeValidNumber") || "Position must be a valid number between 0 and 1000.",
        });
        return;
      }
      
      const payload = {
        columnName: values.columnName,
        position: positionValue,
      };
      createColumn(payload);
      setIsColumnModalOpen(false);
      columnForm.resetFields();
    });
  };

  const hasKanbanData =
    filteredColumns && Object.keys(filteredColumns).length > 0;

  const handleQuickCreateTask = () => {
    if (!firstColumnId) return;
    createTask({
      columnId: firstColumnId,
      title: "New Task",
      description: "",
      priority: "medium",
      status: normalizeTitle(columnMeta?.[firstColumnId]?.title || "todo"),
      dueDate: null,
    });
  };
  const formatStatusLabel = (value = "") =>
    value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const handleOpenListTask = (task) => {
    if (!task) return;
    const fullTask = taskById.get(task.id);
    setSelectedTask(fullTask || task);
  };
  const handleMoveColumnLeft = async (columnId, columnMetaData = {}) => {
    // Lấy danh sách tất cả columns và sắp xếp theo position
    const sortedColumns = Object.entries(columnMeta || {})
      .map(([colId, meta]) => ({
        id: colId,
        position: meta?.position ?? 0,
        title: meta?.title || colId,
      }))
      .sort((a, b) => a.position - b.position);

    const currentIndex = sortedColumns.findIndex((col) => col.id === columnId);
    if (currentIndex <= 0) return; // Không thể di chuyển trái

    const currentColumn = sortedColumns[currentIndex];
    const leftColumn = sortedColumns[currentIndex - 1];

    // Optimistic update: swap positions immediately
    if (updateColumnPositionOptimistic) {
      updateColumnPositionOptimistic(
        columnId,
        leftColumn.position,
        leftColumn.id,
        currentColumn.position
      );
    }

    try {
      await Promise.all([
        BoardService.updateColumn(id, columnId, {
          position: leftColumn.position,
          columnName: columnMetaData?.title || currentColumn.title,
        }),
        BoardService.updateColumn(id, leftColumn.id, {
          position: currentColumn.position,
          columnName: leftColumn.title,
        }),
      ]);
      // Refresh để đảm bảo sync với server
      refetchBoard({ showLoading: false });
    } catch (err) {
      // Rollback nếu có lỗi
      if (updateColumnPositionOptimistic) {
        updateColumnPositionOptimistic(
          columnId,
          currentColumn.position,
          leftColumn.id,
          leftColumn.position
        );
      }
      // Error handling
    }
  };

  const handleMoveColumnRight = async (columnId, columnMetaData = {}) => {
    // Lấy danh sách tất cả columns và sắp xếp theo position
    const sortedColumns = Object.entries(columnMeta || {})
      .map(([colId, meta]) => ({
        id: colId,
        position: meta?.position ?? 0,
        title: meta?.title || colId,
      }))
      .sort((a, b) => a.position - b.position);

    const currentIndex = sortedColumns.findIndex((col) => col.id === columnId);
    if (currentIndex < 0 || currentIndex >= sortedColumns.length - 1) return; // Không thể di chuyển phải

    const currentColumn = sortedColumns[currentIndex];
    const rightColumn = sortedColumns[currentIndex + 1];

    // Optimistic update: swap positions immediately
    if (updateColumnPositionOptimistic) {
      updateColumnPositionOptimistic(
        columnId,
        rightColumn.position,
        rightColumn.id,
        currentColumn.position
      );
    }

    try {
      await Promise.all([
        BoardService.updateColumn(id, columnId, {
          position: rightColumn.position,
          columnName: columnMetaData?.title || currentColumn.title,
        }),
        BoardService.updateColumn(id, rightColumn.id, {
          position: currentColumn.position,
          columnName: rightColumn.title,
        }),
      ]);
      // Refresh để đảm bảo sync với server
      refetchBoard({ showLoading: false });
    } catch (err) {
      // Rollback nếu có lỗi
      if (updateColumnPositionOptimistic) {
        updateColumnPositionOptimistic(
          columnId,
          currentColumn.position,
          rightColumn.id,
          rightColumn.position
        );
      }
      // Error handling
    }
  };

  const tabs = React.useMemo(() => {
    const base = [
      { key: "overview", label: t("overview") || "Overview" },
      { key: "members", label: t("contributeScore") || "Contribute Score" },
    ];
    if (isLeader && !isReadOnly) {
      base.push({
        key: "invitations",
        label: t("groupInvitations") || "Invitations",
      });
    }
    base.push(
      { key: "workspace", label: t("workspace") || "Workspace" },
      { key: "feedback", label: t("feedback") || "Feedback" },
      { key: "posts", label: t("posts") || "Posts" },
      { key: "files", label: t("files") || "Files" }
    );
    return base;
  }, [isLeader, isReadOnly, t]);

  if (loading) {
    return (
      <LoadingState
        message={t("loading") || "Loading..."}
        subtext={t("fetchingGroupData") || "Fetching your group workspace."}
      />
    );
  }

  return (
    <>
    <div className="relative bg-[#f7fafc] min-h-screen flex overflow-hidden">
      {/* Sidebar Navigation - Full Height */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <SidebarNavigation
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={tabs}
          t={t}
        />
      </div>

      {/* Mobile Sidebar (overlay) */}
      <div className="lg:hidden">
        <SidebarNavigation
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={tabs}
          t={t}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto h-screen">
        <div className="px-2 sm:px-4 lg:px-6 xl:px-8 pt-20 pb-24">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Group Header - Only in Overview */}
              {group && (
                <InfoCard
                  group={group}
                  memberCount={groupMembers.length}
                  onBack={() => navigate(-1)}
                  onSelectTopic={
                    group.canEdit && !isReadOnly
                      ? () => navigate("/discover")
                      : null
                  }
                  onEdit={
                    group.canEdit && !isReadOnly ? () => setEditOpen(true) : null
                  }
                  onActivate={
                    !isReadOnly && canActivateGroup ? handleActivateGroup : null
                  }
                  onCloseGroup={
                    !isReadOnly && isLeader && isActiveStatus()
                      ? handleCloseGroupClick
                      : null
                  }
                  isLeader={isLeader}
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
                  groupSkills={groupSkillsWithRole}
                  t={t}
                />
                <MembersPanel
                  groupMembers={groupMembers}
                  mentor={mentor}
                  mentors={mentors}
                  group={group}
                  onInvite={isReadOnly || isInviteLockedBySemesterStart ? null : () => setShowModal(true)}
                  onKickMember={handleKickMember}
                  onTransferLeader={handleTransferLeader}
                  currentUserEmail={userInfo?.email}
                  t={t}
                  showStats={false}
                />
              </div>
            </div>
            )}

            {/* MEMBERS */}
            {activeTab === "members" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <MembersPanel
                    groupMembers={groupMembers}
                    mentor={mentor}
                    mentors={mentors}
                    group={group}
                    onInvite={isReadOnly || isInviteLockedBySemesterStart ? null : () => setShowModal(true)}
                    onKickMember={handleKickMember}
                    onTransferLeader={handleTransferLeader}
                    currentUserEmail={userInfo?.email}
                    t={t}
                    showStats
                    contributionStats={contributionStats}
                    board={board}
                    filtersContent={(
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
                                  scoreTo && current && current > scoreTo.endOf("day")
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
                                  scoreFrom && current && current < scoreFrom.startOf("day")
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
                    )}
                  />
                </div>
              </div>
            )}

            {/* INVITATIONS (Leader only) */}
            {activeTab === "invitations" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {t("mentorInvitationsTab") || "Mentor invitations"}
                    </h3> 
                    <p className="text-sm text-gray-500">
                      {t("mentorInvitationsEmpty") ||
                        "Review mentor invitations sent to your group."}
                    </p>
                  </div>
                </div>

                {pendingLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : pendingInvitations.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                    <Clock className="w-4 h-4" />
                    <span>
                      {t("mentorInvitationsEmpty") ||
                        "No mentor invitations pending for this group."}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-col md:flex-row md:items-center gap-4 border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={inv.avatarUrl || avatarFromEmail(inv.email, 80)}
                            alt={inv.displayName || inv.email}
                            className="w-12 h-12 rounded-full object-cover shadow"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {inv.displayName || inv.email}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {inv.email}
                            </p>
                            {inv.topicTitle && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {inv.topicTitle}
                              </p>
                            )}
                            {inv.message && (
                              <p className="text-xs text-gray-500 mt-1 italic truncate">
                                {inv.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3 md:ml-auto shrink-0 w-full md:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleMentorInvitationAction("accept", inv)
                            }
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-sm transition"
                          >
                            {t("accept") || "Accept"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMentorInvitationAction("reject", inv)
                            }
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition"
                          >
                            {t("reject") || "Reject"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WORKSPACE */}
            {activeTab === "workspace" && (
              <div className="pt-2 space-y-4">
                {/* Workspace Header */}
                <div className="flex flex-col gap-4 mb-20 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {t("workspace") || "Workspace"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-gray-500">
                      <div className="inline-flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-gray-400" />
                        <span>
                          {group.semester || group.semesterLabel || "-"}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {(t("due") || "Due")}: {group.end || "--"}
                        </span>
                      </div>
                      {group.status && (
                        <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                          {group.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    {/* Member Avatars */}
                    {groupMembers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {groupMembers.slice(0, 4).map((member) => {
                            const initials = getMemberInitials(
                              member.name || member.email
                            );
                            return (
                              <div
                                key={member.id}
                                className="relative h-9 w-9 rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-700 shadow-sm overflow-hidden"
                                title={member.name || member.email}
                              >
                                {member.avatarUrl ? (
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center">
                                    {initials}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {groupMembers.length > 4 && (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-xs font-semibold text-gray-600">
                              +{groupMembers.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Invite Members */}
                    {!isReadOnly && (
                      <Tooltip
                        title={
                          !isLeader
                            ? t("onlyLeaderCanInvite") || "Only leader can invite members"
                            : isInviteLockedBySemesterStart
                            ? t("inviteDisabledSemesterStart") ||
                              "Invitations are closed on the semester start date."
                            : ""
                        }
                      >
                        <button
                          onClick={() => setShowModal(true)}
                          disabled={!isLeader || isInviteLockedBySemesterStart}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                            isLeader && !isInviteLockedBySemesterStart
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <UserPlus className="w-4 h-4" />
                          {t("inviteMembers") || "Invite members"}
                        </button>
                      </Tooltip>
                    )}

                    {/* New Column (Kanban only) */}
                    {activeWorkspaceTab === "kanban" && !isReadOnly && (
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsColumnModalOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                        {t("newColumn") || "New Column"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setActiveWorkspaceTab("kanban")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "kanban"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FolderKanban className="w-4 h-4" />
                    {(t("kanban") || "Kanban").charAt(0).toUpperCase() +
                      (t("kanban") || "Kanban").slice(1)}
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("list")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "list"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    {(t("list") || "List").charAt(0).toUpperCase() +
                      (t("list") || "List").slice(1)}
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("backlog")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "backlog"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    {(t("backlog") || "Backlog").charAt(0).toUpperCase() +
                      (t("backlog") || "Backlog").slice(1)}
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("milestones")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "milestones"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    {(t("milestones") || "Milestones").charAt(0).toUpperCase() +
                      (t("milestones") || "Milestones").slice(1)}
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("timeline")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "timeline"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {(t("timelineTasks") || "Timeline").charAt(0).toUpperCase() +
                      (t("timelineTasks") || "Timeline").slice(1)}
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("reports")}
                    className={`flex items-center gap-2 px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeWorkspaceTab === "reports"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {(t("reports") || "Reports").charAt(0).toUpperCase() +
                      (t("reports") || "Reports").slice(1)}
                  </button>
                </div>

                {/* KANBAN SUB-TAB */}
                {activeWorkspaceTab === "kanban" && (
                  <KanbanTab
                    kanbanLoading={kanbanLoading}
                    kanbanError={kanbanError}
                    hasKanbanData={hasKanbanData}
                    filteredColumns={filteredColumns}
                    columnMeta={columnMeta}
                    setSelectedTask={setSelectedTask}
                    createTask={isReadOnly ? undefined : createTask}
                    deleteTask={isReadOnly ? undefined : deleteTask}
                    deleteColumn={isReadOnly ? undefined : deleteColumn}
                    moveColumnLeft={
                      isReadOnly ? undefined : handleMoveColumnLeft
                    }
                    moveColumnRight={
                      isReadOnly ? undefined : handleMoveColumnRight
                    }
                    handleDragOver={isReadOnly ? () => {} : handleDragOver}
                    handleDragEnd={isReadOnly ? () => {} : handleDragEnd}
                    isColumnModalOpen={isColumnModalOpen}
                    setIsColumnModalOpen={setIsColumnModalOpen}
                    handleCreateColumn={handleCreateColumn}
                    t={t}
                    normalizeTitle={normalizeTitle}
                    groupMembers={kanbanMembers}
                    readOnly={isReadOnly}
                  />
                )}

                  {activeWorkspaceTab === "list" && (
                    <div className="mt-2 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-gray-600">
                          {t("status") || "Status"}
                        </label>
                        <select
                          value={listFilterStatus}
                          onChange={(e) => setListFilterStatus(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
                        >
                          <option value="All">
                            {t("allStatuses") || "All statuses"}
                          </option>
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                        <div className="text-sm text-gray-500">
                          {listViewTotalForPager} tasks
                        </div>
                      </div>
                      <Pagination
                        page={listViewPage}
                        setPage={setListViewPage}
                        pageSize={listViewPageSize}
                        setPageSize={setListViewPageSize}
                        total={listViewTotalForPager}
                        showPager={false}
                      />
                      {listViewLoading ? (
                        <div className="text-sm text-gray-500">
                          {t("loading") || "Loading..."}
                        </div>
                      ) : listViewError ? (
                        <div className="text-sm text-red-500">
                          {listViewError}
                        </div>
                      ) : (
                        <>
                          <ListView
                            tasks={listViewPagedTasks}
                            columnMeta={columnMeta}
                            onOpenTask={handleOpenListTask}
                            onCreateTask={
                              isReadOnly ? undefined : handleQuickCreateTask
                            }
                            pageSize={listViewPageSize}
                            t={t}
                          />
                          <Pagination
                            page={listViewPage}
                            setPage={setListViewPage}
                            pageSize={listViewPageSize}
                            setPageSize={setListViewPageSize}
                            total={listViewTotalForPager}
                            showPageSize={false}
                          />
                        </>
                      )}
                    </div>
                  )}

                {/* BACKLOG SUB-TAB */}
                {activeWorkspaceTab === "backlog" && (
                  <BacklogTab
                    groupId={id}
                    columnMeta={columnMeta}
                    groupMembers={groupMembers}
                    onPromoteSuccess={() =>
                      refetchBoard({ showLoading: false })
                    }
                    readOnly={isReadOnly}
                    groupStatus={groupStatus}
                  />
                )}

                {/* MILESTONES SUB-TAB */}
                {activeWorkspaceTab === "milestones" && (
                  <MilestonesTab
                    groupId={id}
                    readOnly={isReadOnly}
                    groupStatus={groupStatus}
                  />
                )}

                {/* TIMELINE SUB-TAB */}
                {activeWorkspaceTab === "timeline" && (
                  <TimelineTab groupId={id} t={t} />
                )}

                {/* REPORTS SUB-TAB */}
                {activeWorkspaceTab === "reports" && (
                  <ReportsTab groupId={id} groupStatus={group?.status} />
                )}
              </div>
            )}

            {/* FILES */}
            {activeTab === "files" && (
              <FilesPanel
                fileItems={fileItems}
                t={t}
                groupId={id}
                onUploadSuccess={loadGroupFiles}
                readOnly={isReadOnly}
              />
            )}

            {/* FEEDBACK */}
            {activeTab === "feedback" && (
              <FeedbackTab
                groupId={id}
                isMentor={isMentor}
                isLeader={isLeader}
                groupName={group?.name || group?.title || ""}
                groupDetail={group}
              />
            )}

            {/* POSTS */}
            {activeTab === "posts" && (
              <GroupPostsTab groupId={id} groupData={group} />
            )}
        </div>
      </div>
    </div>

      {/* ---------------------
           MODALS
      ---------------------- */}
      <AddMemberModal
        open={showModal && !isReadOnly && !isInviteLockedBySemesterStart}
        onClose={() => setShowModal(false)}
        onAdd={handleAddMember}
        t={t}
      />

      <EditGroupModal
        open={editOpen}
        submitting={editSubmitting}
        form={editForm}
        errors={editErrors}
        memberCount={groupMembers.length}
        skills={availableSkills}
        skillsLoading={skillsLoading}
        onChange={handleEditChange}
        onSubmit={handleSubmitEdit}
        onClose={() => setEditOpen(false)}
        t={t}
      />

      {isLeader && isActiveStatus() && (
        <CloseGroupModal
          open={closeGroupModalOpen}
          onClose={() => setCloseGroupModalOpen(false)}
          onConfirm={handleRequestClose}
          role="leader"
          status={groupStatus}
          loading={closeGroupLoading}
        />
      )}

      <TaskModal
        task={selectedTask}
        groupId={id}
        columnMeta={columnMeta}
        members={kanbanMembers}
        groupDetail={group}
        onUpdateTask={isReadOnly ? () => {} : updateTaskFields}
        onUpdateAssignees={
          isReadOnly ? () => {} : updateTaskAssignees
        }
        onDeleteTask={isReadOnly ? undefined : deleteTask}
        onFetchComments={loadTaskComments}
        onAddComment={isReadOnly ? () => {} : addTaskComment}
        onUpdateComment={isReadOnly ? () => {} : updateTaskComment}
        onDeleteComment={isReadOnly ? () => {} : deleteTaskComment}
        onClose={() => setSelectedTask(null)}
        readOnly={isReadOnly}
      />

      {/* New Column Modal */}
      <Modal
        title={t("newColumn") || "New Column"}
        open={isColumnModalOpen}
        onOk={handleCreateColumn}
        onCancel={() => {
          setIsColumnModalOpen(false);
          columnForm.resetFields();
        }}
        okText={t("create") || "Create"}
        cancelText={t("cancel") || "Cancel"}
      >
        <Form form={columnForm} layout="vertical">
          <Form.Item
            name="columnName"
            label={t("columnName") || "Column Name"}
            rules={[
              {
                required: true,
                message:
                  t("pleaseEnterColumnName") || "Please enter column name",
              },
            ]}
          >
            <Input placeholder={t("enterColumnName") || "Enter column name"} />
          </Form.Item>
          <Form.Item
            name="position"
            label={t("position") || "Position"}
            initialValue={Object.keys(columnMeta || {}).length}
            rules={[
              {
                required: false,
                validator: (_, value) => {
                  if (value === undefined || value === null || value === "") {
                    return Promise.resolve();
                  }
                  const numValue = Number(value);
                  if (isNaN(numValue)) {
                    return Promise.reject(
                      new Error(t("positionMustBeNumber") || "Position must be a number")
                    );
                  }
                  if (numValue < 0) {
                    return Promise.reject(
                      new Error(t("positionMustBePositive") || "Position must be greater than or equal to 0")
                    );
                  }
                  if (numValue > 1000) {
                    return Promise.reject(
                      new Error(t("positionTooLarge") || "Position must be less than or equal to 1000")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0}
              max={1000}
              placeholder={String(Object.keys(columnMeta || {}).length)}
              className="w-full"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}







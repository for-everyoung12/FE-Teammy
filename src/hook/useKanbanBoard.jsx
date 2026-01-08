import { useEffect, useMemo, useState, useRef } from "react";
import {
  filterColumns,
  findColumnOfTask,
  moveTaskAcrossColumns,
} from "../utils/kanbanUtils";
import { BoardService } from "../services/board.service";
import { GroupService } from "../services/group.service";
import { notification } from "antd";
import { useTranslation } from "./useTranslation";

const extractPersonId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return (
    entity.id ||
    entity.userId ||
    entity.userID ||
    entity.memberId ||
    entity.memberID ||
    entity.user?.id ||
    entity.user?.userId ||
    entity.accountId ||
    entity.email ||
    ""
  );
};

const extractPersonName = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return (
    entity.displayName ||
    entity.name ||
    entity.fullName ||
    entity.user?.displayName ||
    entity.user?.name ||
    entity.email ||
    entity.username ||
    entity.id ||
    ""
  );
};

const normalizePersonEntity = (entity) => {
  const id = extractPersonId(entity);
  if (!id) return null;
  if (typeof entity === "string") {
    return {
      id,
      name: entity,
      email: "",
      avatarUrl: "",
    };
  }
  return {
    id,
    name: extractPersonName(entity),
    email: entity.email || entity.user?.email || "",
    avatarUrl:
      entity.avatarUrl ||
      entity.avatarURL ||
      entity.photoUrl ||
      entity.photoURL ||
      entity.user?.avatarUrl ||
      entity.user?.avatarURL ||
      "",
  };
};

const normalizePersonList = (list) => {
  if (!list) return [];
  const source = Array.isArray(list) ? list : [list];
  return source.map(normalizePersonEntity).filter(Boolean);
};

const mapAssigneesWithMembers = (assignees = [], members = []) => {
  if (!Array.isArray(assignees)) return [];
  return assignees.map((a) => {
    const id = extractPersonId(a);
    if (!id) return a;
    const matched =
      members.find(
        (m) =>
          normalizeKey(m.id) === normalizeKey(id) ||
          normalizeKey(m.userId) === normalizeKey(id) ||
          normalizeKey(m.email) === normalizeKey(id)
      ) || null;
    if (matched) {
      return {
        id: matched.id || id,
        name: extractPersonName(matched) || extractPersonName(a) || id,
        email: matched.email || matched.user?.email || "",
        avatarUrl:
          matched.avatarUrl ||
          matched.avatarURL ||
          matched.photoUrl ||
          matched.photoURL ||
          matched.user?.avatarUrl ||
          matched.user?.avatarURL ||
          "",
      };
    }
    return normalizePersonEntity(a) || { id, name: id, email: "", avatarUrl: "" };
  });
};

const normalizeCommentsList = (data) => {
  if (!data) return [];
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (Array.isArray(data?.data)) {
    list = data.data;
  } else if (Array.isArray(data?.items)) {
    list = data.items;
  } else if (Array.isArray(data?.results)) {
    list = data.results;
  }
  return list.map((comment, index) => ({
    id:
      comment.id ||
      comment.commentId ||
      comment._id ||
      `comment-${index}`,
    userId:
      comment.userId ||
      comment.ownerId ||
      comment.memberId ||
      comment.authorId ||
      comment.user?.id ||
      comment.user?.userId ||
      comment.user?.userID ||
      comment.createdById ||
      comment.createdBy ||
      "",
    content: comment.content || comment.text || "",
    displayName:
      comment.displayName ||
      comment.user?.displayName ||
      comment.user?.name ||
      comment.createdBy ||
      comment.author ||
      comment.userName ||
      "",
    createdBy:
      comment.createdBy ||
      comment.author ||
      comment.user?.displayName ||
      comment.user?.name ||
      comment.userName ||
      "",
    createdAt:
      comment.createdAt ||
      comment.created_at ||
      comment.when ||
      comment.updatedAt ||
      "",
    avatarUrl:
      comment.avatarUrl ||
      comment.avatarURL ||
      comment.authorAvatar ||
      comment.user?.avatarUrl ||
      comment.user?.avatarURL ||
      "",
    authorAvatar:
      comment.avatarUrl ||
      comment.avatarURL ||
      comment.authorAvatar ||
      comment.user?.avatarUrl ||
      comment.user?.avatarURL ||
      "",
  }));
};

const normalizeKey = (value) =>
  (value || "").toString().trim().toLowerCase();

const findMemberByUserId = (members = [], userId = "") => {
  if (!userId) return null;
  const key = normalizeKey(userId);
  return members.find((member) => {
    const candidates = [
      member.id,
      member.userId,
      member.userID,
      member.memberId,
      member.email,
    ];
    return candidates.some((candidate) => normalizeKey(candidate) === key);
  });
};

const enrichCommentsWithMembers = (comments = [], members = []) => {
  if (!Array.isArray(comments)) return [];
  return comments.map((comment) => {
    const member = findMemberByUserId(members, comment.userId);
    // Prioritize displayName and avatarUrl from comment data
    const displayName = comment.displayName || comment.createdBy || "";
    const avatarUrl = comment.avatarUrl || comment.authorAvatar || "";
    
    if (!member) {
      return {
        ...comment,
        displayName: displayName || comment.userId || "Unknown",
        createdBy: displayName || comment.userId || "Unknown",
        avatarUrl: avatarUrl,
        authorAvatar: avatarUrl,
      };
    }
    return {
      ...comment,
      displayName: displayName || 
        member.name ||
        member.displayName ||
        member.fullName ||
        member.email ||
        comment.userId ||
        "Unknown",
      createdBy: displayName ||
        member.name ||
        member.displayName ||
        member.fullName ||
        member.email ||
        comment.userId ||
        "Unknown",
      avatarUrl: avatarUrl || member.avatarUrl || "",
      authorAvatar: avatarUrl || member.avatarUrl || "",
      authorEmail: member.email || "",
    };
  });
};

const commentsMetaEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].createdBy !== b[i].createdBy ||
      (a[i].authorAvatar || "") !== (b[i].authorAvatar || "") ||
      (a[i].authorEmail || "") !== (b[i].authorEmail || "")
    ) {
      return false;
    }
  }
  return true;
};

export function useKanbanBoard(groupId, options = {}) {
  const { skipApiCalls = false, groupStatus } = options;
  const { t } = useTranslation();
  const [columns, setColumns] = useState({});
  const [columnMeta, setColumnMeta] = useState({});
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const commentsLoadedRef = useRef(false);
  const dragProcessingRef = useRef(false);
  const pendingMovesRef = useRef([]);

  const isGroupClosed = () => {
    if (skipApiCalls) return true;
    if (!groupStatus) return false;
    const statusLower = (groupStatus || "").toLowerCase();
    return statusLower.includes("closed");
  };

  const buildStateFromApi = (data) => {
    const normalizeStatusFromColumn = (value = "") =>
      value.toLowerCase().replace(/\s+/g, "_");
    const colState = {};
    const metaState = {};
    if (data?.columns && Array.isArray(data.columns)) {
      data.columns.forEach((col) => {
        const key = col.id || col.columnId || col.name || col.columnName;
        if (!key) return;
        const columnStatus =
          normalizeStatusFromColumn(col.columnName || col.name || key);
        const tasks = col.tasks || col.taskResponses || [];
        colState[key] = tasks.map((t) => ({
          id: t.id || t.taskId,
          columnId: key,
          title: t.title || "",
          description: t.description || "",
          priority: (t.priority || "").toLowerCase(),
          status: columnStatus || t.status || "",
          dueDate: t.dueDate || "",
          assignees: mapAssigneesWithMembers(
            normalizePersonList(t.assignees),
            groupMembers
          ),
          comments: enrichCommentsWithMembers(
            normalizeCommentsList(t.comments),
            groupMembers
          ),
        }));
        metaState[key] = {
          title: col.columnName || col.name || key,
          isDone: !!col.isDone,
          dueDate: col.dueDate || null,
          position: col.position || 0,
        };
      });
    }
    return { colState, metaState };
  };

  const fetchBoard = async ({ showLoading = true } = {}) => {
    if (!groupId || isGroupClosed()) return;
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await BoardService.getBoard(groupId);
      const { colState, metaState } = buildStateFromApi(res?.data || {});
      setColumns(colState);
      setColumnMeta(metaState);
    } catch (err) {

      setError("Failed to load board");
      setColumns({});
      setColumnMeta({});
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchGroupMembers = async () => {
    if (!groupId || isGroupClosed()) {
      setGroupMembers([]);
      return [];
    }
    try {
      const res = await GroupService.getListMembers(groupId);
      const payload = res?.data;
      let rawList = [];
      if (Array.isArray(payload)) {
        rawList = payload;
      } else if (Array.isArray(payload?.data)) {
        rawList = payload.data;
      } else if (Array.isArray(payload?.items)) {
        rawList = payload.items;
      } else if (Array.isArray(payload?.results)) {
        rawList = payload.results;
      }
      const normalized = normalizePersonList(rawList);
      setGroupMembers(normalized);
      return normalized;
    } catch (err) {

      setGroupMembers([]);
      return [];
    }
  };

  useEffect(() => {
    if (!groupId) {
      // Reset state when groupId is null
      setColumns({});
      setColumnMeta({});
      setGroupMembers([]);
      setSelectedTask(null);
      commentsLoadedRef.current = null;
      return;
    }
    
    // Skip API calls if group is closed
    if (isGroupClosed()) {
      setColumns({});
      setColumnMeta({});
      setGroupMembers([]);
      return;
    }
    
    // Only load if groupId changed
    if (commentsLoadedRef.current === groupId) return;
    
    commentsLoadedRef.current = groupId;
    fetchBoard();
    fetchGroupMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, skipApiCalls, groupStatus]);

  // Load comments only once after both columns and members are ready
  useEffect(() => {
    // Don't load comments if group is closed
    if (isGroupClosed()) return;
    
    const hasColumns = columns && typeof columns === "object" && Object.keys(columns).length > 0;
    const hasMembers = groupMembers && groupMembers.length > 0;
    const isCurrentGroup = commentsLoadedRef.current === groupId;
    
    if (hasColumns && hasMembers && isCurrentGroup && groupId) {
      // Use a flag to track if comments were already loaded for this data
      const columnsKey = JSON.stringify(Object.keys(columns).sort());
      if (commentsLoadedRef.columnsKey !== columnsKey) {
        commentsLoadedRef.columnsKey = columnsKey;
        loadAllTasksComments();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, groupMembers, groupId, skipApiCalls, groupStatus]);

  useEffect(() => {
    if (!groupMembers || groupMembers.length === 0) return;
    setColumns((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      let changed = false;
      const next = {};
      Object.entries(prev).forEach(([colId, tasks]) => {
        const updatedTasks = (tasks || []).map((task) => {
          const updatedComments = enrichCommentsWithMembers(
            task.comments || [],
            groupMembers
          );
          if (commentsMetaEqual(task.comments || [], updatedComments)) {
            return task;
          }
          changed = true;
          return { ...task, comments: updatedComments };
        });
        next[colId] = updatedTasks;
      });
      return changed ? next : prev;
    });
    setSelectedTask((prev) => {
      if (!prev) return prev;
      const updatedComments = enrichCommentsWithMembers(
        prev.comments || [],
        groupMembers
      );
      if (commentsMetaEqual(prev.comments || [], updatedComments)) {
        return prev;
      }
      return {
        ...prev,
        comments: updatedComments,
      };
    });
  }, [groupMembers]);

  const filteredColumns = useMemo(() => {
    if (!columns || typeof columns !== "object") return {};
    const ids = Object.keys(columns || {});
    return filterColumns(columns, search, filterStatus, filterPriority, ids);
  }, [columns, search, filterStatus, filterPriority]);

  const normalizeStatus = (value = "") =>
    value.toLowerCase().replace(/\s+/g, "_");

  const getStatusByColumnId = (columnId) => {
    if (!columnId) return "";
    return normalizeStatus(columnMeta?.[columnId]?.title || columnId);
  };

  const getColumnIdByStatus = (status) => {
    const target = normalizeStatus(status);
    const entry = Object.entries(columnMeta || {}).find(([id, meta]) => {
      const title = normalizeStatus(meta?.title || id);
      return title === target;
    });
    return entry?.[0] || null;
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    setColumns((prev) => {
      const ids = Object.keys(prev || {});
      return moveTaskAcrossColumns(prev, active.id, over.id, ids);
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;

    let newState = columns;
    const activeId = active.id;
    const overId = over.id;

    setColumns((prev) => {
      const ids = Object.keys(prev || {});
      const moved = moveTaskAcrossColumns(prev, activeId, overId, ids);
      const dynamicIds = Object.keys(moved || {});
      const toColCandidate =
        findColumnOfTask(moved, overId, dynamicIds) ||
        (dynamicIds.includes(overId)
          ? overId
          : findColumnOfTask(moved, activeId, dynamicIds));
      const targetStatus = getStatusByColumnId(toColCandidate);

      const nextState =
        toColCandidate && targetStatus
          ? {
              ...moved,
              [toColCandidate]: (moved[toColCandidate] || []).map((t) =>
                t.id === activeId
                  ? { ...t, status: targetStatus, columnId: toColCandidate }
                  : t
              ),
            }
          : moved;

      newState = nextState;
      return nextState;
    });

    const dynamicIds = Object.keys(newState || {});
    const toCol =
      findColumnOfTask(newState, overId, dynamicIds) ||
      (dynamicIds.includes(overId)
        ? overId
        : findColumnOfTask(newState, activeId, dynamicIds));

    if (!groupId || !toCol || !newState?.[toCol]) {
      return;
    }

    const ids = newState[toCol].map((t) => t.id);
    const index = ids.indexOf(activeId);
    const prevTaskId = index > 0 ? ids[index - 1] : null;
    const nextTaskId =
      index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

    const targetStatus = getStatusByColumnId(toCol);
    const movePayload = {
      taskId: activeId,
      columnId: toCol,
      prevTaskId,
      nextTaskId,
      targetStatus,
    };

    // Queue move requests: keep latest per task while one is in-flight
    if (dragProcessingRef.current) {
      const queue = pendingMovesRef.current || [];
      const nextQueue = queue.filter((item) => item.taskId !== movePayload.taskId);
      nextQueue.push(movePayload);
      pendingMovesRef.current = nextQueue;
      return;
    }
    pendingMovesRef.current = [];
    executeMove(movePayload);
  };

  const executeMove = async (payload) => {
    if (!groupId || !payload?.taskId || !payload?.columnId || isGroupClosed()) return;
    
    dragProcessingRef.current = true;
    try {
      // Build move payload - only include fields that have values
      const movePayload = {
        columnId: payload.columnId,
      };
      
      // Only include prevTaskId and nextTaskId if they have values (not null/undefined)
      if (payload.prevTaskId) {
        movePayload.prevTaskId = payload.prevTaskId;
      }
      if (payload.nextTaskId) {
        movePayload.nextTaskId = payload.nextTaskId;
      }
      
      // moveTask API handles position; updateTask keeps status in sync with column title.
      await BoardService.moveTask(groupId, payload.taskId, movePayload, {
        isLoading: false,
      });
      if (payload.targetStatus) {
        const snapshot = getTaskSnapshot(payload.taskId) || {};
        await BoardService.updateTask(
          groupId,
          payload.taskId,
          {
            title: snapshot.title || "Untitled task",
            description: snapshot.description || "",
            priority: snapshot.priority || "medium",
            status: payload.targetStatus,
            dueDate: snapshot.dueDate || null,
          },
          { isLoading: false }
        );
      }
    } catch (err) {
      console.error("Error moving task:", err);
      fetchBoard();
    } finally {
      dragProcessingRef.current = false;
      const queue = pendingMovesRef.current || [];
      const next = queue.shift();
      pendingMovesRef.current = queue;
      if (next) {
        executeMove(next);
      }
    }
  };

  const createColumn = async (payload) => {
    if (!groupId || isGroupClosed()) return;
    try {
      await BoardService.createColumn(groupId, payload);
      fetchBoard({ showLoading: false });
    } catch (err) {

    }
  };

  const deleteColumn = async (columnId) => {
    if (!groupId || !columnId || isGroupClosed()) return;
    try {
      await BoardService.deleteColumn(groupId, columnId);
      notification.success({
        message: t("columnDeletedSuccess") || "Column deleted successfully",
        duration: 2,
      });
      fetchBoard({ showLoading: false });
    } catch (err) {

    }
  };

  const createTask = async (payload) => {
    if (!groupId || isGroupClosed()) return;
    const tempId = `temp-${Date.now()}`;
    
    // Ensure groupMembers are loaded before processing assignees
    let membersToUse = groupMembers;
    if (groupMembers.length === 0) {
      membersToUse = await fetchGroupMembers();
    }
    
    // If payload.assignees is an array of IDs, map them to member objects
    let assigneeObjects = [];
    if (Array.isArray(payload.assignees) && payload.assignees.length > 0) {
      if (typeof payload.assignees[0] === 'string' || typeof payload.assignees[0] === 'number') {
        // It's an array of IDs, find the corresponding members
        assigneeObjects = payload.assignees
          .map(id => {
            const member = membersToUse.find(m => 
              normalizeKey(m.id) === normalizeKey(id) ||
              normalizeKey(m.userId) === normalizeKey(id) ||
              normalizeKey(m.email) === normalizeKey(id)
            );
            return member || { id: String(id), name: String(id), email: "", avatarUrl: "" };
          })
          .filter(Boolean);
      } else {
        // It's already an array of objects
        assigneeObjects = normalizePersonList(payload.assignees);
      }
    }
    
    const normalizedAssignees = mapAssigneesWithMembers(
      assigneeObjects,
      membersToUse
    );
    const normalizedDueDate = normalizeDueDate(payload.dueDate);
    const assigneeIds = normalizedAssignees.map((a) => a.id).filter(Boolean);
    const taskTitle = payload.title || "New Task";
    const optimisticTask = {
      id: tempId,
      columnId: payload.columnId,
      title: taskTitle,
      description: payload.description || "",
      priority: (payload.priority || "medium").toLowerCase(),
      status: payload.status || "todo",
      dueDate: normalizedDueDate,
      assignees: normalizedAssignees,
      comments: [],
    };
    setColumns((prev) => ({
      ...prev,
      [payload.columnId]: [...(prev[payload.columnId] || []), optimisticTask],
    }));
    try {
      const created = await BoardService.createTask(groupId, {
        ...payload,
        dueDate: normalizedDueDate,
        assigneeIds,
      });
      const createdTaskId =
        created?.data?.taskId ||
        created?.data?.id ||
        created?.taskId ||
        created?.id ||
        null;
      if (createdTaskId && assigneeIds.length > 0) {
        await BoardService.replaceTaskAssignees(groupId, createdTaskId, {
          userIds: assigneeIds,
        });
      }
      // Ensure groupMembers are loaded before fetching board to properly map assignees
      let finalMembers = membersToUse;
      if (groupMembers.length === 0) {
        finalMembers = await fetchGroupMembers();
      } else {
        finalMembers = groupMembers;
      }
      
      // Store assignee IDs to restore after fetchBoard if needed
      const savedAssigneeIds = assigneeIds;
      await fetchBoard({ showLoading: false });
      
      // After fetchBoard, find the newly created task and ensure assignees are set
      // The task will have a real ID now, find it by matching title and columnId
      if (savedAssigneeIds.length > 0) {
        // Use finalMembers which we know is the latest fetched members
        setColumns((prev) => {
          const targetColumn = prev[payload.columnId];
          if (!targetColumn || !Array.isArray(targetColumn)) return prev;
          
          // Find the task that was just created (likely the one with matching title in this column)
          // and check if it has missing assignees
          const newlyCreatedTask = targetColumn.find(
            t => t.title === taskTitle && 
                 t.columnId === payload.columnId &&
                 (!t.assignees || t.assignees.length === 0)
          );
          
          if (newlyCreatedTask) {
            // Map the saved assignee IDs to member objects
            const restoredAssignees = mapAssigneesWithMembers(
              savedAssigneeIds.map(id => ({ id: String(id) })),
              finalMembers
            );
            
            return {
              ...prev,
              [payload.columnId]: targetColumn.map(t =>
                t.id === newlyCreatedTask.id ? { ...t, assignees: restoredAssignees } : t
              ),
            };
          }
          return prev;
        });
        
        // Also update selectedTask if it's the newly created one
        setSelectedTask((prev) => {
          if (!prev || prev.title !== taskTitle || prev.columnId !== payload.columnId) return prev;
          if (prev.assignees && prev.assignees.length > 0) return prev;
          
          const restoredAssignees = mapAssigneesWithMembers(
            savedAssigneeIds.map(id => ({ id: String(id) })),
            finalMembers
          );
          return { ...prev, assignees: restoredAssignees };
        });
      }
    } catch (err) {
      // On error, remove optimistic task
      setColumns((prev) => {
        const colId = payload.columnId;
        if (!prev[colId]) return prev;
        return {
          ...prev,
          [colId]: prev[colId].filter((t) => t.id !== tempId),
        };
      });
    }
  };

  const patchTaskState = (taskId, updater) => {
    setColumns((prev) => {
      const ids = Object.keys(prev || {});
      const colId = findColumnOfTask(prev, taskId, ids);
      if (!colId) return prev;
      return {
        ...prev,
        [colId]: prev[colId].map((t) =>
          t.id === taskId ? { ...t, ...updater(t) } : t
        ),
      };
    });
    setSelectedTask((prev) => {
      if (!prev || prev.id !== taskId) return prev;
      return { ...prev, ...updater(prev) };
    });
  };

  const getTaskSnapshot = (taskId) => {
    const ids = Object.keys(columns || {});
    const colId = findColumnOfTask(columns, taskId, ids);
    if (!colId) return null;
    return columns[colId]?.find((t) => t.id === taskId) || null;
  };

  const normalizeDueDate = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      // If already ISO format, return as is
      if (trimmed.includes('T') || trimmed.includes('Z')) {
        return trimmed;
      }
      // Convert YYYY-MM-DD to ISO string
      const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return `${match[1]}T00:00:00.000Z`;
      }
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  const updateTaskFields = async (taskId, changes, options = {}) => {
    if (!groupId || !taskId || isGroupClosed()) return;
    const { skipMove = false } = options;
    const normalizedChanges = { ...changes };
    if ("dueDate" in normalizedChanges) {
      normalizedChanges.dueDate = normalizeDueDate(normalizedChanges.dueDate);
    }
    const snapshot = getTaskSnapshot(taskId) || {};

    const resolveStatusAndColumn = (statusValue, columnIdValue) => {
      let resolvedStatus = statusValue;
      let resolvedColumnId = columnIdValue;
      if (statusValue && columnMeta?.[statusValue]) {
        resolvedColumnId = statusValue;
        resolvedStatus = normalizeStatus(
          columnMeta[statusValue]?.title || statusValue
        );
      } else if (statusValue && !columnIdValue) {
        const inferredColumnId = getColumnIdByStatus(statusValue);
        if (inferredColumnId) {
          resolvedColumnId = inferredColumnId;
        }
      }
      if (!resolvedStatus && resolvedColumnId && columnMeta?.[resolvedColumnId]) {
        resolvedStatus = normalizeStatus(
          columnMeta[resolvedColumnId]?.title || resolvedColumnId
        );
      }
      return { resolvedStatus, resolvedColumnId };
    };

    if (normalizedChanges.status || normalizedChanges.columnId) {
      const { resolvedStatus, resolvedColumnId } = resolveStatusAndColumn(
        normalizedChanges.status,
        normalizedChanges.columnId
      );
      if (resolvedStatus) normalizedChanges.status = resolvedStatus;
      if (resolvedColumnId) normalizedChanges.columnId = resolvedColumnId;
    }
    
    patchTaskState(taskId, () => normalizedChanges);
    try {
      const { resolvedStatus, resolvedColumnId } = resolveStatusAndColumn(
        normalizedChanges.status || snapshot.status,
        normalizedChanges.columnId || snapshot.columnId
      );
      const statusToSend = resolvedStatus || "todo";
      const payloadChanges = { ...normalizedChanges, status: statusToSend };
      delete payloadChanges.columnId;
      await BoardService.updateTask(groupId, taskId, {
        title: snapshot.title || "Untitled task",
        description: snapshot.description || "",
        priority: snapshot.priority || "medium",
        status: statusToSend,
        dueDate: snapshot.dueDate || null,
        ...payloadChanges,
      });
      // Only trigger moveTaskToColumn if status changed and skipMove is false
      if (
        !skipMove &&
        normalizedChanges.status &&
        normalizedChanges.status !== snapshot.status
      ) {
        const targetColumnId =
          normalizedChanges.columnId || resolvedColumnId || normalizedChanges.status;
        if (targetColumnId && columns[targetColumnId] !== undefined) {
          moveTaskToColumn(taskId, targetColumnId);
        }
      }
    } catch (err) {

      fetchBoard({ showLoading: false });
    }
  };

  const updateTaskAssignees = async (taskId, userIds) => {
    if (!groupId || !taskId || isGroupClosed()) return;
    const normalizedAssignees = (userIds || [])
      .map((id) => {
        if (!id) return null;
        const member = groupMembers.find((m) => m.id === id);
        if (member) return member;
        return {
          id,
          name: id,
          email: "",
          avatarUrl: "",
        };
      })
      .filter(Boolean);
    patchTaskState(taskId, () => ({ assignees: normalizedAssignees }));
    try {
      await BoardService.replaceTaskAssignees(groupId, taskId, {
        userIds,
      });
    } catch (err) {

      fetchBoard({ showLoading: false });
    }
  };

  const moveTaskToColumn = async (taskId, targetColumnId) => {
    if (!groupId || !taskId || !targetColumnId) return;
    let newState = columns;
    setColumns((prev) => {
      const ids = Object.keys(prev || {});
      const fromCol = findColumnOfTask(prev, taskId, ids);
      if (!fromCol || fromCol === targetColumnId) return prev;
      const task = prev[fromCol]?.find((t) => t.id === taskId);
      if (!task) return prev;
      const updatedFrom = prev[fromCol].filter((t) => t.id !== taskId);
      const updatedTo = [...(prev[targetColumnId] || []), { ...task, columnId: targetColumnId }];
      newState = {
        ...prev,
        [fromCol]: updatedFrom,
        [targetColumnId]: updatedTo,
      };
      return newState;
    });
    
    // Update selectedTask if it's the moved task
    setSelectedTask((prev) => {
      if (!prev || prev.id !== taskId) return prev;
      return { ...prev, columnId: targetColumnId };
    });
    
    const targetList = newState?.[targetColumnId] || [];
    const prevTaskId =
      targetList.length > 1 ? targetList[targetList.length - 2].id : null;
    
    try {
      // API moveTask already handles status update based on column, no need to call updateTaskFields
      await BoardService.moveTask(groupId, taskId, {
        columnId: targetColumnId,
        prevTaskId,
        nextTaskId: null,
      });
    } catch (err) {

      fetchBoard({ showLoading: false });
    }
  };

  const deleteTask = async (taskId) => {
    if (!groupId || !taskId || isGroupClosed()) return;
    setColumns((prev) => {
      const ids = Object.keys(prev || {});
      const colId = findColumnOfTask(prev, taskId, ids);
      if (!colId) return prev;
      return {
        ...prev,
        [colId]: prev[colId].filter((t) => t.id !== taskId),
      };
    });
    try {
      await BoardService.deleteTask(groupId, taskId);
      notification.success({
        message: t("taskDeletedSuccess") || "Task deleted successfully",
        duration: 2,
      });
    } catch (err) {

      fetchBoard({ showLoading: false });
    }
  };

  const loadTaskComments = async (taskId) => {
    if (!groupId || !taskId || isGroupClosed()) return [];
    try {
      const res = await BoardService.getTaskComments(groupId, taskId);
      const comments = enrichCommentsWithMembers(
        normalizeCommentsList(res?.data),
        groupMembers
      );
      patchTaskState(taskId, () => ({ comments }));
      return comments;
    } catch (err) {

      return [];
    }
  };

  const loadAllTasksComments = async () => {
    if (!groupId || isGroupClosed()) return;
    
    const taskIds = [];
    
    Object.values(columns).forEach((tasks) => {
      if (Array.isArray(tasks)) {
        tasks.forEach((task) => {
          if (task?.id && !task?.id?.startsWith('temp-')) {
            taskIds.push(task.id);
          }
        });
      }
    });
    
    if (taskIds.length > 0) {
      try {
        await Promise.all(
          taskIds.map((taskId) =>
            loadTaskComments(taskId).catch((err) => {

              return [];
            })
          )
        );
      } catch (err) {

      }
    }
  };

  const addTaskComment = async (taskId, content) => {
    if (!groupId || !taskId || isGroupClosed()) return;
    const trimmed = (content || "").trim();
    if (!trimmed) return;
    const tempComment = {
      id: `temp-comment-${Date.now()}`,
      content: trimmed,
      createdAt: new Date().toISOString(),
      createdBy: "You",
    };
    patchTaskState(taskId, (task) => ({
      comments: [...(task.comments || []), tempComment],
    }));
    try {
      await BoardService.createTaskComment(groupId, taskId, {
        content: trimmed,
      });
      await loadTaskComments(taskId);
    } catch (err) {

      patchTaskState(taskId, (task) => ({
        comments: (task.comments || []).filter(
          (comment) => comment.id !== tempComment.id
        ),
      }));
    }
  };

  const updateTaskComment = async (taskId, commentId, content) => {
    if (!groupId || !taskId || !commentId || isGroupClosed()) return;
    const trimmed = (content || "").trim();
    if (!trimmed) return;
    patchTaskState(taskId, (task) => ({
      comments: (task.comments || []).map((comment) =>
        comment.id === commentId ? { ...comment, content: trimmed } : comment
      ),
    }));
    try {
      await BoardService.updateTaskComment(groupId, commentId, {
        content: trimmed,
      });
    } catch (err) {

      await loadTaskComments(taskId);
    }
  };

  const deleteTaskComment = async (taskId, commentId) => {
    if (!groupId || !taskId || !commentId || isGroupClosed()) return;
    const snapshot = getTaskSnapshot(taskId);
    patchTaskState(taskId, (task) => ({
      comments: (task.comments || []).filter(
        (comment) => comment.id !== commentId
      ),
    }));
    try {
      await BoardService.deleteTaskComment(groupId, commentId);
    } catch (err) {

      patchTaskState(taskId, () => ({
        comments: snapshot?.comments || [],
      }));
    }
  };

  const updateColumnPositionOptimistic = (columnId, newPosition, swapColumnId, swapPosition) => {
    setColumnMeta((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const updated = { ...prev };
      if (updated[columnId]) {
        updated[columnId] = { ...updated[columnId], position: newPosition };
      }
      if (swapColumnId && updated[swapColumnId]) {
        updated[swapColumnId] = { ...updated[swapColumnId], position: swapPosition };
      }
      return updated;
    });
  };

  return {
    columns,
    columnMeta,
    filteredColumns,
    loading,
    error,
    selectedTask,
    setSelectedTask,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    handleDragOver,
    handleDragEnd,
    createColumn,
    createTask,
    updateTaskFields,
    updateTaskAssignees,
    deleteTask,
    deleteColumn,
    refetchBoard: fetchBoard,
    groupMembers,
    loadTaskComments,
    loadAllTasksComments,
    addTaskComment,
    updateTaskComment,
    deleteTaskComment,
    updateColumnPositionOptimistic,
  };
}

export default useKanbanBoard;

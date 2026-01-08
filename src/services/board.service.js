import { BaseService } from "../config/basic.service";
import { API } from "../consts/path.api";

export const BoardService = {
  getBoard(groupId, params = {}) {
    return BaseService.get({
      url: API.BOARD.DETAIL(groupId),
      params,
      isLoading: true,
    });
  },

  createColumn(groupId, payload) {
    return BaseService.post({
      url: API.BOARD.CREATE_COLUMN(groupId),
      payload,
      isLoading: true,
    });
  },

  updateColumn(groupId, columnId, payload) {
    return BaseService.put({
      url: API.BOARD.UPDATE_COLUMN(groupId, columnId),
      payload,
      isLoading: true,
    });
  },

  deleteColumn(groupId, columnId) {
    return BaseService.remove({
      url: API.BOARD.DELETE_COLUMN(groupId, columnId),
      isLoading: true,
    });
  },

  createTask(groupId, payload) {
    return BaseService.post({
      url: API.BOARD.CREATE_TASK(groupId),
      payload,
      isLoading: true,
    });
  },

  updateTask(groupId, taskId, payload, options = {}) {
    return BaseService.put({
      url: API.BOARD.UPDATE_TASK(groupId, taskId),
      payload,
      isLoading: options.isLoading ?? true,
    });
  },

  deleteTask(groupId, taskId) {
    return BaseService.remove({
      url: API.BOARD.DELETE_TASK(groupId, taskId),
      isLoading: true,
    });
  },

  moveTask(groupId, taskId, payload, options = {}) {
    // API expects columnId, prevTaskId, nextTaskId directly (not wrapped in req)
    const requestPayload = {
      columnId: payload.columnId,
    };
    
    // Only include prevTaskId and nextTaskId if they have values (not null/undefined)
    if (payload.prevTaskId) {
      requestPayload.prevTaskId = payload.prevTaskId;
    }
    if (payload.nextTaskId) {
      requestPayload.nextTaskId = payload.nextTaskId;
    }
    
    return BaseService.post({
      url: API.BOARD.MOVE_TASK(groupId, taskId),
      payload: requestPayload,
      isLoading: options.isLoading ?? true,
    });
  },

  replaceTaskAssignees(groupId, taskId, payload) {
    return BaseService.put({
      url: API.BOARD.REPLACE_ASSIGNEES(groupId, taskId),
      payload,
      isLoading: true,
    });
  },

  getTaskComments(groupId, taskId, isLoading = true) {
    return BaseService.get({
      url: API.BOARD.LIST_COMMENTS(groupId, taskId),
      isLoading,
    });
  },

  createTaskComment(groupId, taskId, payload) {
    return BaseService.post({
      url: API.BOARD.CREATE_COMMENT(groupId, taskId),
      payload,
      isLoading: true,
    });
  },

  updateTaskComment(groupId, commentId, payload) {
    return BaseService.put({
      url: API.BOARD.UPDATE_COMMENT(groupId, commentId),
      payload,
      isLoading: true,
    });
  },

  deleteTaskComment(groupId, commentId) {
    return BaseService.remove({
      url: API.BOARD.DELETE_COMMENT(groupId, commentId),
      isLoading: true,
    });
  },

  getGroupFiles(groupId) {
    return BaseService.get({
      url: API.BOARD.GROUP_FILES(groupId),
      isLoading: true,
    });
  },

  getTaskFiles(groupId, taskId) {
    return BaseService.get({
      url: API.BOARD.TASK_FILES(groupId, taskId),
      isLoading: true,
    });
  },

  uploadTaskFile(groupId, taskId, formData) {
    return BaseService.post({
      url: API.BOARD.UPLOAD_FILE(groupId),
      payload: formData,
      isLoading: true,
    });
  },

  deleteTaskFile(groupId, taskId, fileId) {
    return BaseService.remove({
      url: API.BOARD.DELETE_FILE(groupId, fileId),
      isLoading: true,
    });
  },

  uploadGroupFile(groupId, payload) {
    return BaseService.post({
      url: API.BOARD.UPLOAD_FILE(groupId),
      payload,
      isLoading: true,
    });
  },

  deleteGroupFile(groupId, fileId) {
    return BaseService.remove({
      url: API.BOARD.DELETE_FILE(groupId, fileId),
      isLoading: true,
    });
  },
};

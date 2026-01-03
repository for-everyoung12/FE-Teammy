import { BaseService } from "../config/basic.service";
import { API } from "../consts/path.api";

export const AdminService = {
    getListUsers(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.LIST_USERS,
      params,
      isLoading,
    });
  },

  validateImportUsers(payload, isLoading = true) {
    return BaseService.post({
      url: API.ADMIN.VALIDATE_IMPORT,
      payload: { rows: payload },
      isLoading,
    });
  },


  importUsers(file, isLoading = true) {
    const form = new FormData();
    form.append("file", file);

    return BaseService.post({
      url: API.ADMIN.IMPORT_USERS,           
      payload: form,
      isLoading,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },


  banUser(userId, isLoading = true) {
    return BaseService.remove({
      url: API.ADMIN.BAN_USER(userId),
      isLoading,
    });
  },


  detailUser(userId, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.DETAIL_USER(userId),
      isLoading,
    });
  },

  createUser(payload = {}, isLoading = true) {
    return BaseService.post({
      url: API.ADMIN.CREATE_USER,
      payload,
      isLoading,
    });
  },


  updateUser(userId, payload = {}, isLoading = true) {
    return BaseService.put({
      url: API.ADMIN.UPDATE_USER(userId),
      payload,
      isLoading,
    });
  },


  downloadUsersTemplate(isLoading = false) {
    return BaseService.get({
      url: API.ADMIN.EXPORT_USERS,            
      isLoading,
      responseType: "blob",
    });
  },

  getDashboardStats(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.DASHBOARD,
      params,
      isLoading,
    });
  },
  getActivityLogs(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.ACTIVITY_LOGS,
      params,
      isLoading,
    });
  },
  getMajorStats(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.MAJOR_STATS,
      params,
      isLoading,
    });
  },
  exportReport(payload, isLoading = true) {
    return BaseService.post({
      url: API.REPORT.EXPORT,
      payload,
      isLoading,
      responseType: "blob", 
    });
  },
    getReportOptions(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.REPORT.OPTIONS,
      params,
      isLoading,
    });
  },
    getDashboardModerator(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.DASHBOARD_MODERATOR,
      params,
      isLoading,
    });
  },
  getPlanningOverview(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.ADMIN.PLANNING_OVERVIEW,
      params,
      isLoading,
    });
  },
  createAnnouncement(payload = {}, isLoading = true) {
  return BaseService.post({
    url: API.ADMIN.CREATE_ANNOUNCEMENT,
    payload,
    isLoading,
  });
},

  getPositions(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.POSITIONS.LIST,
      params,
      isLoading,
    });
  },

  createPosition(payload = {}, isLoading = true) {
    return BaseService.post({
      url: API.POSITIONS.CREATE,
      payload,
      isLoading,
    });
  },

  updatePosition(positionId, payload = {}, isLoading = true) {
    return BaseService.put({
      url: API.POSITIONS.UPDATE(positionId),
      payload,
      isLoading,
    });
  },

  deletePosition(positionId, isLoading = true) {
    return BaseService.remove({
      url: API.POSITIONS.DELETE(positionId),
      isLoading,
    });
  },

  downloadPositionsTemplate(isLoading = false) {
    return BaseService.get({
      url: API.POSITIONS.TEMPLATE,
      isLoading,
      responseType: "blob",
    });
  },

  importPositions(file, isLoading = true) {
    const form = new FormData();
    form.append("file", file);

    return BaseService.post({
      url: API.POSITIONS.IMPORT,
      payload: form,
      isLoading,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getSkills(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.SKILLS.LIST,
      params,
      isLoading,
    });
  },

  createSkill(payload = {}, isLoading = true) {
    return BaseService.post({
      url: API.SKILLS.CREATE,
      payload,
      isLoading,
    });
  },

  detailSkill(token, isLoading = true) {
    return BaseService.get({
      url: API.SKILLS.DETAIL(token),
      isLoading,
    });
  },

  updateSkill(token, payload = {}, isLoading = true) {
    return BaseService.put({
      url: API.SKILLS.UPDATE(token),
      payload,
      isLoading,
    });
  },

  deleteSkill(token, isLoading = true) {
    return BaseService.remove({
      url: API.SKILLS.DELETE(token),
      isLoading,
    });
  },

  downloadSkillsTemplate(isLoading = false) {
    return BaseService.get({
      url: API.SKILLS.TEMPLATE,
      isLoading,
      responseType: "blob",
    });
  },

  importSkills(file, isLoading = true) {
    const form = new FormData();
    form.append("file", file);

    return BaseService.post({
      url: API.SKILLS.IMPORT,
      payload: form,
      isLoading,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getMajors(params = {}, isLoading = true) {
    return BaseService.get({
      url: API.MAJORS.LIST,
      params,
      isLoading,
    });
  },

  createMajor(payload = {}, isLoading = true) {
    return BaseService.post({
      url: API.MAJORS.CREATE,
      payload,
      isLoading,
    });
  },

  detailMajor(majorId, isLoading = true) {
    return BaseService.get({
      url: API.MAJORS.DETAIL(majorId),
      isLoading,
    });
  },

  updateMajor(majorId, payload = {}, isLoading = true) {
    return BaseService.put({
      url: API.MAJORS.UPDATE(majorId),
      payload,
      isLoading,
    });
  },

  deleteMajor(majorId, isLoading = true) {
    return BaseService.remove({
      url: API.MAJORS.DELETE(majorId),
      isLoading,
    });
  },

  downloadMajorsTemplate(isLoading = false) {
    return BaseService.get({
      url: API.MAJORS.TEMPLATE,
      isLoading,
      responseType: "blob",
    });
  },

  importMajors(file, isLoading = true) {
    const form = new FormData();
    form.append("file", file);

    return BaseService.post({
      url: API.MAJORS.IMPORT,
      payload: form,
      isLoading,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

import { BaseService } from "../config/basic.service";
import { API } from "../consts/path.api";

export const MilestoneService = {
  list(groupId, params = {}) {
    return BaseService.get({
      url: API.MILESTONES.LIST(groupId),
      params,
      isLoading: true,
    });
  },

  create(groupId, payload = {}) {
    return BaseService.post({
      url: API.MILESTONES.CREATE(groupId),
      payload,
      isLoading: true,
    });
  },

  update(groupId, milestoneId, payload = {}) {
    return BaseService.put({
      url: API.MILESTONES.UPDATE(groupId, milestoneId),
      payload,
      isLoading: true,
    });
  },

  remove(groupId, milestoneId) {
    return BaseService.remove({
      url: API.MILESTONES.DELETE(groupId, milestoneId),
      isLoading: true,
    });
  },

  assignBacklogItems(groupId, milestoneId, backlogItemIds = []) {
    return BaseService.post({
      url: API.MILESTONES.ASSIGN_ITEMS(groupId, milestoneId),
      payload: { backlogItemIds },
      isLoading: true,
    });
  },

  removeBacklogItem(groupId, milestoneId, backlogItemId) {
    return BaseService.remove({
      url: API.MILESTONES.REMOVE_ITEM(groupId, milestoneId, backlogItemId),
      isLoading: true,
    });
  },

  getOverdueActions(groupId, milestoneId) {
    return BaseService.get({
      url: `/groups/${groupId}/tracking/milestones/${milestoneId}/overdue-actions`,
      isLoading: true,
    });
  },

  extendMilestone(groupId, milestoneId, payload = {}) {
    return BaseService.post({
      url: `/groups/${groupId}/tracking/milestones/${milestoneId}/extend`,
      payload,
      isLoading: true,
    });
  },

  moveMilestoneItems(groupId, milestoneId, payload = {}) {
    return BaseService.post({
      url: `/groups/${groupId}/tracking/milestones/${milestoneId}/move-tasks`,
      payload,
      isLoading: true,
    });
  },

  getTimelineMilestones(groupId, startDate, endDate) {
    return BaseService.get({
      url: `/groups/${groupId}/tracking/timeline`,
      params: { startDate, endDate },
      isLoading: true,
    });
  },
};

import { BaseService } from "../config/basic.service";
import { API } from "../consts/path.api";

export const AiService = {
  getRecruitmentPostSuggestions(payload) {
    return BaseService.post({
      url: API.AI.RECRUITMENT_POST_SUGGESTIONS,
      payload,
      isLoading: true,
    });
  },

  getTopicSuggestions(payload) {
    return BaseService.post({
      url: API.AI.TOPIC_SUGGESTIONS,
      payload,
      isLoading: true,
    });
  },

  getProfilePostSuggestions(payload) {
    return BaseService.post({
      url: API.AI.PROFILE_POST_SUGGESTIONS,
      payload,
      isLoading: true,
    });
  },

  autoAssignTeams(payload) {
    return BaseService.post({
      url: API.AI.AUTO_ASSIGN_TEAMS,
      payload,
      isLoading: true,
    });
  },

  autoAssignTopic(payload) {
    return BaseService.post({
      url: API.AI.AUTO_ASSIGN_TOPIC,
      payload,
      isLoading: true,
    });
  },

  getSummary(params) {
    return BaseService.get({
      url: API.AI.SUMMARY,
      params,
      isLoading: true,
    });
  },

  getOptions(params) {
    return BaseService.get({
      url: API.AI.OPTIONS,
      params,
      isLoading: true,
    });
  },

  autoResolve(payload) {
    return BaseService.post({
      url: API.AI.AUTO_RESOLVE,
      payload,
      isLoading: true,
    });
  },
  generatePostForGroup(groupId) {
  return BaseService.post({
    url: API.AI.GENERATE_POST_GROUP(groupId),
    payload: {}, 
    isLoading: true,
  });
},

generatePersonalPost() {
  return BaseService.post({
    url: API.AI.GENERATE_POST_PERSONAL,
    payload: {}, 
    isLoading: true,
  });
},

assistantDraft(groupId, message) {
  return BaseService.post({
    url: API.GROUP.ASSISTANT_DRAFT(groupId),
    payload: { message },
    isLoading: true,
  });
},

assistantCommit(groupId, draft) {
  return BaseService.post({
    url: API.GROUP.ASSISTANT_COMMIT(groupId),
    payload: draft,
    isLoading: true,
  });
},
};


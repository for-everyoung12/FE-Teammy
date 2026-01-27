export const API = {
  COMMON: {
    PUBLIC: "api/client",
  },
  AUTH: {
    LOGIN: "/auth/login",
    LOGIN_EMAIL: "/auth/login/email",
    REGISTER: "/auth/register",
    ME: "/auth/me",
  },
  ADMIN: {
    LIST_USERS: "/users/admin",
    CREATE_USER: "/users/admin",
    DETAIL_USER: (id) => `/users/admin/${id}`,
    BAN_USER: (id) => `/users/admin/${id}`,
    IMPORT_USERS: "/users/import",
    VALIDATE_IMPORT: "/users/import/validate",
    EXPORT_USERS: "/users/import/template",
    UPDATE_USER: (id) => `/users/admin/${id}`,
    DASHBOARD: "/dashboard",
    ACTIVITY_LOGS: "/admin/activity-logs",
    MAJOR_STATS: "/users/admin/major-stats",
    DASHBOARD_MODERATOR: "/dashboard/moderator",
    PLANNING_OVERVIEW: "/announcements/planning-overview",
    CREATE_ANNOUNCEMENT: "/announcements",
  },
  POST: {
    GET_PERSONAL: "/profile-posts",
    GET_GROUP: "/recruitment-posts",
    POST_PERSONAL: "/profile-posts",
    POST_GROUP: "/recruitment-posts",
    INVITE_PROFILE_POST: (postId) => `/profile-posts/${postId}/invites`,
    DETAIL_PERSONAL: (id) => `/profile-posts/${id}`,
    DETAIL_GROUP: (id) => `/recruitment-posts/${id}`,
    UPDATE_PERSONAL: (id) => `/profile-posts/${id}`,
    UPDATE_GROUP: (id) => `/recruitment-posts/${id}`,
    DELETE_PERSONAL: (id) => `/profile-posts/${id}`,
    DELETE_GROUP: (id) => `/recruitment-posts/${id}`,
    GET_GROUP_POSTS: (groupId) => `/recruitment-posts/group/${groupId}`,
  },
  GROUPS: {
    MEMBERSHIP: "/groups/membership",
  },
  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
    MY_PROFILE: "/users/me/profile",
    UPDATE_PROFILE: "/users/me/profile",
    GET_USER_BY_ID: (id) => `/users/${id}/profile`,
    PROFILE_BY_ID: (userId) => `/users/${userId}/profile`,
    GET_POSITIONS: "/users/positions",
  },
  INVITATIONS: {
    LIST: "/invitations",
    ACCEPT: (id) => `/invitations/${id}/accept`,
    DECLINE: (id) => `/invitations/${id}/decline`,
    MY_PROFILE_POSTS: "/profile-posts/my/invitations",
    PROFILE_POST_ACCEPT: (postId, candidateId) =>
      `/profile-posts/${postId}/invitations/${candidateId}/accept`,
    PROFILE_POST_REJECT: (postId, candidateId) =>
      `/profile-posts/${postId}/invitations/${candidateId}/reject`,
  },
  GROUP: {
    LIST_GROUP: "/groups",
    CREATE_GROUP: "/groups",
    MY_GROUPS: "/groups/my",
    GROUP_DETAIL: "/groups/:id",
    UPDATE_GROUP: (id) => `/groups/${id}`,
    ACTIVATE: (id) => `/groups/${id}/activate`,
    LIST_MEMBERS: "/groups/:id/members",
    INVITE_MEMBER: "/groups/:id/invites",
    INVITE_MENTOR: (groupId) => `/groups/${groupId}/mentor-invites`,
    REMOVE_MEMBER: (groupId, memberId) =>
      `/groups/${groupId}/members/${memberId}`,
    ASSIGN_ROLE: (groupId, memberId) =>
      `/groups/${groupId}/members/${memberId}/roles`,
    TRANSFER_LEADER: (groupId) => `/groups/${groupId}/leader/transfer`,
    JOIN_REQUESTS: (groupId) => `/groups/${groupId}/join-requests`,
    PENDING_REQUESTS: (groupId) => `/groups/${groupId}/pending`,
    ACCEPT_JOIN: (groupId, requestId) =>
      `/groups/${groupId}/pending/${requestId}/accept`,
    REJECT_JOIN: (groupId, requestId) =>
      `/groups/${groupId}/pending/${requestId}/reject`,
    LEAVE_GROUP: (id) => `/groups/${id}/members/me`,
    JOIN_POST_TO_GROUP: (id) => `recruitment-posts/${id}/applications`,
    FEEDBACK_LIST: (groupId) => `/groups/${groupId}/feedback`,
    FEEDBACK_CREATE: (groupId) => `/groups/${groupId}/feedback`,
    FEEDBACK_UPDATE_STATUS: (groupId, feedbackId) => `/groups/${groupId}/feedback/${feedbackId}/status`,
    FEEDBACK_UPDATE: (groupId, feedbackId) => `/groups/${groupId}/feedback/${feedbackId}`,
    FEEDBACK_DELETE: (groupId, feedbackId) => `/groups/${groupId}/feedback/${feedbackId}`,
    CLOSE_GROUP: (groupId) => `/groups/${groupId}/close`,
    CONFIRM_CLOSE: (groupId) => `/groups/${groupId}/close/confirm`,
    REJECT_CLOSE: (groupId) => `/groups/${groupId}/close/reject`,
    ASSISTANT_DRAFT: (groupId) => `/groups/${groupId}/assistant/draft`,
    ASSISTANT_COMMIT: (groupId) => `/groups/${groupId}/assistant/commit`,
  },
  TOPICS: {
    LIST: "/topics",
    LIST_OWNED_OPEN: "/topics?ownedBy=me&status=open",
    CREATE: "/topics",
    DETAIL_TOPIC: (id) => `/topics/${id}`,
    UPDATE: (id) => `/topics/${id}`,
    DELETE: (id) => `/topics/${id}`,
    EXPORT_TOPICS: "/topics/template",
    IMPORT_TOPICS: "/topics/import",
    VALIDATE_IMPORT: "/topics/import/validate",
  },
  MAJORS: {
    LIST: "/majors",
    CREATE: "/majors",
    DETAIL: (id) => `/majors/${id}`,
    UPDATE: (id) => `/majors/${id}`,
    DELETE: (id) => `/majors/${id}`,
    TEMPLATE: "/majors/template",
    IMPORT: "/majors/import",
  },
  SKILLS: {
    LIST: "/skills",
    CREATE: "/skills",
    DETAIL: (token) => `/skills/${token}`,
    UPDATE: (token) => `/skills/${token}`,
    DELETE: (token) => `/skills/${token}`,
    TEMPLATE: "/skills/template",
    IMPORT: "/skills/import",
  },
  POSITIONS: {
    LIST: "/positions",
    CREATE: "/positions",
    UPDATE: (id) => `/positions/${id}`,
    DELETE: (id) => `/positions/${id}`,
    TEMPLATE: "/positions/template",
    IMPORT: "/positions/import",
  },
  BOARD: {
    DETAIL: (groupId) => `/groups/${groupId}/board`,
    CREATE_COLUMN: (groupId) => `/groups/${groupId}/board/columns`,
    UPDATE_COLUMN: (groupId, columnId) =>
      `/groups/${groupId}/board/columns/${columnId}`,
    DELETE_COLUMN: (groupId, columnId) =>
      `/groups/${groupId}/board/columns/${columnId}`,
    CREATE_TASK: (groupId) => `/groups/${groupId}/board/tasks`,
    UPDATE_TASK: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}`,
    DELETE_TASK: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}`,
    MOVE_TASK: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}/move`,
    REPLACE_ASSIGNEES: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}/assignees`,
    LIST_COMMENTS: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}/comments`,
    CREATE_COMMENT: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}/comments`,
    UPDATE_COMMENT: (groupId, commentId) =>
      `/groups/${groupId}/board/comments/${commentId}`,
    DELETE_COMMENT: (groupId, commentId) =>
      `/groups/${groupId}/board/comments/${commentId}`,
    GROUP_FILES: (groupId) => `/groups/${groupId}/board/files`,
    TASK_FILES: (groupId, taskId) =>
      `/groups/${groupId}/board/tasks/${taskId}/files`,
    UPLOAD_FILE: (groupId) => `/groups/${groupId}/board/files/upload`,
    DELETE_FILE: (groupId, fileId) =>
      `/groups/${groupId}/board/files/${fileId}`,
  },
  BACKLOG: {
    LIST: (groupId) => `/groups/${groupId}/tracking/backlog`,
    CREATE: (groupId) => `/groups/${groupId}/tracking/backlog`,
    UPDATE: (groupId, backlogId) =>
      `/groups/${groupId}/tracking/backlog/${backlogId}`,
    ARCHIVE: (groupId, backlogId) =>
      `/groups/${groupId}/tracking/backlog/${backlogId}`,
    PROMOTE: (groupId, backlogId) =>
      `/groups/${groupId}/tracking/backlog/${backlogId}/promote`,
  },
  MILESTONES: {
    LIST: (groupId) => `/groups/${groupId}/tracking/milestones`,
    CREATE: (groupId) => `/groups/${groupId}/tracking/milestones`,
    UPDATE: (groupId, milestoneId) =>
      `/groups/${groupId}/tracking/milestones/${milestoneId}`,
    DELETE: (groupId, milestoneId) =>
      `/groups/${groupId}/tracking/milestones/${milestoneId}`,
    ASSIGN_ITEMS: (groupId, milestoneId) =>
      `/groups/${groupId}/tracking/milestones/${milestoneId}/items`,
    REMOVE_ITEM: (groupId, milestoneId, backlogItemId) =>
      `/groups/${groupId}/tracking/milestones/${milestoneId}/items/${backlogItemId}`,
  },
  REPORT: {
    PROJECT: (groupId) => `/groups/${groupId}/tracking/reports/project`,
    SCORES: (groupId) => `/groups/${groupId}/tracking/scores`,
    EXPORT: "/reports/export",
    OPTIONS: "/reports/options",
  },
  CHAT: {
    CONVERSATIONS: "/chat/conversations",
    MESSAGES: (sessionId) => `/chat/sessions/${sessionId}/messages`,
    SEND_MESSAGE: "/chat/messages",
    GROUP_MESSAGES: (groupId) => `/groups/${groupId}/chat/messages`,
  },
  AI: {
    RECRUITMENT_POST_SUGGESTIONS: "/ai/recruitment-post-suggestions",
    TOPIC_SUGGESTIONS: "/ai/topic-suggestions",
    PROFILE_POST_SUGGESTIONS: "/ai/profile-post-suggestions",
    AUTO_ASSIGN_TEAMS: "/ai/auto-assign/teams",
    AUTO_ASSIGN_TOPIC: "/ai/auto-assign/topic",
    SUMMARY: "/ai/summary",
    OPTIONS: "/ai/options",
    AUTO_RESOLVE: "/ai/auto-resolve",
    GENERATE_POST_GROUP: (groupId) => `/ai-gateway/generate-post/group/${groupId}`,
    GENERATE_POST_PERSONAL: "/ai-gateway/generate-post/personal",

  },
  SEMESTERS: {
    LIST: "/semesters",
    CREATE: "/semesters",
    DETAIL: (id) => `/semesters/${id}`,
    UPDATE: (id) => `/semesters/${id}`,
    ACTIVE: "/semesters/active",
    POLICY: (id) => `/semesters/${id}/policy`,
    UPDATE_POLICY: (id) => `/semesters/${id}/policy`,
    ACTIVATE: (id) => `/semesters/${id}/activate`,
  },
}



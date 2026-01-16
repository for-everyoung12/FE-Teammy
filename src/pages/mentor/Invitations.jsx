import React, { useEffect, useState } from "react";
import {
  Calendar,
  Check,
  ChevronRight,
  Loader2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Modal, notification } from "antd";
import { InvitationService } from "../../services/invitation.service";
import { useTranslation } from "../../hook/useTranslation";
import { GroupService } from "../../services/group.service";
import { TopicService } from "../../services/topic.service";
import { SemesterService } from "../../services/semester.service";
import { MajorService } from "../../services/major.service";
import { useNavigate } from "react-router-dom";

const Invitations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notificationApi, contextHolder] = notification.useNotification();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSemesterId, setSelectedSemesterId] = useState("all");
  const [selectedMajorId, setSelectedMajorId] = useState("all");
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState(null);
  const [rejectingInvitationId, setRejectingInvitationId] = useState(null);
  const [groupDetailModalVisible, setGroupDetailModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupDetail, setLoadingGroupDetail] = useState(false);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const [semesterRes, majorRes] = await Promise.all([
          SemesterService.list(),
          MajorService.getMajors(),
        ]);
        const semesterPayload = semesterRes?.data ?? semesterRes;
        const semesterList = Array.isArray(semesterPayload?.data)
          ? semesterPayload.data
          : Array.isArray(semesterPayload)
          ? semesterPayload
          : semesterPayload?.items || [];
        const majorPayload = majorRes?.data ?? majorRes;
        const majorList = Array.isArray(majorPayload?.data)
          ? majorPayload.data
          : Array.isArray(majorPayload)
          ? majorPayload
          : majorPayload?.items || [];

        setSemesterOptions(
          semesterList
            .map((item) => ({
              id: item.id || item.semesterId || item._id,
              label: formatSemesterLabel(item),
            }))
            .filter(
              (item) =>
                item.id &&
                item.label &&
                normalizeStatus(item.label) !==
                  normalizeStatus(t("updating") || "Updating")
            )
        );

        setMajorOptions(
          majorList
            .map((item) => ({
              id: item.id || item.majorId || item._id,
              label: item.name || item.title || item.majorName || "",
            }))
            .filter((item) => item.id && item.label)
        );
      } catch {
        setSemesterOptions([]);
        setMajorOptions([]);
      } finally {
        setFiltersLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await InvitationService.list();
      const data = Array.isArray(res?.data) ? res.data : [];
      const enrichedInvitations = await Promise.all(
        data.map(async (invitation) => {
          let groupDetail = null;
          if (invitation.groupId) {
            try {
              const groupRes = await GroupService.getGroupDetail(
                invitation.groupId
              );
              groupDetail = groupRes?.data || groupRes || null;
            } catch {
              groupDetail = null;
            }
          }

          let topicDetail = null;
          const topicId =
            invitation.topicId ||
            groupDetail?.topic?.id ||
            groupDetail?.topicId;
          if (topicId) {
            try {
              const topicRes = await TopicService.getTopicDetail(topicId);
              topicDetail = topicRes?.data || topicRes || null;
            } catch {
              topicDetail = null;
            }
          }

          return {
            ...invitation,
            groupName:
              invitation.groupName ||
              groupDetail?.name ||
              groupDetail?.title,
            description: invitation.description || groupDetail?.description,
            currentMembers:
              invitation.currentMembers ?? groupDetail?.currentMembers,
            maxMembers: invitation.maxMembers ?? groupDetail?.maxMembers,
            skills:
              Array.isArray(invitation.skills) && invitation.skills.length > 0
                ? invitation.skills
                : Array.isArray(groupDetail?.skills)
                ? groupDetail.skills
                : [],
            semester:
              invitation.semester ||
              groupDetail?.semester ||
              groupDetail?.semesterLabel,
            semesterLabel:
              invitation.semesterLabel ||
              groupDetail?.semesterLabel ||
              groupDetail?.semester,
            topicTitle:
              invitation.topicTitle ||
              topicDetail?.title ||
              groupDetail?.topic?.title ||
              groupDetail?.topicName,
            topicDescription:
              invitation.topicDescription ||
              topicDetail?.description ||
              groupDetail?.topic?.description,
            topicSkills:
              Array.isArray(invitation.topicSkills) &&
              invitation.topicSkills.length > 0
                ? invitation.topicSkills
                : Array.isArray(topicDetail?.skills)
                ? topicDetail.skills
                : Array.isArray(groupDetail?.topic?.skills)
                ? groupDetail.topic.skills
                : [],
            topic: groupDetail?.topic || invitation.topic,
            major: groupDetail?.major || invitation.major,
            mentor: groupDetail?.mentor || invitation.mentor,
            mentors: groupDetail?.mentors || invitation.mentors,
          };
        })
      );
      setInvitations(enrichedInvitations);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation) => {
    const invitationId = invitation.invitationId || invitation.id;
    if (acceptingInvitationId === invitationId) return; // Prevent double click
    
    try {
      setAcceptingInvitationId(invitationId);
      await InvitationService.accept(invitationId);
      // Update status instead of removing from list
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitation.id || inv.invitationId === invitationId
            ? { ...inv, status: "accepted" }
            : inv
        )
      );
      notificationApi.success({
        message: t("accepted") || "Accepted",
      });
    } catch {
      notificationApi.warning({
        message: t("acceptInvitationFailed") || "Accept invitation failed",
        description: t("pleaseTryAgainLater") || "Please try again later.",
      });
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  const handleRejectInvitation = async (invitation) => {
    const invitationId = invitation.invitationId || invitation.id;
    if (rejectingInvitationId === invitationId) return; // Prevent double click
    
    try {
      setRejectingInvitationId(invitationId);
      await InvitationService.decline(invitationId);
      // Update status instead of removing from list
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitation.id || inv.invitationId === invitationId
            ? { ...inv, status: "rejected" }
            : inv
        )
      );
      notificationApi.info({
        message: t("invitationRejected") || "Invitation rejected",
      });
    } catch {
      notificationApi.warning({
        message: t("rejectInvitationFailed") || "Reject invitation failed",
        description: t("pleaseTryAgainLater") || "Please try again later.",
      });
    } finally {
      setRejectingInvitationId(null);
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("justNow") || "just now";
    if (diffMins < 60) return `${diffMins} ${t("minutesAgo") || "minutes ago"}`;
    if (diffHours < 24) return `${diffHours} ${t("hoursAgo") || "hours ago"}`;
    if (diffDays < 7) return `${diffDays} ${t("daysAgo") || "days ago"}`;
    return date.toLocaleDateString("vi-VN");
  };

  const normalizeStatus = (status = "") => status.toString().toLowerCase();
  const isRejectedStatus = (status) => {
    const value = normalizeStatus(status);
    return value === "rejected" || value === "declined";
  };

  const getInvitationTopic = (inv) =>
    inv.topicTitle ||
    inv.topic?.title ||
    t("topicUndefined") ||
    "Topic not set";
  const formatSemesterValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const season =
        value.season || value.term || value.name || value.semesterName;
      const year = value.year || value.academicYear;
      if (season && year) return `${season} ${year}`;
      return (
        season ||
        year ||
        value.semesterCode ||
        value.code ||
        value.semesterId ||
        ""
      );
    }
    return String(value);
  };
  const getInvitationSemester = (inv) =>
    formatSemesterValue(
      inv.semesterLabel ||
        inv.semesterName ||
        inv.semesterCode ||
        inv.semester ||
        inv.semesterId
    ) ||
    formatSemesterValue(inv.semester);
  const getInvitationSemesterId = (inv) =>
    inv.semesterId ||
    inv.semester?.id ||
    inv.semester?.semesterId ||
    inv.semester?.semester_id ||
    "";
  const formatSemesterLabel = (value) =>
    formatSemesterValue(value) || t("updating") || "Updating";
  const getInvitationMajorId = (inv) =>
    inv.majorId || inv.major?.id || inv.major?.majorId || "";
  const getInvitationMajorName = (inv) =>
    inv.majorName || inv.major?.name || inv.major?.title || "";
  const getInvitationMembers = (inv) => ({
    current: inv.currentMembers ?? inv.memberCount ?? 0,
    max: inv.maxMembers ?? inv.capacity ?? 0,
  });
  const getInvitationSkills = (inv) => {
    const skills = [
      ...(Array.isArray(inv.skills) ? inv.skills : []),
      ...(Array.isArray(inv.topicSkills) ? inv.topicSkills : []),
    ];
    return Array.from(new Set(skills));
  };

  const filteredInvitations = invitations.filter((inv) => {
    const status = normalizeStatus(inv.status);
    if (activeTab !== "all") {
      if (activeTab === "pending" && status !== "pending") return false;
      if (activeTab === "accepted" && status !== "accepted") return false;
      if (activeTab === "rejected" && !isRejectedStatus(status)) return false;
    }
    if (selectedSemesterId !== "all") {
      const semesterId = getInvitationSemesterId(inv);
      if (String(semesterId) !== String(selectedSemesterId)) return false;
    }
    if (selectedMajorId !== "all") {
      const majorId = getInvitationMajorId(inv);
      if (String(majorId) !== String(selectedMajorId)) return false;
    }
    return true;
  });

  const derivedSemesterOptions = Array.from(
    new Map(
      invitations
        .map((inv) => ({
          id: getInvitationSemesterId(inv),
          label: formatSemesterLabel(getInvitationSemester(inv)),
        }))
        .filter((item) => item.id)
        .map((item) => [String(item.id), item])
    ).values()
  );

  const derivedMajorOptions = Array.from(
    new Map(
      invitations
        .map((inv) => ({
          id: getInvitationMajorId(inv),
          label: getInvitationMajorName(inv),
        }))
        .filter((item) => item.id && item.label)
        .map((item) => [String(item.id), item])
    ).values()
  );

  const semesterOptionsToShow =
    semesterOptions.length > 0 ? semesterOptions : derivedSemesterOptions;
  const majorOptionsToShow =
    majorOptions.length > 0 ? majorOptions : derivedMajorOptions;

  const pendingCount = invitations.filter(
    (inv) => normalizeStatus(inv.status) === "pending"
  ).length;
  const acceptedCount = invitations.filter(
    (inv) => normalizeStatus(inv.status) === "accepted"
  ).length;
  const rejectedCount = invitations.filter((inv) =>
    isRejectedStatus(inv.status)
  ).length;

  const openMemberProfile = (member) => {
    const memberId =
      member.id || member.userId || member.userID || member.memberId;
    if (!memberId) return;
    setGroupDetailModalVisible(false);
    navigate(`/mentor/profile/${memberId}`);
  };

  const openGroupDetailModal = async (invitation) => {
    if (!invitation?.groupId) return;
    setSelectedGroup({
      id: invitation.groupId,
      name:
        invitation.groupName || t("groupUnnamed") || "Unnamed group",
      topic:
        invitation.topicTitle || t("topicUndefined") || "Topic not set",
      topicDescription:
        invitation.topicDescription || invitation.topic?.description || "",
      description: invitation.description || "",
      members: invitation.currentMembers || 0,
      maxMembers: invitation.maxMembers || 0,
      skills: invitation.skills || [],
      topicSkills: invitation.topicSkills || [],
      semesterLabel: formatSemesterLabel(getInvitationSemester(invitation)),
    });
    setGroupMembers([]);
    setGroupDetailModalVisible(true);

    try {
      setLoadingGroupDetail(true);
      const res = await GroupService.getGroupDetail(invitation.groupId);
      const g = res?.data || res || {};
      setSelectedGroup({
        id: g.id || invitation.groupId,
        name:
          g.name ||
          g.title ||
          invitation.groupName ||
          t("groupUnnamed") ||
          "Unnamed group",
        topic:
          g.topic?.title ||
          g.topicName ||
          invitation.topicTitle ||
          t("topicUndefined") ||
          "Topic not set",
        topicDescription:
          g.topic?.description || invitation.topicDescription || "",
        description: g.description || "",
        members: g.currentMembers || g.memberCount || 0,
        maxMembers: g.maxMembers || g.capacity || 0,
        skills: Array.isArray(g.skills) ? g.skills : [],
        topicSkills: Array.isArray(g.topic?.skills) ? g.topic.skills : [],
        semesterLabel: formatSemesterLabel(
          g.semester?.name ||
            g.semester?.semesterName ||
            g.semester?.code ||
            g.semester?.semesterCode ||
            g.semesterLabel ||
            g.semester ||
            getInvitationSemester(invitation)
        ),
      });
    } catch {
      setSelectedGroup((prev) => prev || null);
    } finally {
      setLoadingGroupDetail(false);
    }

    try {
      setLoadingGroupMembers(true);
      const res = await GroupService.getListMembers(invitation.groupId);
      const members = Array.isArray(res?.data) ? res.data : [];
      setGroupMembers(members);
    } catch {
      setGroupMembers([]);
      notificationApi.warning({
        message:
          t("loadGroupMembersFailed") ||
          "Failed to load group members",
      });
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  return (
    <div className="space-y-6 min-h-screen">
      {contextHolder}

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
          {t("mentoringInvitations") || "Mentoring Invitations"}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {t("invitations") || "Invitations"}
          </h2>
        </div>

        <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "all"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("all")} ({invitations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "pending"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("pending")} ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("accepted")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "accepted"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("accepted")} ({acceptedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
              activeTab === "rejected"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("rejected") || "Rejected"} ({rejectedCount})
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("semester") || "Semester"}
            </span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              disabled={filtersLoading}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="all">{t("all") || "All"}</option>
              {semesterOptionsToShow.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("major") || "Major"}
            </span>
            <select
              value={selectedMajorId}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              disabled={filtersLoading}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="all">{t("all") || "All"}</option>
              {majorOptionsToShow.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            {t("noInvitations") || "No invitations yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredInvitations.map((inv) => {
              const members = getInvitationMembers(inv);
              const semesterLabel = formatSemesterLabel(
                getInvitationSemester(inv)
              );
              const groupTitle =
                inv.groupName || t("groupUnnamed") || "Unnamed group";
              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                        {(groupTitle || "T").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {groupTitle}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                              normalizeStatus(inv.status) === "accepted"
                                ? "bg-green-50 text-green-600 border border-green-200"
                                : normalizeStatus(inv.status) === "pending"
                                ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
                                : isRejectedStatus(inv.status)
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {normalizeStatus(inv.status) === "accepted"
                              ? t("accepted") || "Accepted"
                              : normalizeStatus(inv.status) === "pending"
                              ? t("pending") || "Pending"
                              : isRejectedStatus(inv.status)
                              ? t("rejected") || "Rejected"
                              : inv.status}
                          </span>
                        </div>
                        {inv.createdAt && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {getRelativeTime(inv.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGroupDetailModal(inv)}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                    >
                      {t("details") || "Details"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                      {t("topic") || "Topic"}
                    </p>
                    <p className="mt-1 text-gray-900">
                      {getInvitationTopic(inv)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>
                        {members.current}/{members.max || "-"}{" "}
                        {t("thanh_vien") || "members"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{semesterLabel}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    {inv.type === "mentor_request" ? (
                      <span>
                        {t("youSentMentorRequest") ||
                          "You sent a mentor request for this group."}
                      </span>
                    ) : (
                      <span>
                        <span className="font-medium">
                          {inv.invitedByName || t("invitedBy") || "Invited by"}
                        </span>{" "}
                        {t("invitedYouToMentorGroup") ||
                          "invited you to mentor the group"}
                      </span>
                    )}
                  </div>

                  {inv.message && (
                    <div className="mt-3 text-sm text-gray-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                        {t("message") || "Message"}
                      </span>
                      <div className="mt-1 italic break-words">
                        {inv.message}
                      </div>
                    </div>
                  )}

                  {normalizeStatus(inv.status) === "pending" &&
                    inv.type !== "mentor_request" && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvitation(inv);
                        }}
                        disabled={
                          acceptingInvitationId ===
                            (inv.invitationId || inv.id) ||
                          rejectingInvitationId === (inv.invitationId || inv.id)
                        }
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptingInvitationId ===
                        (inv.invitationId || inv.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{t("accept") || "Accept"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectInvitation(inv);
                        }}
                        disabled={
                          rejectingInvitationId ===
                            (inv.invitationId || inv.id) ||
                          acceptingInvitationId === (inv.invitationId || inv.id)
                        }
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rejectingInvitationId ===
                        (inv.invitationId || inv.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span>{t("reject") || "Reject"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Modal
        open={groupDetailModalVisible}
        onCancel={() => setGroupDetailModalVisible(false)}
        footer={null}
        width={520}
        centered
        closeIcon={<X className="w-5 h-5" />}
      >
        {loadingGroupDetail ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-3">
              {t("loadingDetails") || "Loading details..."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {selectedGroup && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedGroup.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedGroup.members || 0}/
                    {selectedGroup.maxMembers || 0}{" "}
                    {t("thanh_vien") || "members"}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {selectedGroup.semesterLabel ||
                        t("updating") ||
                        "Updating"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedGroup && (
              <div className="space-y-4 text-sm">
                {selectedGroup.topic && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                      {t("topic") || "Topic"}
                    </p>
                    <p className="mt-1 text-gray-900">
                      {selectedGroup.topic}
                    </p>
                    {selectedGroup.topicDescription && (
                      <p className="mt-2 text-sm text-gray-700">
                        {selectedGroup.topicDescription}
                      </p>
                    )}
                  </div>
                )}

                {selectedGroup.description && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                      {t("description") || "Description"}
                    </p>
                    <p className="mt-1 text-gray-700">
                      {selectedGroup.description}
                    </p>
                  </div>
                )}

                {(selectedGroup.skills?.length > 0 ||
                  selectedGroup.topicSkills?.length > 0) && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                      {t("skills") || "Skills"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ...(selectedGroup.skills || []),
                        ...(selectedGroup.topicSkills || []),
                      ].map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-0.5 rounded-full bg-gray-100 text-xs text-gray-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase mb-2">
                {t("members") || "Members"}
              </p>
              {loadingGroupMembers ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("noMembersInGroup") ||
                    "No members in group."}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {groupMembers.map((member) => (
                    <li
                      key={member.id || member.userId}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => openMemberProfile(member)}
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName || member.name || "avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-gray-600">
                            {(member.fullName || member.name || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.displayName ||
                              member.fullName ||
                              member.name ||
                              t("unknownUser") ||
                              "Unknown"}
                          </p>
                          {member.role && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                String(member.role).toLowerCase() === "mentor"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {String(member.role).toLowerCase()}
                            </span>
                          )}
                        </div>
                        {member.email && (
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invitations;

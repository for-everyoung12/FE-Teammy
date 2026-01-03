import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import FilterSidebar from "../../components/common/discover/FilterSidebar";
import ProjectCard from "../../components/common/discover/ProjectCard";
import TopicDetailModal from "../../components/common/discover/TopicDetailModal";
import { useTranslation } from "../../hook/useTranslation";
import { useAuth } from "../../context/AuthContext";
import { TopicService } from "../../services/topic.service";
import { GroupService } from "../../services/group.service";
import { AuthService } from "../../services/auth.service";
import { AiService } from "../../services/ai.service";
import { Modal, Input, notification } from "antd";
import { Sparkles } from "lucide-react";
// import { getErrorMessage } from "../../utils/helpers";

const Discover = () => {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const [projects, setProjects] = useState([]);
  const [aiSuggestedTopics, setAiSuggestedTopics] = useState([]);
  const [membership, setMembership] = useState({
    hasGroup: false,
    groupId: null,
    status: null,
  });
  const [myGroupDetails, setMyGroupDetails] = useState(null);
  const [inviteState, setInviteState] = useState({
    open: false,
    topic: null,
    loading: false,
    message: "",
  });
  const [detailModalState, setDetailModalState] = useState({
    open: false,
    topic: null,
    loading: false,
  });
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filters, setFilters] = useState({
    major: "all",
    aiRecommended: false,
  });
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingGroupDetails, setIsLoadingGroupDetails] = useState(false);

  const aiSuggestionsFetchedRef = useRef(null);

  const mapTopics = useCallback((list) => {
    return (list || [])
      .filter((t) => {
        const status = (t.status || "open").toLowerCase();
        return status !== "closed";
      })
      .map((t) => ({
        ...t,
        topicId: t.topicId || t.id,
        title: t.title || t.topicName || "Untitled",
        description: t.description || "",
        domain: t.majorName || "General",
        majorId: t.majorId,
        status: t.status || "open",
        tags: [t.status || "open"],
        mentor:
          (t.mentors &&
            t.mentors[0] &&
            (t.mentors[0].mentorName || t.mentors[0].name)) ||
          t.createdByName ||
          "",
        mentorsRaw: t.mentors || [],
        progress: 0,
        members: (t.mentors || []).map((m) =>
          (m.mentorName || m.name || "M")
            .split(" ")
            .map((n) => n[0])
            .join("")
        ),
        createdAt: t.createdAt,
        attachedFiles: t.attachedFiles || [],
        referenceDocs: t.referenceDocs || [],
        registrationFile: t.registrationFile || null,
        topicSkills: t.skills || [],
        groups: t.groups || [],
      }));
  }, []);

  const mapAiSuggestions = useCallback((suggestions) => {
    return (suggestions || [])
      .filter((item) => {
        const detail = item.detail || {};
        const status = (detail.status || "open").toLowerCase();
        return status !== "closed";
      })
      .map((item) => {
        const detail = item.detail || {};
        const mentors = Array.isArray(detail.mentors) ? detail.mentors : [];

        return {
          topicId: item.topicId || detail.topicId,
          title: item.title || detail.title || "Untitled",
          description: item.description || detail.description || "",
          domain: detail.majorName || "General",
          majorId: detail.majorId,
          status: detail.status || "open",
          tags: [detail.status || "open"],
          mentor:
            mentors.length > 0
              ? mentors
                  .map((m) => m.mentorName || m.name || m.mentorEmail)
                  .join(", ")
              : detail.createdByName || "",
          mentorsRaw: mentors,
          progress: 0,
          members: mentors.map((m) =>
            (m.mentorName || m.name || "M")
              .split(" ")
              .map((n) => n[0])
              .join("")
          ),
          createdAt: detail.createdAt,
          attachedFiles: detail.attachedFiles || [],
          referenceDocs: detail.referenceDocs || [],
          registrationFile:
            detail.registrationFile || item.registrationFile || null,
          score: item.score || 0,
          canTakeMore: item.canTakeMore,
          matchingSkills: item.matchingSkills || [],
          topicSkills: item.topicSkills || detail.skills || [],
          isAISuggestion: true,
          groups: detail.groups || [],
          aiReason: item.aiReason || null,
          detail: detail,
        };
      });
  }, []);

  const refetchTopics = useCallback(async () => {
    try {
      const semesterId = userInfo?.semester?.semesterId;
      const params = semesterId ? { semesterId } : {};
      const res = await TopicService.getTopics(params);
      const payload = res?.data ?? res;
      const list =
        (Array.isArray(payload) && payload) ||
        (Array.isArray(payload?.data) && payload.data) ||
        (Array.isArray(payload?.data?.data) && payload.data.data) ||
        [];
      const mapped = mapTopics(list);
      setProjects(mapped);
      setFilteredProjects(mapped);
    } catch (err) {
      console.error("Failed to refetch topics:", err);
    }
  }, [mapTopics, userInfo]);

  const refetchAISuggestions = useCallback(async () => {
    if (!membership.groupId) {
      setIsLoadingAI(false);
      return 0;
    }

    const hasTopicId =
      myGroupDetails?.topicId != null &&
      String(myGroupDetails.topicId).trim() !== "";
    const hasTopicObject =
      myGroupDetails?.topic?.topicId != null &&
      String(myGroupDetails.topic.topicId).trim() !== "";

    if (hasTopicId || hasTopicObject) {
      setAiSuggestedTopics([]);
      setIsLoadingAI(false);
      return 0;
    }

    try {
      setIsLoadingAI(true);
      const aiResponse = await AiService.getTopicSuggestions({
        groupId: membership.groupId,
        limit: null,
      });

      if (
        !aiResponse ||
        aiResponse.success === false ||
        !aiResponse.data.data
      ) {
        setAiSuggestedTopics([]);
        return 0;
      }

      const suggestions = Array.isArray(aiResponse.data.data)
        ? aiResponse.data.data
        : [];

      if (suggestions.length > 0) {
        const mapped = mapAiSuggestions(suggestions);
        setAiSuggestedTopics(mapped);
        return mapped.length;
      } else {
        setAiSuggestedTopics([]);
        return 0;
      }
    } catch (err) {
      console.error("Failed to refetch AI suggestions:", err);
      setAiSuggestedTopics([]);
      return 0;
    } finally {
      setIsLoadingAI(false);
    }
  }, [membership.groupId, myGroupDetails, mapAiSuggestions]);

  const refetchGroupData = useCallback(async () => {
    try {
      const res = await AuthService.getMembership();
      const groupId = res?.data?.groupId || null;
      const hasGroup = !!res?.data?.hasGroup;
      const status = res?.data?.status || null;
      setMembership({
        hasGroup,
        groupId,
        status,
      });

      if (groupId) {
        setIsLoadingGroupDetails(true);
        try {
          const groupRes = await GroupService.getGroupDetail(groupId);
          setMyGroupDetails(groupRes?.data || null);
        } catch {
          setMyGroupDetails(null);
        } finally {
          setIsLoadingGroupDetails(false);
        }
      } else {
        setIsLoadingGroupDetails(false);
      }
    } catch (err) {
      console.error("Failed to refetch group data:", err);
      setIsLoadingGroupDetails(false);
    }
  }, []);

  useEffect(() => {
    refetchGroupData();
  }, [refetchGroupData]);

  useEffect(() => {
    if (!membership.groupId) {
      setAiSuggestedTopics([]);
      setIsLoadingAI(false);
      aiSuggestionsFetchedRef.current = null;
      return;
    }
    if (isLoadingGroupDetails) {
      return;
    }

    const hasTopicId =
      myGroupDetails?.topicId != null &&
      String(myGroupDetails.topicId).trim() !== "";

    const hasTopicObject =
      myGroupDetails?.topic?.topicId != null &&
      String(myGroupDetails.topic.topicId).trim() !== "";

    if (hasTopicId || hasTopicObject) {
      setAiSuggestedTopics([]);
      setIsLoadingAI(false);
      aiSuggestionsFetchedRef.current = null;
      return;
    }

    if (aiSuggestionsFetchedRef.current === membership.groupId) {
      return;
    }

    let mounted = true;
    const fetchAISuggestions = async () => {
      try {
        const count = await refetchAISuggestions();
        if (mounted) {
          aiSuggestionsFetchedRef.current = membership.groupId;
          if (count > 0) {
            notification.info({
              message:
                t("aiSuggestionsAvailable") || "AI Suggestions Available",
              description: `Found ${count} recommended topics for your group`,
              placement: "topRight",
              duration: 3,
            });
          }
        }
      } catch {
        if (mounted) setAiSuggestedTopics([]);
      }
    };

    fetchAISuggestions();
    return () => {
      mounted = false;
    };
  }, [
    membership.groupId,
    myGroupDetails,
    isLoadingGroupDetails,
    refetchAISuggestions,
    t,
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        await refetchTopics();
      } catch {
        notification.error({
          message: t("failedLoadTopics") || "Failed to load topics",
        });
      } finally {
        if (mounted) setIsLoadingTopics(false);
      }
    };
    fetchTopics();
    return () => {
      mounted = false;
    };
  }, [refetchTopics, t]);

  const aiTopicIds = useMemo(() => {
    return new Set(aiSuggestedTopics.map((t) => t.topicId).filter(Boolean));
  }, [aiSuggestedTopics]);

  useEffect(() => {
    let filtered = [...projects];

    filtered = filtered.filter((p) => !aiTopicIds.has(p.topicId));

    if (filters.major !== "all") {
      filtered = filtered.filter(
        (p) => String(p.majorId) === String(filters.major)
      );
    }

    setFilteredProjects(filtered);
  }, [filters, projects, aiTopicIds]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleViewTopicDetail = useCallback(async (topic) => {
    if (!topic?.topicId) return;

    setDetailModalState({ open: true, topic, loading: true });

    try {
      const res = await TopicService.getTopicDetail(topic.topicId);
      const fullTopic = res?.data || res;

      if (fullTopic) {
        const mergedTopic = {
          ...topic,
          ...fullTopic,
          registrationFile:
            fullTopic.registrationFile || topic.registrationFile,
          topicSkills: fullTopic.skills || topic.topicSkills,
          isAISuggestion: topic.isAISuggestion,
          score: topic.score,
          matchingSkills: topic.matchingSkills,
        };

        setDetailModalState({ open: true, topic: mergedTopic, loading: false });
      } else {
        setDetailModalState({ open: true, topic, loading: false });
      }
    } catch {
      setDetailModalState({ open: true, topic, loading: false });
    }
  }, []);
  const openInviteModal = useCallback(
    (p) => {
      if (!p) return;
      const st = String(p.status || p.tags?.[0] || "").toLowerCase();

      if (st !== "open") {
        notification.info({
          message: t("topicNotOpen") || "Topic không ở trạng thái Open",
          description:
            t("onlyOpenTopicSelectable") ||
            "Chỉ có thể chọn topic trạng thái Open.",
        });
        return;
      }

      setInviteState({ open: true, topic: p, loading: false, message: "" });
    },
    [t]
  );

  return (
    <div className="min-h-screen bg-[#f7fafc] pt-20 md:pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] mb-2">
          {t("findProjects")}
        </h1>
        <p className="text-gray-500 text-base md:text-lg">
          {t("discoverProjects")}
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[340px_1fr] gap-6 md:gap-8 px-4 sm:px-6 md:px-8">
        <div className="hidden lg:block flex-shrink-0">
          <FilterSidebar onFilterChange={handleFilterChange} />
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          {isLoadingTopics ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#FF7A00] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#FF7A00] animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-gray-600 font-medium text-lg">
                {t("loadingTopics") || "Loading topics..."}
              </p>
              <p className="mt-2 text-gray-500 text-sm">
                {t("pleaseWait") || "Please wait a moment"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {membership.hasGroup && isLoadingAI && (
                <div className="relative mb-4 rounded-3xl p-[2px] overflow-hidden shadow-[0_20px_60px_-20px_rgba(99,102,241,0.45)]">
                  <div
                    className="absolute inset-0 bg-[conic-gradient(from_180deg,#005BAA,#F37021,#00A94F,#005BAA)] animate-spin"
                    style={{ animationDuration: "2.8s" }}
                  />
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-orange-50 to-green-50 p-8">
                    <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-[#005BAA]/30 via-[#F37021]/15 to-[#00A94F]/15 blur-3xl animate-pulse" />
                    <div
                      className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-br from-[#00A94F]/25 via-[#005BAA]/15 to-[#F37021]/15 blur-3xl animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.35)_1px,transparent_0)] [background-size:14px_14px]" />
                    <div className="relative flex flex-col items-center justify-center text-center">
                      <div className="relative mb-4 grid h-14 w-14 place-items-center">
                        <div
                          className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,#005BAA,#F37021,#00A94F,#005BAA)] animate-spin"
                          style={{ animationDuration: "1.2s" }}
                        />
                        <div className="absolute inset-[4px] rounded-full bg-white/70 backdrop-blur" />
                        <Sparkles className="relative h-6 w-6 text-[#005BAA] animate-pulse drop-shadow" />
                      </div>

                      <p className="font-bold text-base bg-gradient-to-r from-[#005BAA] via-[#F37021] to-[#00A94F] bg-clip-text text-transparent">
                        {t("aiAnalyzing") || "AI is analyzing your group..."}
                      </p>

                      <p className="mt-1 text-sm text-indigo-700/80">
                        {t("findingBestMatch") ||
                          "Finding the best topic matches"}
                      </p>

                      <div className="mt-3 flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full bg-[#005BAA] animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-[#F37021] animate-bounce"
                          style={{ animationDelay: "120ms" }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-[#00A94F] animate-bounce"
                          style={{ animationDelay: "240ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {membership.hasGroup && aiSuggestedTopics.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">
                      {t("aiRecommendedTopics") || "AI Recommended Topics"}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                      {aiSuggestedTopics.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("aiTopicSuggestionsDesc") ||
                      "Topics matched to your group's interests and skills"}
                  </p>
                  <div className="flex flex-col gap-4">
                    {aiSuggestedTopics.map((project) => (
                      <div key={project.topicId} className="relative">
                        <div className="absolute -top-3 -left-3 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg z-10">
                          <Sparkles className="w-3.5 h-3.5 fill-white" />
                          {t("aiRecommended") || "AI Recommended"}
                        </div>

                        <div className="absolute -top-3 -right-3 flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg z-10">
                          <svg
                            className="w-3.5 h-3.5 fill-white"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {project.score}% {t("match") || "Match"}
                        </div>

                        <ProjectCard
                          project={project}
                          onSelectTopic={openInviteModal}
                          onViewDetail={handleViewTopicDetail}
                          hasGroupTopic={
                            !!(
                              myGroupDetails?.topicId ||
                              myGroupDetails?.topic?.topicId
                            )
                          }
                          isAISuggestion={true}
                          membership={membership}
                          myGroupDetails={myGroupDetails}
                          allProjects={[...aiSuggestedTopics, ...projects]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProjects.length > 0 ? (
                <>
                  {membership.hasGroup && aiSuggestedTopics.length > 0 && (
                    <div className="mt-8 mb-4">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900">
                        {t("allTopics") || "All Available Topics"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t("browseAllTopics") ||
                          "Browse all topics from the catalog"}
                      </p>
                    </div>
                  )}

                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.topicId}
                      project={project}
                      onSelectTopic={openInviteModal}
                      onViewDetail={handleViewTopicDetail}
                      hasGroupTopic={
                        !!(
                          myGroupDetails?.topicId ||
                          myGroupDetails?.topic?.topicId
                        )
                      }
                      membership={membership}
                      myGroupDetails={myGroupDetails}
                      allProjects={[...aiSuggestedTopics, ...projects]}
                    />
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-24 h-24 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {t("noProjectsFound") || "No Projects Found"}
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    {t("noProjectsDescription") ||
                      "No projects match your current filters. Try adjusting your filter criteria."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <TopicDetailModal
        isOpen={detailModalState.open}
        onClose={() =>
          setDetailModalState({ open: false, topic: null, loading: false })
        }
        topic={detailModalState.topic}
        onSelectTopic={(topic) => {
          setDetailModalState({ open: false, topic: null, loading: false });
          openInviteModal(topic);
        }}
        loading={inviteState.loading}
        detailLoading={detailModalState.loading}
        hasGroupTopic={
          !!(myGroupDetails?.topicId || myGroupDetails?.topic?.topicId)
        }
        isAISuggestion={detailModalState.topic?.isAISuggestion}
        membership={membership}
        myGroupDetails={myGroupDetails}
        allProjects={[...aiSuggestedTopics, ...projects]}
      />
      <Modal
        open={inviteState.open}
        title={t("inviteMentor") || "Mời mentor"}
        onCancel={() =>
          setInviteState({
            open: false,
            topic: null,
            loading: false,
            message: "",
          })
        }
        onOk={async () => {
          const { topic } = inviteState;
          if (!topic) return;

          try {
            setInviteState((s) => ({ ...s, loading: true }));
            const myGroupsRes = await GroupService.getMyGroups();
            const myGroups = myGroupsRes?.data || [];
            if (!myGroups.length) {
              notification.error({
                message: t("noGroupFound"),
                description: t("pleaseCreateOrJoinGroup"),
              });
              return;
            }
            const group = myGroups[0];
            const groupId = group.id || group.groupId;
            await GroupService.assignTopic(groupId, topic.topicId);
            const mentorCandidate = (topic.mentorsRaw || [])[0];
            if (!mentorCandidate) {
              notification.info({
                message: t("noMentorFound") || "Không tìm thấy mentor",
                description:
                  t("topicHasNoMentor") || "Topic này không có mentor gắn kèm",
              });
              setInviteState({
                open: false,
                topic: null,
                loading: false,
                message: "",
              });
              return;
            }

            const mentorUserId = mentorCandidate.mentorId;
            await GroupService.inviteMentor(groupId, {
              mentorUserId,
              topicId: topic.topicId || topic.id,
              message: inviteState.message,
            });

            await refetchGroupData();
            await Promise.all([refetchTopics(), refetchAISuggestions()]);

            notification.success({
              message: t("topicSelected") || "Đã chọn topic",
              description:
                (t("successfullySelected") || "Đã chọn") +
                ` "${topic.title}" ` +
                (t("andSentMentorInvite") || "và đã gửi thư mời cho mentor"),
            });

            setInviteState({
              open: false,
              topic: null,
              loading: false,
              message: "",
            });
          } catch (err) {
            const statusCode = err?.response?.status;
            const errorMessage =
              err?.response?.data?.message ||
              err?.response?.data ||
              err?.message ||
              "";

            let errorTitle = t("failedToSelectTopic") || "Thất bại";
            let errorDesc = errorMessage || t("pleaseTryAgain");

            if (statusCode === 403) {
              errorTitle = t("notAuthorized") || "Không có quyền";
              errorDesc =
                t("onlyLeaderCanSelectTopic") ||
                "Chỉ trưởng nhóm mới có thể chọn topic cho nhóm.";
            } else if (statusCode === 409) {
              if (
                errorMessage.includes(
                  "Group already has a pending mentor invitation for another topic"
                )
              ) {
                errorTitle =
                  t("invitePendingOtherTopic") ||
                  "Lời mời đang chờ cho topic khác";
                errorDesc =
                  t("invitePendingOtherTopicDesc") ||
                  "Nhóm của bạn đang có lời mời mentor cho một topic khác. Vui lòng chờ xử lý xong trước khi chọn topic mới.";
              } else {
                errorTitle = t("cannotSelectTopic") || "Không thể chọn topic";
                errorDesc =
                  errorMessage || t("pleaseTryAgain") || "Vui lòng thử lại.";
              }
            }

            notification.info({
              message: errorTitle,
              description: errorDesc,
            });
          } finally {
            setInviteState({
              open: false,
              topic: null,
              loading: false,
              message: "",
            });
          }
        }}
        okButtonProps={{
          className: "!bg-[#FF7A00] hover:!opacity-90 !text-white !border-none",
        }}
        cancelButtonProps={{
          className:
            "!border-gray-300 hover:!border-orange-400 hover:!text-orange-400 transition-all",
        }}
        confirmLoading={inviteState.loading}
      >
        <p className="text-sm mb-2">
          {t("sendingInviteForTopic") || "Gửi lời mời mentor cho topic"}:{" "}
          <strong>{inviteState.topic?.title}</strong>
        </p>
        <Input.TextArea
          rows={4}
          placeholder={t("enterMessage") || "Nhập lời nhắn đến mentor"}
          value={inviteState.message}
          onChange={(e) =>
            setInviteState((s) => ({ ...s, message: e.target.value }))
          }
        />
      </Modal>
    </div>
  );
};

export default Discover;

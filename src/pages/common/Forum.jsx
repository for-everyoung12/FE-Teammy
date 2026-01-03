import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Plus, Search, Users, MessageSquare } from "lucide-react";
import { useTranslation } from "../../hook/useTranslation";
import CreatePostModal from "../../components/common/forum/CreatePostModal";
import CreatePersonalPostModal from "../../components/common/forum/CreatePersonalPostModal";
import EditPersonalPostModal from "../../components/common/forum/EditPersonalPostModal";
import EditRecruitmentPostModal from "../../components/common/forum/EditRecruitmentPostModal";
import { PostService } from "../../services/post.service";
import { AuthService } from "../../services/auth.service";
import { GroupService } from "../../services/group.service";
import { AiService } from "../../services/ai.service";
import { toArraySafe, getErrorMessage } from "../../utils/helpers";
import GroupDetailModal from "../../components/common/forum/GroupDetailModal";
import { Modal, notification } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import ApplyModal from "../../components/common/forum/ApplyModal";
import { useNavigate } from "react-router-dom";
import { AIRecommendedProfiles } from "../../components/common/forum/AIRecommendedProfiles";
import { AIRecommendedGroups } from "../../components/common/forum/AIRecommendedGroups";
import { GroupCard } from "../../components/common/forum/GroupCard";
import { PersonalCard } from "../../components/common/forum/PersonalCard";
import { Pagination } from "../../components/common/forum/Pagination";
import { useGroupInvitationSignalR } from "../../hook/useGroupInvitationSignalR";
import { useAuth } from "../../context/AuthContext";
const { confirm } = Modal;
const Forum = () => {
  const { token, userInfo } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [membership, setMembership] = useState({
    hasGroup: false,
    groupId: null,
    status: null,
  });
  const [membershipLoaded, setMembershipLoaded] = useState(false);
  const [myGroupDetails, setMyGroupDetails] = useState(null);
  const userRole = membership.status === "leader" ? "leader" : "individual";
  const [activeTab, setActiveTab] = useState("groups");
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCreatePersonalPostModalOpen, setIsCreatePersonalPostModalOpen] =
    useState(false);
  const [isEditPersonalPostModalOpen, setIsEditPersonalPostModalOpen] =
    useState(false);
  const [isEditRecruitmentPostModalOpen, setIsEditRecruitmentPostModalOpen] =
    useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const savedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  }, []);
  const majorId = userInfo?.majorId ?? savedUser?.majorId;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timer = useRef(null);
  const membershipFetchedRef = useRef(false);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedQuery(query), 200);
    return () => timer.current && clearTimeout(timer.current);
  }, [query]);
  const [postsData, setPostsData] = useState([]);
  const [allPostsData, setAllPostsData] = useState([]);
  const [aiSuggestedPosts, setAiSuggestedPosts] = useState([]);
  const [aiSuggestedGroupPosts, setAiSuggestedGroupPosts] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGroupId, setDetailGroupId] = useState(null);
  const aiProfilesFetchedKeyRef = useRef(null);
  const aiGroupsFetchedKeyRef = useRef(null);
  const aiProfilesNotificationShownRef = useRef(false);
  const aiGroupsNotificationShownRef = useRef(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingAIProfiles, setIsLoadingAIProfiles] = useState(false);
  const [isLoadingAIGroups, setIsLoadingAIGroups] = useState(false);
  const [applyLoadingId, setApplyLoadingId] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyPost, setApplyPost] = useState(null);
  const [useServerSearch, setUseServerSearch] = useState(false);
  const normalizeSkills = (q) =>
    q
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

  const handleInvitationCreated = useCallback((payload) => {
    if (payload.type === "profile_post" && payload.postId) {
      const updatePostStatus = (posts) =>
        posts.map((post) =>
          post.id === payload.postId
            ? { ...post, hasApplied: true, myApplicationStatus: "pending" }
            : post
        );

      setAllPostsData((prev) => updatePostStatus(prev));
      setPostsData((prev) => updatePostStatus(prev));
      setAiSuggestedPosts((prev) =>
        prev.map((s) => {
          const profilePost = s.profilePost || {};
          if (profilePost.id !== payload.postId) return s;
          return {
            ...s,
            profilePost: {
              ...profilePost,
              hasApplied: true,
              myApplicationStatus: "pending",
            },
          };
        })
      );
    }
  }, []);

  const handleInvitationStatusChanged = useCallback((payload) => {
    if (payload.postId) {
      const updatePostStatus = (posts) =>
        posts.map((post) =>
          post.id === payload.postId
            ? { ...post, myApplicationStatus: payload.status }
            : post
        );

      setAllPostsData((prev) => updatePostStatus(prev));
      setPostsData((prev) => updatePostStatus(prev));
      setAiSuggestedPosts((prev) =>
        prev.map((s) => {
          const profilePost = s.profilePost || {};
          if (profilePost.id !== payload.postId) return s;
          return {
            ...s,
            profilePost: {
              ...profilePost,
              myApplicationStatus: payload.status,
            },
          };
        })
      );
    }
  }, []);

  const { isConnected } = useGroupInvitationSignalR(token, userInfo?.userId, {
    onInvitationCreated: handleInvitationCreated,
    onInvitationStatusChanged: handleInvitationStatusChanged,
  });

  useEffect(() => {
    if (membershipFetchedRef.current) return;
    membershipFetchedRef.current = true;
    (async () => {
      try {
        const res = await AuthService.getMembership();
        const m = {
          hasGroup: !!res?.data?.hasGroup,
          groupId: res?.data?.groupId || null,
          status: res?.data?.status || null,
        };
        setMembership(m);

        if (m.groupId) {
          try {
            const groupRes = await GroupService.getGroupDetail(m.groupId);
            setMyGroupDetails(groupRes?.data || null);
          } catch {
            setMyGroupDetails(null);
          }
        }
      } catch {
        // Ignore membership fetch error
      } finally {
        setMembershipLoaded(true);
      }
    })();
  }, []);

  const loadAllPosts = useCallback(
    async (
      { showError = false, shouldUpdate = () => true, setLoading = true } = {}
    ) => {
      try {
        if (setLoading && shouldUpdate()) setIsLoadingPosts(true);
        const [groupRes, individualRes] = await Promise.all([
          PostService.getRecruitmentPosts(),
          PostService.getPersonalPosts(),
        ]);

        const groupArr = toArraySafe(groupRes).filter(
          (x) => x?.type === "group_hiring"
        );
        const individualArr = toArraySafe(individualRes).filter(
          (x) => x?.type === "individual"
        );

        if (!shouldUpdate()) return;

        setAllPostsData([...groupArr, ...individualArr]);
      } catch {
        if (showError && shouldUpdate()) {
          notification.error({
            message: t("error") || "Error",
            description: t("failedToFetchPosts") || "Failed to fetch posts",
            placement: "topRight",
            duration: 3,
          });
        }
      } finally {
        if (setLoading && shouldUpdate()) setIsLoadingPosts(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q) return;

    setUseServerSearch(false);
    let mounted = true;

    loadAllPosts({ shouldUpdate: () => mounted });

    return () => {
      mounted = false;
    };
  }, [debouncedQuery, loadAllPosts]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) return;

    let mounted = true;

    (async () => {
      try {
        if (mounted) setIsLoadingPosts(true);

        const params = {
          skills: normalizeSkills(q),
          majorId: majorId ?? undefined,
        };

        const res =
          activeTab === "groups"
            ? await PostService.getRecruitmentPosts(params)
            : await PostService.getPersonalPosts(params);

        const arr = toArraySafe(res).filter((x) =>
          activeTab === "groups"
            ? x?.type === "group_hiring"
            : x?.type === "individual"
        );

        if (!mounted) return;

        setPostsData(arr);
        setUseServerSearch(true);
        setPage(1);
      } catch {
        if (mounted) {
          setUseServerSearch(false);
          setPostsData([]);
        }
      } finally {
        if (mounted) setIsLoadingPosts(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [debouncedQuery, activeTab, majorId]);

  /** 3) Khi activeTab thay đổi, CHỈ filter data từ allPostsData nếu KHÔNG đang search */
  useEffect(() => {
    if (useServerSearch) return;

    const groupArr = allPostsData.filter((x) => x?.type === "group_hiring");
    const individualArr = allPostsData.filter((x) => x?.type === "individual");
    setPostsData(activeTab === "groups" ? groupArr : individualArr);
  }, [activeTab, allPostsData, useServerSearch]);

  /** 4) Gọi AI suggestions khi chuyển sang tab individuals */
  const groupCurrentMembers =
    myGroupDetails?.currentMembers || myGroupDetails?.members?.length || 0;
  const groupMaxMembers =
    myGroupDetails?.maxMembers || myGroupDetails?.capacity || 0;
  const groupTopicId = myGroupDetails?.topicId || "";

  useEffect(() => {
    if (!membershipLoaded) {
      return;
    }

    if (
      activeTab !== "individuals" ||
      !membership.groupId ||
      membership.status !== "leader"
    ) {
      aiProfilesFetchedKeyRef.current = null;
      aiProfilesNotificationShownRef.current = false;
      setAiSuggestedPosts([]);
      return;
    }

    const hasTopic = !!(groupTopicId && String(groupTopicId).trim() !== "");
    const eligible = !(groupCurrentMembers >= groupMaxMembers && hasTopic);

    if (!eligible) {
      aiProfilesFetchedKeyRef.current = null;
      aiProfilesNotificationShownRef.current = false;
      setAiSuggestedPosts([]);
      return;
    }

    const key = `individuals-${membership.groupId}-${eligible ? 1 : 0}`;
    if (aiProfilesFetchedKeyRef.current === key) return;
    aiProfilesFetchedKeyRef.current = key;

    let mounted = true;
    (async () => {
      try {
        setIsLoadingAIProfiles(true);
        const aiResponse = await AiService.getProfilePostSuggestions({
          groupId: membership.groupId,
          limit: 10,
        });

        if (!aiResponse || aiResponse.success === false || !aiResponse.data) {
          if (mounted) setAiSuggestedPosts([]);
          return;
        }

        let suggestions = [];

        if (Array.isArray(aiResponse.data.data)) {
          suggestions = aiResponse.data.data.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.profilePost &&
              item.profilePost.id &&
              (item.profilePost?.status || "").toString().toLowerCase() !==
                "expired"
          );
        }

        if (mounted && suggestions.length > 0) {
          setAiSuggestedPosts(suggestions);
          if (!aiProfilesNotificationShownRef.current) {
            notification.info({
              message:
                t("aiSuggestionsAvailable") || "AI Suggestions Available",
              description: `Found ${suggestions.length} recommended profiles for your group`,
              placement: "topRight",
              duration: 3,
            });
            aiProfilesNotificationShownRef.current = true;
          }
        } else {
          if (mounted) setAiSuggestedPosts([]);
        }
      } catch {
        if (mounted) setAiSuggestedPosts([]);
      } finally {
        if (mounted) setIsLoadingAIProfiles(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    membership.groupId,
    groupCurrentMembers,
    groupMaxMembers,
    groupTopicId,
    membershipLoaded,
  ]);

  /** 5) Gọi AI suggestions khi chuyển sang tab groups */
  useEffect(() => {
    if (!membershipLoaded) {
      return;
    }

    if (activeTab !== "groups" || majorId == null) {
      aiGroupsFetchedKeyRef.current = null;
      aiGroupsNotificationShownRef.current = false;
      setAiSuggestedGroupPosts([]);
      setIsLoadingAIGroups(false);
      return;
    }

    if (membership.hasGroup) {
      aiGroupsFetchedKeyRef.current = null;
      aiGroupsNotificationShownRef.current = false;
      setAiSuggestedGroupPosts([]);
      setIsLoadingAIGroups(false);
      return;
    }

    const key = `groups-${majorId}`;
    if (aiGroupsFetchedKeyRef.current === key) {
      return;
    }
    aiGroupsFetchedKeyRef.current = key;

    let mounted = true;
    (async () => {
      try {
        setIsLoadingAIGroups(true);
        const aiResponse = await AiService.getRecruitmentPostSuggestions({
          majorId,
          limit: 10,
        });

        if (!aiResponse || aiResponse.success === false || !aiResponse.data) {
          if (mounted) setAiSuggestedGroupPosts([]);
          return;
        }
        let suggestions = [];

        if (Array.isArray(aiResponse.data.data)) {
          suggestions = aiResponse.data.data.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              item.post &&
              item.post.id &&
              (item.post?.status || "").toString().toLowerCase() !== "expired"
          );
        }

        if (mounted && suggestions.length > 0) {
          setAiSuggestedGroupPosts(suggestions);
          if (!aiGroupsNotificationShownRef.current) {
            notification.info({
              message:
                t("aiSuggestionsAvailable") || "AI Suggestions Available",
              description: `Found ${suggestions.length} recommended groups for you`,
              placement: "topRight",
              duration: 3,
            });
            aiGroupsNotificationShownRef.current = true;
          }
        } else {
          if (mounted) setAiSuggestedGroupPosts([]);
        }
      } catch {
        if (mounted) setAiSuggestedGroupPosts([]);
      } finally {
        if (mounted) setIsLoadingAIGroups(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, majorId, membership.hasGroup, membershipLoaded]);

  const handleCreated = useCallback(async () => {
    await loadAllPosts({ showError: true, setLoading: false });
  }, [loadAllPosts]);

  const aiGroupPostIds = useMemo(() => {
    return new Set(
      aiSuggestedGroupPosts.map((item) => item.post?.id).filter(Boolean)
    );
  }, [aiSuggestedGroupPosts]);

  const aiProfilePostIds = useMemo(() => {
    return new Set(
      aiSuggestedPosts.map((item) => item.profilePost?.id).filter(Boolean)
    );
  }, [aiSuggestedPosts]);

  const searchIndex = useMemo(() => {
    if (useServerSearch) return new Map();

    const index = new Map();

    (postsData || []).forEach((item) => {
      const texts = [
        item?.title,
        item?.description,
        item?.groupName,
        item?.group?.name,
        item?.userDisplayName,
        item?.group?.leader?.displayName,
        item?.leader?.displayName,
        item?.owner?.displayName,
        item?.major?.majorName,
        item?.majorName,
        item?.topic?.name,
        item?.topicName,
        item?.skills ? String(item.skills) : "",
        item?.positionNeeded ?? item?.position_needed ?? "",
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())
        .join(" ");

      const key = item?.id ?? item;
      index.set(key, texts);
    });

    return index;
  }, [postsData, useServerSearch]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    return (postsData || []).filter((item) => {
      const statusStr = (item?.status || "").toString().toLowerCase();
      if (statusStr === "closed" || statusStr === "expired") return false;

      if (activeTab === "groups" && aiGroupPostIds.has(item.id)) return false;
      if (activeTab === "individuals" && aiProfilePostIds.has(item.id))
        return false;

      if (useServerSearch) return true;

      const searchText = searchIndex.get(item?.id ?? item) || "";
      return !q || searchText.includes(q);
    });
  }, [
    postsData,
    debouncedQuery,
    activeTab,
    aiGroupPostIds,
    aiProfilePostIds,
    useServerSearch,
    searchIndex,
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeTab]);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  const openCounts = useMemo(() => {
    return (allPostsData || []).reduce(
      (acc, item) => {
        const statusStr = (item?.status || "").toString().toLowerCase();
        if (statusStr !== "open") return acc;

        if (item?.type === "group_hiring") acc.groups += 1;
        if (item?.type === "individual") acc.individuals += 1;

        return acc;
      },
      { groups: 0, individuals: 0 }
    );
  }, [allPostsData]);

  const { groups: openGroupPosts, individuals: openIndividualPosts } =
    openCounts;

  const onClickOpenApply = (post) => {
    if (!post?.id) return;
    setApplyPost(post);
    setApplyOpen(true);
  };
  const handleApplySubmit = async (payload /* { message } */) => {
    const id = applyPost?.id;
    if (!id) return;

    try {
      setApplyLoadingId(id);
      const res = await GroupService.applyPostToGroup(id, payload);

      const bodyStatus = (res?.data?.status || "").toString().toLowerCase();
      const newStatus = bodyStatus || "pending";

      const updatePost = (item) => {
        if (!item || item.id !== id) return item;

        const currentCount = item.applicationsCount || 0;

        return {
          ...item,
          hasApplied: true,
          myApplicationStatus: newStatus,
          myApplicationId: res?.data?.id || item?.myApplicationId || null,
          applicationsCount: currentCount + 1,
        };
      };

      setPostsData((prev) => (prev || []).map(updatePost));

      setAllPostsData((prev) => (prev || []).map(updatePost));

      setAiSuggestedGroupPosts((prev) =>
        (prev || []).map((s) => {
          const post = s.post || {};
          if (post.id !== id) return s;

          const currentCount = post.applicationsCount || 0;

          return {
            ...s,
            post: {
              ...post,
              hasApplied: true,
              myApplicationStatus: newStatus,
              myApplicationId: res?.data?.id || post.myApplicationId || null,
              applicationsCount: currentCount + 1,
            },
          };
        })
      );

      notification.success({
        message: t("inviteRequestSent") || "Invite request sent!",
      });
      setDetailOpen(false);
    } catch {
      notification.error({
        message:
          t("failedToSendInviteRequest") || "Failed to send invite request.",
      });
    } finally {
      setApplyLoadingId(null);
      setApplyOpen(false);
      setApplyPost(null);
    }
  };

  const onInvite = async (postId) => {
    try {
      await PostService.inviteProfilePost(postId);

      setAllPostsData((prev) =>
        prev.map((item) =>
          item.id === postId
            ? { ...item, hasApplied: true, myApplicationStatus: "pending" }
            : item
        )
      );
      setPostsData((prev) =>
        prev.map((item) =>
          item.id === postId
            ? { ...item, hasApplied: true, myApplicationStatus: "pending" }
            : item
        )
      );

      setAiSuggestedPosts((prev) =>
        (prev || []).map((s) => {
          const profilePost = s.profilePost || {};
          if (profilePost.id !== postId) return s;
          return {
            ...s,
            profilePost: {
              ...profilePost,
              hasApplied: true,
              myApplicationStatus: "pending",
            },
          };
        })
      );

      notification.success({
        message:
          t("userInvitedToGroup") || "User invited to the group successfully!",
      });
    } catch (error) {
      notification.error({
        message: getErrorMessage(
          error,
          t("failedToInviteUser") || "Failed to invite user."
        ),
      });
    }
  };

  const openDetail = (postId) => {
    if (!postId) {
      return;
    }
    setDetailGroupId(postId);
    setDetailOpen(true);
  };

  const resolveUserId = (userObj = {}) =>
    userObj.userId ||
    userObj.id ||
    userObj.user?.userId ||
    userObj.user?.id ||
    userObj.accountId ||
    userObj.ownerId ||
    "";

  const goProfile = (userObj = {}) => {
    const id = typeof userObj === "string" ? userObj : resolveUserId(userObj);
    if (!id) return;
    navigate(`/profile/${id}`);
  };

  const handleAIGroupApply = (detail, postId, groupId) => {
    const fullPost = postsData.find((p) => p.groupId === groupId) || {
      ...detail,
      id: postId || groupId,
      groupId,
      type: "group_hiring",
    };
    onClickOpenApply(fullPost);
  };

  const handleOpenGroupDetail = (postId) => {
    setDetailGroupId(postId);
    setDetailOpen(true);
  };

  const handleEditPersonalPost = (post) => {
    setEditingPost(post);
    setIsEditPersonalPostModalOpen(true);
  };

  const handleEditRecruitmentPost = (post) => {
    setEditingPost(post);
    setIsEditRecruitmentPostModalOpen(true);
  };

  const handleDeletePersonalPost = (postId) => {
    confirm({
      centered: true,
      title: t("confirmDeletePostTitle") || "Delete this post?",
      content:
        t("confirmDeletePost") || "Are you sure you want to delete this post?",
      icon: <ExclamationCircleOutlined />,
      okText: t("delete") || "Delete",
      okType: "danger",
      cancelText: t("cancel") || "Cancel",
      async onOk() {
        try {
          await PostService.deleteProfilePost(postId);
          notification.success({
            message: t("deletePostSuccess") || "Post deleted successfully",
          });
          handleCreated();
        } catch (err) {
          notification.error({
            message: t("deletePostFailed") || "Failed to delete post",
            description:
              err?.response?.data?.message ||
              t("pleaseTryAgain") ||
              "Please try again",
          });
          throw err;
        }
      },
    });
  };

  const handleDeleteRecruitmentPost = (postId) => {
    confirm({
      centered: true,
      title: t("confirmDeletePostTitle") || "Delete this post?",
      content:
        t("confirmDeletePost") || "Are you sure you want to delete this post?",
      icon: <ExclamationCircleOutlined />,
      okText: t("delete") || "Delete",
      okType: "danger",
      cancelText: t("cancel") || "Cancel",
      async onOk() {
        try {
          await PostService.deleteRecruitmentPost(postId);
          notification.success({
            message: t("deletePostSuccess") || "Post deleted successfully",
          });
          handleCreated();
        } catch (err) {
          notification.error({
            message: t("deletePostFailed") || "Failed to delete post",
            description:
              err?.response?.data?.message ||
              t("pleaseTryAgain") ||
              "Please try again",
          });
          throw err;
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] pb-16 pt-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-10 lg:px-8">
        <div className="border-b border-gray-200 pb-6 md:pb-8 mb-4 md:mb-6">
          <div className="space-y-3">
            <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-gray-900">
              {t("recruitmentForum") || "Recruitment Forum"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-gray-400 text-muted-foreground">
              {t("recruitmentForumDescription") ||
                "Post recruitment opportunities or showcase your profile to find the perfect team match. Connect with students and groups across all departments."}
            </p>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                {userRole === "leader" &&
                  (() => {
                    if (!myGroupDetails) {
                      return (
                        <button
                          onClick={() => setIsCreatePostModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-3 md:px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100 w-full md:w-auto justify-center"
                          title={t("createRecruitPost") || "Create group post"}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            {t("createRecruitPost") ||
                              "Create recruitment post"}
                          </span>
                          <span className="sm:hidden">
                            {t("createRecruitPost") ||
                              "Create recruitment Post"}
                          </span>
                        </button>
                      );
                    }

                    const currentMembers =
                      myGroupDetails.currentMembers ||
                      myGroupDetails.members?.length ||
                      0;
                    const maxMembers =
                      myGroupDetails.maxMembers || myGroupDetails.capacity || 0;
                    const isGroupFull =
                      maxMembers > 0 && currentMembers >= maxMembers;

                    return !isGroupFull ? (
                      <button
                        onClick={() => setIsCreatePostModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-3 md:px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100 w-full md:w-auto justify-center"
                        title={t("createRecruitPost") || "Create group post"}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {t("createRecruitPost") || "Create recruitment post"}
                        </span>
                        <span className="sm:hidden">
                          {t("createRecruitPost") || "Create recruitment Post"}
                        </span>
                      </button>
                    ) : null;
                  })()}
                {userRole !== "leader" && !membership.hasGroup && (
                  <button
                    onClick={() => setIsCreatePersonalPostModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-3 md:px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100 w-full md:w-auto justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("createPersonalPost") || "Create personal post"}
                    </span>
                    <span className="sm:hidden">
                      {t("createPersonalPost") || "Create personal Post"}
                    </span>
                  </button>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {openGroupPosts}{" "}
                    {openGroupPosts === 1
                      ? "recruitment post"
                      : "recruitment posts"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {openIndividualPosts}{" "}
                    {openIndividualPosts === 1
                      ? "student profile"
                      : "student profiles"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === "groups"
                  ? t("searchByProject") || "Search posts by project, skills…"
                  : t("searchByPeople") || "Search people by role, skills…"
              }
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none ring-blue-100 transition focus:border-blue-500 focus:ring-4"
            />
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <div className="inline-flex w-full md:w-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 md:flex-initial px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition ${
                activeTab === "groups"
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t("postGroup") || "Post Group"}
            </button>
            <button
              onClick={() => setActiveTab("individuals")}
              className={`flex-1 md:flex-initial px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition ${
                activeTab === "individuals"
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t("postPersonal") || "Post Personal"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoadingPosts ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#FF7A00] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#FF7A00] animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-gray-600 font-medium text-lg">
                {t("loadingPosts") || "Loading posts..."}
              </p>
              <p className="mt-2 text-gray-500 text-sm">
                {t("pleaseWait") || "Please wait a moment"}
              </p>
            </div>
          ) : (
            <>
              {activeTab === "groups" && isLoadingAIGroups && (
                <div className="relative mb-4 rounded-3xl p-[2px] overflow-hidden shadow-[0_20px_60px_-20px_rgba(99,102,241,0.45)]">
                  <div
                    className="absolute inset-0 bg-[conic-gradient(from_180deg,#005BAA,#F37021,#00A94F,#005BAA)] animate-spin"
                    style={{ animationDuration: "2.8s" }}
                  />

                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-50 via-indigo-50 to-cyan-50 p-8">
                    <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/35 via-purple-400/20 to-indigo-400/20 blur-3xl animate-pulse" />
                    <div
                      className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/30 via-indigo-400/20 to-fuchsia-400/20 blur-3xl animate-pulse"
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
                        <Users className="relative h-6 w-6 text-[#005BAA] animate-pulse drop-shadow" />
                      </div>

                      <p className="font-bold text-base bg-gradient-to-r from-[#005BAA] via-[#F37021] to-[#00A94F] bg-clip-text text-transparent">
                        {t("aiAnalyzingGroups") ||
                          "AI is finding groups for you..."}
                      </p>

                      <p className="mt-1 text-sm text-indigo-700/80">
                        {t("findingBestGroupMatch") ||
                          "Finding the best group matches"}
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

              {activeTab === "individuals" && isLoadingAIProfiles && (
                <div className="relative mb-4 rounded-3xl p-[2px] overflow-hidden shadow-[0_20px_60px_-20px_rgba(99,102,241,0.45)]">
                  <div
                    className="absolute inset-0 bg-[conic-gradient(from_180deg,#005BAA,#F37021,#00A94F,#005BAA)] animate-spin"
                    style={{ animationDuration: "2.8s" }}
                  />

                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-50 via-indigo-50 to-cyan-50 p-8">
                    <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/35 via-purple-400/20 to-indigo-400/20 blur-3xl animate-pulse" />
                    <div
                      className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/30 via-indigo-400/20 to-fuchsia-400/20 blur-3xl animate-pulse"
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
                        <Users className="relative h-6 w-6 text-[#005BAA] animate-pulse drop-shadow" />
                      </div>

                      <p className="font-bold text-base bg-gradient-to-r from-[#005BAA] via-[#F37021] to-[#00A94F] bg-clip-text text-transparent">
                        {t("aiAnalyzingProfiles") ||
                          "AI is finding profiles for you..."}
                      </p>

                      <p className="mt-1 text-sm text-indigo-700/80">
                        {t("findingBestProfileMatch") ||
                          "Finding the best profile matches"}
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

              {/* AI Suggested Groups - Show at top for groups tab */}
              {activeTab === "groups" && (
                <AIRecommendedGroups
                  aiSuggestedGroupPosts={aiSuggestedGroupPosts}
                  membership={membership}
                  onOpenDetail={handleOpenGroupDetail}
                  onApply={handleAIGroupApply}
                />
              )}

              {/* AI Suggested Profiles - Show at top for individuals tab */}
              {activeTab === "individuals" && (
                <AIRecommendedProfiles
                  aiSuggestedPosts={aiSuggestedPosts}
                  membership={membership}
                  onInvite={onInvite}
                  myGroupDetails={myGroupDetails}
                />
              )}

              {/* Only show "No results" if there are no AI suggestions AND no filtered posts */}
              {filtered.length === 0 &&
                aiSuggestedGroupPosts.length === 0 &&
                aiSuggestedPosts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                    {t("noData") || "No results found."}
                  </div>
                )}

              {/* GROUP CARDS */}
              {activeTab === "groups" &&
                paged.map((p) => (
                  <GroupCard
                    key={p.id}
                    post={p}
                    membership={membership}
                    applyLoadingId={applyLoadingId}
                    onOpenDetail={openDetail}
                    onApply={onClickOpenApply}
                    onClickLeader={goProfile}
                    onEdit={handleEditRecruitmentPost}
                    onDelete={handleDeleteRecruitmentPost}
                    currentUserId={userInfo?.userId}
                  />
                ))}

              {/* PERSONAL CARDS */}
              {activeTab === "individuals" &&
                paged.map((u) => (
                  <PersonalCard
                    key={u.id}
                    post={u}
                    userRole={userRole}
                    onInvite={onInvite}
                    onClickProfile={goProfile}
                    membership={membership}
                    myGroupDetails={myGroupDetails}
                    onEdit={handleEditPersonalPost}
                    onDelete={handleDeletePersonalPost}
                    currentUserId={userInfo?.userId}
                  />
                ))}

              {/* Pagination */}
              <Pagination
                page={page}
                setPage={setPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
                total={total}
              />
            </>
          )}
        </div>
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          closeModal={() => setIsCreatePostModalOpen(false)}
          onCreated={handleCreated}
          defaultGroupId={membership.groupId || ""}
          destroyOnClose
        />
        <CreatePersonalPostModal
          isOpen={isCreatePersonalPostModalOpen}
          closeModal={() => setIsCreatePersonalPostModalOpen(false)}
          onCreated={handleCreated}
          destroyOnClose
        />
        <EditPersonalPostModal
          isOpen={isEditPersonalPostModalOpen}
          closeModal={() => {
            setIsEditPersonalPostModalOpen(false);
            setEditingPost(null);
          }}
          onUpdated={handleCreated}
          post={editingPost}
        />
        <EditRecruitmentPostModal
          isOpen={isEditRecruitmentPostModalOpen}
          closeModal={() => {
            setIsEditRecruitmentPostModalOpen(false);
            setEditingPost(null);
          }}
          onUpdated={handleCreated}
          post={editingPost}
          majorName={
            myGroupDetails?.major?.majorName || myGroupDetails?.majorName || ""
          }
        />
        <GroupDetailModal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          groupId={detailGroupId}
          onApply={onClickOpenApply}
          membership={membership}
        />
        <ApplyModal
          open={applyOpen}
          onClose={() => {
            setApplyOpen(false);
            setApplyPost(null);
          }}
          post={applyPost}
          onSubmit={handleApplySubmit}
        />
      </div>
    </div>
  );
};

export default Forum;

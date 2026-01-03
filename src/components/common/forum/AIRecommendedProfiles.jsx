import React from "react";
import { Sparkles, Star, UserPlus } from "lucide-react";
import { Chip, StatusChip } from "./Chip";
import { initials, timeAgoFrom } from "../../../utils/helpers";
import { useTranslation } from "../../../hook/useTranslation";
import { useNavigate } from "react-router-dom";

const clamp3 = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-line",
};

export function AIRecommendedProfiles({
  aiSuggestedPosts,
  membership,
  onInvite,
  myGroupDetails,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (
    !membership.groupId ||
    !Array.isArray(aiSuggestedPosts) ||
    aiSuggestedPosts.length === 0 ||
    !aiSuggestedPosts.some(
      (s) => s && typeof s === "object" && s.profilePost && s.profilePost.id
    )
  ) {
    return null;
  }

  return (
    <div className="mb-6 md:mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
        <h3 className="text-lg md:text-xl font-bold text-gray-900">
          {t("aiRecommendedProfiles") || "AI Recommended Profiles"}
        </h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
          {aiSuggestedPosts.length}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        {t("aiSuggestionsDesc") || "Top candidates matched for your group"}
      </p>

      {aiSuggestedPosts.map((suggestion, idx) => {
        const profilePost = suggestion.profilePost || {};
        const user = profilePost.user || {};
        const major = profilePost.major || {};

        const postId = profilePost.id;
        const userName = user.displayName || "User";
        const userId = user.userId || user.id || profilePost.userId || null;
        const matchScore = suggestion.scorePercent || 0;
        const avatarUrl = user.avatarUrl || null;
        const description = profilePost.description || "";
        const createdAt = profilePost.createdAt || new Date();
        const timeAgo = createdAt ? timeAgoFrom(createdAt) : "";
        const title = profilePost.title || t("profile") || "Profile";
        const matchingSkills = suggestion.matchingSkills || [];
        const positionNeeded = profilePost.position_needed || "";
        const skillsArray =
          matchingSkills.length > 0
            ? matchingSkills
            : positionNeeded
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        const majorName = user.majorName || major.majorName || "";
        const primaryRole = suggestion.primaryRole || "";
        const inviteStatus = profilePost.hasApplied
          ? profilePost.myApplicationStatus || "pending"
          : null;
        const aiReason = suggestion.aiReason || "";
        return (
          <div
            key={idx}
            className="relative rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-white p-4 md:p-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="absolute -top-2 -right-2 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg z-10">
              <Star className="w-3 h-3 fill-white" />
              {matchScore}% {t("match") || "Match"}
            </div>

            <div className="flex items-start gap-3">
              <div className="relative h-10 w-10 shrink-0">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-10 w-10 rounded-full object-cover shadow-sm"
                    role={userId ? "button" : undefined}
                    onClick={() => userId && navigate(`/profile/${userId}`)}
                    style={{ cursor: userId ? "pointer" : "default" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "flex";
                    }}
                  />
                )}
                <div
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white"
                  style={{
                    display: avatarUrl ? "none" : "flex",
                    cursor: userId ? "pointer" : "default",
                  }}
                  role={userId ? "button" : undefined}
                  onClick={() => userId && navigate(`/profile/${userId}`)}
                >
                  {initials(userName)}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{userName}</span>
                  <span>•</span>
                  <span>{timeAgo}</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-700" style={clamp3}>
              {description}
            </p>
            {aiReason && String(aiReason).trim() !== "" && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-white p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-indigo-600 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-indigo-700">
                      {t("aiReason") || "AI Reason"}
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{aiReason}</p>
                  </div>
                </div>
              </div>
            )}

            {primaryRole && (
              <div className="text-xs font-semibold tracking-wide text-gray-500">
                {(t("roleNeed") || "Role") + ":"}
                <div className="mt-2 flex-wrap gap-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  {primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1)}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {skillsArray.length > 0 && (
                  <div className="text-xs font-semibold tracking-wide text-gray-500">
                    {(t("matchingSkills") || "Matching Skills") + ":"}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skillsArray.map((s, i) => (
                        <Chip key={i}>{s}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {majorName && (
                  <div className="lg:ml-10 text-xs font-semibold tracking-wide text-gray-800">
                    {(t("major") || "Major") + ":"}
                    <div className="mt-2 text-gray-500">{majorName}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-300">
              <div className="flex justify-end">
                {profilePost.hasApplied && inviteStatus ? (
                  <StatusChip status={inviteStatus} />
                ) : membership?.status !== "member" &&
                  membership?.status !== "student" &&
                  (() => {
                    if (myGroupDetails) {
                      const currentMembers =
                        myGroupDetails.currentMembers ||
                        myGroupDetails.members?.length ||
                        0;
                      const maxMembers =
                        myGroupDetails.maxMembers ||
                        myGroupDetails.capacity ||
                        0;
                      if (currentMembers >= maxMembers) {
                        return false;
                      }
                    }
                    return true;
                  })() ? (
                  <button
                    onClick={async () => {
                      if (postId && onInvite) {
                        await onInvite(postId);
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-lg bg-[#FF7A00] hover:opacity-90 px-3 md:px-3.5 py-2 text-xs font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("inviteToGroup") || "Invite to Group"}
                    </span>
                    <span className="sm:hidden">{t("invite") || "Invite"}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

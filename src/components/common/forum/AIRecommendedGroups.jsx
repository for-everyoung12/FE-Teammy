import { Sparkles, Star, Clock, Eye, Calendar, Users } from "lucide-react";
import { Chip, StatusChip } from "./Chip";
import { useTranslation } from "../../../hook/useTranslation";

const clamp3 = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-line",
};

export function AIRecommendedGroups({
  aiSuggestedGroupPosts,
  membership,
  onOpenDetail,
  onApply,
}) {
  const { t } = useTranslation();

  if (!aiSuggestedGroupPosts || aiSuggestedGroupPosts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 md:mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
        <h3 className="text-lg md:text-xl font-bold text-gray-900">
          {t("aiSuggestedGroups") || "AI Recommended Groups for You"}
        </h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
          {aiSuggestedGroupPosts.length}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        {t("aiGroupSuggestionsDesc") ||
          "Groups matched to your major and interests"}
      </p>

      {aiSuggestedGroupPosts.map((suggestion, idx) => {
        const post = suggestion.post || {};
        const postId = post.id;
        const group = post.group || {};
        const groupId = group.groupId;
        const groupName = group.name || "Group";
        const title = post.title || groupName;
        const description = post.description || "";
        const status = post.status || "open";
        const matchScore = suggestion.scorePercent || 0;
        const avatarUrl = group.leader?.avatarUrl || null;
        const currentMembers = post.currentMembers || 0;
        const maxMembers = group.maxMembers || 0;
        const positionNeeded = post.position_needed || "";
        const positions = positionNeeded
          ? positionNeeded
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [];
        const skills = suggestion.matchingSkills || post.skills || [];
        const major = post.major || {};
        const createdAt = post.createdAt || new Date();
        const applicationDeadline = post.applicationDeadline || null;
        const applicationsCount = post.applicationsCount || 0;
        const hasApplied = post.hasApplied || false;
        const myApplicationStatus = post.myApplicationStatus || null;
        const leader = group.leader || {};
        const leaderName = leader.displayName || leader.name || "";
        const aiReason = suggestion.aiReason || "";
        return (
          <div
            key={idx}
            className="relative rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-white p-4 md:p-5 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all"
          >
            <div className="absolute -top-2 -right-2 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg z-10">
              <Star className="w-3 h-3 fill-white" />
              {matchScore}% Match
            </div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-start gap-2 md:gap-3 flex-wrap">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0">
                    {title}
                  </h3>
                  {status && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg shrink-0 ${
                        status === "open"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                  {leaderName ? (
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm md:text-lg font-semibold shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={leaderName}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          leaderName.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="truncate">
                        {leaderName} • {leader.role || t("leader") || "Leader"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm md:text-lg font-semibold shrink-0">
                        {groupName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate">{groupName}</span>
                    </div>
                  )}
                  {leaderName && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">{groupName}</span>
                    </>
                  )}
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col gap-4 md:gap-0 md:text-right text-xs md:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>
                    {applicationsCount}{" "}
                    <span className="hidden sm:inline">
                      {t("applications") || "Applications"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1 md:mt-1">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">
                    {applicationDeadline
                      ? `${t("due") || "Due"}: ${new Date(
                          applicationDeadline
                        ).toLocaleDateString()}`
                      : t("noDeadline") || "No deadline"}
                  </span>
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

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {positions && positions.length > 0 && (
                  <div className="text-xs font-semibold tracking-wide text-gray-800">
                    {(t("positionsNeeded") || "Positions Needed") + ":"}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {positions.map((pos, i) => (
                        <Chip key={i}>{pos.name || pos}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                <div className="lg:ml-10 text-xs font-semibold tracking-wide text-gray-800">
                  {(t("major") || "Major") + ":"}
                  <div className="mt-2 text-gray-500">
                    {major?.majorName || major?.name || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {skills && skills.length > 0 && (
                <div className="text-xs font-semibold tracking-wide text-gray-800">
                  {(t("matchingSkills") || "Matching Skills") + ":"}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <Chip key={i}>
                        {typeof skill === "string"
                          ? skill
                          : skill.name || skill}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-300">
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                <Users className="h-4 w-4" />
                {currentMembers > 0 && (
                  <span>
                    {currentMembers}/{maxMembers} {t("Members") || "Members"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (postId) {
                      onOpenDetail(postId);
                    }
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg px-3 md:px-3.5 py-2 text-xs font-bold shadow-sm hover:border-orange-400 hover:text-orange-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  {t("viewDetails") || "View Details"}
                </button>
                {!membership.hasGroup &&
                  (hasApplied && myApplicationStatus ? (
                    <StatusChip status={myApplicationStatus} />
                  ) : (
                    <button
                      onClick={() => onApply(post, postId, groupId)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg bg-[#FF7A00] px-3 md:px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:!opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {t("applyNow") || "Apply Now"}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

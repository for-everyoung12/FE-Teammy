import React, { useState } from "react";
import { UserPlus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Chip, StatusChip } from "./Chip";
import { initials, timeAgoFrom, toArraySkills } from "../../../utils/helpers";
import { useTranslation } from "../../../hook/useTranslation";

const clamp3 = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "pre-line",
};

export function PersonalCard({
  post,
  userRole,
  onInvite,
  onClickProfile,
  membership,
  myGroupDetails,
  onEdit,
  onDelete,
  currentUserId,
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const inviteStatus = post.hasApplied
    ? post.myApplicationStatus || "pending"
    : null;

  const author = post.user || post.owner || post;
  const authorId =
    author.userId ||
    author.id ||
    author.user?.userId ||
    author.user?.id ||
    author.accountId ||
    author.ownerId ||
    "";
  const name =
    post?.userDisplayName ||
    post?.user?.displayName ||
    post?.name ||
    author?.displayName ||
    "";
  const timeAgo = post?.createdAt
    ? timeAgoFrom(post.createdAt)
    : post?.timeAgo || "";
  const avatarUrl =
    author?.avatarUrl || post?.user?.avatarUrl || post?.ownerAvatarUrl || null;
  const majorName =
    post?.user?.majorName || post?.major?.majorName || author?.majorName || "";

  // Check if current user is the post owner
  const isOwner =
    currentUserId &&
    (authorId === currentUserId ||
      post.userId === currentUserId ||
      post.ownerId === currentUserId);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow relative">
      {/* Menu 3 chấm - chỉ hiển thị cho chủ post */}
      {isOwner && onEdit && onDelete && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors bg-white/80 backdrop-blur-sm border border-gray-200"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(post);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  {t("edit") || "Edit"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete(post.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("delete") || "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div
        className="flex items-start gap-3 cursor-pointer hover:text-gray-800"
        onClick={() => onClickProfile(authorId || author)}
        style={{ paddingRight: isOwner ? "2.5rem" : "0" }}
      >
        <div className="relative mt-1 h-10 w-10 shrink-0">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={name}
              className="h-10 w-10 rounded-full object-cover shadow-sm"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
          )}
          <div
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white"
            style={{ display: avatarUrl ? "none" : "flex" }}
          >
            {initials(name)}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {post.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">
              {name || t("profile") || "Profile"}
            </span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700" style={clamp3}>
        {post.description}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="text-xs font-semibold tracking-wide text-gray-500">
              {(t("skills") || "Skills") + ":"}
              <div className="mt-2 flex flex-wrap gap-2">
                {toArraySkills(post).map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </div>

            <div className="lg:ml-10 text-xs font-semibold tracking-wide text-gray-800">
              {(t("major") || "Major") + ":"}
              <div className="mt-2 text-gray-500">{majorName}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-300">
        {userRole === "leader" && (
          <div className="flex justify-end">
            {membership?.status !== "member" &&
            membership?.status !== "student" &&
            (() => {
              // Kiểm tra xem nhóm đã full thành viên chưa
              if (myGroupDetails) {
                const currentMembers =
                  myGroupDetails.currentMembers ||
                  myGroupDetails.members?.length ||
                  0;
                const maxMembers =
                  myGroupDetails.maxMembers || myGroupDetails.capacity || 0;
                // Nếu nhóm đã full thành viên, ẩn nút invite
                if (currentMembers >= maxMembers) {
                  return false;
                }
              }
              return true;
            })() ? (
              post.hasApplied && inviteStatus ? (
                <StatusChip status={inviteStatus} />
              ) : (
                <button
                  onClick={async () => {
                    await onInvite(post.id);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-[#FF7A00] hover:opacity-90 px-3 md:px-3.5 py-2 text-xs font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("inviteToGroup") || "Invite to Group"}
                  </span>
                  <span className="sm:hidden">{t("invite") || "Invite"}</span>
                </button>
              )
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

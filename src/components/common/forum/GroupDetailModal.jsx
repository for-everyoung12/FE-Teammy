import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
import { Users, Shield } from "lucide-react";
import { PostService } from "../../../services/post.service";
import { useTranslation } from "../../../hook/useTranslation";

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 shrink-0 text-[11px] font-semibold tracking-wide text-gray-500">
        {label}
      </span>
      <div className="text-sm text-gray-800 break-all">{children ?? "—"}</div>
    </div>
  );
}

function StatusChip({ status }) {
  const colorMap = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  const label =
    status === "pending"
      ? "Pending"
      : status === "approved"
      ? "Approved"
      : "Rejected";
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-bold ${
        colorMap[status] || colorMap.pending
      }`}
    >
      {label}
    </span>
  );
}

const GroupDetailModal = ({
  isOpen,
  onClose,
  groupId,
  onApply,
  membership,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const lastFetchedGroupRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !groupId) {
      if (!isOpen) lastFetchedGroupRef.current = null;
      return;
    }
    if (lastFetchedGroupRef.current === groupId) return;
    lastFetchedGroupRef.current = groupId;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await PostService.getRecruitmentPostDetail(groupId);
        if (!mounted) return;
        setGroup(res?.data || res);
      } catch {
        setGroup(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, groupId]);

  const title = useMemo(
    () =>
      group?.title || group?.group?.name || t("groupDetail") || "Group Detail",
    [group, t]
  );
  const maxMembers = group?.group?.maxMembers;
  const currentMembers =
    typeof group?.currentMembers === "number"
      ? group.currentMembers
      : group?.group?.members?.length ?? 0;

  const mentor = group?.group?.mentor || group?.mentor;
  const memberList = [
    ...(group?.group?.leader
      ? [{ ...group.group.leader, isLeader: true }]
      : []),
    ...(group?.group?.members || []),
  ];

  const description = group?.description || group?.group?.description || "";
  const isLongDescription =
    description.split("\n").length > 3 || description.length > 200;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      title={<div className="font-bold text-base">{title}</div>}
      width={780}
      destroyOnClose
      styles={{ body: { paddingTop: 12, paddingBottom: 16 } }}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        ) : !group ? (
          <div className="text-sm text-gray-500">
            {t("noData") || "No results found."}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                {t("descriptionPost") || "Description post"}
              </div>
              <div className="text-sm text-gray-700">
                <div
                  ref={descriptionRef}
                  className="whitespace-pre-line"
                  style={
                    !isDescriptionExpanded && isLongDescription
                      ? {
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                      : {}
                  }
                >
                  {description || "—"}
                </div>
                {isLongDescription && (
                  <button
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    className="mt-2 text-[12px] font-semibold text-black flex items-center gap-1"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <span>{t("showLess") || "Show less"}</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>{t("showMore") || "Show more"}</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="space-y-2">
                <Row label={t("major") || "Major"}>
                  {group.major?.majorName || "—"}
                </Row>
                <Row label={t("positionNeeded") || "Position Needed"}>
                  {group.position_needed || group.positionNeeded || "—"}
                </Row>
                {group.skills && group.skills.length > 0 && (
                  <Row label={t("requiredSkills") || "Skills"}>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {group.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Row>
                )}
                {(group.topicName || group.topic?.title) && (
                  <Row label={t("topic") || "Topic"}>
                    {group.topicName || group.topic?.title}
                  </Row>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">
                  {group.group?.name || title}
                </span>
              </div>

              <div className="mb-3 space-y-1 text-xs text-gray-500">
                <div className="flex flex-wrap gap-2">
                  {(group.group?.status || group.status) && (
                    <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-[2px] text-[11px]">
                      {t("groupStatus") || "Status"}:{" "}
                      <span className="ml-1 font-medium text-gray-700">
                        {group.group?.status || group.status}
                      </span>
                    </span>
                  )}

                  {typeof maxMembers === "number" && (
                    <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-[2px] text-[11px]">
                      {t("groupMembers") || "Members"}:{" "}
                      <span className="ml-1 font-medium text-gray-700">
                        {currentMembers}/{maxMembers}
                      </span>
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  {t("descriptionGroup") || "Description group"}:{" "}
                  {group.group?.description ||
                    group.description ||
                    t("noDescription") ||
                    "No description"}
                </p>
              </div>
              {mentor && (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold text-gray-600">
                    {t("mentor") || "Mentor"}
                  </div>
                  <div className="flex items-center gap-3">
                    {mentor.avatarUrl ? (
                      <img
                        src={mentor.avatarUrl}
                        alt={mentor.displayName || "mentor"}
                        className="h-8 w-8 rounded-full object-cover bg-gray-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                        {(mentor.displayName || "?").charAt(0)}
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-800 break-all">
                        {mentor.displayName || "Unknown"}
                      </span>
                      {mentor.email && (
                        <span className="text-[11px] text-gray-500 break-all">
                          {mentor.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="mb-2 text-xs font-semibold text-gray-600">
                  {(t("Members") || "Members") + ` (${memberList.length})`}
                </div>

                {memberList.length ? (
                  <ul className="space-y-2 text-sm">
                    {memberList.map((m, idx) => (
                      <li
                        key={m.userId || m.id || idx}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.displayName || m.name || "avatar"}
                              className="h-8 w-8 rounded-full object-cover bg-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0">
                              {(m.displayName || m.name || "?").charAt(0)}
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-gray-800 break-all">
                              {m.displayName || m.name || "Unknown"}
                            </span>
                            {m.email && (
                              <span className="text-[11px] text-gray-500 break-all">
                                {m.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {(m.isLeader ||
                          m.role === "leader" ||
                          m.assignedRole === "leader") && (
                          <span className="rounded-full bg-blue-50 px-2 py-[2px] text-[11px] font-semibold text-blue-700">
                            Leader
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-500">
                    {t("noMembers") || "This group has no members yet."}
                  </div>
                )}
              </div>
            </div>

            {!loading &&
              group &&
              onApply &&
              membership &&
              !membership.hasGroup && (
                <div className="flex justify-end pt-3 border-t border-gray-200">
                  {group.hasApplied || group.myApplicationStatus ? (
                    <StatusChip
                      status={group.myApplicationStatus || "pending"}
                    />
                  ) : (
                    <button
                      onClick={() => onApply(group)}
                      className="inline-flex items-center justify-center rounded-lg bg-[#FF7A00] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:!opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {t("applyNow") || "Apply Now"}
                    </button>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GroupDetailModal;

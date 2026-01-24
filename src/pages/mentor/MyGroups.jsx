import React, { useState, useEffect, useMemo } from "react";
import { Card, Progress, Button, Skeleton } from "antd";
import { BookOpen, Target, Calendar, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GroupService } from "../../services/group.service";
import { ReportService } from "../../services/report.service";
import { SemesterService } from "../../services/semester.service";
import { useTranslation } from "../../hook/useTranslation";

export default function MyGroups() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemesterId, setSelectedSemesterId] = useState("all");
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  useEffect(() => {
    fetchMyGroups();
  }, []);

  useEffect(() => {
    const fetchSemesters = async () => {
      setFiltersLoading(true);
      try {
        const res = await SemesterService.list();
        const payload = res?.data ?? res;
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : payload?.items || [];

        setSemesterOptions(
          list
            .map((item) => ({
              id: item.id || item.semesterId || item._id,
              label: formatSemesterLabel(item),
            }))
            .filter((item) => item.id && item.label),
        );
      } catch {
        setSemesterOptions([]);
      } finally {
        setFiltersLoading(false);
      }
    };

    fetchSemesters();
  }, [t]);

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
        value.id ||
        ""
      );
    }
    return String(value);
  };
  const formatSemesterLabel = (value) =>
    formatSemesterValue(value) || t("updating") || "Updating";

  const fetchMyGroups = async () => {
    try {
      setLoading(true);
      const res = await GroupService.getMyGroups();
      const list = Array.isArray(res?.data) ? res.data : [];

      const withProgress = await Promise.all(
        list.map(async (g) => {
          try {
            const reportRes = await ReportService.getProjectReport(g.id);
            const progress = reportRes?.data?.project?.completionPercent ?? 0;
            return { ...g, calculatedProgress: progress };
          } catch {
            return { ...g, calculatedProgress: 0 };
          }
        })
      );

      setGroups(withProgress);
    } finally {
      setLoading(false);
    }
  };

  const normalize = (g) => {
    const semesterEnd = g.semester?.endDate
      ? new Date(g.semester.endDate).toLocaleDateString("vi-VN")
      : "N/A";
    const semesterValue = formatSemesterValue(
      g.semesterLabel || g.semester || g.semesterName,
    );
    const semesterId =
      g.semesterId ||
      g.semester?.id ||
      g.semester?.semesterId ||
      g.semester?.semester_id ||
      g.semester?.semesterCode ||
      g.semester?.code ||
      semesterValue ||
      "";

    const allMembers = [g.leader, ...(g.members || [])].filter(Boolean);

    const getInitials = (name) => {
      if (!name) return "?";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    return {
      id: g.id,
      name: g.name || t("unnamedGroup") || "Nhóm không tên",
      topic: g.topic?.title || t("noTopic") || "Chưa có topic",
      topicDescription:
        g.topic?.description ||
        g.description ||
        t("noDescription") ||
        "Chưa có mô tả.",
      description: g.description || t("noDescription") || "Chưa có mô tả.",
      members: g.currentMembers || 0,
      maxMembers: g.maxMembers || 5,
      progress: g.calculatedProgress || 0,
      status:
        g.calculatedProgress >= 60
          ? t("onTrack") || "Đúng tiến độ"
          : t("needAttention") || "Cần theo dõi",
      memberAvatars: allMembers.slice(0, 4).map((m) => ({
        name: m.displayName || "User",
        avatarUrl: m.avatarUrl,
        initials: getInitials(m.displayName),
      })),
      deadline: semesterEnd,
      semester: g.semester,
      semesterId,
      semesterLabel: formatSemesterLabel(g.semester || semesterValue),
      major: g.major?.majorName || "N/A",
      skills: g.skills || [],
    };
  };

  const normalized = groups.map(normalize);
  const derivedSemesterOptions = useMemo(
    () =>
      Array.from(
        new Map(
          normalized
            .map((g) => ({
              id: g.semesterId,
              label: g.semesterLabel,
            }))
            .filter((item) => item.id && item.label)
            .map((item) => [String(item.id), item]),
        ).values(),
      ),
    [normalized],
  );
  const semesterOptionsToShow =
    semesterOptions.length > 0 ? semesterOptions : derivedSemesterOptions;
  const filtered = normalized.filter((group) => {
    if (selectedSemesterId !== "all") {
      if (String(group.semesterId) !== String(selectedSemesterId)) return false;
    }
    const query = (searchText || "").trim().toLowerCase();
    if (!query) return true;
    const name = (group.name || "").toLowerCase();
    const topic = (group.topic || "").toLowerCase();
    const description = (group.description || "").toLowerCase();
    const major = (group.major || "").toLowerCase();
    const semester = (group.semesterLabel || "").toLowerCase();
    return (
      name.includes(query) ||
      topic.includes(query) ||
      description.includes(query) ||
      major.includes(query) ||
      semester.includes(query)
    );
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-8xl mx-auto">
        <h1 className="text-4xl font-extrabold text-black">
          {t("myGroups") || "My Groups"}
        </h1>
        <p className="text-gray-600 mt-1">
          {t("manageAndTrackGroups") ||
            "Quản lý và theo dõi các nhóm dự án bạn đang hướng dẫn"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-200 bg-white">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full bg-transparent outline-none text-sm text-gray-700"
              placeholder={t("searchGroups") || "Search groups..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
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
        </div>
      </div>

      {/* ---------------------------------- */}
      {/* GROUP LIST - CARD GRID */}
      {/* ---------------------------------- */}
      <div className="w-full mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((index) => (
              <Card
                key={index}
                className="!rounded-2xl !shadow-sm !border !border-gray-200 !h-full"
                bodyStyle={{ padding: "24px" }}
              >
                <div className="flex flex-col h-full space-y-4">
                  {/* Header skeleton */}
                  <div className="flex-1 space-y-3">
                    <Skeleton.Input active size="large" style={{ width: "60%", height: 28 }} />
                    <Skeleton.Input active size="small" style={{ width: "80%", height: 20 }} />
                    <div className="space-y-2">
                      <Skeleton.Input active style={{ width: "100%", height: 16 }} />
                      <Skeleton.Input active style={{ width: "90%", height: 16 }} />
                      <Skeleton.Input active style={{ width: "75%", height: 16 }} />
                    </div>
                  </div>
                  
                  {/* Progress skeleton */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton.Input active size="small" style={{ width: 60, height: 14 }} />
                      <Skeleton.Input active size="small" style={{ width: 40, height: 14 }} />
                    </div>
                    <Skeleton.Input active style={{ width: "100%", height: 8, borderRadius: 4 }} />
                  </div>
                  
                  {/* Members skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton.Avatar key={i} active size={32} shape="circle" />
                      ))}
                    </div>
                    <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
                  </div>
                  
                  {/* Details skeleton */}
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={16} shape="circle" />
                      <Skeleton.Input active size="small" style={{ width: "70%", height: 16 }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={16} shape="circle" />
                      <Skeleton.Input active size="small" style={{ width: "65%", height: 16 }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton.Avatar active size={16} shape="circle" />
                      <Skeleton.Input active size="small" style={{ width: "60%", height: 16 }} />
                    </div>
                  </div>
                  
                  {/* Skills skeleton */}
                  <div>
                    <Skeleton.Input active size="small" style={{ width: 50, height: 12, marginBottom: 8 }} />
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton.Input key={i} active size="small" style={{ width: 60 + i * 10, height: 24, borderRadius: 12 }} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Button skeleton */}
                  <div className="pt-2 mt-auto">
                    <Skeleton.Button active size="large" block style={{ height: 40, borderRadius: 8 }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>{t("noGroups") || "Chưa có nhóm nào"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filtered.map((g) => (
              <Card
                key={g.id}
                className="!rounded-2xl !shadow-sm !border !border-gray-200 hover:!shadow-lg !transition-all hover:!border-blue-300 !h-full !flex !flex-col"
                bodyStyle={{ display: "flex", flexDirection: "column", flex: 1, padding: "24px" }}
              >
                <div className="flex flex-col h-full space-y-4">
                  {/* Header */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {g.name}
                    </h2>
                    <p className="text-sm text-gray-600 font-medium mb-3">
                      {g.topic}
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
                      {g.topicDescription}
                    </p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-500 font-medium">
                        {t("progress") || "Progress"}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {g.progress}%
                      </span>
                    </div>
                    <Progress
                      percent={g.progress}
                      strokeColor="#3b82f6"
                      trailColor="#e5e7eb"
                      showInfo={false}
                      className="!mb-4"
                    />
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {g.memberAvatars.slice(0, 4).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium overflow-hidden border-2 border-white"
                          title={member.name}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span>{member.initials}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm">
                      {g.members}/{g.maxMembers} {t("members") || "members"}
                    </span>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-medium">{t("major") || "Major"}:</span> {g.major}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>
                        <span className="font-medium">{t("deadline") || "Deadline"}:</span> {g.deadline}
                      </span>
                    </div>
                    {g.semester && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          <span className="font-medium">{t("semester") || "Semester"}:</span> {g.semester.season}{" "}
                          {g.semester.year}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {g.skills && g.skills.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-2 font-medium">
                        {t("skills") || "Skills"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.skills.slice(0, 6).map((skill, idx) => {
                          const skillName = typeof skill === "string" ? skill : (skill?.token || skill?.name || skill);
                          return (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                            >
                              {skillName}
                            </span>
                          );
                        })}
                        {g.skills.length > 6 && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                            +{g.skills.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2 mt-auto">
                    <Button
                      type="primary"
                      htmlType="button"
                      className="!rounded-lg !w-full !h-10 !font-medium !bg-[#4264d7] hover:!bg-[#3651b8] !border-none"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (g.id) {
                          navigate(`/mentor/my-groups/${g.id}`);
                        }
                      }}
                    >
                      {t("viewDetails") || "View Details"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

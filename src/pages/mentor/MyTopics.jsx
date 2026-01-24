import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { TopicService } from "../../services/topic.service";
import { SemesterService } from "../../services/semester.service";
import { MajorService } from "../../services/major.service";
import { useTranslation } from "../../hook/useTranslation";
import ProjectCard from "../../components/common/discover/ProjectCard";
import TopicDetailModal from "../../components/common/discover/TopicDetailModal";

const MyTopics = () => {
  const { t } = useTranslation();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("all");
  const [selectedMajorId, setSelectedMajorId] = useState("all");
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [detailModalState, setDetailModalState] = useState({
    open: false,
    topic: null,
    loading: false,
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await TopicService.getOwnedOpenTopics();
      const data = Array.isArray(res?.data) ? res.data : [];
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const mappedTopics = useMemo(() => {
    return (topics || []).map((topic) => ({
      ...topic,
      topicId: topic.topicId || topic.id,
      title: topic.title || topic.topicName || "Untitled",
      description: topic.description || "",
      domain: topic.majorName || topic.major?.name || "General",
      majorId: topic.majorId || topic.major?.id || topic.major?.majorId,
      majorName: topic.majorName || topic.major?.name || "",
      semesterId:
        topic.semesterId ||
        topic.semester?.id ||
        topic.semester?.semesterId ||
        topic.semester?.semester_id ||
        "",
      semesterLabel:
        topic.semesterLabel ||
        topic.semester?.name ||
        topic.semester?.semesterName ||
        topic.semester?.code ||
        topic.semester?.semesterCode ||
        "",
      semester: topic.semester || topic.semesterLabel || topic.semesterName,
      status: topic.status || "open",
      tags: [topic.status || "open"],
      mentor:
        (topic.mentors &&
          topic.mentors[0] &&
          (topic.mentors[0].mentorName || topic.mentors[0].name)) ||
        topic.createdByName ||
        "",
      mentors: topic.mentors || [],
      createdAt: topic.createdAt,
      attachedFiles: topic.attachedFiles || [],
      referenceDocs: topic.referenceDocs || [],
      registrationFile: topic.registrationFile || null,
      topicSkills: topic.skills || [],
      groups: topic.groups || [],
    }));
  }, [topics]);
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
  const formatSemesterLabel = (value) =>
    formatSemesterValue(value) || t("updating") || "Updating";
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
            .filter((item) => item.id && item.label)
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
  }, [t]);
  const derivedSemesterOptions = Array.from(
    new Map(
      mappedTopics
        .map((topic) => ({
          id: topic.semesterId,
          label: formatSemesterLabel(topic.semesterLabel || topic.semester),
        }))
        .filter((item) => item.id)
        .map((item) => [String(item.id), item])
    ).values()
  );
  const derivedMajorOptions = Array.from(
    new Map(
      mappedTopics
        .map((topic) => ({
          id: topic.majorId,
          label: topic.majorName || topic.domain,
        }))
        .filter((item) => item.id && item.label)
        .map((item) => [String(item.id), item])
    ).values()
  );
  const semesterOptionsToShow =
    semesterOptions.length > 0 ? semesterOptions : derivedSemesterOptions;
  const majorOptionsToShow =
    majorOptions.length > 0 ? majorOptions : derivedMajorOptions;
  const filteredTopics = useMemo(() => {
    const query = (searchText || "").trim().toLowerCase();
    const semesterFilter = selectedSemesterId || "all";
    const majorIdFilter = selectedMajorId || "all";
    return mappedTopics.filter((topic) => {
      if (semesterFilter !== "all") {
        if (String(topic.semesterId) !== String(semesterFilter)) return false;
      }
      if (majorIdFilter !== "all") {
        if (String(topic.majorId) !== String(majorIdFilter)) return false;
      }
      if (!query) return true;
      const title = (topic.title || "").toLowerCase();
      const description = (topic.description || "").toLowerCase();
      const domain = (topic.domain || "").toLowerCase();
      const mentor = (topic.mentor || "").toLowerCase();
      const skills = Array.isArray(topic.topicSkills)
        ? topic.topicSkills.join(" ").toLowerCase()
        : "";
      return (
        title.includes(query) ||
        description.includes(query) ||
        domain.includes(query) ||
        mentor.includes(query) ||
        skills.includes(query)
      );
    });
  }, [mappedTopics, searchText, selectedMajorId, selectedSemesterId]);

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
        };

        setDetailModalState({
          open: true,
          topic: mergedTopic,
          loading: false,
        });
      } else {
        setDetailModalState({ open: true, topic, loading: false });
      }
    } catch {
      setDetailModalState({ open: true, topic, loading: false });
    }
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
            {t("topics") || "Topics"}
          </h1>
          <p className="text-gray-600">
            {t("browseAllTopics") || "Topics assigned to you."}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full bg-transparent outline-none text-sm"
                placeholder={t("searchTopics") || "Search topics..."}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
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
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              {t("noTopicsFound") || "No topics found."}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTopics.map((topic) => (
                <ProjectCard
                  key={topic.topicId}
                  project={topic}
                  onViewDetail={handleViewTopicDetail}
                  hasGroupTopic
                />
              ))}
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
        detailLoading={detailModalState.loading}
        hasGroupTopic
        membership={{ status: "mentor" }}
      />
    </div>
  );
};

export default MyTopics;

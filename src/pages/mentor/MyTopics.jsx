import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { TopicService } from "../../services/topic.service";
import { useTranslation } from "../../hook/useTranslation";
import ProjectCard from "../../components/common/discover/ProjectCard";
import TopicDetailModal from "../../components/common/discover/TopicDetailModal";

const MyTopics = () => {
  const { t } = useTranslation();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
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
      domain: topic.majorName || "General",
      majorId: topic.majorId,
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
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : mappedTopics.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              {t("noTopicsFound") || "No topics found."}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {mappedTopics.map((topic) => (
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

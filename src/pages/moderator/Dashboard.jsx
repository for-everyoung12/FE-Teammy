import React, { useEffect, useState } from "react";
import { Card, Badge, Spin, notification, Table, Tag, Select } from "antd";
import {
  ExclamationCircleOutlined,
  TeamOutlined,
  UserOutlined,
  BulbOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import { useTranslation } from "../../hook/useTranslation";
import { AdminService } from "../../services/admin.service";
import { GroupService } from "../../services/group.service";
import { TopicService } from "../../services/topic.service";
import { SemesterService } from "../../services/semester.service";
const { Option } = Select;

const ModeratorDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  useEffect(() => {
    fetchSemesters();
    fetchGroups();
    fetchTopics();
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;
    fetchDashboardData(selectedSemesterId);
  }, [selectedSemesterId]);

  const fetchSemesters = async () => {
    try {
      const res = await SemesterService.list();
      const payload = res?.data?.data || res?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      setSemesterList(list);
      const active = list.find((s) => s?.isActive);
      setSelectedSemesterId(active?.semesterId || list[0]?.semesterId || null);
    } catch {
      notification.error({
        message: t("error"),
        description: "Failed to load semesters",
      });
    }
  };

  const fetchDashboardData = async (semesterId) => {
    try {
      setLoading(true);
      const response = await AdminService.getDashboardModerator({
        semesterId,
      });
      if (response?.data) setDashboardData(response.data);
    } catch {
      notification.error({
        message: t("error"),
        description: "Failed to load dashboard statistics",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await GroupService.getListGroup();
      if (response?.data) setGroups(response.data.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      const response = await TopicService.getTopics({ pageSize: 5 });
      if (response?.data) {
        const topicsData = Array.isArray(response.data)
          ? response.data
          : response.data.items || [];
        setTopics(topicsData.slice(0, 5));
      }
    } catch (error) {
      console.error("Failed to fetch topics:", error);
    } finally {
      setLoadingTopics(false);
    }
  };

  const stats = [
    {
      title: t("totalGroups") || "Total Groups",
      value: dashboardData?.totalGroups ?? 0,
      icon: <TeamOutlined className="text-white text-xl" />,
      bg: "from-blue-500 to-cyan-400",
    },
    {
      title: t("groupsMissingTopic") || "Groups Missing Topic",
      value: dashboardData?.groupsWithoutTopic ?? 0,
      icon: <BulbOutlined className="text-white text-xl" />,
      bg: "from-amber-500 to-orange-400",
    },
    {
      title: t("groupsMissingMember") || "Groups Missing Member",
      value: dashboardData?.groupsWithoutMember ?? 0,
      icon: <UserOutlined className="text-white text-xl" />,
      bg: "from-violet-500 to-fuchsia-400",
    },
    {
      title: t("studentsWithoutGroup") || "Students Without Group",
      value: dashboardData?.studentsWithoutGroup ?? 0,
      icon: <AlertOutlined className="text-white text-xl" />,
      bg: "from-rose-500 to-red-400",
    },
  ];

  const groupColumns = [
    {
      title: t("groupName") || "Group Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: t("topic") || "Topic",
      dataIndex: "topic",
      key: "topic",
      ellipsis: true,
      render: (topic) => topic?.title || t("noTopic") || "No Topic",
    },
    {
      title: t("mentors") || "Mentorswwww",
      dataIndex: "mentor",
      key: "mentor",
      render: (m) => m?.displayName || "N/A",
    },
    {
      title: t("Members") || "Members",
      key: "members",
      render: (_, r) => `${r.currentMembers || 0}/${r.maxMembers || 0}`,
    },
    {
      title: t("status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const s = String(status || "").toLowerCase();

        const map = {
          recruiting: {
            badge: "warning",
            text: t("recruiting") || "Recruiting",
          },
          active: {
            badge: "success",
            text: t("active") || "Active",
          },
          closed: {
            badge: "error",
            text: t("closed") || "Closed",
          },
        };

        const meta = map[s] || { badge: "default", text: status || "N/A" };

        return <Badge status={meta.badge} text={meta.text} />;
      },
    },
  ];

  const topicColumns = [
    {
      title: t("topicName") || "Topic Name",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    { title: t("major") || "Major", dataIndex: "majorName", key: "majorName" },
    {
      title: t("mentors") || "Mentors",
      dataIndex: "mentors",
      key: "mentors",
      render: (mentors) =>
        !mentors || mentors.length === 0
          ? "N/A"
          : mentors.map((m) => m.mentorName).join(", "),
    },
    {
      title: t("status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const s = String(status || "").toLowerCase();

        const statusType =
          s === "open" ? "success" : s === "closed" ? "error" : "default";
        const text =
          s === "open"
            ? t("open") || "Open"
            : s === "closed"
            ? t("closed") || "Closed"
            : status || "N/A";

        return <Badge status={statusType} text={text} />;
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="inline-block text-2xl sm:text-3xl lg:text-4xl font-extrabold">
            Dashboard
          </h1>

          {dashboardData?.semesterLabel && (
            <Tag color="geekblue" className="rounded-full px-3 py-1">
              {dashboardData.semesterLabel}
            </Tag>
          )}
        </div>
        <Select
          value={selectedSemesterId}
          onChange={(value) => setSelectedSemesterId(value)}
          className="w-60"
          placeholder={t("selectSemester") || "Select semester"}
        >
          {semesterList.map((s) => (
            <Option key={s.semesterId} value={s.semesterId}>
              {`${s.season || ""} ${s.year || ""}`.trim()}
            </Option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item, index) => (
          <Card
            key={index}
            className="shadow-lg border border-gray-100 rounded-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-105"
            bodyStyle={{ padding: 24 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">
                  {item.title}
                </h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {item.value}
                </p>
              </div>

              <div
                className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${item.bg}
                            flex items-center justify-center shadow-md`}
              >
                {item.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card
          title={
            <div className="flex items-center gap-2">
              <TeamOutlined className="text-blue-500" />
              <span>{t("recentGroups") || "Recent Groups"}</span>
            </div>
          }
          className="shadow-lg border-gray-100 rounded-lg"
        >
          <Table
            columns={groupColumns}
            dataSource={groups}
            loading={loadingGroups}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <BulbOutlined className="text-orange-500" />
              <span>{t("recentTopics") || "Recent Topics"}</span>
            </div>
          }
          className="shadow-lg border-gray-100 rounded-lg"
        >
          <Table
            columns={topicColumns}
            dataSource={topics}
            loading={loadingTopics}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </div>
    </div>
  );
};

export default ModeratorDashboard;

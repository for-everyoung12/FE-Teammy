import React, { useEffect, useMemo, useState } from "react";
import { Card, Spin, notification, Tag, Select } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ProjectOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AdminService } from "../../services/admin.service";
import { useTranslation } from "../../hook/useTranslation";
import { SemesterService } from "../../services/semester.service";
const { Option } = Select;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [majorsData, setMajorsData] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  useEffect(() => {
    fetchSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;
    fetchDashboardData(selectedSemesterId);
    fetchMajorsData(selectedSemesterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemesterId]);

  const fetchSemesters = async () => {
    try {
      const res = await SemesterService.list();
      const payload = res?.data?.data || res?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      setSemesterList(list);
      const active = list.find((s) => s?.isActive);
      setSelectedSemesterId(
        active?.semesterId || list[0]?.semesterId || null
      );
    } catch {
      notification.error({
        message: t("error") || "Error",
        description: "Failed to load semesters",
      });
    }
  };

  const fetchDashboardData = async (semesterId) => {
    try {
      setLoading(true);
      const response = await AdminService.getDashboardStats({
        semesterId,
      });
      if (response?.data) setDashboardData(response.data);
    } catch {
      notification.error({
        message: t("error") || "Error",
        description: "Failed to load dashboard statistics",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMajorsData = async (semesterId) => {
    try {
      const response = await AdminService.getMajorStats(
        { semesterId },
        false
      );
      const stats = Array.isArray(response?.data) ? response.data : [];

      const chartData = stats
        .map((major) => ({
          name: major.majorName || "Unknown",
          studentCount: major.studentCount ?? 0,
          studentsWithoutGroup: major.studentsWithoutGroup ?? 0,
          groupCount: major.groupCount ?? 0,
        }))
        .filter(
          (x) =>
            x.studentCount > 0 || x.studentsWithoutGroup > 0 || x.groupCount > 0
        )
        .sort((a, b) => b.studentCount - a.studentCount);

      setMajorsData(chartData);
    } catch {
      // eslint-disable-next-line no-console
    }
  };

  const cardThemes = useMemo(
    () => [
      { ring: "ring-blue-200/60", grad: "from-blue-500 to-indigo-500" },
      { ring: "ring-emerald-200/60", grad: "from-emerald-500 to-teal-500" },
      { ring: "ring-orange-200/60", grad: "from-orange-500 to-rose-500" },
      { ring: "ring-violet-200/60", grad: "from-violet-500 to-fuchsia-500" },
      { ring: "ring-cyan-200/60", grad: "from-cyan-500 to-sky-500" },
      { ring: "ring-amber-200/60", grad: "from-amber-500 to-orange-500" },
      { ring: "ring-slate-200/60", grad: "from-slate-600 to-slate-800" },
      { ring: "ring-lime-200/60", grad: "from-lime-500 to-emerald-500" },
      { ring: "ring-pink-200/60", grad: "from-pink-500 to-rose-500" },
    ],
    []
  );

  const cards = [
    {
      title: t("totalUsers") || "Total Users",
      value: dashboardData?.totalUsers || 0,
      icon: <UserOutlined />,
    },
    {
      title: t("activeUsers7d") || "Active Users (7d)",
      value: dashboardData?.activeUsers || 0,
      icon: <UserAddOutlined />,
    },
    {
      title: t("totalGroups") || "Total Groups",
      value: dashboardData?.totalGroups || 0,
      icon: <TeamOutlined />,
    },
    {
      title: t("groupsWithMentor") || "Groups with Mentor",
      value: dashboardData?.recruitingGroups || 0,
      icon: <TeamOutlined />,
    },
    {
      title: t("totalTopics") || "Total Topics",
      value: dashboardData?.totalTopics || 0,
      icon: <ProjectOutlined />,
    },
    {
      title: t("openTopics") || "Open Topics",
      value: dashboardData?.openTopics || 0,
      icon: <ClockCircleOutlined />,
    },
    {
      title: t("totalPosts") || "Total Posts",
      value: dashboardData?.totalPosts || 0,
      icon: <ProjectOutlined />,
    },
    {
      title: t("groupPosts") || "Group Posts",
      value: dashboardData?.groupPosts || 0,
      icon: <TeamOutlined />,
    },
    {
      title: t("profilePosts") || "Profile Posts",
      value: dashboardData?.profilePosts || 0,
      icon: <UserOutlined />,
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">
            {t("dashboard") || "Dashboard"}
          </h1>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => {
          const theme = cardThemes[i % cardThemes.length];

          return (
            <Card
              key={i}
              className={`relative overflow-hidden rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all`}
              styles={{ body: { padding: 18 } }}
            >
              <div
                className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${theme.grad}`}
              />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm">{card.title}</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">
                    {typeof card.value === "number"
                      ? card.value.toLocaleString()
                      : card.value}
                  </p>
                </div>

                <div
                  className={`h-11 w-11 rounded-2xl grid place-items-center text-white shadow-sm bg-gradient-to-br ${theme.grad} ring-4 ${theme.ring}`}
                >
                  <span className="text-xl">{card.icon}</span>
                </div>
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full w-2/3 bg-gradient-to-r ${theme.grad}`}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {t("majorsDistribution") || "Majors Distribution"}
              </span>
              <span className="text-xs text-slate-500">
                •{" "}
                {t("studentDistributionMajors") ||
                  "Student & group statistics across majors"}
              </span>
            </div>
          }
          className="rounded-2xl border border-slate-100 shadow-sm"
          styles={{
            header: { borderBottom: "1px solid #f1f5f9" },
            body: { padding: 16 },
          }}
        >
          {majorsData.length > 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-orange-50 p-3">
              <ResponsiveContainer width="100%" height={480}>
                <BarChart
                  data={majorsData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 24, bottom: 10 }}
                  barCategoryGap={14}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={190}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) =>
                      `${t("major") || "Major"}: ${label}`
                    }
                  />
                  <Legend verticalAlign="top" height={36} />

                  <Bar
                    dataKey="studentCount"
                    name={t("students") || "Students"}
                    fill="#3B82F6"
                    radius={[8, 8, 8, 8]}
                    barSize={14}
                  />
                  <Bar
                    dataKey="studentsWithoutGroup"
                    name={t("studentsWithoutGroup") || "Students without group"}
                    fill="#F97316"
                    radius={[8, 8, 8, 8]}
                    barSize={14}
                  />
                  <Bar
                    dataKey="groupCount"
                    name={t("groups") || "Groups"}
                    fill="#22C55E"
                    radius={[8, 8, 8, 8]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-[420px] text-slate-400">
              {t("noData") || "No data available"}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

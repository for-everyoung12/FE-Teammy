import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Tooltip,
  notification,
} from "antd";
import { SearchOutlined, EyeOutlined, BellOutlined } from "@ant-design/icons";
import GroupDetailModal from "../../components/moderator/GroupDetailModal";
import { useTranslation } from "../../hook/useTranslation";
import { GroupService } from "../../services/group.service";
import { MajorService } from "../../services/major.service";
const { Option } = Select;

export default function GroupManagement() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    status: "All Status",
    major: "All Major",
    search: "",
  });

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [majorList, setMajorList] = useState([]);
  useEffect(() => {
    let mounted = true;

    const fetchGroups = async () => {
      setLoading(true);
      try {
        const res = await GroupService.getListGroup();
        const arr = Array.isArray(res?.data) ? res.data : [];
        const mapped = arr.map((g, idx) => {
          const mentorObj =
            g?.mentor ??
            (Array.isArray(g?.mentors) && g.mentors.length > 0
              ? g.mentors[0]
              : null);

          const mentorName =
            (typeof mentorObj === "string" ? mentorObj : null) ||
            mentorObj?.displayName ||
            mentorObj?.fullName ||
            mentorObj?.name ||
            mentorObj?.mentorName ||
            mentorObj?.email ||
            g?.mentorName ||
            "Not Assigned";
          const membersCount = Number.isFinite(Number(g?.currentMembers))
            ? g.currentMembers
            : 0;
          const capacity = Number.isFinite(Number(g?.maxMembers))
            ? g.maxMembers
            : 5;
          const status =
            g?.status && typeof g.status === "string"
              ? g.status.charAt(0).toUpperCase() + g.status.slice(1)
              : "Active";
          return {
            key: String(g?.groupId || g?.id || `G-${idx + 1}`),
            groupName: g?.name || g?.title || `Group ${idx + 1}`,
            topic: g?.topic?.title || g?.topicTitle || "Not Assigned",
            mentor: mentorName || "Not Assigned",
            members: membersCount,
            capacity,
            isFull: membersCount >= capacity,
            major:
              g?.field ||
              g?.major?.majorName ||
              g?.major?.name ||
              (typeof g?.major === "string" ? g.major : "") ||
              "",
            status,
            membersDetail: Array.isArray(g?.memberPreview)
              ? g.memberPreview
              : [],
            raw: g,
          };
        });
        if (mounted) setRows(mapped);
      } catch {
        notification.error({
          message: t("failedLoadGroups") || "Failed to load groups",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchMajors = async () => {
      try {
        const res = await MajorService.getMajors();
        const payload = res?.data ?? res;
        if (mounted) {
          setMajorList(Array.isArray(payload) ? payload : []);
        }
      } catch {
        notification.error({
          message: t("failedLoadMajors") || "Failed to load majors",
        });
      }
    };

    fetchGroups();
    fetchMajors();

    return () => {
      mounted = false;
    };
  }, [t]);

  const columns = [
    {
      title: t("groupName") || "Group Name",
      dataIndex: "groupName",
      key: "groupName",
      render: (text) => (
        <span className="font-medium text-gray-800 hover:text-blue-600 transition">
          {text}
        </span>
      ),
    },
    {
      title: t("topics") || "Topic",
      dataIndex: "topic",
      key: "topic",
      render: (text) =>
        text === "Not Assigned" ? (
          <Tag color="orange">{t("notAssigned") || "Not Assigned"}</Tag>
        ) : (
          <span>{text}</span>
        ),
    },
    {
      title: t("mentor") || "Mentor",
      dataIndex: "mentor",
      key: "mentor",
      render: (text) =>
        text === "Not Assigned" ? (
          <Tag color="orange">{t("notAssigned") || "Not Assigned"}</Tag>
        ) : (
          <span>{text}</span>
        ),
    },
    {
      title: t("Members") || "Members",
      key: "members",
      align: "center",
      render: (_, r) => {
        const full = r.isFull || (r.capacity ? r.members >= r.capacity : false);
        const text = r.capacity ? `${r.members}/${r.capacity}` : r.members;
        return <Tag color={full ? "green" : "blue"}>{text}</Tag>;
      },
    },
    { title: t("major") || "Major", dataIndex: "major", key: "major" },
    {
      title: t("status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          Recruiting: "orange",
          Pending: "yellow",
          Active: "green",
        };
        return (
          <Tag
            color={colorMap[status]}
            className="px-3 py-1 rounded-full font-medium"
          >
            {status}
          </Tag>
        );
      },
    },
    {
      title: t("actions") || "Actions",
      key: "actions",
      render: (_, record) => {
        return (
          <Space size="small">
            <Tooltip title={t("viewDetails") || "View details"}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={async () => {
                  try {
                    const res = await GroupService.getGroupDetail(record.key);
                    if (res?.data) {
                      setCurrent(res.data);
                      setOpen(true);
                    }
                  } catch {
                    notification.error({
                      message:
                        t("failedLoadGroupDetail") ||
                        "Failed to load group detail",
                    });
                  }
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const filteredRows = rows.filter((item) => {
    const s = filters.search.toLowerCase();
    const searchMatch =
      item.groupName.toLowerCase().includes(s) ||
      item.mentor.toLowerCase().includes(s);
    const majorMatch =
      filters.major === "All Major" || item.major === filters.major;
    const statusMatch =
      filters.status === "All Status" || item.status === filters.status;
    return searchMatch && majorMatch && statusMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="inline-block text-2xl sm:text-3xl lg:text-4xl font-extrabold">
          {t("groupManagement") || "Group Management"}
        </h1>
      </div>
      <Card className="shadow-sm border-gray-100 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder={
              t("searchByGroupOrMentor") || "Search by group name or mentor..."
            }
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-1/2"
          />
          <div className="flex gap-2">
            <Select
              value={filters.major}
              onChange={(v) => setFilters({ ...filters, major: v })}
              className="w-60"
            >
              <Option value="All Major">{t("allMajor") || "All Major"}</Option>
              {majorList.map((m) => (
                <Option key={m.majorId} value={m.majorName}>
                  {m.majorName}
                </Option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
              className="w-50"
            >
              <Option value="All Status">
                {t("allStatus") || "All Status"}
              </Option>
              <Option value="Active">{t("active") || "Active"}</Option>
              <Option value="Recruiting">
                {t("recruiting") || "Recruiting"}
              </Option>
              <Option value="Closed">{t("closed") || "Closed"}</Option>
            </Select>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filteredRows}
          pagination={{ pageSize: 5 }}
          bordered
          loading={loading}
          scroll={{ x: "max-content" }}
          className="rounded-lg mt-5"
        />
      </Card>

      <GroupDetailModal
        open={open}
        onClose={() => setOpen(false)}
        group={current}
      />
    </div>
  );
}

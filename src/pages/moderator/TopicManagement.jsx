import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "../../hook/useTranslation";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Tooltip,
  notification,
  Modal,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import TopicDetailModal from "../../components/moderator/TopicDetailModal";
import TopicAddModal from "../../components/moderator/TopicAddModal";
import TopicEditModal from "../../components/moderator/TopicEditModal";
import { TopicService } from "../../services/topic.service";
import { GroupService } from "../../services/group.service";
const { Option } = Select;

const TopicManagement = () => {
  const [filters, setFilters] = useState({
    status: "All Status",
    search: "",
  });

  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentTopicId, setCurrentTopicId] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTopicsList = async () => {
    setLoading(true);
    try {
      const res = await TopicService.getTopics();
      const payload = res?.data ?? res;
      const list = Array.isArray(payload) ? payload : payload?.data ?? [];

      const groupRes = await GroupService.getListGroup();
      const groupList = Array.isArray(groupRes?.data) ? groupRes.data : [];

      const mapped = (list || []).map((t, idx) => {
        const assignedGroup = groupList.find(
          (g) => g.topic?.topicId === t.topicId
        );

        return {
          key: t.topicId || idx,
          topicName: t.title || "",
          description: t.description || "",
          mentorName:
            (t.mentors && t.mentors.length > 0
              ? t.mentors.map((m) => m.mentorName).join(", ")
              : "") ||
            t.createdByName ||
            "",
          majorName: t.majorName || "",
          createdAt: t.createdAt ? t.createdAt.slice(0, 10) : "",
          status: (t.status || "open").toLowerCase(),
          groupName: assignedGroup?.name || t.pendingGroupName || "",
          hasGroup:
            !!assignedGroup ||
            String(t.status || "").toLowerCase() === "closed",
          raw: t,
        };
      });

      setTopics(mapped);
    } catch {
      notification.error({
        message: t("failedLoadTopics") || "Failed to load topics",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = topics;

  const getStatus = (row) => row?.status || "available";

  const filteredData = useMemo(() => {
    const s = filters.search.toLowerCase().trim();

    return data.filter((item) => {
      const searchMatch =
        item.topicName.toLowerCase().includes(s) ||
        item.mentorName.toLowerCase().includes(s) ||
        item.majorName.toLowerCase().includes(s);

      const statusStr = getStatus(item);
      const statusMatch =
        filters.status === "All Status" || statusStr === filters.status;

      return searchMatch && statusMatch;
    });
  }, [data, filters]);

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleEdit = (record) => {
    setCurrentTopic(record.raw);
    setIsEditModalOpen(true);
  };

  const handleDelete = (record) => {
    if (record.hasGroup) {
      notification.info({
        message: t("cannotDeleteTopic") || "Cannot Delete Topic",
        description:
          t("topicAlreadyAssigned") ||
          `This topic has been assigned to group "${record.groupName}" and cannot be deleted.`,
      });
      return;
    }

    Modal.confirm({
      title: t("confirmDelete") || "Delete Topic",
      content: `${
        t("confirmDeleteTopic") || "Are you sure you want to delete"
      } "${record.topicName}"?`,
      centered: true,
      okText: t("delete") || "Delete",
      cancelText: t("cancel") || "Cancel",
      okButtonProps: {
        className:
          "!bg-red-500 !text-white !border-none !rounded-md !px-4 !py-2 hover:!opacity-90",
      },
      cancelButtonProps: {
        className:
          "!border-gray-300 hover:!border-orange-400 hover:!text-orange-400 transition-all !py-2",
      },
      onOk: async () => {
        try {
          await TopicService.deleteTopic(record.key);
          notification.success({
            message: t("topicDeleted") || "Topic deleted successfully",
          });
          fetchTopicsList();
        } catch {
          notification.error({
            message: t("failedDeleteTopic") || "Failed to delete topic",
          });
        }
      },
    });
  };

  const columns = [
    {
      title: t("topics") || "Topic",
      dataIndex: "topicName",
      key: "topicName",
      render: (text) => (
        <span className="font-medium text-gray-800 hover:text-blue-600 transition">
          {text}
        </span>
      ),
    },
    {
      title: t("assignedGroup") || "Assigned Group",
      dataIndex: "groupName",
      key: "groupName",
      render: (groupName) =>
        groupName ? (
          <span className="text-blue-600 font-medium">{groupName}</span>
        ) : (
          <span className="text-gray-400 italic">
            {t("notAssigned") || "Not assigned"}
          </span>
        ),
    },
    {
      title: t("mentor") || "Mentor",
      dataIndex: "mentorName",
      key: "mentorName",
    },
    { title: t("major") || "Major", dataIndex: "majorName", key: "majorName" },
    {
      title: t("createdDate") || "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: t("status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === "open"
              ? "text-green-600 bg-green-50"
              : "text-orange-600 bg-orange-50"
          }`}
        >
          {status === "open" ? t("open") || "Open" : t("closed") || "Closed"}
        </span>
      ),
    },

    {
      title: t("actions") || "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title={t("viewDetails") || "View details"}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setCurrentTopic(record.raw);
                setCurrentTopicId(record.key);
                setIsModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t("edit") || "Edit"}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip
            title={
              record.hasGroup
                ? t("cannotDeleteAssignedTopic") ||
                  "Cannot delete assigned topic"
                : t("delete") || "Delete"
            }
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              className={
                record.hasGroup ? "!cursor-not-allowed !opacity-50" : ""
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="inline-block text-2xl sm:text-3xl lg:text-4xl font-extrabold">
          {t("topicManagement") || "Topic Management"}
        </h1>
        <Space className="flex-wrap">
          <Button
            icon={<PlusOutlined />}
            onClick={handleCreate}
            className="!bg-[#FF7A00] !text-white !border-none !rounded-md !px-6 !py-5 hover:!opacity-90"
          >
            <span className="hidden sm:inline">
              {t("createTopic") || "Create Topic"}
            </span>
          </Button>
          <Button
            icon={<UploadOutlined />}
            className="!border-gray-300 hover:!border-orange-400 hover:!text-orange-400 transition-all !py-5"
            onClick={() => navigate("/moderator/import-topics")}
          >
            <span className="hidden sm:inline">
              {t("importTopics") || "Import Topics"}
            </span>
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1  gap-6">
        <Card className="xl:col-span-3 shadow-sm border-gray-100 rounded-lg">
          <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder={
                t("searchByTopicOrMentor") ||
                "Search by topic title or mentor..."
              }
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="sm:w-1/2"
            />
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onChange={(v) => setFilters({ ...filters, status: v })}
                className="w-40"
              >
                <Option value="All Status">
                  {t("allStatus") || "All Status"}
                </Option>
                <Option value="open">{t("open") || "Open"}</Option>
                <Option value="closed">{t("closed") || "Closed"}</Option>
              </Select>
            </div>
          </div>

          <Table
            rowKey="key"
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 8 }}
            bordered
            scroll={{ x: "max-content" }}
            className="rounded-lg"
          />
        </Card>
      </div>

      <TopicAddModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTopicsList}
      />

      <TopicEditModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        topic={currentTopic}
        onSuccess={fetchTopicsList}
      />
      <TopicDetailModal
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        topicDetails={currentTopic}
        topicId={currentTopicId}
      />
    </div>
  );
};

export default TopicManagement;

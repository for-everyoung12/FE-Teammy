import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  Select,
  Input,
  Button,
  Tag,
  Space,
  notification,
  Spin,
  List,
  Avatar,
  Checkbox,
  Typography,
  Divider,
  Modal,
} from "antd";
import {
  BellOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  SendOutlined,
  FieldTimeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "../../hook/useTranslation";
import { AdminService } from "../../services/admin.service";
import { SemesterService } from "../../services/semester.service";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const scopeMap = {
  withoutTopic: "groups_without_topic",
  withoutMembers: "groups_understaffed",
  withoutGroups: "students_without_group",
};

const formatDateDMY = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

export default function ModeratorNotifications() {
  const { t } = useTranslation();

  const [filterType, setFilterType] = useState("withoutTopic");
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [overview, setOverview] = useState(null);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  const [isDirty, setIsDirty] = useState(false);

  const savedUser = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await SemesterService.list();
        const semesters = res?.data || [];
        setSemesterList(semesters);

        const activeSemester = semesters.find((s) => s.isActive);
        if (activeSemester) {
          setSelectedSemesterId(activeSemester.semesterId);
        }
      } catch (error) {
        notification.error({
          message: t("error") || "Error",
          description:
            error?.response?.data?.message ||
            t("failedToFetchSemesters") ||
            "Failed to fetch semesters",
        });
      }
    };

    fetchSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchOverview = async () => {
      if (!selectedSemesterId) {
        setOverview(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await AdminService.getPlanningOverview({
          majorId: savedUser?.majorId,
          semesterId: selectedSemesterId,
        });
        setOverview(res?.data || null);
      } catch (error) {
        notification.error({
          message: t("error") || "Error",
          description:
            error?.response?.data?.message ||
            t("failedToFetchData") ||
            "Failed to fetch data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemesterId, savedUser?.majorId]);

  const semesterObj = overview?.semester;
  const semesterId = semesterObj?.semesterId || overview?.semesterId;
  const semesterLabel =
    overview?.semesterLabel ||
    (semesterObj?.season && semesterObj?.year
      ? `${semesterObj.season} ${semesterObj.year}`
      : "this semester");

  const majorLabel = overview?.majorName || "this major";

  const counts = {
    withoutTopic: overview?.groupsWithoutTopicCount || 0,
    withoutMembers: overview?.groupsWithoutMemberCount || 0,
    withoutGroups: overview?.studentsWithoutGroupCount || 0,
  };

  const list = useMemo(() => {
    if (!overview) return [];

    if (filterType === "withoutTopic") {
      return (overview.groupsWithoutTopic || []).map((g) => ({
        type: "group",
        id: g.groupId,
        name: g.name,
        description: g.description,
        currentMembers: g.currentMembers,
        maxMembers: g.maxMembers,
        status: g.status,
      }));
    }

    if (filterType === "withoutMembers") {
      return (overview.groupsWithoutMember || []).map((g) => ({
        type: "group",
        id: g.groupId,
        name: g.name,
        description: g.description,
        currentMembers: g.currentMembers,
        maxMembers: g.maxMembers,
        status: g.status,
      }));
    }

    return (overview.studentsWithoutGroup || []).map((s) => ({
      type: "student",
      id: s.studentId,
      name: s.displayName,
      primaryRole: s.primaryRole,
      skillTags: s.skillTags || [],
    }));
  }, [overview, filterType]);

  const selectedItems = useMemo(() => {
    if (!selectedIds?.length) return [];
    return list.filter((x) => selectedIds.includes(x.id));
  }, [list, selectedIds]);

  const selectedCount = selectedIds.length;

  const selectionLabel =
    filterType === "withoutGroups"
      ? t("selectStudentsToNotify") || "Select students to notify"
      : t("selectGroupsToNotify") || "Select groups to notify";

  const getAnnouncementTemplate = (type, ov, picked) => {
    const prefix = `[${semesterLabel} - ${majorLabel}]`;

    const startDate = semesterObj?.startDate;
    const endDate = semesterObj?.endDate;

    const teamSelfSelectEnd = semesterObj?.policy?.teamSelfSelectEnd;
    const topicSelfSelectEnd = semesterObj?.policy?.topicSelfSelectEnd;

    const semesterLine =
      startDate && endDate
        ? `Semester period: ${formatDateDMY(startDate)} → ${formatDateDMY(
            endDate,
          )}`
        : "";

    const deadlineLine =
      type === "withoutTopic"
        ? topicSelfSelectEnd
          ? `Topic registration closes on: ${formatDateDMY(topicSelfSelectEnd)}`
          : ""
        : teamSelfSelectEnd
        ? `Team self-selection closes on: ${formatDateDMY(teamSelfSelectEnd)}`
        : "";

    const infoBlock =
      semesterLine || deadlineLine
        ? `\n\n${[semesterLine, deadlineLine].filter(Boolean).join("\n")}`
        : "";

    const selCount = picked?.length || 0;
    const one = selCount === 1 ? picked[0] : null;

    const closing = `\n\nRegards,\nTeammy Moderator`;

    if (type === "withoutTopic") {
      const oneExtra =
        selCount === 1
          ? `\n\nRecipient group: ${one?.name || "N/A"}\nMembers: ${
              one?.currentMembers ?? 0
            }/${one?.maxMembers ?? 0}`
          : "";

      return {
        title:
          selCount === 1
            ? `${prefix} Topic pending — ${one?.name || "Selected group"}`
            : `${prefix} Topic pending`,
        content: `Hello,${infoBlock}

We noticed that a project topic has not been registered in Teammy yet.${oneExtra}

Please complete the topic registration before the deadline.${closing}`,
      };
    }

    if (type === "withoutMembers") {
      const oneExtra =
        selCount === 1
          ? `\n\nRecipient group: ${one?.name || "N/A"}\nMembers: ${
              one?.currentMembers ?? 0
            }/${one?.maxMembers ?? 0}`
          : "";

      return {
        title:
          selCount === 1
            ? `${prefix} Team incomplete — ${one?.name || "Selected group"}`
            : `${prefix} Team incomplete`,
        content: `Hello,${infoBlock}

Your team is currently below the required member count for this semester.${oneExtra}

Please ensure your team reaches the expected size before the deadline.${closing}`,
      };
    }

    const oneExtra =
      selCount === 1
        ? `\n\nRecipient student: ${one?.name || "N/A"}\nRole: ${
            one?.primaryRole || "N/A"
          }`
        : "";

    return {
      title:
        selCount === 1
          ? `${prefix} No team selected — ${one?.name || "Selected student"}`
          : `${prefix} No team selected`,
      content: `Hello,${infoBlock}

Our records show that you have not joined a project team in Teammy yet.${oneExtra}

Please make sure you are part of a team before the deadline.${closing}`,
    };
  };

  useEffect(() => {
    setSelectedIds([]);
    setIsDirty(false);
  }, [filterType]);

  useEffect(() => {
    if (!overview) return;
    if (isDirty) return;

    const tpl = getAnnouncementTemplate(filterType, overview, selectedItems);
    setTitle(tpl.title);
    setMsg(tpl.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, overview, selectedItems, isDirty]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => setSelectedIds(list.map((x) => x.id));
  const handleClear = () => setSelectedIds([]);

  const handleResetTemplate = () => {
    if (!overview) return;

    const doReset = () => {
      const tpl = getAnnouncementTemplate(filterType, overview, selectedItems);
      setTitle(tpl.title);
      setMsg(tpl.content);
      setIsDirty(false);
    };

    if (isDirty) {
      Modal.confirm({
        title: "Reset to template?",
        content:
          "Your current edits will be overwritten by the default template.",
        okText: "Reset",
        cancelText: "Cancel",
        onOk: doReset,
      });
    } else {
      doReset();
    }
  };

  const sendNow = async () => {
    if (!selectedCount) {
      return notification.info({
        message:
          t("pleaseSelectAtLeastOne") ||
          "Please select at least one recipient.",
      });
    }
    if (!title.trim()) {
      return notification.info({
        message: t("titleRequired") || "Please enter a title.",
      });
    }
    if (!msg.trim()) {
      return notification.info({
        message: t("messageRequired") || "Please enter a message.",
      });
    }

    try {
      setSending(true);

      const scope = scopeMap[filterType];

      const payload = {
        semesterId,
        scope,
        title: title.trim(),
        content: msg.trim(),
        targetRole: null,
        pinned: false,
      };

      if (scope === "students_without_group") {
        payload.targetUserIds = selectedIds;
      } else {
        payload.targetGroupIds = selectedIds;
      }

      await AdminService.createAnnouncement(payload, false);

      notification.success({
        message: t("sentSuccessfully") || "Sent successfully.",
      });

      setSelectedIds([]);
      setIsDirty(false);
    } catch (error) {
      notification.error({
        message: t("error") || "Error",
        description:
          error?.response?.data?.message ||
          t("failedToSendNotification") ||
          "Failed to send notification",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase() || "?";
  };

  const renderExtraTag = () => {
    if (filterType === "withoutTopic") return <Tag color="error">No Topic</Tag>;
    if (filterType === "withoutMembers")
      return <Tag color="warning">Understaffed</Tag>;
    if (filterType === "withoutGroups")
      return <Tag color="processing">Student</Tag>;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="inline-block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
            {t("notifications") || "Notifications"}
          </h1>
          <div className="mt-1 text-sm text-slate-500">
            {t("composeNotification") || "Compose notification"} •{" "}
            <span className="font-medium text-slate-700">{semesterLabel}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="border-0 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.10)] transition-shadow"
          styles={{ body: { padding: 16 } }}
        >
          <div className="flex items-center justify-between">
            <Space>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10">
                <ExclamationCircleOutlined className="text-orange-500 text-lg" />
              </span>
              <span className="font-semibold text-slate-800">
                {t("groupsWithoutTopics") || "Groups without topic"}
              </span>
            </Space>
            <Tag
              className="!m-0 !rounded-full !px-3 !py-1 !font-semibold"
              color="red-inverse"
            >
              {counts.withoutTopic}
            </Tag>
          </div>
        </Card>

        <Card
          className="border-0 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.10)] transition-shadow"
          styles={{ body: { padding: 16 } }}
        >
          <div className="flex items-center justify-between">
            <Space>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10">
                <TeamOutlined className="text-rose-500 text-lg" />
              </span>
              <span className="font-semibold text-slate-800">
                {t("studentsWithoutGroup") || "Students without group"}
              </span>
            </Space>
            <Tag
              className="!m-0 !rounded-full !px-3 !py-1 !font-semibold"
              color="red-inverse"
            >
              {counts.withoutGroups}
            </Tag>
          </div>
        </Card>

        <Card
          className="border-0 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.10)] transition-shadow"
          styles={{ body: { padding: 16 } }}
        >
          <div className="flex items-center justify-between">
            <Space>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10">
                <BellOutlined className="text-indigo-500 text-lg" />
              </span>
              <span className="font-semibold text-slate-800">
                {t("groupsMissingMembers") || "Groups missing members"}
              </span>
            </Space>
            <Tag
              className="!m-0 !rounded-full !px-3 !py-1 !font-semibold"
              color="red-inverse"
            >
              {counts.withoutMembers}
            </Tag>
          </div>
        </Card>
      </div>

      <Card
        className="xl:col-span-2 border-0 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
        styles={{
          header: {
            padding: "14px 20px",
            borderBottom: "1px solid rgba(226,232,240,0.9)",
          },
          body: { padding: 20 },
        }}
        title={
          <span className="font-semibold text-slate-900">
            {t("composeNotification") || "Compose notification"}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <span className="text-sm font-medium text-slate-600 min-w-[140px]">
              {t("semester") || "Semester"}
            </span>
            <Select
              value={selectedSemesterId}
              onChange={(value) => setSelectedSemesterId(value)}
              className="w-full sm:w-96"
              size="large"
              placeholder={t("selectSemester") || "Select semester"}
            >
              {semesterList.map((s) => (
                <Option key={s.semesterId} value={s.semesterId}>
                  {`${s.season || ""} ${s.year || ""}`.trim()}
                </Option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <span className="text-sm font-medium text-slate-600 min-w-[140px]">
              {t("filterByScope") || "Scope"}
            </span>
            <Select
              value={filterType}
              onChange={(v) => setFilterType(v)}
              className="w-full sm:w-96"
              disabled={loading}
              size="large"
            >
              <Option value="withoutTopic">
                {t("groupsWithoutTopics") || "Groups without topic"} (
                {counts.withoutTopic})
              </Option>
              <Option value="withoutGroups">
                {t("studentsWithoutGroup") || "Students without group"} (
                {counts.withoutGroups})
              </Option>
              <Option value="withoutMembers">
                {t("groupsMissingMembers") || "Groups missing members"} (
                {counts.withoutMembers})
              </Option>
            </Select>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-slate-600">
                {selectionLabel}
              </span>

              <Space wrap>
                <Button
                  size="middle"
                  onClick={handleSelectAll}
                  disabled={loading || !list.length}
                  className="!rounded-xl !border-slate-200 hover:!border-slate-300"
                >
                  {t("selectAll") || "Select all"}
                </Button>
                <Button
                  size="middle"
                  onClick={handleClear}
                  disabled={loading || !selectedCount}
                  className="!rounded-xl"
                >
                  {t("clear") || "Clear"}
                </Button>
              </Space>
            </div>

            <Spin spinning={loading}>
              <div
                className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-2 sm:p-3"
                style={{ maxHeight: 420, overflow: "auto" }}
              >
                <List
                  split={false}
                  dataSource={list}
                  locale={{
                    emptyText: loading
                      ? t("loading") || "Loading..."
                      : t("noData") || "No data available",
                  }}
                  renderItem={(item) => {
                    const checked = selectedIds.includes(item.id);

                    const subtitleParts = [];
                    if (item.currentMembers !== undefined) {
                      subtitleParts.push(
                        `${item.currentMembers}/${item.maxMembers} members`,
                      );
                    }
                    if (item.primaryRole) subtitleParts.push(item.primaryRole);

                    return (
                      <List.Item
                        className={`!px-3 !py-3 !mb-2 !rounded-2xl cursor-pointer border transition-all ${
                          checked
                            ? "bg-blue-50 border-blue-200 shadow-[0_8px_20px_rgba(59,130,246,0.10)]"
                            : "bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                        }`}
                        onClick={() => toggleSelect(item.id)}
                      >
                        <div className="w-full flex items-start gap-3">
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />

                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size={42}
                                className="!shadow-sm"
                                icon={
                                  item.type === "student" ? (
                                    <UserOutlined />
                                  ) : undefined
                                }
                              >
                                {getInitials(item.name)}
                              </Avatar>
                            }
                            title={
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Text
                                    strong
                                    className="block truncate !text-slate-900"
                                  >
                                    {item.name}
                                  </Text>
                                  {subtitleParts.length ? (
                                    <Text type="secondary" className="text-xs">
                                      {subtitleParts.join(" • ")}
                                    </Text>
                                  ) : null}
                                </div>
                                <div className="shrink-0">
                                  {renderExtraTag()}
                                </div>
                              </div>
                            }
                            description={
                              item.type === "student" &&
                              item.skillTags?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.skillTags.slice(0, 8).map((s) => (
                                    <Tag
                                      key={s}
                                      className="m-0 !rounded-full"
                                      color="geekblue"
                                    >
                                      {s}
                                    </Tag>
                                  ))}
                                  {item.skillTags.length > 8 && (
                                    <Tag className="m-0 !rounded-full">
                                      +{item.skillTags.length - 8}
                                    </Tag>
                                  )}
                                </div>
                              ) : item.description ? (
                                <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                                  {item.description}
                                </div>
                              ) : null
                            }
                          />
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </div>
            </Spin>
          </div>

          <Divider className="!my-3" />

          {/* Title + Reset */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">
                {t("title") || "Title"} <span className="text-red-500">*</span>
              </span>

              <Button
                size="middle"
                onClick={handleResetTemplate}
                disabled={!overview}
                className="!px-3 !rounded-xl"
              >
                {t("resetTemplate") || "Reset to template"}
              </Button>
            </div>

            {isDirty ? (
              <div className="text-xs text-slate-500 mb-2">(edited)</div>
            ) : null}

            <Input
              className="!rounded-2xl"
              size="large"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder={
                t("enterNotificationTitle") || "Enter notification title..."
              }
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div>
            <span className="text-sm font-medium text-slate-600 block mb-2">
              {t("message") || "Message"}{" "}
              <span className="text-red-500">*</span>
            </span>
            <TextArea
              className="!rounded-2xl"
              autoSize={{ minRows: 5, maxRows: 10 }}
              value={msg}
              onChange={(e) => {
                setMsg(e.target.value);
                setIsDirty(true);
              }}
              placeholder={
                t("enterNotificationMessage") ||
                "Enter your notification message..."
              }
              maxLength={500}
            />
          </div>

          <Space className="mt-2 sticky bottom-4" wrap>
            <Button
              size="large"
              type="primary"
              shape="round"
              icon={<SendOutlined />}
              className="!bg-[#FF7A00] hover:!opacity-90 !text-white !shadow-[0_12px_30px_rgba(255,122,0,0.25)]"
              onClick={sendNow}
              disabled={!selectedCount || sending}
              loading={sending}
            >
              {t("sendNow") || "Send now"}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}

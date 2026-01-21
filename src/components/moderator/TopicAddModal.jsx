import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Input, Select, notification, Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { TopicService } from "../../services/topic.service";
import { MajorService } from "../../services/major.service";
import { SemesterService } from "../../services/semester.service";
import { useTranslation } from "../../hook/useTranslation";

const { Option } = Select;

const TopicAddModal = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [majors, setMajors] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [existingTopics, setExistingTopics] = useState([]);

  const normalizeTitle = (value = "") =>
    value.trim().replace(/\s+/g, " ").toLowerCase();

  const parseMentorEmails = (value = "") =>
    value
      .split(/[,;|\n]+/g)
      .map((email) => email.trim())
      .filter(Boolean);

  const validateMentorEmails = (_, value) => {
    const emails = parseMentorEmails(value);
    if (emails.length === 0) return Promise.resolve();
    const invalid = emails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalid.length === 0) return Promise.resolve();
    return Promise.reject(
      new Error(
        t("invalidMentorEmails") ||
          "Please enter valid mentor email addresses.",
      ),
    );
  };

  const activeSemester = useMemo(
    () => semesters.find((s) => s.isActive),
    [semesters],
  );

  useEffect(() => {
    if (!open) return;

    const fetchMetadata = async () => {
      try {
        const [majorsRes, semestersRes, topicsRes] = await Promise.all([
          MajorService.getMajors(),
          SemesterService.list(),
          TopicService.getTopics({ pageSize: 1000 }),
        ]);

        const majorsData = majorsRes?.data || [];
        const semestersData = semestersRes?.data || [];
        const topicsData = topicsRes?.data?.data || topicsRes?.data || [];

        setMajors(majorsData);
        setSemesters(semestersData);
        setExistingTopics(Array.isArray(topicsData) ? topicsData : []);
        const current = form.getFieldValue("semesterId");
        const active = semestersData.find((s) => s.isActive);
        if (!current && active?.semesterId) {
          form.setFieldsValue({ semesterId: active.semesterId });
        }
      } catch {
        notification.error({
          message: t("failedLoadMetadata") || "Failed to load metadata",
        });
      }
    };

    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const selectedSemester = semesters.find(
        (s) => s.semesterId === values.semesterId,
      );

      if (!selectedSemester?.isActive) {
        notification.error({
          message: t("semesterNotActive") || "Semester is not active",
          description:
            t("onlyActiveSemesterAllowed") ||
            "You can only create topics for the active semester. Please activate this semester first.",
        });
        return;
      }

      const normalizedTitle = normalizeTitle(values.title);
      const duplicate = existingTopics.find((topic) => {
        const topicSemesterId = topic.semesterId;
        const topicTitle = topic.title || topic.topicName || topic.name || "";
        return (
          String(topicSemesterId) === String(values.semesterId) &&
          normalizeTitle(topicTitle) === normalizedTitle
        );
      });

      if (duplicate) {
        form.setFields([
          {
            name: "title",
            errors: [
              t("topicTitleExists") ||
                "Topic title already exists in this semester.",
            ],
          },
        ]);
        return;
      }

      setSubmitting(true);

      const formData = new FormData();

      formData.append("SemesterId", values.semesterId);
      formData.append("MajorId", values.majorId);
      formData.append("Title", values.title);
      formData.append("Description", values.description);
      formData.append("Status", values.status || "open");

      const mentorEmails = parseMentorEmails(values.mentorEmails);
      mentorEmails.forEach((email) => {
        formData.append("MentorEmails", email);
      });

      if (values.registrationFile?.fileList?.[0]) {
        formData.append(
          "RegistrationFile",
          values.registrationFile.fileList[0].originFileObj,
        );
      }
      await TopicService.createTopic(formData);

      notification.success({
        message: t("topicCreated") || "Topic created successfully",
      });

      form.resetFields();

      if (activeSemester?.semesterId) {
        form.setFieldsValue({ semesterId: activeSemester.semesterId });
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      if (err?.errorFields) return;
      const apiMessage = err?.response?.data?.message || err?.message;
      if (
        apiMessage &&
        /title/i.test(apiMessage) &&
        /exist|already/i.test(apiMessage)
      ) {
        form.setFields([{ name: "title", errors: [apiMessage] }]);
        return;
      }

      notification.error({
        message: t("failedCreateTopic") || "Failed to create topic",
        description: apiMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (activeSemester?.semesterId) {
      form.setFieldsValue({ semesterId: activeSemester.semesterId });
    }
    onClose?.();
  };

  return (
    <Modal
      centered
      title={t("createTopic") || "Create Topic"}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText={t("create") || "Create"}
      cancelText={t("cancel") || "Cancel"}
      width="min(1000px, 92vw)"
      styles={{
        content: { padding: 20, borderRadius: 14 },
        body: {
          padding: 10,
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto",
        },
      }}
      destroyOnClose
      okButtonProps={{
        className:
          "!bg-[#FF7A00] !text-white !border-none !rounded-md !px-4 !py-2 hover:!opacity-90",
        disabled: !activeSemester,
      }}
      cancelButtonProps={{
        className:
          "!border-gray-300 hover:!border-orange-400 hover:!text-orange-400 transition-all !py-2",
      }}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label={t("title") || "Title"}
          name="title"
          rules={[
            {
              required: true,
              message: t("pleaseInputTitle") || "Please input title",
            },
          ]}
        >
          <Input placeholder={t("enterTopicTitle") || "Enter topic title"} />
        </Form.Item>

        <Form.Item
          label={t("description") || "Description"}
          name="description"
          rules={[
            {
              required: true,
              message:
                t("pleaseInputDescription") || "Please input description",
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t("enterDescription") || "Enter description"}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label={t("major") || "Major"}
            name="majorId"
            rules={[
              {
                required: true,
                message: t("pleaseSelectMajor") || "Please select major",
              },
            ]}
          >
            <Select placeholder={t("selectMajor") || "Select major"}>
              {majors.map((major) => (
                <Option key={major.majorId} value={major.majorId}>
                  {major.majorName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={t("semester") || "Semester"}
            name="semesterId"
            rules={[
              {
                required: true,
                message: t("pleaseSelectSemester") || "Please select semester",
              },
            ]}
          >
            <Select placeholder={t("selectSemester") || "Select semester"}>
              {semesters.map((sem) => {
                const label = `${sem.season} ${sem.year}${
                  sem.isActive ? "" : " (Inactive)"
                }`;

                return (
                  <Option
                    key={sem.semesterId}
                    value={sem.semesterId}
                    disabled={!sem.isActive}
                  >
                    {label}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          label={t("status") || "Status"}
          name="status"
          initialValue="open"
        >
          <Select>
            <Option value="open">Open</Option>
            <Option value="closed">Closed</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t("mentorEmails") || "Mentor Emails"}
          name="mentorEmails"
          rules={[
            {
              required: true,
              message:
                t("pleaseImportMailMentor") || "Please import mentor emails",
            },
            { validator: validateMentorEmails },
          ]}
        >
          <Input placeholder="email1@example.com, email2@example.com" />
        </Form.Item>

        <Form.Item
          label={t("registrationFile") || "Registration File"}
          name="registrationFile"
          valuePropName="file"
          rules={[
            {
              required: true,
              message:
                t("pleaseImportFile") || "Please import registration file",
            },
          ]}
        >
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          >
            <Button icon={<UploadOutlined />}>
              {t("clickToUpload") || "Click to Upload"}
            </Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TopicAddModal;

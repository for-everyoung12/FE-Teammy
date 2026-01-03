import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../hook/useTranslation";
import {
  Modal,
  Input,
  Button,
  Form,
  notification,
  DatePicker,
  Tag,
  Select,
} from "antd";
import { Plus, Sparkles } from "lucide-react";
import { PostService } from "../../../services/post.service";
import { SkillService } from "../../../services/skill.service";
import { UserService } from "../../../services/user.service";
import dayjs from "dayjs";
import { AiService } from "../../../services/ai.service";
const { TextArea } = Input;

const CreatePostModal = ({ isOpen, closeModal, onCreated, defaultGroupId }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [groupName, setGroupName] = useState("");
  const [majorName, setMajorName] = useState("");
  const [majorId, setMajorId] = useState("");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillFilter, setSkillFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const loadGroupName = async () => {
      try {
        if (!defaultGroupId) return;
        const res = await import("../../../services/group.service").then((m) =>
          m.GroupService.getGroupDetail(defaultGroupId)
        );
        const name = res?.data?.title || res?.data?.name || "";
        const major = res?.data?.major?.majorName || res?.data?.majorName || "";
        const majorIdValue =
          res?.data?.major?.majorId || res?.data?.majorId || "";
        if (mounted) {
          setGroupName(name);
          setMajorName(major);
          setMajorId(majorIdValue);
        }
      } catch {
        // ignore silently
      }
    };
    loadGroupName();
    return () => {
      mounted = false;
    };
  }, [defaultGroupId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSkills = async () => {
      if (!majorName) {
        setAvailableSkills([]);
        return;
      }

      try {
        const response = await SkillService.list({ major: majorName });
        if (response?.data) {
          setAvailableSkills(response.data);
        }
      } catch {
        setAvailableSkills([]);
      }
    };

    fetchSkills();
  }, [majorName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPositions = async () => {
      if (!majorId) {
        setAvailablePositions([]);
        return;
      }

      try {
        const response = await UserService.getPositions(majorId, false);
        if (response?.data) {
          setAvailablePositions(response.data);
        }
      } catch {
        setAvailablePositions([]);
      }
    };

    fetchPositions();
  }, [majorId, isOpen]);

  const handleAddSkill = (skillToken) => {
    if (!selectedSkills.includes(skillToken)) {
      const newSkills = [...selectedSkills, skillToken];
      setSelectedSkills(newSkills);
      form.setFieldsValue({ required_skills: newSkills });
    }
  };

  const handleRemoveSkill = (skillToken) => {
    const newSkills = selectedSkills.filter((s) => s !== skillToken);
    setSelectedSkills(newSkills);
    form.setFieldsValue({ required_skills: newSkills });
  };

  const filteredSkills = availableSkills.filter((skill) => {
    const isSelected = selectedSkills.some(
      (selected) => selected.toLowerCase() === skill.token.toLowerCase()
    );
    if (isSelected) return false;
    if (skillFilter === "all") return true;
    return skill.role === skillFilter;
  });

  const getRoleColor = (role) => {
    const colors = {
      frontend: "blue",
      backend: "green",
      mobile: "purple",
      devops: "orange",
      qa: "red",
    };
    return colors[role] || "default";
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const {
        groupId,
        title,
        description,
        position_needed,
        expiresAt,
        required_skills,
      } = await form.validateFields();

      await PostService.createRecruitmentPost({
        groupId,
        title,
        description,
        position_needed: Array.isArray(position_needed)
          ? position_needed.join(", ")
          : position_needed,
        expiresAt: expiresAt?.toISOString(),
        required_skills,
      });

      notification.success({
        message: t("createRecruitPostSuccess") || "Recruitment post created",
      });
      form.resetFields();
      setSelectedSkills([]);
      closeModal();
      onCreated?.();
    } catch {
      /* validate/API error handled elsewhere */
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleGenerateWithAI = async () => {
    const gid = defaultGroupId || form.getFieldValue("groupId");
    if (!gid) {
      notification.info({
        message: t("groupNotFound") || "Group not found",
      });
      return;
    }

    try {
      setIsGeneratingAI(true);

      const res = await AiService.generatePostForGroup(gid);

      const draft =
        res?.data?.draft || res?.data?.data?.draft || res?.data?.data || {};

      const nextTitle = draft.title || "";
      const nextDescription = draft.description || "";
      const nextPosition = draft.positionNeed || draft.position_needed || "";
      const nextSkills = draft.requiredSkills || draft.required_skills || [];

      const nextExpires = draft.expiresAt || draft.expires_at || null;

      let validExpiresDate = null;
      if (nextExpires) {
        const parsedDate = dayjs(nextExpires);
        if (parsedDate.isValid() && parsedDate.isAfter(dayjs())) {
          validExpiresDate = parsedDate;
        }
      }

      form.setFieldsValue({
        title: nextTitle,
        description: nextDescription,
        position_needed: nextPosition,
        required_skills: Array.isArray(nextSkills) ? nextSkills : [],
        expiresAt: validExpiresDate,
      });

      if (Array.isArray(nextSkills)) setSelectedSkills(nextSkills);

      notification.success({
        message: t("aiGenerateSuccess") || "Generated by AI",
      });
    } catch (err) {
      notification.error({
        message: t("aiGenerateFailed") || "Failed to generate by AI",
        description:
          err?.response?.data?.message ||
          t("pleaseTryAgain") ||
          "Please try again",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-10">
          <span>
            {t("createRecruitPostTitle") || "Create Recruitment Post"}
          </span>
          <Button
            onClick={handleGenerateWithAI}
            loading={isGeneratingAI}
            disabled={isGeneratingAI || isSubmitting}
            className="!border-orange-400 !text-orange-500"
          >
            <Sparkles className="w-4 h-4 text-[#FF7A00] animate-pulse" />
          </Button>
        </div>
      }
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      open={isOpen}
      onCancel={() => {
        form.resetFields();
        setSelectedSkills([]);
        closeModal();
      }}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          groupId: defaultGroupId || "",
          title: "",
          description: "",
          position_needed: "",
          expiresAt: null,
          required_skills: [],
        }}
      >
        <Form.Item name="groupId" hidden>
          <Input />
        </Form.Item>
        <Form.Item label={t("group") || "Group"} shouldUpdate>
          <Input value={groupName || defaultGroupId || ""} disabled />
        </Form.Item>
        <Form.Item
          label={t("pleaseEnterTitle") ? t("title") : "Title"}
          name="title"
          rules={[
            {
              required: true,
              message: t("pleaseEnterTitle") || "Please enter title",
            },
          ]}
        >
          <Input
            placeholder={t("placeholderTitle") || "VD: Tuyển FE cho project"}
          />
        </Form.Item>
        <Form.Item
          label={t("pleaseEnterDescription") ? t("description") : "Description"}
          name="description"
          rules={[
            {
              required: true,
              message:
                t("pleaseEnterDescription") || "Please enter description",
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder={
              t("placeholderDescription") || "Mô tả yêu cầu, stack..."
            }
          />
        </Form.Item>
        <Form.Item
          label={
            t("pleaseEnterPosition") ? t("positionNeeded") : "Position Needed"
          }
          name="position_needed"
          rules={[
            {
              required: true,
              message:
                t("pleaseEnterPosition") || "Please select the position needed",
            },
          ]}
        >
          <Select
            mode="multiple"
            placeholder={t("selectPosition") || "Select positions"}
            disabled={!majorId || availablePositions.length === 0}
            options={availablePositions.map((pos) => ({
              label: pos.name || pos.positionName || pos,
              value: pos.name || pos.positionName || pos,
            }))}
          />
        </Form.Item>
        <Form.Item
          label={t("placeholderExpiresAt") ? t("expiresAt") : "Expires At"}
          name="expiresAt"
          rules={[
            {
              required: true,
              message: t("pleaseSelectDeadline") || "Please select deadline",
            },
            {
              validator: (_, value) =>
                value && value.isAfter(dayjs())
                  ? Promise.resolve()
                  : Promise.reject(
                      t("deadlineMustBeFuture") ||
                        "Expires date must be after now!"
                    ),
            },
          ]}
        >
          <DatePicker
            style={{ width: "100%" }}
            disabledDate={(current) =>
              current && current < dayjs().endOf("day")
            }
            placeholder={t("placeholderExpiresAt") || "Chọn ngày hết hạn"}
          />
        </Form.Item>
        <Form.Item
          label={t("requiredSkills") || "Required Skills"}
          name="required_skills"
          rules={[
            {
              validator: (_, value) => {
                if (!value || value.length < 3) {
                  return Promise.reject(
                    new Error(
                      t("pleaseSelectAtLeast3Skills") ||
                        "Please select at least 3 skills"
                    )
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <div className="space-y-3">
            <div className="min-h-[80px] p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
              <p className="text-xs font-medium text-gray-700 mb-2">
                {t("selectedSkills") ||
                  `Selected Skills (${selectedSkills.length})`}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSkills.length === 0 ? (
                  <p className="text-gray-400 text-xs">
                    {t("clickSkillsToAdd") || "Click skills below to add them"}
                  </p>
                ) : (
                  selectedSkills.map((skillToken) => {
                    const skill = availableSkills.find(
                      (s) => s.token === skillToken
                    );
                    return (
                      <Tag
                        key={skillToken}
                        color={getRoleColor(skill?.role)}
                        closable
                        onClose={() => handleRemoveSkill(skillToken)}
                        className="cursor-pointer"
                      >
                        {skillToken}
                      </Tag>
                    );
                  })
                )}
              </div>
            </div>

            {majorName && availableSkills.length > 0 && (
              <>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSkillFilter("all")}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                      skillFilter === "all"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {t("all") || "All"} ({availableSkills.length})
                  </button>
                  {["frontend", "backend", "mobile", "devops", "qa"].map(
                    (role) => {
                      const count = availableSkills.filter(
                        (s) => s.role === role
                      ).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSkillFilter(role)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition capitalize ${
                            skillFilter === role
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {role} ({count})
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="max-h-[300px] overflow-y-auto p-3 border border-gray-300 rounded-lg bg-white">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    {t("availableSkillsClickToAdd") ||
                      "Available Skills (Click to add)"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredSkills.map((skill) => {
                      return (
                        <Tag
                          key={skill.token}
                          color={getRoleColor(skill.role)}
                          className="cursor-pointer transition text-xs hover:scale-105"
                          onClick={() => handleAddSkill(skill.token)}
                        >
                          {skill.token}
                          <Plus className="inline-block w-3 h-3 ml-1" />
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {!majorName && (
              <p className="text-xs text-gray-500">
                {t("skillsWillBeAvailableAfterLoadingGroupInformation") ||
                  "Skills will be available after loading group information"}
              </p>
            )}
          </div>
        </Form.Item>
        <div className="flex justify-between mt-4">
          <Button
            onClick={() => {
              form.resetFields();
              setSelectedSkills([]);
              closeModal();
            }}
            className="inline-flex items-center rounded-lg px-3.5 py-2 text-xs font-bold shadow-sm hover:!border-orange-400 hover:!text-orange-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            {t("cancel") || "Cancel"}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg !bg-[#FF7A00] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:!opacity-90 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          >
            {t("publishPost") || "Publish Post"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreatePostModal;

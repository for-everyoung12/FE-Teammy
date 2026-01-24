import React, { useState } from "react";
import { Calendar, MessageSquare, Star, AlertTriangle, ArrowRight, CheckCircle, Clock, User, Edit, Trash2, MoreVertical, Send } from "lucide-react";
import { Modal, Form, Input, Select, Button } from "antd";
import { useTranslation } from "../../../hook/useTranslation";

const { TextArea } = Input;

export default function FeedbackCard({ feedback, isLeader, isMentor, onUpdateStatus, onEdit, onDelete, groupId }) {
  const { t } = useTranslation();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [kebabMenuOpen, setKebabMenuOpen] = useState(false);

  const normalizeStatus = (status) => {
    if (!status) return "follow_up_requested";
    const statusLower = (status || "").toLowerCase();
    // Map valid statuses
    if (statusLower === "submitted") {
      return "acknowledged";
    }
    if (statusLower === "acknowledged" || statusLower === "đã xác nhận") {
      return "acknowledged";
    }
    if (statusLower === "resolved" || statusLower === "đã giải quyết") {
      return "resolved";
    }
    if (statusLower === "follow_up_requested" || statusLower === "chờ xử lý") {
      return "follow_up_requested";
    }
    // Map invalid statuses to default
    return "follow_up_requested";
  };

  const getStatusConfig = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "submitted") {
      return {
        label: t("submittedStatus") || "Submitted",
        color: "bg-blue-500 text-white",
        icon: <Send className="w-3 h-3" />,
      };
    }
    if (statusLower === "acknowledged" || statusLower === "đã xác nhận") {
      return {
        label: t("acknowledgedStatus") || "Acknowledged",
        color: "bg-yellow-500 text-white",
        icon: <CheckCircle className="w-3 h-3" />,
      };
    }
    if (statusLower === "resolved" || statusLower === "đã giải quyết") {
      return {
        label: t("resolvedStatus") || "Resolved",
        color: "bg-green-500 text-white",
        icon: <CheckCircle className="w-3 h-3" />,
      };
    }
    if (statusLower === "follow_up_requested" || statusLower === "chờ xử lý") {
      return {
        label: t("followUpRequestedStatus") || "Follow Up Requested",
        color: "bg-yellow-500 text-white",
        icon: <Clock className="w-3 h-3" />,
      };
    }
    // Default to follow_up_requested if status is unknown
    return {
      label: t("followUpRequestedStatus") || "Follow Up Requested",
      color: "bg-yellow-500 text-white",
      icon: <Clock className="w-3 h-3" />,
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t("today") || "Today";
      if (diffDays === 1) return `1 ${t("dayAgo") || "day ago"}`;
      return `${diffDays} ${t("daysAgo") || "days ago"}`;
    } catch {
      return dateString;
    }
  };

  const getInitials = (name = "") => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/).slice(0, 2);
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const translateCategory = (category) => {
    if (!category) return "";
    const categoryLower = category.toLowerCase();
    const categoryMap = {
      "projectprogress": t("projectProgress") || "Project Progress",
      "tiến độ dự án": t("projectProgress") || "Project Progress",
      "codequality": t("codeQuality") || "Code Quality",
      "chất lượng code": t("codeQuality") || "Code Quality",
      "technicalskills": t("technicalSkills") || "Technical Skills",
      "kỹ năng kỹ thuật": t("technicalSkills") || "Technical Skills",
      "teamwork": t("teamwork") || "Teamwork",
      "làm việc nhóm": t("teamwork") || "Teamwork",
      "other": t("other") || "Other",
      "khác": t("other") || "Other",
    };
    return categoryMap[categoryLower] || category;
  };

  const statusConfig = getStatusConfig(feedback.status);
  // Support both nested mentor object and flat structure from backend
  const mentorName = feedback.mentorName || feedback.mentor?.displayName || feedback.mentor?.name || feedback.mentor?.email || (t("mentor") || "Mentor");
  const mentorEmail = feedback.mentorEmail || feedback.mentor?.email || "";
  const mentorAvatar = feedback.mentorAvatar || feedback.mentor?.avatarUrl || feedback.mentor?.avatar;
  const mentorInitials = getInitials(mentorName);

  const handleStatusUpdate = async (values) => {
    if (onUpdateStatus) {
      // Try multiple possible ID fields - backend returns feedbackId
      const feedbackId = feedback.feedbackId || feedback.id || feedback._id || feedback.feedback_id;
      if (!feedbackId) {
        console.error("Feedback ID is missing. Feedback object:", feedback);
        console.error("Available keys:", Object.keys(feedback || {}));
        return;
      }
      try {
        setStatusSubmitting(true);
        await onUpdateStatus(feedbackId, values);
        setStatusModalOpen(false);
        form.resetFields();
      } finally {
        setStatusSubmitting(false);
      }
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: t("confirmDeleteFeedback") || "Delete this feedback?",
      content: t("deleteFeedbackWarning") || "Are you sure you want to delete this feedback? This action cannot be undone.",
      okText: t("delete") || "Delete",
      okButtonProps: { danger: true },
      cancelText: t("cancel") || "Cancel",
      onOk: () => {
        if (onDelete) {
          onDelete(feedback);
        }
        setKebabMenuOpen(false);
      },
    });
  };

  // Close kebab menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.kebab-menu-container')) {
        setKebabMenuOpen(false);
      }
    };
    if (kebabMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [kebabMenuOpen]);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        {/* Header: Mentor info and status */}
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            {mentorAvatar ? (
              <img
                src={mentorAvatar}
                alt={mentorName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {mentorInitials}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{mentorName}</p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(feedback.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </div>
            {isMentor && (
              <div className="relative kebab-menu-container">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKebabMenuOpen(!kebabMenuOpen);
                  }}
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                {kebabMenuOpen && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) {
                          onEdit(feedback);
                        }
                        setKebabMenuOpen(false);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                      {t("edit") || "Edit"}
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t("delete") || "Delete"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main feedback text */}
        <p className="text-gray-800">{feedback.summary}</p>

        {/* Category tag and Rating in same row */}
        {(feedback.category || feedback.rating) && (
          <div className="flex items-center gap-3 flex-wrap">
            {feedback.category && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                {translateCategory(feedback.category)}
              </div>
            )}
            {feedback.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm text-gray-700">{feedback.rating}/5</span>
              </div>
            )}
          </div>
        )}

        {/* Details */}
        {feedback.details && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">{t("details") || "Details"}</span>
            </div>
            <p className="text-sm text-gray-700 pl-6">{feedback.details}</p>
          </div>
        )}

        {/* Blockers */}
        {feedback.blockers && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold">{t("feedbackBlockers") || "Blockers"}</span>
            </div>
            <p className="text-sm text-red-600 pl-6">{feedback.blockers}</p>
          </div>
        )}

        {/* Next Steps */}
        {feedback.nextSteps && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">{t("nextSteps") || "Next Steps"}</span>
            </div>
            <p className="text-sm text-gray-700 pl-6">{feedback.nextSteps}</p>
          </div>
        )}

        {/* Note from leader/team - Comment style */}
        {(feedback.acknowledgedNote || feedback.note) && (
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-blue-900">{t("teamResponse") || "Team Response"}</p>
                  <span className="text-xs text-blue-600">•</span>
                  <p className="text-xs text-blue-600">{t("note") || "Note"}</p>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">{feedback.acknowledgedNote || feedback.note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isLeader && (
          <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-500 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {t("updateStatus") || "Update Status"}
            </button>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        title={t("updateFeedbackStatus") || "Update Feedback Status"}
        open={statusModalOpen}
        onCancel={() => {
          if (statusSubmitting) return;
          setStatusModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleStatusUpdate}
          initialValues={{
            status: normalizeStatus(feedback.status),
          }}
        >
          <Form.Item
            name="status"
            label={t("status") || "Status"}
            rules={[{ required: true, message: t("pleaseSelectStatus") || "Please select status" }]}
          >
            <Select>
              <Select.Option value="acknowledged">{t("acknowledgedStatus") || "Acknowledged"}</Select.Option>
              <Select.Option value="follow_up_requested">{t("followUpRequestedStatus") || "Follow Up Requested"}</Select.Option>
              <Select.Option value="resolved">{t("resolvedStatus") || "Resolved"}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="note"
            label={t("note") || "Note"}
            rules={[{ required: true, message: t("required") || "Required" }]}
          >
            <TextArea rows={4} placeholder={t("notePlaceholder") || "Enter note (optional)"} />
          </Form.Item>
          <Form.Item>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  if (statusSubmitting) return;
                  setStatusModalOpen(false);
                  form.resetFields();
                }}
                disabled={statusSubmitting}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button type="primary" htmlType="submit" loading={statusSubmitting}>
                {statusSubmitting
                  ? t("updatingFeedback") || "Updating..."
                  : t("update") || "Update"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}






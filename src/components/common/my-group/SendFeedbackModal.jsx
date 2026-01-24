import React, { useState, useEffect } from "react";
import { X, Star, Send } from "lucide-react";
import { Form, Input, Select, Button } from "antd";
import { useTranslation } from "../../../hook/useTranslation";

const { TextArea } = Input;

export default function SendFeedbackModal({
  open,
  submitting,
  onClose,
  onSubmit,
  groupName = "",
  initialValues = null,
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [rating, setRating] = useState(initialValues?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      handleClose();
    }
  };

  const handleClose = () => {
    form.resetFields();
    setRating(initialValues?.rating || 0);
    setHoverRating(0);
    onClose();
  };

  // Update form when initialValues change (for edit mode)
  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue({
        summary: initialValues.summary,
        category: initialValues.category,
        rating: initialValues.rating,
        details: initialValues.details,
        blockers: initialValues.blockers,
        nextSteps: initialValues.nextSteps,
      });
      setRating(initialValues.rating || 0);
    } else if (open && !initialValues) {
      form.resetFields();
      setRating(0);
    }
  }, [open, initialValues, form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const values = await form.validateFields();
      if (rating > 0) {
        values.rating = rating;
      }
      await onSubmit(values);
      handleClose();
    } catch (error) {
      // Validation errors handled by form
    }
  };

  const handleStarClick = (value) => {
    setRating(value);
    form.setFieldsValue({ rating: value });
  };

  const handleStarHover = (value) => {
    setHoverRating(value);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const getStarState = (value) => {
    const displayRating = hoverRating || rating;
    return value <= displayRating;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdrop}
    >
      <div className="absolute inset-0 bg-black/40" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {initialValues ? (t("editFeedback") || "Edit Feedback") : (t("sendFeedbackTitle") || "Send Feedback")}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {initialValues 
                ? (t("editFeedbackSubtitle") || "Edit feedback for group") 
                : (t("sendFeedbackSubtitle") || "Send comments and evaluations for group")} {groupName || ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto">
          <Form form={form} layout="vertical">
            <Form.Item
              name="summary"
              label={
                <span>
                  {t("feedbackSummary") || "Summary"} <span className="text-red-500">*</span>
                </span>
              }
              rules={[
                { required: true, message: t("feedbackSummaryRequired") || "Please enter feedback summary" },
              ]}
            >
              <TextArea
                rows={3}
                placeholder={t("feedbackSummaryPlaceholder") || "Enter feedback summary for the group..."}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="category"
              label={t("feedbackCategory") || "Category"}
              rules={[
                { required: true, message: t("required") || "Required" },
              ]}
            >
              <Select
                placeholder={t("feedbackCategoryPlaceholder") || "Select category"}
                disabled={submitting}
                allowClear
              >
                <Select.Option value="projectProgress">{t("projectProgress") || "Project Progress"}</Select.Option>
                <Select.Option value="codeQuality">{t("codeQuality") || "Code Quality"}</Select.Option>
                <Select.Option value="technicalSkills">{t("technicalSkills") || "Technical Skills"}</Select.Option>
                <Select.Option value="teamwork">{t("teamwork") || "Teamwork"}</Select.Option>
                <Select.Option value="other">{t("other") || "Other"}</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="rating"
              label={t("feedbackRating") || "Rating"}
              rules={[
                { required: true, message: t("required") || "Required" },
              ]}
            >
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isFilled = getStarState(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleStarClick(value)}
                      onMouseEnter={() => handleStarHover(value)}
                      onMouseLeave={handleStarLeave}
                      disabled={submitting}
                      className="focus:outline-none p-1 transition-all"
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          isFilled
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </Form.Item>

            <Form.Item
              name="details"
              label={t("feedbackDetails") || "Details"}
              rules={[
                { required: true, message: t("required") || "Required" },
              ]}
            >
              <TextArea
                rows={4}
                placeholder={t("feedbackDetailsPlaceholder") || "Describe detailed feedback..."}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="blockers"
              label={t("feedbackBlockers") || "Blockers"}
              rules={[
                { required: true, message: t("required") || "Required" },
              ]}
            >
              <Input
                placeholder={t("feedbackBlockersPlaceholder") || "Issues hindering progress..."}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="nextSteps"
              label={t("feedbackNextSteps") || "Next Steps"}
              rules={[
                { required: true, message: t("required") || "Required" },
              ]}
            >
              <Input
                placeholder={t("feedbackNextStepsPlaceholder") || "Suggest next steps..."}
                disabled={submitting}
              />
            </Form.Item>
          </Form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t("cancel") || "Cancel"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting 
              ? (initialValues ? (t("updatingFeedback") || "Updating...") : (t("sendingFeedback") || "Sending..."))
              : (initialValues ? (t("updateFeedback") || "Update Feedback") : (t("sendFeedback") || "Send Feedback"))}
          </button>
        </div>
      </form>
    </div>
  );
}


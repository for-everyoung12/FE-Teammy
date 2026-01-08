import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Tabs, notification } from "antd";
import dayjs from "dayjs";
import { MilestoneService } from "../../../services/milestone.service";

const getMilestonesFromTimeline = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.milestones)) return payload.milestones;
  if (Array.isArray(payload.data?.milestones)) return payload.data.milestones;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

export default function MoveIncompleteItemsDialog({
  open,
  onCancel,
  groupId,
  milestoneId,
  currentMilestoneId,
  t,
  onMoved,
}) {
  const [activeTab, setActiveTab] = useState("existing");
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneTargetDate, setNewMilestoneTargetDate] = useState(null);
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("existing");
    setSelectedTargetId(null);
    setNewMilestoneName("");
    setNewMilestoneTargetDate(null);
    setNewMilestoneDescription("");

    const fetchMilestones = async () => {
      if (!groupId) return;
      setMilestonesLoading(true);
      try {
        const startDate = dayjs().subtract(365, "day").format("YYYY-MM-DD");
        const endDate = dayjs().add(365, "day").format("YYYY-MM-DD");
        const res = await MilestoneService.getTimelineMilestones(
          groupId,
          startDate,
          endDate
        );
        const payload = res?.data ?? res;
        setMilestones(getMilestonesFromTimeline(payload));
      } catch {
        setMilestones([]);
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [open, groupId]);

  const milestoneOptions = useMemo(() => {
    return (milestones || [])
      .filter(
        (m) =>
          (m.milestoneId || m.id) &&
          (m.milestoneId || m.id) !== currentMilestoneId
      )
      .map((m) => ({
        value: m.milestoneId || m.id,
        label: `${m.name || "Milestone"} · ${m.targetDate || "--"}`,
      }));
  }, [milestones, currentMilestoneId]);

  const handleConfirm = async () => {
    if (!groupId || !milestoneId) return;
    if (activeTab === "existing") {
      if (!selectedTargetId) {
        notification.info({
          message: t("validationError") || "Validation error",
          description:
            t("pleaseSelectMilestone") || "Please select a milestone.",
        });
        return;
      }
    } else {
      if (!newMilestoneName.trim() || !newMilestoneTargetDate) {
        notification.info({
          message: t("validationError") || "Validation error",
          description:
            t("pleaseEnterRequiredFields") ||
            "Please enter required fields.",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (activeTab === "existing") {
        await MilestoneService.moveMilestoneItems(groupId, milestoneId, {
          targetMilestoneId: selectedTargetId,
          createNewMilestone: false,
        });
      } else {
        await MilestoneService.moveMilestoneItems(groupId, milestoneId, {
          createNewMilestone: true,
          newMilestoneName: newMilestoneName.trim(),
          newMilestoneTargetDate: dayjs(newMilestoneTargetDate).format(
            "YYYY-MM-DD"
          ),
          newMilestoneDescription: (newMilestoneDescription || "").trim(),
        });
      }
      notification.success({ message: t("updated") || "Updated" });
      onMoved?.();
      onCancel?.();
    } catch (err) {
      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message || t("pleaseTryAgain") || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t("moveIncompleteItems") || "Move incomplete items"}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "existing",
            label: t("moveToExisting") || "Move to existing",
            children: (
              <div className="space-y-3">
                <label className="text-sm text-gray-700 mb-1 block">
                  {t("selectMilestone") || "Select milestone"}
                </label>
                <Select
                  className="w-full"
                  loading={milestonesLoading}
                  placeholder={
                    t("selectMilestone") || "Select milestone"
                  }
                  value={selectedTargetId}
                  onChange={setSelectedTargetId}
                  options={milestoneOptions}
                />
                <p className="text-xs text-gray-500">
                  {t("moveItemsHint") ||
                    "Incomplete items will move to the selected milestone."}
                </p>
              </div>
            ),
          },
          {
            key: "new",
            label: t("createNewMilestone") || "Create new milestone",
            children: (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    {t("title") || "Title"}
                  </label>
                  <Input
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                    placeholder={t("enterTitle") || "Enter title"}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    {t("targetDate") || "Target date"}
                  </label>
                  <DatePicker
                    className="w-full"
                    value={newMilestoneTargetDate}
                    onChange={setNewMilestoneTargetDate}
                    inputReadOnly
                    disabledDate={(current) =>
                      current && current < dayjs().startOf("day")
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    {t("description") || "Description"}
                  </label>
                  <Input.TextArea
                    rows={3}
                    value={newMilestoneDescription}
                    onChange={(e) =>
                      setNewMilestoneDescription(e.target.value)
                    }
                    placeholder={
                      t("enterDescription") || "Enter description"
                    }
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCancel}>
          {t("cancel") || "Cancel"}
        </Button>
        <Button type="primary" loading={submitting} onClick={handleConfirm}>
          {t("confirm") || "Confirm"}
        </Button>
      </div>
    </Modal>
  );
}

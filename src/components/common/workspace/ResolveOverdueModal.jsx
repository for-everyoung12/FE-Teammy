import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Modal, Radio, Select, notification } from "antd";
import dayjs from "dayjs";
import { MilestoneService } from "../../../services/milestone.service";

const getSafeNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getQuickBaseDate = (milestone) => {
  const today = dayjs().startOf("day");
  const milestoneDate = milestone?.targetDate ? dayjs(milestone.targetDate) : null;
  if (milestoneDate && milestoneDate.isValid() && milestoneDate.isAfter(today)) {
    return milestoneDate;
  }
  return today;
};

export default function ResolveOverdueModal({
  open,
  onCancel,
  groupId,
  milestone,
  milestoneOptions,
  t,
  overdueActions,
  overdueLoading,
  extendDate,
  extendLoading,
  setExtendDate,
  onExtend,
  onMoved,
}) {
  const [mode, setMode] = useState("extend");
  const [destination, setDestination] = useState("milestone");
  const [targetMilestoneId, setTargetMilestoneId] = useState(null);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("extend");
    setDestination("milestone");
    setTargetMilestoneId(null);
    setNewMilestoneName("");
    setNewMilestoneDate(null);
  }, [open]);

  const incompleteCount = useMemo(() => {
    if (!milestone) return 0;
    const total = Number(milestone.totalItems || 0);
    const done = Number(milestone.completedItems || 0);
    return Math.max(0, total - done);
  }, [milestone]);

  const overdueCount = useMemo(() => {
    const count = getSafeNumber(overdueActions?.overdueItems);
    return count ?? 0;
  }, [overdueActions]);

  const helperText =
    mode === "extend"
      ? t("extendHelper") || "This updates the milestone target date."
      : t("moveItemsHelper") || "Moves only incomplete items.";

  const isPrimaryDisabled = useMemo(() => {
    if (mode === "extend") {
      return !extendDate;
    }
    if (destination === "milestone") return !targetMilestoneId;
    if (destination === "new") {
      return !newMilestoneName.trim() || !newMilestoneDate;
    }
    return false;
  }, [mode, destination, targetMilestoneId, newMilestoneName, newMilestoneDate, extendDate]);

  const handleQuickAdd = (weeks) => {
    const baseDate = getQuickBaseDate(milestone);
    setExtendDate(baseDate.add(weeks, "week"));
  };

  const handleEndOfMonth = () => {
    const baseDate = getQuickBaseDate(milestone);
    setExtendDate(baseDate.endOf("month"));
  };

  const handleSubmit = async () => {
    if (!milestone || !groupId) return;
    if (mode === "extend") {
      const success = await onExtend?.();
      if (success) onCancel?.();
      return;
    }

    const milestoneId = milestone.milestoneId || milestone.id;
    setSubmitting(true);
    try {
      const payload = {};
      if (destination === "milestone") {
        payload.targetMilestoneId = targetMilestoneId;
        payload.createNewMilestone = false;
      } else {
        payload.createNewMilestone = true;
        payload.targetMilestoneId = null;
        payload.newMilestoneName = newMilestoneName.trim();
        payload.newMilestoneTargetDate = dayjs(newMilestoneDate).format("YYYY-MM-DD");
      }
      await MilestoneService.moveMilestoneItems(groupId, milestoneId, payload);
      notification.success({
        message: t("itemsMoved") || "Items moved",
      });
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
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      title={t("resolveOverdue") || "Resolve overdue"}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {incompleteCount} {t("incompleteItems") || "incomplete"} •{" "}
          {overdueCount} {t("overdueItems") || "overdue"}
        </p>

        <Radio.Group
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="flex flex-col gap-2"
        >
          <Radio value="extend">{t("extendTargetDate") || "Extend target date"}</Radio>
          <Radio value="move">{t("moveIncompleteItems") || "Move incomplete items"}</Radio>
        </Radio.Group>

        {mode === "extend" && (
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/40 p-3">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">
                {t("newTargetDate") || "New target date"}
              </label>
              <DatePicker
                className="w-full"
                value={extendDate}
                inputReadOnly
                disabledDate={(current) => current && current < dayjs().startOf("day")}
                onChange={setExtendDate}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="small" onClick={() => handleQuickAdd(1)}>
                {t("quickAdd1Week") || "+1 week"}
              </Button>
              <Button size="small" onClick={() => handleQuickAdd(2)}>
                {t("quickAdd2Weeks") || "+2 weeks"}
              </Button>
              <Button size="small" onClick={handleEndOfMonth}>
                {t("quickAddEndOfMonth") || "End of month"}
              </Button>
            </div>
          </div>
        )}

        {mode === "move" && (
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/40 p-3">
            <Radio.Group
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="flex flex-wrap gap-6"
            >
              <Radio value="milestone">{t("moveToMilestone") || "Move to milestone"}</Radio>
              <Radio value="new">{t("createNewMilestone") || "Create new milestone"}</Radio>
            </Radio.Group>
            {destination === "milestone" && (
              <Select
                className="w-full"
                showSearch
                value={targetMilestoneId}
                onChange={setTargetMilestoneId}
                options={milestoneOptions}
                placeholder={t("selectMilestone") || "Select milestone"}
                optionFilterProp="label"
              />
            )}
            {destination === "new" && (
              <div className="space-y-3">
                <Input
                  value={newMilestoneName}
                  onChange={(e) => setNewMilestoneName(e.target.value)}
                  placeholder={t("newMilestoneName") || "New milestone name"}
                />
                <DatePicker
                  className="w-full"
                  value={newMilestoneDate}
                  inputReadOnly
                  disabledDate={(current) => current && current < dayjs().startOf("day")}
                  onChange={setNewMilestoneDate}
                  placeholder={t("newMilestoneTargetDate") || "New milestone target date"}
                />
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500">{helperText}</p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button onClick={onCancel}>{t("cancel") || "Cancel"}</Button>
          <Button
            type="primary"
            loading={extendLoading || submitting || overdueLoading}
            disabled={isPrimaryDisabled}
            onClick={handleSubmit}
          >
            {mode === "extend"
              ? t("extendMilestone") || "Extend milestone"
              : t("moveItems") || "Move items"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

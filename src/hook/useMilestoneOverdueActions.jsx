import { useCallback, useEffect, useState } from "react";
import { notification } from "antd";
import dayjs from "dayjs";
import { MilestoneService } from "../services/milestone.service";

const getMilestoneId = (milestone) =>
  milestone?.milestoneId || milestone?.id || null;

export default function useMilestoneOverdueActions({
  groupId,
  milestone,
  isActive,
  t,
  onRefresh,
  onExtended,
}) {
  const [overdueActions, setOverdueActions] = useState(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [overdueError, setOverdueError] = useState("");
  const [extendDate, setExtendDate] = useState(null);
  const [extendLoading, setExtendLoading] = useState(false);

  const milestoneId = getMilestoneId(milestone);

  const resetState = useCallback(() => {
    setOverdueActions(null);
    setOverdueError("");
    setExtendDate(null);
  }, []);

  const fetchOverdueActions = useCallback(async () => {
    if (!groupId || !milestoneId) return;
    setOverdueLoading(true);
    setOverdueError("");
    setOverdueActions(null);
    try {
      const res = await MilestoneService.getOverdueActions(groupId, milestoneId);
      const payload = res?.data ?? res;
      setOverdueActions(payload || null);
    } catch (err) {
      setOverdueActions(null);
      setOverdueError(
        err?.response?.data?.message ||
          t("failedLoadOverdueActions") ||
          "Failed to load overdue actions."
      );
    } finally {
      setOverdueLoading(false);
    }
  }, [groupId, milestoneId, t]);

  useEffect(() => {
    if (!isActive || !milestoneId) {
      resetState();
      return;
    }
    fetchOverdueActions();
  }, [isActive, milestoneId, fetchOverdueActions, resetState]);

  const handleExtendMilestone = useCallback(async (options = {}) => {
    if (!groupId || !milestoneId) return;
    if (!extendDate) {
      notification.info({
        message: t("pleaseSelectDate") || "Please select a date.",
      });
      return;
    }
    setExtendLoading(true);
    try {
      await MilestoneService.extendMilestone(groupId, milestoneId, {
        newTargetDate: dayjs(extendDate).format("YYYY-MM-DD"),
        ...options,
      });
      notification.success({
        message: t("updated") || "Updated",
      });
      setExtendDate(null);
      if (typeof onExtended === "function") {
        onExtended(extendDate);
      }
      fetchOverdueActions();
      if (typeof onRefresh === "function") {
        onRefresh();
      }
      return true;
    } catch (err) {
      notification.info({
        message: t("actionFailed") || "Action failed",
        description:
          err?.response?.data?.message ||
          t("pleaseTryAgain") ||
          "Please try again.",
      });
      return false;
    } finally {
      setExtendLoading(false);
    }
  }, [
    groupId,
    milestoneId,
    extendDate,
    t,
    onExtended,
    onRefresh,
    fetchOverdueActions,
  ]);

  return {
    overdueActions,
    overdueLoading,
    overdueError,
    extendDate,
    extendLoading,
    fetchOverdueActions,
    handleExtendMilestone,
    resetState,
    setExtendDate,
  };
}

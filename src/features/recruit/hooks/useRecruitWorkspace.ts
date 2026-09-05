/** Coordinates recruitment tabs, risk consent, feed, and advanced ViewModels. */
import { useCallback, useState } from "react";
import {
  grantAdvancedRecruitRiskConsent,
  hasAdvancedRecruitRiskConsent,
} from "../utils/recruitRiskConsent";
import { useAdvancedRecruit } from "./useAdvancedRecruit";
import { useRecruit } from "./useRecruit";

export type RecruitWorkspaceSection = "feed" | "advanced";

export function useRecruitWorkspace() {
  const feed = useRecruit();
  const advanced = useAdvancedRecruit(feed.config);
  const initializeAdvanced = advanced.initialize;
  const [section, setSection] = useState<RecruitWorkspaceSection>("feed");
  const [riskOpen, setRiskOpen] = useState(false);
  const [riskStorageError, setRiskStorageError] = useState(false);

  const openFeed = useCallback(() => setSection("feed"), []);
  const openAdvanced = useCallback(() => {
    if (!hasAdvancedRecruitRiskConsent()) {
      setRiskStorageError(false);
      setRiskOpen(true);
      return;
    }
    setSection("advanced");
    initializeAdvanced();
  }, [initializeAdvanced]);
  const agreeToAdvancedRisk = useCallback(() => {
    if (!riskStorageError && !grantAdvancedRecruitRiskConsent()) {
      setRiskStorageError(true);
      return;
    }
    setRiskOpen(false);
    setSection("advanced");
    initializeAdvanced();
  }, [initializeAdvanced, riskStorageError]);
  const cancelAdvancedRisk = useCallback(() => {
    setRiskOpen(false);
    setRiskStorageError(false);
  }, []);

  return {
    section,
    riskOpen,
    riskStorageError,
    feed,
    advanced,
    openFeed,
    openAdvanced,
    agreeToAdvancedRisk,
    cancelAdvancedRisk,
  };
}

export type RecruitWorkspaceState = ReturnType<typeof useRecruitWorkspace>;

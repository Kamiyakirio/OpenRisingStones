/** Binds the advanced aggregation engine to the public recruitment transport. */
import {
  collectAdvancedRecruitDataset,
  waitForRecruitInterval,
  type AdvancedRecruitLoaderOptions,
} from "@/features/recruit/utils/advancedRecruitAggregation";
import {
  fetchRecruitDetail,
  fetchRecruitPage,
  isRecruitRateLimitError,
} from "@/features/recruit/api/recruitApi";

export function loadAdvancedRecruitDataset(
  options: AdvancedRecruitLoaderOptions,
) {
  return collectAdvancedRecruitDataset(options, {
    fetchPage: fetchRecruitPage,
    fetchDetail: fetchRecruitDetail,
    wait: waitForRecruitInterval,
    random: Math.random,
    isRateLimitError: isRecruitRateLimitError,
  });
}

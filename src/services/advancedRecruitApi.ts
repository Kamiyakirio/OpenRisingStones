/** Binds the advanced aggregation engine to the public recruitment transport. */
import {
  collectAdvancedRecruitDataset,
  waitForRecruitInterval,
  type AdvancedRecruitLoaderOptions,
} from "../utils/advancedRecruitAggregation";
import { fetchRecruitDetail, fetchRecruitPage } from "./recruitApi";

export function loadAdvancedRecruitDataset(
  options: AdvancedRecruitLoaderOptions,
) {
  return collectAdvancedRecruitDataset(options, {
    fetchPage: fetchRecruitPage,
    fetchDetail: fetchRecruitDetail,
    wait: waitForRecruitInterval,
    random: Math.random,
  });
}

/** Initial query values for the public recruitment browser. */
import type { RecruitFilters } from "../types";

export function createEmptyRecruitFilters(): RecruitFilters {
  return {
    dutyName: "",
    dutyType: "",
    areaId: "",
  };
}

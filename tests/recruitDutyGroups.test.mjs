/** Regression coverage for savage-raid duty aggregation. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecruitDutyChoices,
  expandRecruitDutyChoice,
} from "../src/features/recruit/utils/recruitDutyGroups.ts";

const duties = [1, 2, 3, 4].map((floor) => ({
  id: floor,
  type: "零式",
  name: `巴哈姆特零式大迷宫 入侵之章${floor}`,
  teamComposition: "满编小队",
}));

test("collapses four numbered savage floors into one visible choice", () => {
  assert.deepEqual(buildRecruitDutyChoices(duties), [
    {
      label: "巴哈姆特零式大迷宫 入侵之章",
      type: "零式",
      dutyNames: duties.map((duty) => duty.name),
    },
  ]);
});

test("expands the grouped choice back to every concrete API duty name", () => {
  assert.deepEqual(
    expandRecruitDutyChoice("巴哈姆特零式大迷宫 入侵之章", duties),
    duties.map((duty) => duty.name),
  );
});

test("leaves non-savage duties unchanged", () => {
  const trial = {
    id: 9,
    type: "绝境战",
    name: "幻想龙诗绝境战",
    teamComposition: "满编小队",
  };
  assert.deepEqual(buildRecruitDutyChoices([trial])[0]?.dutyNames, [
    trial.name,
  ]);
});

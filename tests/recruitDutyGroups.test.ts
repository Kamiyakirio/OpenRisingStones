/** Regression coverage for savage-raid duty aggregation. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecruitDutyChoices,
  expandRecruitDutyChoice,
} from "../src/features/recruit/utils/recruitDutyGroups.ts";

const duties = [1, 2, 3, 4].map((floor) => ({
  id: floor,
  type: "\u96f6\u5f0f",
  name: `\u5df4\u54c8\u59c6\u7279\u96f6\u5f0f\u5927\u8ff7\u5bab \u5165\u4fb5\u4e4b\u7ae0${floor}`,
  teamComposition: "\u6ee1\u7f16\u5c0f\u961f",
}));

test("collapses four numbered savage floors into one visible choice", () => {
  assert.deepEqual(buildRecruitDutyChoices(duties), [
    {
      label:
        "\u5df4\u54c8\u59c6\u7279\u96f6\u5f0f\u5927\u8ff7\u5bab \u5165\u4fb5\u4e4b\u7ae0",
      type: "\u96f6\u5f0f",
      dutyNames: duties.map((duty) => duty.name),
    },
  ]);
});

test("expands the grouped choice back to every concrete API duty name", () => {
  assert.deepEqual(
    expandRecruitDutyChoice(
      "\u5df4\u54c8\u59c6\u7279\u96f6\u5f0f\u5927\u8ff7\u5bab \u5165\u4fb5\u4e4b\u7ae0",
      duties,
    ),
    duties.map((duty) => duty.name),
  );
});

test("leaves non-savage duties unchanged", () => {
  const trial = {
    id: 9,
    type: "\u7edd\u5883\u6218",
    name: "\u5e7b\u60f3\u9f99\u8bd7\u7edd\u5883\u6218",
    teamComposition: "\u6ee1\u7f16\u5c0f\u961f",
  };
  assert.deepEqual(buildRecruitDutyChoices([trial])[0]?.dutyNames, [
    trial.name,
  ]);
});

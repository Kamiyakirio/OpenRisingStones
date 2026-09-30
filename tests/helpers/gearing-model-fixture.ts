/** Small typed editor records shared by tests that do not need real game data. */
import type {
  Evaluation,
  Item,
} from "../../src/features/gearing/editor/types.ts";

export function gearingItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    name: "Item",
    level: 0,
    slotKey: "mainHand",
    kind: "equipment",
    stats: {},
    jobs: ["SCH"],
    sourceId: null,
    ...overrides,
  };
}

export function gearingEvaluation(
  overrides: Partial<Evaluation> = {},
): Evaluation {
  return {
    stats: {},
    baseStats: {},
    effects: {
      damage: 1,
      gcd: 2.5,
      crtChance: 0,
      crtDamage: 1,
      detDamage: 1,
      dhtChance: 0,
      tenDamage: 1,
      tenMitigation: 1,
      ssDamage: 1,
      hp: 0,
      mp: 0,
    },
    slots: {},
    issues: [],
    tiers: {},
    itemLevel: 0,
    dataVersion: "test",
    ...overrides,
  };
}

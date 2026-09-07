/** Owned game-table conversion, adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import { parseSheet, sourceIndex, statColumns } from "./csv.mjs";
export function convert(raw, config) {
  const loadExd = (name) => parseSheet(raw[name], name);
  const statAbbrs = { ...config.conversion.statAbbrs };
  const jobs = Object.keys(config.rules.jobSchemas);
  const sourceOfId = sourceIndex(config.sources);
  const labels = config.conversion.sourceLabels;
  const BaseParam = loadExd("BaseParam.csv");
  const ClassJobCategory = loadExd("ClassJobCategory.csv");
  const ContentFinderCondition = loadExd("ContentFinderCondition.csv");
  const Item = loadExd("Item.csv");
  const ItemAction = loadExd("ItemAction.csv");
  const ItemFood = loadExd("ItemFood.csv");
  const ItemLevel = loadExd("ItemLevel.csv");
  const slotComposite = {
    15: [4, 3],
    16: [4, 5, 7, 8],
    18: [7, 8],
    19: [4, 3, 5, 7, 8],
    20: [4, 5, 7],
    21: [4, 7, 8],
    22: [4, 5],
  };
  const jobCategories = ClassJobCategory.map((line) => {
    const ret = {};
    for (const classjob of jobs) {
      if (line[classjob] === "True") {
        ret[classjob] = true;
      }
    }
    return ret;
  });
  jobCategories[2] = {
    PLD: true,
    WAR: true,
    DRK: true,
    GNB: true,
    MNK: true,
    DRG: true,
    SAM: true,
    RPR: true,
  };
  const jobCategoryOfMainStats = {
    STR: 2,
    DEX: 105,
    INT: 63,
    MND: 64,
    "STR,DEX": 30,
    "INT,MND": 31,
  };
  const lodestoneIds = [
    undefined,
    ...raw["lodestone-item-id.txt"].split(/\r?\n/).map((x) => x || undefined),
  ];
  const slotsUsed = [];
  const jobCategoriesUsed = [];
  const levelsUsed = {};
  const lodestoneIdsUsed = [];
  const sourcesMissing = {};
  const gears = Item.map((x) => {
    if (x["ClassJobCategory"] === "0") return;
    const ret = {};
    ret.id = +x["#"];
    ret.name = x["Name"];
    ret.level = +x["LevelItem"];
    ret.rarity = +x["Rarity"];
    ret.slot = +x["EquipSlotCategory"];
    if (ret.slot in slotComposite) {
      ret.rawSlot = ret.slot;
      ret.slot = slotComposite[ret.slot][0];
    }
    ret.role = +x["BaseParamModifier"];
    ret.jobCategory = +x["ClassJobCategory"];
    ret.equipLevel = +x["LevelEquip"];
    ret.equipLevelVariable =
      x["Description"] === config.conversion.levelSyncDescription
        ? true
        : undefined;
    ret.materiaSlot = +x["MateriaSlotCount"];
    ret.materiaAdvanced =
      x["IsAdvancedMeldingPermitted"] === "True" ? true : undefined;
    ret.stats = {};
    ret.hq = x["CanBeHq"] === "True" ? true : undefined;
    ret.source = sourceOfId[ret.id];
    ret.obsolete =
      (ret.rarity === 7 &&
        ret.source !== labels.fate &&
        !(ret.slot >= 9 && ret.slot <= 12)) ||
      ret.source?.endsWith(labels.obsolete) ||
      ret.source === labels.oldDiadem
        ? true
        : undefined;
    // HQ bonuses are additive; special non-HQ bonuses are handled separately below.
    const rawStats = {};
    for (let i = 0; i < 6; i++) {
      rawStats[x[`BaseParam[${i}]`]] ??= 0;
      rawStats[x[`BaseParam[${i}]`]] += +x[`BaseParamValue[${i}]`];
      if (ret.hq) {
        rawStats[x[`BaseParamSpecial[${i}]`]] ??= 0;
        rawStats[x[`BaseParamSpecial[${i}]`]] +=
          +x[`BaseParamValueSpecial[${i}]`];
      }
    }
    rawStats[12] = (rawStats[12] ?? 0) + +x["DamagePhys"];
    rawStats[13] = (rawStats[13] ?? 0) + +x["DamageMag"];
    for (const [k, v] of Object.entries(rawStats)) {
      if (v >= 0 && k in statAbbrs && k !== "12" && k !== "13") {
        ret.stats[statAbbrs[k]] = v;
      }
    }
    if (
      ret.rarity === 4 &&
      ret.level > 1 &&
      "VIT" in ret.stats &&
      Object.keys(ret.stats).length === 2
    ) {
      ret.customizable = true;
    }
    if (rawStats[12] > 0 && ("STR" in ret.stats || "DEX" in ret.stats)) {
      ret.stats["PDMG"] = rawStats[12];
      ret.stats["DLY"] = +x["Delayms"];
    }
    if (rawStats[13] > 0 && ("INT" in ret.stats || "MND" in ret.stats)) {
      ret.stats["MDMG"] = rawStats[13];
    }
    if (ret.slot === 13 && ret.jobCategory === 129) {
      ret.stats["MDMG"] = rawStats[13];
    }
    if (Object.keys(ret.stats).length === 0) return;
    if (x["ItemSpecialBonus"] === "9" || x["ItemSpecialBonus"] === "10") {
      ret.occultStats = {};
      for (let i = 0; i < 6; i++) {
        const stat = statAbbrs[x[`BaseParamSpecial[${i}]`]];
        if (stat !== undefined) {
          ret.occultStats[stat] = +x[`BaseParamValueSpecial[${i}]`];
        }
      }
    }
    if (
      (ret.jobCategory === 1 ||
        ret.jobCategory === 34 ||
        ret.jobCategory === 30 ||
        ret.jobCategory === 31) &&
      !("main" in ret.stats)
    ) {
      const existMainStats = ["STR", "DEX", "INT", "MND"]
        .filter((x) => x in ret.stats)
        .join(",");
      if (existMainStats !== "") {
        ret.jobCategory = jobCategoryOfMainStats[existMainStats] ?? 34;
      } else {
        const craft =
          "CMS" in ret.stats || "CRL" in ret.stats || "CP" in ret.stats;
        const gather =
          "GTH" in ret.stats || "PCP" in ret.stats || "GP" in ret.stats;
        if (craft && !gather) ret.jobCategory = 33;
        if (!craft && gather) ret.jobCategory = 32;
        if (craft && gather) ret.jobCategory = 35;
        if (!craft && !gather) ret.jobCategory = 34;
      }
    }
    if (ret.jobCategory === 63 && ret.equipLevel > 80) {
      ret.jobCategory = 147;
    }
    if (ret.source?.startsWith(labels.craftGather)) {
      const craft =
        "CMS" in ret.stats || "CRL" in ret.stats || "CP" in ret.stats;
      ret.source =
        (craft ? labels.craft : labels.gather) +
        ret.source.slice(labels.craftGather.length);
    }
    slotsUsed[ret.rawSlot ?? ret.slot] = true;
    jobCategoriesUsed[ret.jobCategory] = jobCategories[ret.jobCategory];
    levelsUsed[ret.level] = true;
    lodestoneIdsUsed[ret.id] = lodestoneIds[ret.id];
    if (ret.source === undefined && ret.slot !== 17 && ret.equipLevel >= 50) {
      sourcesMissing[ret.id] = `${ret.level}${ret.hq ? "HQ" : ""}  ${ret.name}`;
    }
    return ret;
  })
    .filter(Boolean)
    .sort((a, b) => {
      const k = a.level - b.level;
      return k !== 0 ? k : a.id - b.id;
    });
  const jobCategoryMap = Object.fromEntries(
    jobCategoriesUsed
      .map((x, i) => [Object.keys(x).sort().join(","), i])
      .filter(Boolean),
  );
  const foods = Item.map((x) => {
    const itemAction = ItemAction[+x["ItemAction"]];
    const actionType = +itemAction["Action"];
    const isFood = actionType === 844 || actionType === 845;
    const isPotion = actionType === 846;
    if (!(isFood || isPotion) || x["CanBeHq"] !== "True") return;
    const itemFood = ItemFood[+itemAction["Data[1]"]];
    const ret = {};
    ret.id = +x["#"];
    ret.name = x["Name"];
    ret.level = +x["LevelItem"];
    ret.slot = isFood ? -1 : -2;
    ret.jobCategory = undefined;
    ret.stats = {};
    ret.statRates = {};
    ret.statMain = statAbbrs[itemFood["BaseParam[0]"]];
    for (const i of [0, 1, 2]) {
      const stat = statAbbrs[itemFood[`BaseParam[${i}]`]];
      if (stat !== undefined) {
        if (itemFood[`IsRelative[${i}]`] === "True") {
          ret.stats[stat] = +itemFood[`MaxHQ[${i}]`];
          ret.statRates[stat] = +itemFood[`ValueHQ[${i}]`];
        } else {
          ret.stats[stat] = +itemFood[`ValueHQ[${i}]`];
        }
      }
    }
    if (Object.keys(ret.stats).length === 0) return;
    const jobs = {};
    if ("CMS" in ret.stats || "CRL" in ret.stats || "CP" in ret.stats) {
      ["CRP", "BSM", "ARM", "GSM", "LTW", "WVR", "ALC", "CUL"].forEach(
        (j) => (jobs[j] = true),
      );
    } else {
      if (isPotion) return;
    }
    if ("GTH" in ret.stats || "PCP" in ret.stats || "GP" in ret.stats) {
      ["MIN", "BTN", "FSH"].forEach((j) => (jobs[j] = true));
    }
    if ("TEN" in ret.stats) {
      ["PLD", "WAR", "DRK", "GNB"].forEach((j) => (jobs[j] = true));
    }
    if ("PIE" in ret.stats) {
      ["WHM", "SCH", "AST", "SGE"].forEach((j) => (jobs[j] = true));
    }
    if (Object.keys(jobs).length === 0) {
      if (!("SPS" in ret.stats)) {
        [
          "PLD",
          "WAR",
          "DRK",
          "GNB",
          "MNK",
          "DRG",
          "NIN",
          "SAM",
          "RPR",
          "VPR",
          "BRD",
          "MCH",
          "DNC",
        ].forEach((j) => (jobs[j] = true));
      }
      if (!("SKS" in ret.stats)) {
        ["WHM", "SCH", "AST", "SGE", "BLM", "SMN", "RDM", "PCT", "BLU"].forEach(
          (j) => (jobs[j] = true),
        );
      }
    }
    ret.jobCategory = jobCategoryMap[Object.keys(jobs).sort().join(",")];
    if (ret.jobCategory === undefined)
      throw new Error(`Missing job category for consumable ${ret.id}.`);
    lodestoneIdsUsed[ret.id] = lodestoneIds[ret.id];
    return ret;
  }).filter(Boolean);
  // Preserve the source selection rule: a food stays visible unless a later one dominates every stat.
  const bestFoods = [];
  for (const food of foods.slice().reverse()) {
    if (food.id === 4745) continue;
    if (
      !bestFoods.some(
        (bestFood) =>
          food.slot === bestFood.slot &&
          Object.keys(food.stats).every(
            (stat) => food.stats[stat] <= bestFood.stats[stat],
          ),
      )
    ) {
      food.best = true;
      bestFoods.push(food);
    }
  }
  const syncLevelOfJobLevel = {};
  for (const x of ContentFinderCondition) {
    if (!x) continue;
    const jobLevelRequired = +x["ClassJobLevelRequired"];
    if (jobLevelRequired % 10 === 0 && jobLevelRequired >= 50) {
      syncLevelOfJobLevel[x["ItemLevelRequired"]] = jobLevelRequired;
      syncLevelOfJobLevel[x["ItemLevelSync"]] = jobLevelRequired;
    }
  }
  delete syncLevelOfJobLevel["0"];
  const syncLevels = {};
  for (const l of Object.keys(syncLevelOfJobLevel)
    .map(Number)
    .sort((a, b) => a - b)) {
    const jobLevel = syncLevelOfJobLevel[l];
    syncLevels[jobLevel] ??= [];
    syncLevels[jobLevel].push(l);
    levelsUsed[l] = true;
  }
  delete statAbbrs[55];
  delete statAbbrs[56];
  const levelCaps = {
    level: Object.keys(levelsUsed)
      .map(Number)
      .sort((a, b) => a - b),
  };
  for (const i of Object.keys(statAbbrs)) {
    levelCaps[statAbbrs[i]] = levelCaps.level.map(
      (l) => +ItemLevel[l][statColumns[i]],
    );
  }
  delete slotsUsed[0];
  // Resolve cap columns by semantic names; never depend on CSV column positions.
  const slotCaps = {};
  for (const i of Object.keys(statAbbrs)) {
    slotCaps[statAbbrs[i]] = Array.from(slotsUsed, (used, j) =>
      used ? +BaseParam[+i][`slot${j}`] : 0,
    );
  }
  const roleCaps = {};
  for (const i of Object.keys(statAbbrs)) {
    roleCaps[statAbbrs[i]] = Array.from(
      { length: 13 },
      (_, j) => +BaseParam[+i][`MeldParam[${j}]`],
    );
  }
  const levelGroupBasis = config.conversion.levelGroupBasis;
  const levelGroupLast = levelGroupBasis.at(-1);
  // Group by item level while retaining sparse item-ID lookups used by saved share codes.
  const gearGroups = [];
  const groupedGears = [];
  for (const gear of gears) {
    let groupId = levelGroupBasis.findLast((level) => level <= gear.level);
    if ((gear.id >= 10337 && gear.id <= 10344) || gear.id === 17726) {
      groupId = levelGroupLast;
    }
    gearGroups[gear.id] = groupId;
    groupedGears[groupId] ??= [];
    groupedGears[groupId].push(gear);
  }
  const bluMdmgAdditions = config.blueMage;

  const data = {
    bluMdmgAdditions,
    foods,
    gearGroupBasis: levelGroupBasis,
    gearGroups,
  };
  for (const id of levelGroupBasis)
    data["gears-" + (id === levelGroupLast ? "recent" : id)] =
      groupedGears[id] ?? [];
  Object.assign(data, {
    jobCategories: jobCategoriesUsed,
    levelCaps,
    lodestoneIds: lodestoneIdsUsed,
    roleCaps,
    slotCaps,
    syncLevels,
  });
  return { data, sourcesMissing };
}

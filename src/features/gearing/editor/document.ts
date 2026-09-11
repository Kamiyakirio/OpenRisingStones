/** Validate persisted user intent in TS; native storage treats the document as opaque JSON. */
import type { Equipment, GearsetDocument } from "./types";
export function parseDocument(
  value: unknown,
  expectedId?: string,
): GearsetDocument {
  if (!value || typeof value !== "object")
    throw new Error("Invalid gearset document.");
  const doc = value as GearsetDocument;
  if (
    doc.formatVersion !== 2 ||
    typeof doc.id !== "string" ||
    !/^[-a-zA-Z0-9]{1,80}$/.test(doc.id) ||
    (expectedId !== undefined && doc.id !== expectedId)
  )
    throw new Error("Invalid gearset document version or ID.");
  if (
    typeof doc.name !== "string" ||
    !doc.name.trim() ||
    [...doc.name].length > 120 ||
    typeof doc.job !== "string" ||
    !Number.isInteger(doc.jobLevel) ||
    !Number.isInteger(doc.clan) ||
    !doc.equipment ||
    typeof doc.equipment !== "object" ||
    Array.isArray(doc.equipment)
  )
    throw new Error("Invalid gearset metadata.");
  const alternatives = doc.alternatives ?? {};
  if (
    Object.values(alternatives).some((v) => !Array.isArray(v)) ||
    Object.values(alternatives).flat().length > 1000 ||
    Object.keys(doc.equipment).length > 20
  )
    throw new Error("Invalid gearset size.");
  for (const config of [
    ...Object.values(doc.equipment),
    ...Object.values(alternatives).flat(),
  ] as Equipment[]) {
    if (
      !config ||
      !Number.isSafeInteger(config.itemId) ||
      config.itemId <= 0 ||
      !Array.isArray(config.materias) ||
      config.materias.length > 5
    )
      throw new Error("Invalid equipment configuration.");
    for (const meld of config.materias) {
      if (
        !meld ||
        typeof meld !== "object" ||
        Array.isArray(meld) ||
        (meld.stat !== undefined && typeof meld.stat !== "string") ||
        (meld.grade !== undefined &&
          (!Number.isInteger(meld.grade) || meld.grade < 1 || meld.grade > 12))
      )
        throw new Error("Invalid materia configuration.");
    }
    if (
      (config.equipmentLocked !== undefined &&
        typeof config.equipmentLocked !== "boolean") ||
      (config.materiaLocked !== undefined &&
        typeof config.materiaLocked !== "boolean") ||
      (config.customStats != null &&
        (typeof config.customStats !== "object" ||
          Array.isArray(config.customStats)))
    )
      throw new Error("Invalid equipment fields.");
    if (
      Object.values(config.customStats ?? {}).some(
        (v) => !Number.isInteger(v) || v! < 0 || v! > 1000,
      )
    )
      throw new Error("Invalid custom stats.");
  }
  return {
    ...doc,
    alternatives,
    duplicateToolMateria: doc.duplicateToolMateria ?? true,
  };
}

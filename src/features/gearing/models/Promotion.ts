/* eslint-disable @typescript-eslint/no-explicit-any -- Recursive MST runtime schema boundary. */
/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import * as mst from "mobx-state-tree";

export const Promotion = mst.types
  .model({
    filter: mst.types.optional(mst.types.boolean, true),
    legacyLink: mst.types.optional(mst.types.boolean, true),
    materiaDetDhtOptimization: mst.types.optional(mst.types.boolean, true),
    summaryMenu: mst.types.optional(mst.types.boolean, true),
  })
  .views((self) => ({
    get(name: string): boolean {
      return (self as any)[name] ?? false;
    },
  }))
  .actions((self) => ({
    off(name: string): void {
      if ((self as any)[name] === true) {
        (self as any)[name] = false;
      }
    },
  }));

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Preserve recursive MST instance typing.
export interface IPromotion extends mst.Instance<typeof Promotion> {}
